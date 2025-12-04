"""
Database package initialization.

This package contains database configuration, setup utilities, and schema files.
"""

from .db import db, init_db_if_needed, force_init_db, get_db_info

__all__ = [
    'db',
    'init_db_if_needed',
    'force_init_db',
    'get_db_info'
]