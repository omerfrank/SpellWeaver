from flask import Blueprint, jsonify, request ,render_template, jsonify, session, g
from app.services.firebase_service import FirebaseService
from app.routes.auth_routes import login_required

session_bp = Blueprint('session', __name__, url_prefix='/api')

firebase = FirebaseService() 

@session_bp.route('/player/connectToSession', methods=['POST'])
@login_required
def connect_to_session():
    """Connect a player to an active game session using a session code"""
    player_id = session.get('user_id')
    if not player_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    print("player id found!")
    try:
        data = request.get_json()
        session_code = data.get('session_code')
        character_id = data.get('character_id')
        display_name = data.get('display_name')
        print(f"got json vars: {data}")
        if not session_code or not character_id or not display_name:
            return jsonify({"status": "error", "message": "Missing required data"}), 400
        
        # Find session by code
        session_id = firebase.get_session_by_code(session_code)
        print(f"got session id from firebase, {session_id}")
        if not session_id:
            return jsonify({"status": "error", "message": "Invalid session code. Please check and try again."}), 404
        
        # Get the session to verify it's active
        game_session = firebase.get_game_session(session_id)
        print("got game session")
        if not game_session:
            return jsonify({"status": "error", "message": "Session not found"}), 404
        
        if game_session.status != 'active':
            return jsonify({"status": "error", "message": "This session is no longer active"}), 400
        
        # Add player to session
        success = firebase.add_player_to_session(
            session_id=session_id,
            player_id=player_id,
            character_id=character_id,
            display_name=display_name
        )
        print("added player to session")
        
        if success:
            return jsonify({
                "status": "success",
                "message": "Successfully connected to game",
                "session_id": session_id
            }), 200
        else:
            return jsonify({"status": "error", "message": "Failed to connect to session"}), 500
            
    except Exception as e:
        print(f"Error connecting to session: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# NEW ROUTE: Disconnect from session
@session_bp.route('/player/disconnectFromSession', methods=['POST'])
@login_required
def disconnect_from_session():
    """Disconnect a player from their current session"""
    player_id = session.get('user_id')
    if not player_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({"status": "error", "message": "Session ID required"}), 400
        
        # Remove player from session
        success = firebase.remove_player_from_session(session_id, player_id)
        
        if success:
            return jsonify({"status": "success", "message": "Disconnected from session"}), 200
        else:
            return jsonify({"status": "error", "message": "Failed to disconnect"}), 500
            
    except Exception as e:
        print(f"Error disconnecting from session: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# NEW ROUTE: Get current session info for player
@session_bp.route('/player/currentSession', methods=['GET'])
@login_required
def get_current_session():
    """Get the player's current session information"""
    player_id = session.get('user_id')
    if not player_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    try:
        # Get player's active session
        session_info = firebase.get_player_active_session(player_id)
        
        if session_info:
            return jsonify({"status": "success", "session": session_info}), 200
        else:
            return jsonify({"status": "success", "session": None}), 200
            
    except Exception as e:
        print(f"Error getting current session: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
# NEW ROUTE: Get current session info for player
@session_bp.route('/test', methods=['GET'])
def test():
    return "works!"
