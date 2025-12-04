


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