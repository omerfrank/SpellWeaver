# Import all route blueprints for players and dm
from app.routes.player_routes import player_bp
from app.routes.dm_routes import dm_bp
from app.routes.main_routes import main_bp
from app.routes.game_routes import game_bp
from app.routes.auth_routes import auth_bp
from app.routes.sesstion_route import session_bp
from app.routes.grid_routes import grid_bp
from app.routes.espcam_routes import espcam_bp
from app.routes.webcam_routes import webcam_bp
from app.routes.soundboard_routes import soundboard_bp
# Create a list of blueprints to register in the app
routes = [player_bp,dm_bp,main_bp,game_bp,auth_bp,session_bp,grid_bp,espcam_bp,webcam_bp,soundboard_bp]



