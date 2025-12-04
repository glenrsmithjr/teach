"""
User models including basic User, Instructor, and Learner.
"""

import json
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

from database.db import db
from database.sqlite_helpers import register_sqlite_listeners

class User(db.Model, UserMixin):
    """Base user model for authentication and basic user info."""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    def __init__(self, email, password_hash, first_name, last_name, role, created_at=None, is_active=True):
        self.email = email.lower()
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.role = role
        self.created_at = created_at or datetime.utcnow()
        self.is_active = is_active
    
    @property
    def full_name(self):
        """Get the user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def password(self):
        """Prevent password from being accessed."""
        raise AttributeError('password is not a readable attribute')
    
    @password.setter
    def password(self, password):
        """Set password hash."""
        self.password_hash = generate_password_hash(password)
    
    def verify_password(self, password):
        """Check if password matches."""
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self):
        """Update last login timestamp."""
        self.last_login = datetime.utcnow()
        db.session.commit()
    
    @property
    def is_instructor(self):
        """Check if user is an instructor."""
        return self.role == 'instructor'
    
    @property
    def is_learner(self):
        """Check if user is a learner."""
        return self.role == 'learner'
    
    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.role == 'admin'
    
    @classmethod
    def get_user_by_email(cls, email):
        """Get user by email."""
        return cls.query.filter_by(email=email.lower()).first()
    
    @classmethod
    def get_user_by_id(cls, user_id):
        """Get user by ID."""
        return cls.query.get(user_id)
    
    def __repr__(self):
        return f"<User {self.id}: {self.email}, {self.role}>"


class Instructor(db.Model):
    """Instructor model extending the base User model."""
    __tablename__ = 'instructors'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    institution = Column(String(255))
    department = Column(String(255))
    bio = Column(Text)
    preferences = Column(Text, default='{}')
    
    # Relationships
    user = relationship('User', backref='instructor', uselist=False)
    tutors = relationship('Tutor', backref='instructor', cascade='all, delete-orphan')
    courses = relationship('Course', backref='instructor', cascade='all, delete-orphan')
    
    def __init__(self, user_id, institution=None, department=None, bio=None, preferences=None):
        self.user_id = user_id
        self.institution = institution
        self.department = department
        self.bio = bio
        self.preferences = json.dumps(preferences or {})
    
    @property
    def preferences_dict(self):
        """Get preferences as a Python dictionary."""
        try:
            return json.loads(self.preferences)
        except Exception:
            return {}
    
    @preferences_dict.setter
    def preferences_dict(self, preferences_dict):
        """Set preferences from a Python dictionary."""
        self.preferences = json.dumps(preferences_dict)
    
    @classmethod
    def get_instructor_by_user_id(cls, user_id):
        """Get instructor by user ID."""
        return cls.query.filter_by(user_id=user_id).first()
    
    @classmethod
    def get_all_instructors(cls):
        """Get all instructors."""
        return cls.query.all()
    
    def __repr__(self):
        return f"<Instructor {self.id}: {self.user_id}>"


class Learner(db.Model):
    """Learner model extending the base User model."""
    __tablename__ = 'learners'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    grade_level = Column(String(50))
    learning_preferences = Column(Text, default='{}')
    last_active = Column(DateTime)
    
    # Relationships
    user = relationship('User', backref='learner', uselist=False)
    # Remove the conflicting course_enrollments backref which is now defined in CourseEnrollment

    def __init__(self, user_id, grade_level=None, learning_preferences=None):
        self.user_id = user_id
        self.grade_level = grade_level
        self.learning_preferences = json.dumps(learning_preferences or {})

    @property
    def learning_preferences_dict(self):
        """Get learning preferences as a Python dictionary."""
        try:
            return json.loads(self.learning_preferences)
        except Exception:
            return {}

    @learning_preferences_dict.setter
    def learning_preferences_dict(self, learning_preferences_dict):
        """Set learning preferences from a Python dictionary."""
        self.learning_preferences = json.dumps(learning_preferences_dict)

    def update_last_active(self):
        """Update last active timestamp."""
        self.last_active = datetime.utcnow()
        db.session.commit()

    @classmethod
    def get_learner_by_user_id(cls, user_id):
        """Get learner by user ID."""
        return cls.query.filter_by(user_id=user_id).first()

    @classmethod
    def get_all_learners(cls):
        """Get all learners."""
        return cls.query.all()

    def __repr__(self):
        return f"<Learner {self.id}: {self.user_id}>"


# Register model listeners for SQLite compatibility
register_sqlite_listeners([User, Instructor, Learner])
