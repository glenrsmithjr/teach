"""
Models package initialization.

This package contains all SQLAlchemy models for the application.
"""

from .user import User, Instructor, Learner
from .tutor import Tutor, TutorModule
from .course import Course, CourseEnrollment, CourseTutor
from .analytics import LearnerTutor, LearnerSession, SessionActivity, PerformanceMetric
from .admin import Admin, AdminLog
from .agents import Agent

__all__ = [
    'User',
    'Instructor',
    'Learner',
    'Tutor',
    'TutorModule',
    'Course',
    'CourseEnrollment',
    'CourseTutor',
    'LearnerTutor',
    'LearnerSession',
    'SessionActivity',
    'PerformanceMetric',
    'Admin',
    'AdminLog',
    'Agent'
]

# Register all models in their respective files rather than here
# to avoid circular import issues
