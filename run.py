# run.py
#!/usr/bin/env python
"""
Entry point script for running the Tutor Authoring Platform.
This script handles command-line arguments and starts the Flask application.
"""

import os
import sys
import argparse
from app import create_app
from database.db import get_db_info, force_init_db


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Run the Tutor Authoring Platform')
    parser.add_argument('--env', '-e', choices=['development', 'testing', 'production'],
                        default='development', help='Environment to run in')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', '-p', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--init-db', action='store_true', help='Force re-initialization of the database, dropping existing data.')
    parser.add_argument('--db-info', action='store_true', help='Print database information')

    return parser.parse_args()


def main():
    """Main entry point function"""
    args = parse_args()
    os.environ['FLASK_CONFIG'] = args.env
    app = create_app()

    # Handle database CLI commands
    if args.init_db:
        print("Forcing database re-initialization...")
        with app.app_context():
            if force_init_db(app):
                print("Database re-initialized successfully.")
            else:
                print("Failed to re-initialize database.")
                return 1
        return 0

    if args.db_info:
        print("Retrieving database information...")
        with app.app_context():
            db_info = get_db_info(app)
            if 'error' in db_info:
                print(f"Error: {db_info['error']}")
                return 1
            print("Database Information:")
            for key, value in db_info.items():
                print(f"  {key}: {value}")
        return 0

    # Start the application server
    print(f"Starting server in {args.env} mode on {args.host}:{args.port}")
    # Use SocketIO's run method if you are using it, otherwise app.run
    # For this setup, assuming socketio is integrated in create_app, we let app.run handle it
    # or you would import socketio and call socketio.run(app, ...)
    app.run(host=args.host, port=args.port, debug=(args.env == 'development'))

    return 0


if __name__ == '__main__':
    sys.exit(main())