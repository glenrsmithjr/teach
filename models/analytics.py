"""
Models for analytics and tracking learner progress.
"""

import json
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime

from database.db import db
from database.sqlite_helpers import register_sqlite_listeners, calculate_session_duration, update_learner_tutor_access

class LearnerTutor(db.Model):
    """Association between a learner and a tutor, tracking progress."""
    __tablename__ = 'learner_tutors'
    
    id = Column(Integer, primary_key=True)
    learner_id = Column(Integer, ForeignKey('learners.id', ondelete='CASCADE'), nullable=False)
    tutor_id = Column(Integer, ForeignKey('tutors.id', ondelete='CASCADE'), nullable=False)
    first_access = Column(DateTime)
    last_access = Column(DateTime)
    completion_percentage = Column(Float, default=0)
    progress_data = Column(Text, default='{}')
    
    # Relationships
    learner = relationship('Learner', backref='tutors')
    tutor = relationship('Tutor', backref='learners')
    sessions = relationship('LearnerSession', backref='learner_tutor', cascade='all, delete-orphan')
    
    def __init__(self, learner_id, tutor_id):
        self.learner_id = learner_id
        self.tutor_id = tutor_id
        self.completion_percentage = 0
        self.progress_data = '{}'
    
    @property
    def progress_data_dict(self):
        """Get progress data as a Python dictionary."""
        try:
            return json.loads(self.progress_data)
        except Exception:
            return {}
    
    @progress_data_dict.setter
    def progress_data_dict(self, progress_data_dict):
        """Set progress data from a Python dictionary."""
        self.progress_data = json.dumps(progress_data_dict)
    
    def update_progress(self, module_id, progress_value):
        """Update progress for a specific module."""
        progress = self.progress_data_dict
        module_key = str(module_id)
        
        if 'modules' not in progress:
            progress['modules'] = {}
        
        progress['modules'][module_key] = progress_value
        self.progress_data_dict = progress
        
        # Update completion percentage based on module progress
        self.update_completion_percentage()
        
        db.session.commit()
    
    def update_completion_percentage(self):
        """Calculate and update the overall completion percentage."""
        progress = self.progress_data_dict
        if 'modules' not in progress or not progress['modules']:
            self.completion_percentage = 0
            return
        
        module_progress = progress['modules'].values()
        self.completion_percentage = sum(module_progress) / len(module_progress)
        
        # SQLite doesn't enforce CHECK constraints, so we need to enforce the range in python_code
        if self.completion_percentage < 0:
            self.completion_percentage = 0
        elif self.completion_percentage > 100:
            self.completion_percentage = 100
    
    def start_session(self):
        """Start a new learning session."""
        session = LearnerSession(learner_tutor_id=self.id)
        db.session.add(session)
        
        # We need to manually update the access timestamps since SQLite doesn't support triggers
        self = update_learner_tutor_access(self, session)
        
        db.session.commit()
        return session
    
    @classmethod
    def get_by_learner_and_tutor(cls, learner_id, tutor_id):
        """Get a LearnerTutor record by learner and tutor IDs."""
        return cls.query.filter_by(
            learner_id=learner_id, 
            tutor_id=tutor_id
        ).first()
    
    def __repr__(self):
        return f"<LearnerTutor {self.id}: Learner {self.learner_id}, Tutor {self.tutor_id}, {self.completion_percentage:.1f}%>"


class LearnerSession(db.Model):
    """A learning session tracking a learner's interaction with a tutor."""
    __tablename__ = 'learner_sessions'
    
    id = Column(Integer, primary_key=True)
    learner_tutor_id = Column(Integer, ForeignKey('learner_tutors.id', ondelete='CASCADE'), nullable=False)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime)
    duration_minutes = Column(Integer)
    session_data = Column(Text, default='{}')
    module_progress = Column(Text, default='{}')
    
    # Relationships
    activities = relationship('SessionActivity', backref='session', cascade='all, delete-orphan')
    
    def __init__(self, learner_tutor_id):
        self.learner_tutor_id = learner_tutor_id
        self.start_time = datetime.utcnow()
        self.session_data = '{}'
        self.module_progress = '{}'
    
    def end_session(self):
        """End the session and calculate duration."""
        self.end_time = datetime.utcnow()
        
        # We need to manually calculate the duration since SQLite doesn't support triggers
        self.duration_minutes = calculate_session_duration(self)
        
        db.session.commit()
        return self
    
    @property
    def session_data_dict(self):
        """Get session data as a Python dictionary."""
        try:
            return json.loads(self.session_data)
        except Exception:
            return {}
    
    @session_data_dict.setter
    def session_data_dict(self, session_data_dict):
        """Set session data from a Python dictionary."""
        self.session_data = json.dumps(session_data_dict)
    
    @property
    def module_progress_dict(self):
        """Get module progress as a Python dictionary."""
        try:
            return json.loads(self.module_progress)
        except Exception:
            return {}
    
    @module_progress_dict.setter
    def module_progress_dict(self, module_progress_dict):
        """Set module progress from a Python dictionary."""
        self.module_progress = json.dumps(module_progress_dict)
    
    def record_activity(self, activity_type, activity_data=None, score=None, feedback=None):
        """Record an activity within this session."""
        activity = SessionActivity(
            session_id=self.id,
            activity_type=activity_type,
            activity_data=activity_data,
            score=score,
            feedback=feedback
        )
        
        db.session.add(activity)
        db.session.commit()
        return activity
    
    def update_module_progress(self, module_id, progress_value):
        """Update progress for a specific module in this session."""
        progress = self.module_progress_dict
        module_key = str(module_id)
        progress[module_key] = progress_value
        self.module_progress_dict = progress
        
        # Also update the overall learner-tutor progress
        learner_tutor = self.learner_tutor
        learner_tutor.update_progress(module_id, progress_value)
        
        db.session.commit()
    
    @classmethod
    def get_by_learner(cls, learner_id):
        """Get all sessions for a specific learner."""
        return cls.query.join(LearnerTutor).filter(LearnerTutor.learner_id == learner_id).all()
    
    def __repr__(self):
        duration = f", {self.duration_minutes} min" if self.duration_minutes else ""
        return f"<LearnerSession {self.id}: {self.start_time.strftime('%Y-%m-%d %H:%M')}{duration}>"


