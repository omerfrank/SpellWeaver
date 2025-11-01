from flask import Flask
from app.routes import DM_blueprints # Import the list of blueprints
from app.routes import player_blueprints  # Import the list of blueprints
from app.routes import main_bluprints  # Import the list of blueprints

def create_app():
    app = Flask(__name__)

    # Register all blueprints for dm
    for blueprint in DM_blueprints:
        app.register_blueprint(blueprint,url_prefix='/dm')
    # Register all blueprints for player
    for blueprint in player_blueprints:
        app.register_blueprint(blueprint,url_prefix='/player')
    for blueprint in main_bluprints:
        app.register_blueprint(blueprint)

    return app