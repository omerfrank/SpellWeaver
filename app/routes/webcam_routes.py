"""
Webcam Routes - Flask Blueprint for Client-Side Webcam
Handles snapshot uploads and webcam control
Architecturally separate from ESP32 camera routes
"""

from flask import Blueprint, jsonify, request, Response
from app.services.webcam_service import get_webcam_service
from app.routes.auth_routes import login_required


# Create blueprint - note the distinct prefix
webcam_bp = Blueprint('webcam', __name__, url_prefix='/api/webcam')


@webcam_bp.route('/activate', methods=['POST'])
@login_required
def activate_webcam():
    """
    Activate webcam mode for the current session.
    Enforces single-source camera rule.
    
    Request Body:
        session_id (str): DM session identifier
    
    Returns:
        JSON: Activation status
    """
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id:
        return jsonify({
            'status': 'error',
            'message': 'Session ID required'
        }), 400
    
    webcam_service = get_webcam_service()
    result = webcam_service.activate_webcam(session_id)
    
    status_code = 200 if result['status'] == 'success' else 400
    return jsonify(result), status_code


@webcam_bp.route('/deactivate', methods=['POST'])
@login_required
def deactivate_webcam():
    """
    Deactivate webcam mode.
    
    Returns:
        JSON: Deactivation status
    """
    webcam_service = get_webcam_service()
    result = webcam_service.deactivate_webcam()
    
    return jsonify(result), 200


@webcam_bp.route('/snapshot', methods=['POST'])
@login_required
def upload_snapshot():
    """
    Upload and process a snapshot from client webcam.
    
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
    
    webcam_service = get_webcam_service()
    result = webcam_service.process_snapshot(image_data)
    
    status_code = 200 if result['status'] == 'success' else 400
    return jsonify(result), status_code


@webcam_bp.route('/preview', methods=['GET'])
@login_required
def get_snapshot_preview():
    """
    Retrieve the latest processed snapshot for preview.
    
    Returns:
        Image: JPEG image or 404 if no snapshot available
    """
    webcam_service = get_webcam_service()
    
    snapshot = webcam_service.get_latest_snapshot()
    
    if snapshot:
        return Response(snapshot, mimetype='image/jpeg')
    else:
        return jsonify({
            'status': 'error',
            'message': 'No snapshot available'
        }), 404


@webcam_bp.route('/status', methods=['GET'])
@login_required
def get_webcam_status():
    """
    Get current webcam status.
    
    Returns:
        JSON: Webcam status information
    """
    webcam_service = get_webcam_service()
    status = webcam_service.get_status()
    
    return jsonify(status), 200


@webcam_bp.route('/test', methods=['GET'])
def test_endpoint():
    """
    Test endpoint to verify webcam routes are working.
    No authentication required.
    
    Returns:
        JSON: Test response
    """
    return jsonify({
        'status': 'success',
        'message': 'Webcam routes are working',
        'endpoints': {
            'activate': 'POST /api/webcam/activate',
            'deactivate': 'POST /api/webcam/deactivate',
            'snapshot': 'POST /api/webcam/snapshot',
            'preview': 'GET /api/webcam/preview',
            'status': 'GET /api/webcam/status'
        }
    }), 200


# Error handlers
@webcam_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404


@webcam_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500