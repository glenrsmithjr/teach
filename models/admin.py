"""
Models for admin users and actions.
"""

import json
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database.db import db
from .user import User
from database.sqlite_helpers import register_timestamp_listeners, update_timestamp

class Admin(db.Model):
    """Admin model extending the base User model."""
    __tablename__ = 'admins'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    admin_level = Column(String(20), default='standard')  # 'standard' or 'super'
    permissions = Column(Text, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref='admin', uselist=False)
    logs = relationship('AdminLog', backref='admin', cascade='all, delete-orphan')
    
    def __init__(self, user_id, admin_level='standard', permissions=None):
        self.user_id = user_id
        self.admin_level = admin_level
        self.permissions = json.dumps(permissions or {})
    
    @property
    def is_super_admin(self):
        """Check if this admin has super admin privileges."""
        return self.admin_level == 'super'
    
    @property
    def permissions_dict(self):
        """Get permissions as a Python dictionary."""
        try:
            return json.loads(self.permissions)
        except Exception:
            return {}
    
    @permissions_dict.setter
    def permissions_dict(self, permissions_dict):
        """Set permissions from a Python dictionary."""
        self.permissions = json.dumps(permissions_dict)
    
    def has_permission(self, permission):
        """Check if admin has a specific permission."""
        if self.is_super_admin:
            return True
        
        permissions = self.permissions_dict
        return permissions.get(permission, False)
    
    def log_action(self, action, target_type=None, target_id=None, details=None, ip_address=None, user_agent=None):
        """Log an admin action."""
        log = AdminLog(
            admin_id=self.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=json.dumps(details or {}),
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(log)
        return log
    
    @classmethod
    def get_admin_by_user_id(cls, user_id):
        """Get admin by user ID."""
        return cls.query.filter_by(user_id=user_id).first()
    
    @classmethod
    def get_all_admins(cls):
        """Get all admin users."""
        return cls.query.all()
    
    def __repr__(self):
        return f"<Admin {self.id}: {self.admin_level}>"


class AdminLog(db.Model):
    """Model for tracking admin actions."""
    __tablename__ = 'admin_logs'
    
    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey('admins.id', ondelete='CASCADE'), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    action = Column(String(100), nullable=False)
    target_type = Column(String(50))
    target_id = Column(Integer)
    details = Column(Text, default='{}')
    ip_address = Column(String(50))
    user_agent = Column(Text)
    
    def __init__(self, admin_id, action, target_type=None, target_id=None, details=None, ip_address=None, user_agent=None):
        self.admin_id = admin_id
        self.action = action
        self.target_type = target_type
        self.target_id = target_id
        self.details = details or '{}'
        self.ip_address = ip_address
        self.user_agent = user_agent
    
    @property
    def details_dict(self):
        """Get details as a Python dictionary."""
        try:
            return json.loads(self.details)
        except Exception:
            return {}
    
    @details_dict.setter
    def details_dict(self, details_dict):
        """Set details from a Python dictionary."""
        self.details = json.dumps(details_dict)
    
    @classmethod
    def get_logs_by_admin(cls, admin_id, limit=100):
        """Get logs for a specific admin."""
        return cls.query.filter_by(admin_id=admin_id).order_by(cls.timestamp.desc()).limit(limit).all()
    
    @classmethod
    def get_logs_by_action(cls, action, limit=100):
        """Get logs for a specific action."""
        return cls.query.filter_by(action=action).order_by(cls.timestamp.desc()).limit(limit).all()
    
    @classmethod
    def get_logs_by_target(cls, target_type, target_id, limit=100):
        """Get logs for a specific target."""
        return cls.query.filter_by(target_type=target_type, target_id=target_id).order_by(cls.timestamp.desc()).limit(limit).all()
    
    def __repr__(self):
        return f"<AdminLog {self.id}: {self.action}>"

# Register timestamp listeners for SQLite compatibility
register_timestamp_listeners([Admin, AdminLog])
