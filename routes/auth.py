from flask import Blueprint, request, jsonify, render_template, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone, timedelta
import uuid
from database.db import db
from models import User, Instructor, Learner
import re

# Create a token blocklist
jwt_blocklist = set()

auth_bp = Blueprint('auth', __name__)


# Utility functions
def is_valid_email(email):
    """Check if an email is valid"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def is_strong_password(password):
    """Check if a password meets strength requirements"""
    # At least 8 characters, one uppercase, one lowercase, one digit, one special char
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True


def get_user_data(user):
    """Return a dictionary with user information"""
    user_data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'is_active': user.is_active
    }

    # Add role-specific data
    if user.role == 'instructor' and user.instructor:
        user_data['instructor_id'] = user.instructor.id
        user_data['institution'] = user.instructor.institution
        user_data['department'] = user.instructor.department
    elif user.role == 'learner' and user.learner:
        user_data['learner_id'] = user.learner.id
        user_data['grade_level'] = user.learner.grade_level

    return user_data


# Automatic token refresh
@auth_bp.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=30))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=get_jwt_identity())
            set_access_cookies(response, access_token)
        return response
    except (RuntimeError, KeyError):
        # Case where there is not a valid JWT. Just return the original response
        return response


# API Endpoints

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account (API)

    Function: User Registration
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate email format
        if not is_valid_email(data['email']):
            return jsonify({"error": "Invalid email format"}), 400

        # Validate password strength
        if not is_strong_password(data['password']):
            return jsonify({"error": "Password does not meet strength requirements"}), 400

        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({"error": "Email already registered"}), 409

        # Validate role
        valid_roles = ['instructor', 'learner', 'admin']
        if data['role'] not in valid_roles:
            return jsonify({"error": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400

        # Create user
        new_user = User(
            email=data['email'].lower(),
            password_hash=generate_password_hash(data['password']),
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data['role'],
            created_at=datetime.now(timezone.utc),
            is_active=True
        )

        db.session.add(new_user)
        db.session.flush()  # Flush to get the user ID without committing

        # Create role-specific profile
        if data['role'] == 'instructor':
            new_instructor = Instructor(
                user_id=new_user.id,
                institution=data.get('institution', ''),
                department=data.get('department', ''),
                bio=data.get('bio', '')
            )
            db.session.add(new_instructor)

        elif data['role'] == 'learner':
            new_learner = Learner(
                user_id=new_user.id,
                grade_level=data.get('grade_level', '')
            )
            db.session.add(new_learner)

        db.session.commit()

        # Create tokens
        access_token = create_access_token(identity=new_user.id)
        refresh_token = create_refresh_token(identity=new_user.id)

        return jsonify({
            "message": "User registered successfully",
            "user": get_user_data(new_user),
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in user registration: {str(e)}")
        return jsonify({"error": "An error occurred during registration"}), 500


# The rest of the authentication endpoints remain largely the same,
# since they don't reference the specific roles or models that changed names

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user and return JWT tokens (API)

    Function: User Authentication
    """
    try:
        data = request.get_json()

        # Validate required fields
        if 'email' not in data or 'password' not in data:
            return jsonify({"error": "Email and password are required"}), 400

        # Find user by email
        user = User.query.filter_by(email=data['email'].lower()).first()

        # Check if user exists and password is correct
        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({"error": "Invalid email or password"}), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({"error": "Account is inactive"}), 403

        # Update last login time
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()

        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)

        response = jsonify({
            "message": "Login successful",
            "user": get_user_data(user),
            "access_token": access_token,
            "refresh_token": refresh_token
        })

        # Set cookies if configured for cookie-based auth
        if current_app.config.get('JWT_COOKIE_SECURE', False):
            set_access_cookies(response, access_token)
            set_refresh_cookies(response, refresh_token)

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error in user login: {str(e)}")
        return jsonify({"error": "An error occurred during login"}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh the access token using a refresh token (API)

    Function: Token Refresh
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_active:
            return jsonify({"error": "Invalid user or inactive account"}), 401

        access_token = create_access_token(identity=current_user_id)

        response = jsonify({
            "message": "Token refreshed successfully",
            "access_token": access_token
        })

        # Set cookie if configured for cookie-based auth
        if current_app.config.get('JWT_COOKIE_SECURE', False):
            set_access_cookies(response, access_token)

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error in token refresh: {str(e)}")
        return jsonify({"error": "An error occurred during token refresh"}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Log out a user by revoking their tokens (API)

    Function: User Logout
    """
    try:
        jti = get_jwt()["jti"]
        jwt_blocklist.add(jti)

        response = jsonify({"message": "Successfully logged out"})

        # Unset cookies if configured for cookie-based auth
        if current_app.config.get('JWT_COOKIE_SECURE', False):
            unset_jwt_cookies(response)

        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error in user logout: {str(e)}")
        return jsonify({"error": "An error occurred during logout"}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_user_info():
    """Get the current authenticated user's information (API)

    Function: User Information
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"user": get_user_data(user)}), 200

    except Exception as e:
        current_app.logger.error(f"Error retrieving user info: {str(e)}")
        return jsonify({"error": "An error occurred while retrieving user information"}), 500


# Web UI Endpoints

@auth_bp.route('/register-page', methods=['GET'])
def register_page():
    """Render the registration page (Web UI)

    Function: Registration Page
    """
    return render_template('auth/register.html')


@auth_bp.route('/login-page', methods=['GET'])
def login_page():
    """Render the login page (Web UI)

    Function: Login Page
    """
    return render_template('auth/login.html')


@auth_bp.route('/forgot-password', methods=['GET'])
def forgot_password_page():
    """Render the forgot password page (Web UI)

    Function: Forgot Password Page
    """
    return render_template('auth/forgot_password.html')


@auth_bp.route('/reset-password/<token>', methods=['GET'])
def reset_password_page(token):
    """Render the password reset page (Web UI)

    Function: Reset Password Page
    """
    return render_template('auth/reset_password.html', token=token)