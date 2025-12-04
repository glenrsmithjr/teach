"""
Models for courses and enrollments.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from database.db import db
from database.sqlite_helpers import register_sqlite_listeners

class Course(db.Model):
    """Course model for organizing tutors and learners."""
    __tablename__ = 'courses'
    
    id = Column(Integer, primary_key=True)
    instructor_id = Column(Integer, ForeignKey('instructors.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    course_code = Column(String(50), unique=True, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    learners = relationship('CourseEnrollment', backref='course', cascade='all, delete-orphan')
    tutors = relationship('CourseTutor', backref='course', cascade='all, delete-orphan')
    
    def __init__(self, instructor_id, title, description=None, course_code=None, 
                 start_date=None, end_date=None, is_active=True):
        self.instructor_id = instructor_id
        self.title = title
        self.description = description
        self.course_code = course_code
        self.start_date = start_date
        self.end_date = end_date
        self.is_active = is_active
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def validate_dates(self):
        """Validate that end_date is not before start_date."""
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date")
    
    def enroll_learner(self, learner_id):
        """Enroll a learner in this course."""
        # Check if learner is already enrolled
        existing = CourseEnrollment.query.filter_by(
            course_id=self.id, 
            learner_id=learner_id
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.enrolled_date = datetime.utcnow()
                db.session.commit()
            return existing
        
        enrollment = CourseEnrollment(
            course_id=self.id,
            learner_id=learner_id
        )
        
        db.session.add(enrollment)
        self.updated_at = datetime.utcnow()
        db.session.commit()
        
        return enrollment
    
    def unenroll_learner(self, learner_id):
        """Unenroll a learner from this course."""
        enrollment = CourseEnrollment.query.filter_by(
            course_id=self.id, 
            learner_id=learner_id
        ).first()
        
        if enrollment:
            enrollment.is_active = False
            self.updated_at = datetime.utcnow()
            db.session.commit()
    
    def assign_tutor(self, tutor_id, due_date=None, is_required=True):
        """Assign a tutor to this course."""
        # Check if tutor is already assigned
        existing = CourseTutor.query.filter_by(
            course_id=self.id, 
            tutor_id=tutor_id
        ).first()
        
        if existing:
            existing.due_date = due_date
            existing.is_required = is_required
            db.session.commit()
            return existing
        
        assignment = CourseTutor(
            course_id=self.id,
            tutor_id=tutor_id,
            due_date=due_date,
            is_required=is_required
        )
        
        db.session.add(assignment)
        self.updated_at = datetime.utcnow()
        db.session.commit()
        
        return assignment
    
    def unassign_tutor(self, tutor_id):
        """Unassign a tutor from this course."""
        assignment = CourseTutor.query.filter_by(
            course_id=self.id, 
            tutor_id=tutor_id
        ).first()
        
        if assignment:
            db.session.delete(assignment)
            self.updated_at = datetime.utcnow()
            db.session.commit()
    
    @classmethod
    def get_active_courses(cls):
        """Get all active courses."""
        return cls.query.filter_by(is_active=True).all()
    
    @classmethod
    def get_courses_by_instructor(cls, instructor_id):
        """Get all courses created by a specific instructor."""
        return cls.query.filter_by(instructor_id=instructor_id).all()
    
    def __repr__(self):
        status = "active" if self.is_active else "inactive"
        return f"<Course {self.id}: {self.title} ({status})>"


class CourseEnrollment(db.Model):
    """Junction table for course-learner relationships."""
    __tablename__ = 'course_learners'  # Using the course_learners table name
    
    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    learner_id = Column(Integer, ForeignKey('learners.id', ondelete='CASCADE'), nullable=False)
    enrolled_date = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationship to learner - changed backref to 'enrolled_courses' to avoid conflict
    learner = relationship('Learner', backref='course_enrollments')

    def __init__(self, course_id, learner_id, is_active=True):
        self.course_id = course_id
        self.learner_id = learner_id
        self.enrolled_date = datetime.utcnow()
        self.is_active = is_active

    @classmethod
    def get_enrollments_by_learner(cls, learner_id):
        """Get all course enrollments for a specific learner."""
        return cls.query.filter_by(learner_id=learner_id).all()

    @classmethod
    def get_enrollments_by_course(cls, course_id):
        """Get all learner enrollments for a specific course."""
        return cls.query.filter_by(course_id=course_id).all()

    def __repr__(self):
        status = "active" if self.is_active else "inactive"
        return f"<CourseEnrollment {self.id}: Learner {self.learner_id} in Course {self.course_id} ({status})>"


class CourseTutor(db.Model):
    """Junction table for course-tutor relationships."""
    __tablename__ = 'course_tutors'

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    tutor_id = Column(Integer, ForeignKey('tutors.id', ondelete='CASCADE'), nullable=False)
    assigned_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(Date)
    is_required = Column(Boolean, default=True)

    # Relationship to tutor
    tutor = relationship('Tutor', backref='courses')

    def __init__(self, course_id, tutor_id, due_date=None, is_required=True):
        self.course_id = course_id
        self.tutor_id = tutor_id
        self.assigned_date = datetime.utcnow()
        self.due_date = due_date
        self.is_required = is_required

    @classmethod
    def get_assignments_by_tutor(cls, tutor_id):
        """Get all course assignments for a specific tutor."""
        return cls.query.filter_by(tutor_id=tutor_id).all()

    @classmethod
    def get_assignments_by_course(cls, course_id):
        """Get all tutor assignments for a specific course."""
        return cls.query.filter_by(course_id=course_id).all()

    def __repr__(self):
        required = "required" if self.is_required else "optional"
        return f"<CourseTutor {self.id}: Tutor {self.tutor_id} in Course {self.course_id} ({required})>"


# Register model listeners for SQLite compatibility
register_sqlite_listeners([Course, CourseEnrollment, CourseTutor])