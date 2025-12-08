"""
ESP32-CAM Routes - Flask Blueprint
Client-side streaming, server-side snapshot processing
"""

from flask import Blueprint, jsonify, request, Response
from app.services.espcam_service import get_espcam_service
from app.routes.auth_routes import login_required


# Create blueprint
espcam_bp = Blueprint('espcam', __name__, url_prefix='/api/espcam')


@espcam_bp.route('/discover', methods=['GET'])
@login_required
def discover_camera():
    """
    Discover ESP32-CAM IP address from Firebase.
    Returns IP for client to connect directly.
    
    Returns:
        JSON: Camera IP and stream URL
    """
    espcam_service = get_espcam_service()
    result = espcam_service.get_camera_ip()
    
    status_code = 200 if result['status'] in ['success', 'warning'] else 404
    return jsonify(result), status_code


@espcam_bp.route('/activate', methods=['POST'])
@login_required
def activate_espcam():
    """
    Activate ESP32-CAM mode for the current session.
    
    Request Body:
        session_id (str): DM session identifier
    
    Returns:
        JSON: Activation status with stream URL
    """
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({
            'status': 'error',
            'message': 'Session ID required'
        }), 400
    
    espcam_service = get_espcam_service()
    result = espcam_service.activate_espcam(session_id)
    
    status_code = 200 if result['status'] == 'success' else 400
    return jsonify(result), status_code


@espcam_bp.route('/deactivate', methods=['POST'])
@login_required
def deactivate_espcam():
    """
    Deactivate ESP32-CAM mode.
    
    Returns:
        JSON: Deactivation status
    """
    espcam_service = get_espcam_service()
    result = espcam_service.deactivate_espcam()
    
    return jsonify(result), 200


@espcam_bp.route('/snapshot', methods=['POST'])
@login_required
def upload_snapshot():
    """
    Upload and process a snapshot captured from ESP32-CAM stream.
    
    Request Body:
        image_data (str): Base64-encoded JPEG image
    
    Returns:
        JSON: Processing status and metadata
    """
    data = request.get_json()
    image_data = data.get('image_data')
    
    if not image_data:
        return jsonify({
            'status': 'error',
            'message': 'Image data required'
        }), 400
    
    espcam_service = get_espcam_service()
    result = espcam_service.process_snapshot(image_data)
    
    status_code = 200 if result['status'] == 'success' else 400
    return jsonify(result), status_code


@espcam_bp.route('/preview', methods=['GET'])
@login_required
def get_snapshot_preview():
    """
    Retrieve the latest processed snapshot for preview.
    
    Returns:
        Image: JPEG image or 404 if no snapshot available
    """
    espcam_service = get_espcam_service()
    
    snapshot = espcam_service.get_latest_snapshot()
    
    if snapshot:
        return Response(snapshot, mimetype='image/jpeg')
    else:
        return jsonify({
            'status': 'error',
            'message': 'No snapshot available'
        }), 404


@espcam_bp.route('/status', methods=['GET'])
@login_required
def get_espcam_status():
    """
    Get current ESP32-CAM status.
    
    Returns:
        JSON: ESP32-CAM status information
    """
    espcam_service = get_espcam_service()
    status = espcam_service.get_status()
    
    return jsonify(status), 200


@espcam_bp.route('/test', methods=['GET'])
def test_endpoint():
    """
    Test endpoint to verify ESP32-CAM routes are working.
    
    Returns:
        JSON: Test response
    """
    return jsonify({
        'status': 'success',
        'message': 'ESP32-CAM routes are working',
        'endpoints': {
            'discover': 'GET /api/espcam/discover',
            'activate': 'POST /api/espcam/activate',
            'deactivate': 'POST /api/espcam/deactivate',
            'snapshot': 'POST /api/espcam/snapshot',
            'preview': 'GET /api/espcam/preview',
            'status': 'GET /api/espcam/status'
        }
    }), 200


# Error handlers
@espcam_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404


@espcam_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500