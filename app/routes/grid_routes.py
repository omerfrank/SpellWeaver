from flask import Blueprint, render_template, jsonify, request, session, g
from app.services.firebase_service import FirebaseService
from app.routes.auth_routes import login_required
# Create a blueprint instance
grid_bp = Blueprint('grid', __name__, template_folder='../templates',static_folder='../static',url_prefix='/api/grid')
firebase = FirebaseService()


@grid_bp.route('/test')
def test():
    return {"message": "test works!"}
# :5000/dm/api/session/-OeXHWkk5uXy2HJtJGsj/gridState:1
@grid_bp.route('/session/<session_id>/gridState')
def update_grid(session_id):
    upd = firebase.get_grid_effects(session_id)
    map = firebase.get_grid_map(session_id)
    return jsonify({"status": "success", "gameState": {
        "mapUrl": map,
        "effects": upd
    }}, 200)