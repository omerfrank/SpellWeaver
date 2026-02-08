import os
from flask import Flask
import firebase_admin
from firebase_admin import credentials

# Import your config
from app.config import Config

# Import route blueprints
from app.routes import routes


def create_app():
    """
    Flask application factory.
    Initializes and configures the Flask app.
    """
    app = Flask(__name__)
    
    # Load configuration from config.py
    app.config.from_object(Config)

    # -------------------------------------------------
    # Initialize Firebase Admin SDK
    # -------------------------------------------------
    try:
        cred_path = app.config['FIREBASE_CREDENTIALS']
        db_url = app.config['FIREBASE_DATABASE_URL']
        
        # Check if the credentials file exists
        if not os.path.exists(cred_path):
            raise FileNotFoundError(f"Firebase credentials file not found at: {cred_path}")

        # This 'if' statement prevents re-initializing the app
        # which can happen during hot-reloads in debug mode
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'databaseURL': db_url
            })
        
        print("Firebase Admin SDK initialized successfully.")

    except Exception as e:
        app.logger.error(f"Error initializing Firebase Admin SDK: {e}")

    
    # -------------------------------------------------
    # Register Blueprints
    # -------------------------------------------------
    for route in routes:
        app.register_blueprint(route)
    
    app.logger.info("Blueprints registered successfully.")

    return app