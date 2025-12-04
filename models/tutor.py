"""
Models for tutors and their modules.
"""

import json
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from database.db import db
from database.sqlite_helpers import register_sqlite_listeners

class Tutor(db.Model):
    """Tutor model representing an interactive tutoring experience."""
    __tablename__ = 'tutors'
    
    id = Column(Integer, primary_key=True)
    instructor_id = Column(Integer, ForeignKey('instructors.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    subject_area = Column(String(100))
    content = Column(Text, default='{}')
    settings = Column(Text, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_published = Column(Boolean, default=False)
    version = Column(String(20), default='1.0')
    
    # Relationships
    modules = relationship('TutorModule', backref='tutor', cascade='all, delete-orphan', order_by='TutorModule.sequence_order')
    
    def __init__(self, instructor_id, title, description=None, subject_area=None, grade_level=None, 
                 difficulty_level=None, content=None, settings=None, is_published=False, version='1.0'):
        self.instructor_id = instructor_id
        self.title = title
        self.description = description
        self.subject_area = subject_area
        self.content = json.dumps(content or {})
        self.settings = json.dumps(settings or {})
        self.is_published = is_published
        self.version = version
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    @property
    def content_dict(self):
        """Get content as a Python dictionary."""
        try:
            return json.loads(self.content)
        except Exception:
            return {}
    
    @content_dict.setter
    def content_dict(self, content_dict):
        """Set content from a Python dictionary."""
        self.content = json.dumps(content_dict)
    
    @property
    def settings_dict(self):
        """Get settings as a Python dictionary."""
        try:
            return json.loads(self.settings)
        except Exception:
            return {}
    
    @settings_dict.setter
    def settings_dict(self, settings_dict):
        """Set settings from a Python dictionary."""
        self.settings = json.dumps(settings_dict)
    
    def publish(self):
        """Publish the tutor."""
        self.is_published = True
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def unpublish(self):
        """Unpublish the tutor."""
        self.is_published = False
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def add_module(self, title, sequence_order=None, content=None, module_type='lesson', 
                   prerequisites=None, learning_objectives=None):
        """Add a new module to this tutor."""
        
        # If sequence_order is not provided, place at the end
        if sequence_order is None:
            if self.modules:
                max_order = max(m.sequence_order for m in self.modules)
                sequence_order = max_order + 1
            else:
                sequence_order = 1
        
        module = TutorModule(
            tutor_id=self.id,
            title=title,
            sequence_order=sequence_order,
            content=content,
            module_type=module_type,
            prerequisites=prerequisites,
            learning_objectives=learning_objectives
        )
        
        db.session.add(module)
        self.updated_at = datetime.utcnow()
        db.session.commit()
        
        return module
    
    def reorder_modules(self, module_order):
        """Reorder modules based on a list of module IDs."""
        if not module_order or not all(isinstance(id_, int) for id_ in module_order):
            raise ValueError("module_order must be a list of module IDs (integers)")
        
        # Ensure all modules exist
        modules = {m.id: m for m in self.modules}
        if not all(id_ in modules for id_ in module_order):
            raise ValueError("module_order contains invalid module IDs")
        
        # Update sequence order
        for i, module_id in enumerate(module_order, 1):
            modules[module_id].sequence_order = i
        
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    @classmethod
    def get_published_tutors(cls):
        """Get all published tutors."""
        return cls.query.filter_by(is_published=True).all()
    
    @classmethod
    def get_tutors_by_instructor(cls, instructor_id):
        """Get all tutors created by a specific instructor."""
        return cls.query.filter_by(instructor_id=instructor_id).all()
    
    def __repr__(self):
        status = "published" if self.is_published else "draft"
        return f"<Tutor {self.id}: {self.title} ({status})>"


class TutorModule(db.Model):
    """Module within a tutor, representing a learning unit."""
    __tablename__ = 'tutor_modules'
    
    id = Column(Integer, primary_key=True)
    tutor_id = Column(Integer, ForeignKey('tutors.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    sequence_order = Column(Integer, nullable=False)
    content = Column(Text, default='{}')
    module_type = Column(String(50))  # 'lesson', 'quiz', 'practice', 'assessment', 'other'
    prerequisites = Column(Text, default='{}')
    learning_objectives = Column(Text, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    def __init__(self, tutor_id, title, sequence_order, content=None, module_type='lesson', 
                 prerequisites=None, learning_objectives=None):
        self.tutor_id = tutor_id
        self.title = title
        self.sequence_order = sequence_order
        self.content = json.dumps(content or {})
        self.module_type = module_type
        self.prerequisites = json.dumps(prerequisites or {})
        self.learning_objectives = json.dumps(learning_objectives or {})
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    @property
    def content_dict(self):
        """Get content as a Python dictionary."""
        try:
            return json.loads(self.content)
        except Exception:
            return {}
    
    @content_dict.setter
    def content_dict(self, content_dict):
        """Set content from a Python dictionary."""
        self.content = json.dumps(content_dict)
    
    @property
    def prerequisites_dict(self):
        """Get prerequisites as a Python dictionary."""
        try:
            return json.loads(self.prerequisites)
        except Exception:
            return {}
    
    @prerequisites_dict.setter
    def prerequisites_dict(self, prerequisites_dict):
        """Set prerequisites from a Python dictionary."""
        self.prerequisites = json.dumps(prerequisites_dict)
    
    @property
    def learning_objectives_dict(self):
        """Get learning objectives as a Python dictionary."""
        try:
            return json.loads(self.learning_objectives)
        except Exception:
            return {}
    
    @learning_objectives_dict.setter
    def learning_objectives_dict(self, learning_objectives_dict):
        """Set learning objectives from a Python dictionary."""
        self.learning_objectives = json.dumps(learning_objectives_dict)
    
    def get_next_module(self):
        """Get the next module in sequence."""
        return TutorModule.query.filter_by(
            tutor_id=self.tutor_id, 
            sequence_order=self.sequence_order + 1
        ).first()
    
    def get_previous_module(self):
        """Get the previous module in sequence."""
        return TutorModule.query.filter_by(
            tutor_id=self.tutor_id, 
            sequence_order=self.sequence_order - 1
        ).first()
    
    def __repr__(self):
        return f"<TutorModule {self.id}: {self.title} ({self.module_type})>"


# Register model listeners for SQLite compatibility
register_sqlite_listeners([Tutor, TutorModule])
