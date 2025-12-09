"""
Sound Board Routes - Flask Blueprint for ESP32-CAM Sound Effects
Handles sound effect triggers by updating Firebase
"""

from flask import Blueprint, jsonify, request
from firebase_admin import db
from app.routes.auth_routes import login_required


# Create blueprint
soundboard_bp = Blueprint('soundboard', __name__, url_prefix='/api/soundboard')


@soundboard_bp.route('/trigger', methods=['POST'])
@login_required
def trigger_sound():
    """
    Trigger a sound effect on ESP32-CAM.
    Updates /espcam/effect in Firebase.
    
    Request Body:
        effect_name (str): Name of the sound effect
    
    Returns:
        JSON: Status of the operation
    """
    try:
        data = request.get_json()
        effect_name = data.get('effect_name')
        
        if not effect_name:
            return jsonify({
                'status': 'error',
                'message': 'Effect name is required'
            }), 400
        
        # Update Firebase: /espcam/effect
        ref = db.reference('espcam/effect')
        ref.set(effect_name)
        
        print(f"🔊 Sound effect triggered: {effect_name}")
        
        return jsonify({
            'status': 'success',
            'message': f'Sound effect "{effect_name}" triggered',
            'effect': effect_name
        }), 200
        
    except Exception as e:
        print(f"❌ Error triggering sound: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to trigger sound: {str(e)}'
        }), 500


@soundboard_bp.route('/status', methods=['GET'])
@login_required
def get_status():
    """
    Get the current effect from Firebase.
    
    Returns:
        JSON: Current effect status
    """
    try:
        ref = db.reference('espcam/effect')
        current_effect = ref.get()
        
        return jsonify({
            'status': 'success',
            'current_effect': current_effect
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting status: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to get status: {str(e)}'
        }), 500


@soundboard_bp.route('/test', methods=['GET'])
def test_endpoint():
    """
    Test endpoint to verify sound board routes are working.
    
    Returns:
        JSON: Test response
    """
    return jsonify({
        'status': 'success',
        'message': 'Sound board routes are working',
        'endpoints': {
            'trigger': 'POST /api/soundboard/trigger',
            'clear': 'POST /api/soundboard/clear',
            'status': 'GET /api/soundboard/status'
        }
    }), 200