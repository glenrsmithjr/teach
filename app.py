# app.py
import os
import logging
from flask import Flask, request
from flask_jwt_extended import JWTManager
from flask_login import LoginManager
from flask_cors import CORS
from flask_session import Session
from flask import session as flask_session
from flask_socketio import SocketIO

from config import config
from database.db import db, init_db_if_needed
from routes import register_blueprints
from agents.tutor_builder_agent.tutor_builder_agent import TutorBuilderAgent
import time
import threading
from datetime import datetime, timedelta


IDLE_SECONDS = 5 * 60  # 5 minutes

class AgentWrapper:
    def __init__(self, agent):
        self.agent = agent
        self.last_active = datetime.utcnow()

    def touch(self):
        self.last_active = datetime.utcnow()

class AgentManager:
    def __init__(self, socketio):
        self.socketio = socketio
        self._agents = {}          # agent_id -> AgentWrapper
        self._sid_to_agent = {}    # socket sid -> agent_id (optional convenience)
        self._lock = threading.RLock()
        # start a background reaper
        self.socketio.start_background_task(self._reaper_loop)

    def get_or_create(self, agent_id):
        with self._lock:
            wrap = self._agents.get(agent_id)
            if wrap is None:
                # create a fresh TutorBuilderAgent for this session
                wrap = AgentWrapper(TutorBuilderAgent(self.socketio))
                self._agents[agent_id] = wrap
            wrap.touch()
            return wrap.agent

    def bind_sid(self, sid, agent_id):
        with self._lock:
            self._sid_to_agent[sid] = agent_id

    def unbind_sid(self, sid):
        with self._lock:
            self._sid_to_agent.pop(sid, None)

    def mark_active(self, agent_id):
        with self._lock:
            if agent_id in self._agents:
                self._agents[agent_id].touch()

    def _reaper_loop(self):
        while True:
            time.sleep(30)  # sweep periodically
            cutoff = datetime.utcnow() - timedelta(seconds=IDLE_SECONDS)
            stale = []
            with self._lock:
                for agent_id, wrap in list(self._agents.items()):
                    if wrap.last_active < cutoff:
                        stale.append(agent_id)
            # save and terminate outside the lock
            for agent_id in stale:
                self._save_and_terminate(agent_id)

    def _save_and_terminate(self, agent_id):
        with self._lock:
            wrap = self._agents.pop(agent_id, None)
        if wrap is None:
            return
        try:
            # implement these on TutorBuilderAgent (shown below)
            wrap.agent.save_to_db()
            wrap.agent.shutdown()
        except Exception as e:
            # log but continue
            print(f"[AgentManager] Error terminating agent {agent_id}: {e}")


def create_app(config_name=None):
    """Create and configure the Flask application instance (App Factory)."""
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Configure extensions
    db.init_app(app)
    jwt = JWTManager(app)
    socketio = SocketIO(app)  # You might need to pass this to your run script

    app.agent_manager = AgentManager(socketio)

    # Initialize other extensions like LoginManager, CORS, Session, etc.
    init_extensions(app)

    # Setup JWT blocklist
    from routes.auth import jwt_blocklist
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blocklist(jwt_header, jwt_payload):
        return jwt_payload["jti"] in jwt_blocklist

    # Register all blueprints for the application
    register_blueprints(app)

    # Initialize the database if it doesn't exist
    with app.app_context():
        init_db_if_needed(app)

    # --- SocketIO Event Handlers ---
    @socketio.on('connect')
    def on_connect():
        agent_id = flask_session.get('agent_id')
        if not agent_id:
            # As a fallback, mint one here (should usually exist from the page route)
            import uuid
            agent_id = str(uuid.uuid4())
            flask_session['agent_id'] = agent_id

        agent = app.agent_manager.get_or_create(agent_id)
        app.agent_manager.bind_sid(request.sid, agent_id)
        print(f"Client connected: {request.sid} (agent_id={agent_id})")
        agent.handle_connection(request.sid)

    @socketio.on('message')
    def on_message(message):
        agent_id = app.agent_manager._sid_to_agent.get(request.sid)
        if not agent_id:
            return
        agent = app.agent_manager.get_or_create(agent_id)
        agent.handle_message(request.sid, message)
        # bump last_active since a call was made
        app.agent_manager.mark_active(agent_id)

    @socketio.on('disconnect')
    def on_disconnect():
        agent_id = app.agent_manager._sid_to_agent.get(request.sid)
        app.agent_manager.unbind_sid(request.sid)
        print(f"Client disconnected: {request.sid} (agent_id={agent_id})")

    @socketio.on('save_tutor')
    def on_save_tutor(message):
        agent_id = app.agent_manager._sid_to_agent.get(request.sid)
        if not agent_id:
            return
        agent = app.agent_manager.get_or_create(agent_id)
        # message is expected to contain: tutor_id, user_id, title, html, tutor_state
        agent.handle_save_tutor(request.sid, message)
        app.agent_manager.mark_active(agent_id)

    @socketio.on('create_expert_model')
    def on_create_expert_model(message):
        agent_id = app.agent_manager._sid_to_agent.get(request.sid)
        if not agent_id:
            return
        agent = app.agent_manager.get_or_create(agent_id)
        # delegate to the existing confirm-tutor flow
        agent.handle_confirm_tutor(request.sid, {'sender': 'user', 'content': {
            'message': 'Tutor Confirmed (via create_expert_model)',
            'html': message.get('html', '')
        }}, agent.get_session(request.sid))
        app.agent_manager.mark_active(agent_id)

    @socketio.on('refine_tutor')
    def on_refine_tutor(message):
        agent_id = app.agent_manager._sid_to_agent.get(request.sid)
        if not agent_id:
            return
        agent = app.agent_manager.get_or_create(agent_id)
        # keep the same schema that handle_refine_tutor expects
        agent.handle_refine_tutor(request.sid, {
            'sender': 'user',
            'content': {
                'message': message.get('message', ''),
                'html': message.get('html', '')
            }
        }, agent.get_session(request.sid))
        app.agent_manager.mark_active(agent_id)

    @socketio.on('unlock_tutor')
    def on_unlock_tutor(message):
        agent_id = app.agent_manager._sid_to_agent.get(request.sid)
        if not agent_id:
            return
        agent = app.agent_manager.get_or_create(agent_id)
        agent.handle_unlock_tutor(request.sid, message)
        app.agent_manager.mark_active(agent_id)

    # Configure security headers for production
    if not app.debug and not app.testing:
        @app.after_request
        def add_security_headers(response):
            for header, value in app.config.get('SECURITY_HEADERS', {}).items():
                response.headers[header] = value
            return response

    return app


def init_extensions(app):
    """Initialize Flask extensions."""
    login_manager = LoginManager(app)
    login_manager.login_view = 'auth.login_page'  # Redirect to login page if not authenticated
    login_manager.login_message_category = 'info'

    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return User.query.get(int(user_id))

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(__file__), 'sessions')
    if not os.path.exists(app.config['SESSION_FILE_DIR']):
        os.makedirs(app.config['SESSION_FILE_DIR'])
    Session(app)

    from flask_migrate import Migrate
    Migrate(app, db)