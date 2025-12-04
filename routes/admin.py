from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Instructor, Learner, Tutor, Course
from database.db import db
from sqlalchemy import func
import datetime
from functools import wraps

admin_bp = Blueprint('admin', __name__)

# Admin authorization decorator
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or user.role != 'admin':
            return jsonify({"error": "Admin privileges required"}), 403
        
        return fn(*args, **kwargs)
    return wrapper

# Dashboard endpoints

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    """Get admin dashboard statistics (API)
    
    Function: Admin Dashboard
    """
    try:
        # Get counts
        user_count = User.query.count()
        instructor_count = Instructor.query.count()
        learner_count = Learner.query.count()
        tutor_count = Tutor.query.count()
        course_count = Course.query.count()
        
        # Active users (logged in within the last 7 days)
        week_ago = datetime.datetime.now() - datetime.timedelta(days=7)
        active_users = User.query.filter(User.last_login >= week_ago).count()
        
        # Recently created users
        recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
        recent_users_data = [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
            for user in recent_users
        ]
        
        # Published vs draft tutors
        published_tutors = Tutor.query.filter_by(is_published=True).count()
        draft_tutors = Tutor.query.filter_by(is_published=False).count()
        
        return jsonify({
            "user_stats": {
                "total": user_count,
                "active": active_users,
                "instructors": instructor_count,
                "learners": learner_count
            },
            "content_stats": {
                "tutors": tutor_count,
                "published_tutors": published_tutors,
                "draft_tutors": draft_tutors,
                "courses": course_count
            },
            "recent_users": recent_users_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# User management endpoints

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users with optional filtering (API)
    
    Function: User Listing
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role = request.args.get('role')
        search = request.args.get('search')
        
        query = User.query
        
        # Apply filters
        if role:
            query = query.filter_by(role=role)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.email.ilike(search_term)) |
                (User.first_name.ilike(search_term)) |
                (User.last_name.ilike(search_term))
            )
        
        # Paginate results
        pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page)
        
        users_data = []
        for user in pagination.items:
            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "is_active": user.is_active
            }
            
            # Add role-specific IDs
            if user.role == 'instructor' and user.instructor:
                user_data['instructor_id'] = user.instructor.id
            elif user.role == 'learner' and user.learner:
                user_data['learner_id'] = user.learner.id
                
            users_data.append(user_data)
        
        return jsonify({
            "users": users_data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get detailed information about a specific user (API)
    
    Function: User Details
    """
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user_data = {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "is_active": user.is_active
        }
        
        # Add role-specific data
        if user.role == 'instructor' and user.instructor:
            user_data['instructor'] = {
                "id": user.instructor.id,
                "institution": user.instructor.institution,
                "department": user.instructor.department,
                "bio": user.instructor.bio,
                "total_tutors": len(user.instructor.tutors),
                "total_courses": len(user.instructor.courses)
            }
        elif user.role == 'learner' and user.learner:
            user_data['learner'] = {
                "id": user.learner.id,
                "grade_level": user.learner.grade_level,
                "last_active": user.learner.last_active.isoformat() if user.learner.last_active else None,
                "enrolled_courses": len(user.learner.course_enrollments)
            }
        
        return jsonify({"user": user_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update a user's information (API)
    
    Function: User Update
    """
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        # Update basic user info
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({"error": "Email already in use"}), 409
            user.email = data['email']
        if 'is_active' in data:
            user.is_active = data['is_active']
        
        # Update role-specific info
        if user.role == 'instructor' and user.instructor and 'instructor' in data:
            instructor_data = data['instructor']
            if 'institution' in instructor_data:
                user.instructor.institution = instructor_data['institution']
            if 'department' in instructor_data:
                user.instructor.department = instructor_data['department']
            if 'bio' in instructor_data:
                user.instructor.bio = instructor_data['bio']
        elif user.role == 'learner' and user.learner and 'learner' in data:
            learner_data = data['learner']
            if 'grade_level' in learner_data:
                user.learner.grade_level = learner_data['grade_level']
        
        db.session.commit()
        
        return jsonify({"message": "User updated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_user(user_id):
    """Deactivate a user account (API)
    
    Function: User Deactivation
    """
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Prevent deactivating your own admin account
        current_user_id = get_jwt_identity()
        if user_id == current_user_id:
            return jsonify({"error": "Cannot deactivate your own account"}), 400
        
        user.is_active = False
        db.session.commit()
        
        return jsonify({"message": "User deactivated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>/activate', methods=['POST'])
@admin_required
def activate_user(user_id):
    """Activate a user account (API)
    
    Function: User Activation
    """
    try:
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user.is_active = True
        db.session.commit()
        
        return jsonify({"message": "User activated successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@admin_required
def reset_user_password(user_id):
    """Reset a user's password (API)
    
    Function: Password Reset
    """
    try:
        from werkzeug.security import generate_password_hash
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.get_json()
        
        if 'new_password' not in data:
            return jsonify({"error": "New password is required"}), 400
        
        # Validate password (you might want to add strength requirements)
        if len(data['new_password']) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        
        user.password_hash = generate_password_hash(data['new_password'])
        db.session.commit()
        
        return jsonify({"message": "Password reset successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Content management endpoints

@admin_bp.route('/tutors', methods=['GET'])
@admin_required
def get_all_tutors():
    """Get all tutors with optional filtering (API)
    
    Function: Tutor Listing
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')  # 'published', 'draft'
        search = request.args.get('search')
        instructor_id = request.args.get('instructor_id', type=int)
        
        query = Tutor.query
        
        # Apply filters
        if status == 'published':
            query = query.filter_by(is_published=True)
        elif status == 'draft':
            query = query.filter_by(is_published=False)
        
        if instructor_id:
            query = query.filter_by(instructor_id=instructor_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Tutor.title.ilike(search_term)) |
                (Tutor.description.ilike(search_term)) |
                (Tutor.subject_area.ilike(search_term))
            )
        
        # Paginate results
        pagination = query.order_by(Tutor.created_at.desc()).paginate(page=page, per_page=per_page)
        
        tutors_data = []
        for tutor in pagination.items:
            instructor_name = f"{tutor.instructor.user.first_name} {tutor.instructor.user.last_name}" if tutor.instructor and tutor.instructor.user else "Unknown"
            
            tutors_data.append({
                "id": tutor.id,
                "title": tutor.title,
                "description": tutor.description,
                "subject_area": tutor.subject_area,
                "grade_level": tutor.grade_level,
                "instructor_id": tutor.instructor_id,
                "instructor_name": instructor_name,
                "is_published": tutor.is_published,
                "created_at": tutor.created_at.isoformat() if tutor.created_at else None,
                "updated_at": tutor.updated_at.isoformat() if tutor.updated_at else None,
                "modules_count": len(tutor.modules)
            })
        
        return jsonify({
            "tutors": tutors_data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/courses', methods=['GET'])
@admin_required
def get_all_courses():
    """Get all courses with optional filtering (API)
    
    Function: Course Listing
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')  # 'active', 'inactive'
        search = request.args.get('search')
        instructor_id = request.args.get('instructor_id', type=int)
        
        query = Course.query
        
        # Apply filters
        if status == 'active':
            query = query.filter_by(is_active=True)
        elif status == 'inactive':
            query = query.filter_by(is_active=False)
        
        if instructor_id:
            query = query.filter_by(instructor_id=instructor_id)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Course.title.ilike(search_term)) |
                (Course.description.ilike(search_term)) |
                (Course.course_code.ilike(search_term))
            )
        
        # Paginate results
        pagination = query.order_by(Course.created_at.desc()).paginate(page=page, per_page=per_page)
        
        courses_data = []
        for course in pagination.items:
            instructor_name = f"{course.instructor.user.first_name} {course.instructor.user.last_name}" if course.instructor and course.instructor.user else "Unknown"
            
            courses_data.append({
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "course_code": course.course_code,
                "instructor_id": course.instructor_id,
                "instructor_name": instructor_name,
                "start_date": course.start_date.isoformat() if course.start_date else None,
                "end_date": course.end_date.isoformat() if course.end_date else None,
                "is_active": course.is_active,
                "created_at": course.created_at.isoformat() if course.created_at else None,
                "updated_at": course.updated_at.isoformat() if course.updated_at else None,
                "learners_count": len(course.learners),
                "tutors_count": len(course.tutors)
            })
        
        return jsonify({
            "courses": courses_data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# System monitoring endpoints

@admin_bp.route('/system/stats', methods=['GET'])
@admin_required
def get_system_stats():
    """Get system statistics (API)
    
    Function: System Statistics
    """
    try:
        # User registration trends (last 30 days)
        thirty_days_ago = datetime.datetime.now() - datetime.timedelta(days=30)
        new_user_count = User.query.filter(User.created_at >= thirty_days_ago).count()
        
        # Active session count
        active_session_count = db.session.query(func.count(db.session.query(
            User.id
        ).filter(
            User.last_login >= (datetime.datetime.now() - datetime.timedelta(hours=1))
        ).subquery())).scalar()
        
        # Platform usage
        tutor_creations = Tutor.query.filter(Tutor.created_at >= thirty_days_ago).count()
        course_creations = Course.query.filter(Course.created_at >= thirty_days_ago).count()
        
        # Database status
        db_stats = {
            "user_table_size": User.query.count(),
            "tutor_table_size": Tutor.query.count(),
            "course_table_size": Course.query.count()
        }
        
        return jsonify({
            "user_trends": {
                "new_users_30d": new_user_count,
                "active_sessions": active_session_count
            },
            "platform_usage": {
                "new_tutors_30d": tutor_creations,
                "new_courses_30d": course_creations
            },
            "database_stats": db_stats
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Admin settings endpoints

@admin_bp.route('/settings', methods=['GET'])
@admin_required
def get_admin_settings():
    """Get admin settings (API)
    
    Function: Admin Settings
    """
    # In a real application, you would store these in the database
    # For simplicity, we're returning hardcoded values
    return jsonify({
        "registration_enabled": True,
        "maintenance_mode": False,
        "default_user_settings": {
            "default_role": "learner",
            "email_verification_required": True
        },
        "notification_settings": {
            "admin_email_notifications": True,
            "system_alerts_enabled": True
        }
    }), 200

@admin_bp.route('/settings', methods=['PUT'])
@admin_required
def update_admin_settings():
    """Update admin settings (API)
    
    Function: Admin Settings Update
    """
    try:
        data = request.get_json()
        
        # In a real application, you would validate and store these settings
        # For simplicity, we're just acknowledging the request
        
        return jsonify({
            "message": "Settings updated successfully",
            "settings": data
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Web UI endpoints

@admin_bp.route('/dashboard-page', methods=['GET'])
@admin_required
def admin_dashboard_page():
    """Render the admin dashboard page (Web UI)
    
    Function: Admin Dashboard Page
    """
    return render_template('admin/dashboard.html')

@admin_bp.route('/users-page', methods=['GET'])
@admin_required
def admin_users_page():
    """Render the user management page (Web UI)
    
    Function: User Management Page
    """
    return render_template('admin/users.html')

@admin_bp.route('/tutors-page', methods=['GET'])
@admin_required
def admin_tutors_page():
    """Render the tutor management page (Web UI)
    
    Function: Tutor Management Page
    """
    return render_template('admin/tutors.html')

@admin_bp.route('/courses-page', methods=['GET'])
@admin_required
def admin_courses_page():
    """Render the course management page (Web UI)
    
    Function: Course Management Page
    """
    return render_template('admin/courses.html')

@admin_bp.route('/system-page', methods=['GET'])
@admin_required
def admin_system_page():
    """Render the system monitoring page (Web UI)
    
    Function: System Monitoring Page
    """
    return render_template('admin/system.html')

@admin_bp.route('/settings-page', methods=['GET'])
@admin_required
def admin_settings_page():
    """Render the admin settings page (Web UI)
    
    Function: Admin Settings Page
    """
    return render_template('admin/settings.html')
