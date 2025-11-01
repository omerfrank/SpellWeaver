from flask import Blueprint

# Import all route blueprints for players and dm
from app.routes.player_routes import player_bp
from app.routes.dm_routes import dm_bp
from app.routes.main_routes import main_bp
from app.routes.game_routes import game_bp

# Create a list of blueprints to register in the app
routes = [player_bp,dm_bp,main_bp,game_bp]