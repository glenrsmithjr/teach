# routes/main.py
from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Tutor
from models import User
from flask import session as flask_session
import uuid
import json


main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """
    Redirects all traffic from the root URL to the login page.
    This is the main public entry point for the application.
    """
    # 'auth.login_page' is the endpoint for the login page function in your auth.py
    # return redirect(url_for('auth.login_page'))
    return redirect(url_for('main.dashboard'))


@main_bp.route('/dashboard')
# @jwt_required()
def dashboard():
    """
    Serves the correct dashboard based on the authenticated user's role.
    """
    return render_template('instructor/main-content/dashboard/main-dashboard.html')
    # current_user_id = get_jwt_identity()
    # user = User.query.get(current_user_id)

    # print('user: ', user)


    if not user:
        flash("User not found.", "error")
        # Redirect to login, as something is wrong with the session/token
        return redirect(url_for('auth.login_page'))

    if user.role == 'instructor':
        return render_template('instructor/main-content/dashboard/main-dashboard.html', user=user)
    elif user.role == 'learner':
        return render_template('path/to/main-content/dashboard-html-file', user=user)
    elif user.role == 'admin':
        return render_template('path/to/main-content/dashboard-html-file', user=user)
    else:
        # Fallback for unknown roles
        flash("Your user role is not recognized.", "warning")
        return render_template('auth/login.html')


@main_bp.route('/support')
def support():
    """
    Navigates to the support page.
    """
    return render_template('')



@main_bp.route('/profile')
def profile_settings():
    """
    Navigates to the profile and settings page.
    """
    return render_template('')


@main_bp.route('/tutor-database')
def online_tutor_database():
    """
    Navigates to the profile and settings page.
    """
    return render_template('')


#####################
# COMMON NAVIGATION #
#####################

class TestUser:
    def __init__(self, id_, role):
        self.id = id_
        self.role = role

def str_to_bool(val):
    """Convert common truthy/falsey strings to a proper bool."""
    if val is None:
        return False
    return val.lower() == 'true'

@main_bp.route('/tutor-view/<int:tutor_id>')
def tutor_view(tutor_id):
    """
    Serves a tutor view with support for user_id and preview boolean.
    Example: /tutor-view/42?user_id=7&preview=true
    """
    # Demo user (replace later with actual user from JWT)
    user = TestUser(id_=1, role='instructor')

    if not user:
        flash("User not found.", "error")
        return redirect(url_for('auth.login_page'))

    # --- Fetch tutor record from the database ---
    tutor = Tutor.query.filter_by(id=tutor_id).first()
    if not tutor:
        flash("Tutor not found.", "error")
        return redirect(url_for('main.dashboard'))

    print(tutor)
    print(tutor.content)
    print(tutor.id)
    raw = tutor.content or "{}"
    try:
        payload = json.loads(raw) if isinstance(raw, str) else raw
        # If your content is exactly {"html": "..."} this will extract the HTML
        tutor_html = payload.get("html", raw if isinstance(raw, str) else "")
    except Exception:
        # fallback: if somehow content is already raw HTML
        tutor_html = raw

    # Parse tutor content
    #tutor_html = tutor.content

    # Get parameters
    user_id = request.args.get('user_id', type=int, default=user.id)
    is_preview = str_to_bool(request.args.get('preview'))

    sidebar_html = None
    # Render sidebar conditionally
    if user.role == 'instructor':
        sidebar_html = render_template('instructor/left-sidebars/sidebar-instructor.html')

    return render_template(
        'learner/main-content/tutor-view.html',
        tutor_titles=["Tutor Title1", "Tutor Title2", "Tutor Title3"],
        sidebarHtml=sidebar_html,
        tutorHtml=tutor_html,
        userId=user_id,
        isPreview=is_preview
    )





#########################
# INSTRUCTOR NAVIGATION #
#########################

@main_bp.route('/create-tutor')
def instructor_create_tutor():
    """
    Navigates to tutor creation page for instructors.
    """
    if 'agent_id' not in flask_session:
        flask_session['agent_id'] = str(uuid.uuid4())
    return render_template('instructor/main-content/builder/builder.html')

@main_bp.route('/manage-tutors')
def instructor_manage_tutors():
    """
    Navigates to ....
    """
    return render_template('')


@main_bp.route('/manage-learners')
def instructor_manage_learners():
    """
    Navigates to ....
    """
    return render_template('')

@main_bp.route('/get-component-sidebar')
#@jwt_required()
def instructor_component_sidebar():
    """Serves the component-sidebar HTML partial."""
    return render_template('instructor/right-sidebars/builder/component-sidebar.html')


@main_bp.route('/get-expert-model-sidebar')
#@jwt_required()
def instructor_expert_model_sidebar():
    """Serves the expert-model-sidebar HTML partial."""
    return render_template('instructor/right-sidebars/builder/expert-model-sidebar.html')


######################
# LEARNER NAVIGATION #
######################