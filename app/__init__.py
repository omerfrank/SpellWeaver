import os
from flask import Flask
import firebase_admin
from firebase_admin import credentials

# Import your config
from app.config import Config

# Import your route blueprints
# (Based on your app/routes/__init__.py file)
from app.routes.main_routes import main_bp
from app.routes.player_routes import player_bp
from app.routes.dm_routes import dm_bp

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
        # Depending on your app, you might want to exit or handle this
        # For now, we'll just log the error
    
    # -------------------------------------------------
    # Register Blueprints
    # -------------------------------------------------
    app.register_blueprint(main_bp)
    app.register_blueprint(player_bp)
    app.register_blueprint(dm_bp)
    
    app.logger.info("Blueprints registered successfully.")

    return app