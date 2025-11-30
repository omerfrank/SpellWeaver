"""
Camera Routes - Flask Blueprint for ESP32-CAM Integration
Handles HTTP endpoints for camera control and streaming
"""

from flask import Blueprint, jsonify, Response, send_file
from app.services.camera_service import get_camera_service
from app.routes.auth_routes import login_required
import io


# Create blueprint
camera_bp = Blueprint('camera', __name__, url_prefix='/api/camera')


@camera_bp.route('/connect', methods=['POST'])
@login_required
def connect_camera():
    """
    Endpoint to find and connect to ESP32-CAM.
    Queries Firebase for camera IP and establishes connection.
    
    Returns:
        JSON: Connection status and stream URL
    """
    print("connecting... ")
    camera_service = get_camera_service()
    print("connected succ \n")
    # Find camera in Firebase
    result = camera_service.find_camera()
    if result['status'] == 'success':
        # Start streaming automatically on successful connection
        stream_result = camera_service.start_streaming()
        
        if stream_result['status'] != 'success':
            return jsonify({
                'status': 'warning',
                'message': 'Camera connected but stream failed to start',
                'camera_ip': camera_service.camera_ip,
                'stream_url': '/api/camera/stream'
            }), 200
        
        return jsonify(result), 200
    else:
        return jsonify(result), 404


@camera_bp.route('/disconnect', methods=['POST'])
@login_required
def disconnect_camera():
    """
    Endpoint to disconnect from ESP32-CAM.
    Stops streaming and cleans up resources.
    
    Returns:
        JSON: Disconnection status
    """
    camera_service = get_camera_service()
    result = camera_service.disconnect()
    
    return jsonify(result), 200


@camera_bp.route('/status', methods=['GET'])
@login_required
def get_status():
    """
    Endpoint to check current camera connection status.
    
    Returns:
        JSON: Current camera status information
    """
    camera_service = get_camera_service()
    status = camera_service.get_status()
    
    return jsonify(status), 200


@camera_bp.route('/stream', methods=['GET'])
@login_required
def stream_video():
    """
    Endpoint to stream JPEG frames from camera.
    Uses multipart/x-mixed-replace for continuous streaming.
    
    Returns:
        Response: MJPEG stream
    """
    camera_service = get_camera_service()
    
    if not camera_service.is_connected:
        return jsonify({
            'status': 'error',
            'message': 'Camera not connected'
        }), 404
    
    def generate_frames():
        """
        Generator function to yield frames for streaming.
        """
        while camera_service.is_streaming:
            frame = camera_service.get_latest_frame()
            
            if frame:
                # Yield frame in multipart format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            else:
                # No frame available, wait a bit
                import time
                time.sleep(0.1)
    
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@camera_bp.route('/snapshot', methods=['GET'])
@login_required
def capture_snapshot():
    """
    Endpoint to capture a single frame from camera.
    Useful for testing or saving specific moments.
    
    Returns:
        Image: JPEG image
    """
    camera_service = get_camera_service()
    
    if not camera_service.is_connected:
        return jsonify({
            'status': 'error',
            'message': 'Camera not connected'
        }), 404
    
    # Capture single frame
    frame = camera_service.capture_single_frame()
    
    if frame:
        return Response(frame, mimetype='image/jpeg')
    else:
        return jsonify({
            'status': 'error',
            'message': 'Failed to capture frame'
        }), 500


@camera_bp.route('/settings/quality', methods=['POST'])
@login_required
def set_quality():
    """
    Endpoint to adjust JPEG quality.
    
    Request Body:
        quality (int): Quality level (0-63, lower is better)
    
    Returns:
        JSON: Status of quality change
    """
    from flask import request
    
    data = request.get_json()
    quality = data.get('quality')
    
    if quality is None:
        return jsonify({
            'status': 'error',
            'message': 'Quality parameter required'
        }), 400
    
    camera_service = get_camera_service()
    result = camera_service.set_quality(int(quality))
    
    return jsonify(result), 200


@camera_bp.route('/settings/framerate', methods=['POST'])
@login_required
def set_frame_rate():
    """
    Endpoint to adjust frame rate.
    
    Request Body:
        fps (float): Frames per second (0.5 - 10)
    
    Returns:
        JSON: Status of frame rate change
    """
    from flask import request
    
    data = request.get_json()
    fps = data.get('fps')
    
    if fps is None:
        return jsonify({
            'status': 'error',
            'message': 'FPS parameter required'
        }), 400
    
    camera_service = get_camera_service()
    result = camera_service.set_frame_rate(float(fps))
    
    return jsonify(result), 200


@camera_bp.route('/restart', methods=['POST'])
@login_required
def restart_stream():
    """
    Endpoint to restart the camera stream.
    Useful for recovering from errors.
    
    Returns:
        JSON: Status of stream restart
    """
    camera_service = get_camera_service()
    
    # Stop current stream
    camera_service.stop_streaming()
    
    # Start new stream
    result = camera_service.start_streaming()
    
    return jsonify(result), 200


@camera_bp.route('/test', methods=['GET'])
def test_endpoint():
    """
    Test endpoint to verify camera routes are working.
    No authentication required.
    
    Returns:
        JSON: Test response
    """
    return jsonify({
        'status': 'success',
        'message': 'Camera routes are working',
        'endpoints': {
            'connect': 'POST /api/camera/connect',
            'disconnect': 'POST /api/camera/disconnect',
            'status': 'GET /api/camera/status',
            'stream': 'GET /api/camera/stream',
            'snapshot': 'GET /api/camera/snapshot'
        }
    }), 200


# Error handlers
@camera_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404


@camera_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500