class SessionActivity(db.Model):
    """An individual activity within a learning session."""
    __tablename__ = 'session_activities'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('learner_sessions.id', ondelete='CASCADE'), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    activity_type = Column(String(50), nullable=False)
    activity_data = Column(Text, default='{}')
    score = Column(Float)
    feedback = Column(Text)
    
    def __init__(self, session_id, activity_type, activity_data=None, score=None, feedback=None):
        self.session_id = session_id
        self.activity_type = activity_type
        self.activity_data = json.dumps(activity_data or {})
        self.score = score
        self.feedback = feedback
        self.timestamp = datetime.utcnow()
    
    @property
    def activity_data_dict(self):
        """Get activity data as a Python dictionary."""
        try:
            return json.loads(self.activity_data)
        except Exception:
            return {}
    
    @activity_data_dict.setter
    def activity_data_dict(self, activity_data_dict):
        """Set activity data from a Python dictionary."""
        self.activity_data = json.dumps(activity_data_dict)
    
    def __repr__(self):
        return f"<SessionActivity {self.id}: {self.activity_type}, {self.timestamp.strftime('%Y-%m-%d %H:%M')}>"


class PerformanceMetric(db.Model):
    """A performance metric for tracking learner performance."""
    __tablename__ = 'performance_metrics'
    
    id = Column(Integer, primary_key=True)
    learner_id = Column(Integer, ForeignKey('learners.id', ondelete='CASCADE'), nullable=False)
    tutor_id = Column(Integer, ForeignKey('tutors.id', ondelete='CASCADE'), nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    contextual_data = Column(Text, default='{}')
    
    # Relationships
    learner = relationship('Learner', backref='performance_metrics')
    tutor = relationship('Tutor', backref='performance_metrics')
    
    def __init__(self, learner_id, tutor_id, metric_name, metric_value, contextual_data=None):
        self.learner_id = learner_id
        self.tutor_id = tutor_id
        self.metric_name = metric_name
        self.metric_value = metric_value
        self.contextual_data = json.dumps(contextual_data or {})
        self.recorded_at = datetime.utcnow()
    
    @property
    def contextual_data_dict(self):
        """Get contextual data as a Python dictionary."""
        try:
            return json.loads(self.contextual_data)
        except Exception:
            return {}
    
    @contextual_data_dict.setter
    def contextual_data_dict(self, contextual_data_dict):
        """Set contextual data from a Python dictionary."""
        self.contextual_data = json.dumps(contextual_data_dict)
    
    @classmethod
    def get_by_learner_and_metric(cls, learner_id, metric_name):
        """Get all metrics of a specific type for a learner."""
        return cls.query.filter_by(
            learner_id=learner_id, 
            metric_name=metric_name
        ).order_by(cls.recorded_at.desc()).all()
    
    @classmethod
    def get_by_tutor_and_metric(cls, tutor_id, metric_name):
        """Get all metrics of a specific type for a tutor."""
        return cls.query.filter_by(
            tutor_id=tutor_id, 
            metric_name=metric_name
        ).order_by(cls.recorded_at.desc()).all()
    
    def __repr__(self):
        return f"<PerformanceMetric {self.id}: {self.metric_name} = {self.metric_value}, Learner {self.learner_id}>"


# Register model listeners for SQLite compatibility
register_sqlite_listeners([LearnerTutor, LearnerSession, SessionActivity, PerformanceMetric])
