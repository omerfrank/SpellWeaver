from flask import Blueprint, render_template, jsonify, request, session, g
from app.services.firebase_service import FirebaseService
from app.routes.auth_routes import login_required
# Create a blueprint instance
grid_bp = Blueprint('grid', __name__, template_folder='../templates',static_folder='../static',url_prefix='/api/grid')
firebase = FirebaseService()


@grid_bp.route('/session/<session_id>/testgrid', methods=['POST', 'GET'])
def test_grid_effect(session_id):
    """Test route to add a 2-cell radius circle at 0,0"""
    success = firebase.add_grid_effect(
        session_id=session_id,
        user_id='system_test',
        effect_type='radius',
        x=0,
        y=0,
        range=2,          # This sets the radius
        color='#FF0000'   # Red color for visibility
    )
    
    if success:
        return jsonify({"status": "success", "message": "Test circle added at 0,0"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to add effect"}), 500
    
@grid_bp.route('/session/<session_id>/gridState')
def update_grid(session_id):
    upd = firebase.get_grid_effects(session_id)
    map = firebase.get_grid_map(session_id)
    return jsonify({"status": "success", "gameState": {
        "mapUrl": map,
        "effects": upd
    }}), 200
@grid_bp.route('/session/<session_id>/map', methods=['POST'])
@login_required
def update_map(session_id):
    try:
        data = request.get_json()
        map_link = data.get('map_url')

        if not map_link:
            return jsonify({"status": "error", "message": "No map URL provided"}), 400

        success = firebase.update_grid_map(session_id, map_link)
        
        if success:
            return jsonify({"status": "success", "message": "Map updated"}), 200
        else:
            return jsonify({"status": "error", "message": "Database update failed"}), 500

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500