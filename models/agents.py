# database/models/agent.py
import json
from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database.db import db
from database.sqlite_helpers import register_sqlite_listeners


class Agent(db.Model):
    """
    Agent model representing a TutorBuilderAgent instance tied to a Tutor.
    Stores operator bank, session data, and expert model as JSON.
    """
    __tablename__ = 'agents'

    id = Column(Integer, primary_key=True)
    tutor_id = Column(Integer, ForeignKey('tutors.id', ondelete='CASCADE'), nullable=False)
    operator_bank = Column(Text, default='{}')
    sessions = Column(Text, default='{}')
    expert_model = Column(Text, default='{}')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tutor = relationship('Tutor', backref='agent', uselist=False)

    def __init__(self, tutor_id, operator_bank=None, sessions=None, expert_model=None):
        self.tutor_id = tutor_id
        self.operator_bank = json.dumps(operator_bank or {})
        self.sessions = json.dumps(sessions or {})
        self.expert_model = json.dumps(expert_model or {})
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    @property
    def operator_bank_dict(self):
        """Return operator_bank as a Python dict."""
        try:
            return json.loads(self.operator_bank)
        except Exception:
            return {}

    @operator_bank_dict.setter
    def operator_bank_dict(self, value):
        self.operator_bank = json.dumps(value or {})

    @property
    def sessions_dict(self):
        """Return sessions as a Python dict."""
        try:
            return json.loads(self.sessions)
        except Exception:
            return {}

    @sessions_dict.setter
    def sessions_dict(self, value):
        self.sessions = json.dumps(value or {})

    @property
    def expert_model_dict(self):
        """Return expert_model as a Python dict."""
        try:
            return json.loads(self.expert_model)
        except Exception:
            return {}

    @expert_model_dict.setter
    def expert_model_dict(self, value):
        self.expert_model = json.dumps(value or {})

    def save(self):
        """Update timestamp and persist to the database."""
        self.updated_at = datetime.utcnow()
        db.session.add(self)
        db.session.commit()

    def __repr__(self):
        return f"<Agent {self.id} for Tutor {self.tutor_id}>"

# SQLite foreign-key pragma support
register_sqlite_listeners([Agent])
