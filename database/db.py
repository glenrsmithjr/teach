from flask_sqlalchemy import SQLAlchemy
import os
import glob
import logging
import time

# Initialize SQLAlchemy instance
db = SQLAlchemy()

def init_db_if_needed(app):
    """
    Checks if the database exists. If not, it calls force_init_db to create it.
    This is intended to be called on application startup.
    """
    with app.app_context():
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if not db_uri.startswith('sqlite:///'):
            app.logger.info("Database check skipped: Not an SQLite database.")
            return

        db_path = db_uri.replace('sqlite:///', '')

        # Check if the database file already exists
        if not os.path.exists(db_path):
            app.logger.info("Database not found. Initializing...")
            force_init_db(app)
        else:
            app.logger.info("Database already exists. Skipping initialization.")


def force_init_db(app):
    """
    Initializes the database schema.
    This function creates the database directory and executes all .sql files
    found in the 'schema' directory.
    """
    max_retries = 5
    retry_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            with app.app_context():
                db_uri = app.config['SQLALCHEMY_DATABASE_URI']
                print(db_uri)
                if not db_uri.startswith('sqlite:///'):
                    app.logger.error(f"Unsupported database URI: {db_uri}. This function only supports SQLite.")
                    return False

                db_path = db_uri.replace('sqlite:///', '', 1)
                if not os.path.isabs(db_path):
                    db_path = os.path.join(app.instance_path, db_path)

                db_dir = os.path.dirname(os.path.abspath(db_path))
                os.makedirs(db_dir, exist_ok=True)
                app.logger.info(f"Using SQLite path: {db_path}")

                try:
                    if not os.path.exists(db_path):
                        with open(db_path, 'a', encoding='utf-8'):
                            pass
                except Exception as ioe:
                    app.logger.error(f"Cannot create SQLite file at {db_path}: {ioe}")
                    return False

                schema_dir = os.path.join(os.path.dirname(__file__), 'schema')
                sql_files = sorted(glob.glob(os.path.join(schema_dir, '*.sql')))

                if not sql_files:
                    app.logger.warning(f"No SQL files found in {schema_dir}. Database will be empty.")
                    return True

                # Use the SQLAlchemy engine to execute schema statements
                with db.engine.connect() as conn:
                    # Begin a transaction
                    with conn.begin():
                        for sql_file in sql_files:
                            app.logger.info(f"Executing SQL file: {sql_file}")
                            with open(sql_file, 'r') as f:
                                sql_content = f.read()
                                # Execute each statement separately
                                for statement in sql_content.split(';'):
                                    if statement.strip():
                                        conn.execute(db.text(statement))

                app.logger.info("Database schema initialized successfully")
                return True

        except Exception as e:
            app.logger.error(f"Failed to initialize schema on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                app.logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                app.logger.error("Maximum retry attempts reached. Schema initialization failed.")
                return False

    return False


def get_db_info(app):
    """Get database information for logging"""
    with app.app_context():
        try:
            db_info = {}
            with db.engine.connect() as conn:
                result = conn.execute(db.text("SELECT sqlite_version()"))
                db_info['version'] = result.scalar()

                # Use the standard SQLAlchemy config key
                db_info['database'] = app.config['SQLALCHEMY_DATABASE_URI']

                result = conn.execute(db.text("SELECT count(*) FROM sqlite_master WHERE type='table'"))
                db_info['tables'] = result.scalar()

            return db_info
        except Exception as e:
            app.logger.error(f"Error getting database info: {str(e)}")
            return {"error": str(e)}
