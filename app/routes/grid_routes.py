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

@grid_bp.route('/session/<session_id>/clear', methods=['POST'])
def clear_map(session_id):
    try:

        success = firebase.clear_grid_effects(session_id)
        
        if success:
            return jsonify({"status": "success", "message": "effect clear"}), 200
        else:
            return jsonify({"status": "error", "message": "Database update failed"}), 500

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
@grid_bp.route('/session/<session_id>/effect', methods=['POST'])
@login_required
def add_spell_effect(session_id):
    """Add a spell area effect to the grid."""
    GRID_ROWS = 8
    GRID_COLS = 10
    try:
        data = request.get_json()
        row    = data.get('row')
        col    = data.get('col')
        color  = data.get('color', '#9B59B6')   # purple default
        label  = data.get('label', 'Spell')

        if row is None or col is None:
            return jsonify({"status": "error", "message": "row and col required"}), 400

        success = firebase.add_grid_effect(
            session_id=session_id,
            user_id=label,          # reuse user_id as a label for now
            effect_type='radius',
            x=(GRID_COLS - 1 - col),                  # grid service uses x/y → col/row
            y=row,
            range=1,                # range=1 → 3×3 area
            color=color
        )

        if success:
            return jsonify({"status": "success", "message": f"Effect added at row={row}, col={col}"}), 200
        else:
            return jsonify({"status": "error", "message": "Firebase update failed"}), 500

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500