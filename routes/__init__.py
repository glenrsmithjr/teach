# routes/__init__.py
from flask import Blueprint
from flask import render_template
from flask import send_from_directory

# Import all blueprints
from .main import main_bp
from .auth import auth_bp
from .instructor import instructor_bp
from .learner import learner_bp
from .tutor import tutor_bp
from .course import course_bp
from .analytics import analytics_bp
from .admin import admin_bp
from .admin_logs import admin_logs_bp
from .dashboard import dashboard_bp


def register_blueprints(app):
    """Register all blueprints with the application"""
    # App routes
    app.register_blueprint(main_bp, url_prefix='/')
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(instructor_bp, url_prefix='/instructors')
    app.register_blueprint(learner_bp, url_prefix='/learners')
    app.register_blueprint(tutor_bp, url_prefix='/tutors')
    app.register_blueprint(course_bp, url_prefix='/courses')
    app.register_blueprint(analytics_bp, url_prefix='/analytics')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(admin_logs_bp, url_prefix='/admin/logs')
    app.register_blueprint(dashboard_bp, url_prefix='/dashboard')

    # Serve files from templates directory as static files
    @app.route('/templates/<path:filename>')
    def templates(filename):
        resp, resp_code = _check_file_request_safe(filename)
        if resp_code != 200:
            return resp, resp_code

        return send_from_directory('templates', filename)

    # Serve static javascript files
    @app.route('/static/<path:filename>')
    def javascript(filename):
        resp, resp_code = _check_file_request_safe(filename)
        if resp_code != 200:
            return resp, resp_code

        return send_from_directory('static', filename)


    def _check_file_request_safe(filename: str, valid_extensions: list = ('.html', '.js')) -> (str, int):
        # Prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            return "Access denied", 403

        # Only allow specified file extensions
        if not any(filename.endswith(ext) for ext in valid_extensions):
            return "File type not allowed", 403

        return filename, 200

    # Add a simple health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'ok'}, 200