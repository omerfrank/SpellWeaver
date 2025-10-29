from flask import Blueprint

# Import all route blueprints
from app.routes.user_routes import user_bp

# Create a list of blueprints to register in the app
blueprints = [user_bp]