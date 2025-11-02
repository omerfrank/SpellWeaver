import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Firebase configuration
    FIREBASE_CREDENTIALS = os.getenv('FIREBASE_CREDENTIALS_PATH')
    FIREBASE_DATABASE_URL = os.getenv('FIREBASE_DATABASE_URL')
    
    # ESP32-CAM configuration
    CAMERA_UPLOAD_FOLDER = 'app/static/uploads/camera'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    
    # Image processing
    PROCESS_INTERVAL = int(os.getenv('PROCESS_INTERVAL', 3))
    
    # Game settings
    GRID_SIZE = (8, 10)
    CELL_SIZE = 50

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False