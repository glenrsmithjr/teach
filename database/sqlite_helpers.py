"""
Helper functions and decorators for SQLite compatibility.

This module provides functions to handle functionality that PostgreSQL
has built-in but SQLite does not, such as automatic timestamps and
constraint enforcement.
"""

from sqlalchemy import event
from sqlalchemy.sql import func
from datetime import datetime
import json

def update_timestamp(mapper, connection, target):
    """Update the updated_at timestamp on model update"""
    target.updated_at = datetime.utcnow()

def register_timestamp_listeners(models):
    """Register updated_at timestamp listeners for all models in the list"""
    for model in models:
        event.listen(model, 'before_update', update_timestamp)

def validate_json_string(json_str):
    """Validate that a string is valid JSON"""
    try:
        if json_str:
            json.loads(json_str)
        return True
    except (ValueError, TypeError):
        return False

def set_json_defaults(mapper, connection, target):
    """Set empty JSON fields to '{}' for SQLite compatibility"""
    for key, value in target.__dict__.items():
        if key.startswith('_'):
            continue
            
        column = getattr(type(target), key, None)
        if hasattr(column, 'type') and str(column.type).lower() == 'text':
            # For fields that should store JSON
            if key.endswith('_data') or key in ('preferences', 'settings', 'content', 'progress_data', 
                                               'learning_objectives', 'prerequisites', 'contextual_data'):
                if getattr(target, key) is None:
                    setattr(target, key, '{}')

def validate_boolean_fields(mapper, connection, target):
    """Ensure boolean fields are stored as 0/1 in SQLite"""
    for key, value in target.__dict__.items():
        if key.startswith('_'):
            continue
            
        column = getattr(type(target), key, None)
        if hasattr(column, 'type') and str(column.type).lower() == 'integer':
            # For fields that should store boolean values
            if key.startswith('is_') or key.endswith('_required') or key in ('is_active', 'is_published'):
                current_value = getattr(target, key)
                if current_value is not None:
                    # Convert to 0 or 1
                    setattr(target, key, 1 if current_value else 0)

def register_sqlite_listeners(models):
    """Register all SQLite compatibility listeners for the given models"""
    for model in models:
        event.listen(model, 'before_insert', set_json_defaults)
        event.listen(model, 'before_update', set_json_defaults)
        event.listen(model, 'before_insert', validate_boolean_fields)
        event.listen(model, 'before_update', validate_boolean_fields)
        
    # Also register timestamp listeners
    register_timestamp_listeners(models)

def calculate_session_duration(session):
    """Calculate session duration in minutes"""
    if session.start_time and session.end_time:
        delta = session.end_time - session.start_time
        return int(delta.total_seconds() / 60)
    return None

def update_learner_tutor_access(learner_tutor, session):
    """Update learner_tutor access timestamps based on session"""
    if session.start_time:
        # Update last_access
        learner_tutor.last_access = session.start_time
        
        # Update first_access if it's not set
        if not learner_tutor.first_access:
            learner_tutor.first_access = session.start_time
    
    return learner_tutor
