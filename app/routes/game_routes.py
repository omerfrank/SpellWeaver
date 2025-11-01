from flask import Blueprint, jsonify, request
from app.services.firebase_service import FirebaseService  # <-- Make sure this is imported

game_bp = Blueprint('game', __name__, url_prefix='/api/game')

firebase = FirebaseService() # <-- Make sure this is instantiated

# ... (your other routes like /action and /state) ...

@game_bp.route('/test', methods=['GET'])
def db_test():
    """API health check"""
    
    # --- Add this line to run the test ---
    test_result = firebase.run_test_query()
    
    return jsonify({
        'status': 'test',
        'message': 'Game API is running',
        'firebase_test_result': test_result  # <-- See the result in your browser
    }), 200