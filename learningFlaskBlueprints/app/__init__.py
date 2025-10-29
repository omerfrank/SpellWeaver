from flask import Flask
from app.routes import blueprints  # Import the list of blueprints

def create_app():
    app = Flask(__name__)

    # Register all blueprints
    for blueprint in blueprints:
        app.register_blueprint(blueprint,url_prefix='/api')

    return app