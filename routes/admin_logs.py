from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Admin, AdminLog
from routes.admin import admin_required

admin_logs_bp = Blueprint('admin_logs', __name__)

@admin_logs_bp.route('/', methods=['GET'])
@admin_required
def get_admin_logs():
    """Get admin activity logs (API)
    
    Function: Admin Logs
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        admin_id = request.args.get('admin_id', type=int)
        action = request.args.get('action')
        target_type = request.args.get('target_type')
        target_id = request.args.get('target_id', type=int)
        
        # Build query based on filters
        query = AdminLog.query
        
        if admin_id:
            query = query.filter_by(admin_id=admin_id)
        
        if action:
            query = query.filter_by(action=action)
        
        if target_type:
            query = query.filter_by(target_type=target_type)
        
        if target_id:
            query = query.filter_by(target_id=target_id)
        
        # Order and paginate
        pagination = query.order_by(AdminLog.timestamp.desc()).paginate(page=page, per_page=per_page)
        
        logs_data = []
        for log in pagination.items:
            admin_name = f"{log.admin.user.full_name}" if log.admin and log.admin.user else "Unknown"
            
            logs_data.append({
                "id": log.id,
                "admin_id": log.admin_id,
                "admin_name": admin_name,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": log.details,
                "ip_address": log.ip_address
            })
        
        return jsonify({
            "logs": logs_data,
            "pagination": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_logs_bp.route('/actions', methods=['GET'])
@admin_required
def get_admin_actions():
    """Get distinct admin actions for filtering (API)
    
    Function: Admin Actions
    """
    try:
        # Get distinct action values
        actions = db.session.query(AdminLog.action).distinct().all()
        return jsonify({
            "actions": [action[0] for action in actions]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_logs_bp.route('/admins', methods=['GET'])
@admin_required
def get_admin_users():
    """Get all admin users for filtering (API)
    
    Function: Admin Users
    """
    try:
        admins = Admin.query.all()
        admin_data = []
        
        for admin in admins:
            if admin.user:
                admin_data.append({
                    "id": admin.id,
                    "name": admin.user.full_name,
                    "email": admin.user.email,
                    "level": admin.admin_level
                })
        
        return jsonify({
            "admins": admin_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_logs_bp.route('/stats', methods=['GET'])
@admin_required
def get_admin_log_stats():
    """Get admin log statistics (API)
    
    Function: Admin Log Stats
    """
    try:
        from sqlalchemy import func, desc
        from datetime import datetime, timedelta
        
        # Total logs
        total_logs = AdminLog.query.count()
        
        # Logs in the last 24 hours
        day_ago = datetime.now() - timedelta(days=1)
        recent_logs = AdminLog.query.filter(AdminLog.timestamp >= day_ago).count()
        
        # Most common actions
        common_actions = db.session.query(
            AdminLog.action, 
            func.count(AdminLog.id).label('count')
        ).group_by(AdminLog.action).order_by(desc('count')).limit(5).all()
        
        common_actions_data = [
            {"action": action, "count": count}
            for action, count in common_actions
        ]
        
        # Most active admins
        active_admins = db.session.query(
            AdminLog.admin_id,
            func.count(AdminLog.id).label('count')
        ).group_by(AdminLog.admin_id).order_by(desc('count')).limit(5).all()
        
        active_admins_data = []
        for admin_id, count in active_admins:
            admin = Admin.query.get(admin_id)
            if admin and admin.user:
                active_admins_data.append({
                    "admin_id": admin_id,
                    "name": admin.user.full_name,
                    "count": count
                })
        
        return jsonify({
            "total_logs": total_logs,
            "logs_last_24h": recent_logs,
            "common_actions": common_actions_data,
            "active_admins": active_admins_data
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Web UI endpoints

@admin_logs_bp.route('/logs-page', methods=['GET'])
@admin_required
def admin_logs_page():
    """Render the admin logs page (Web UI)
    
    Function: Admin Logs Page
    """
    return render_template('admin/logs.html')
