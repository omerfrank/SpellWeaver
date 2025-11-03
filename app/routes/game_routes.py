from flask import Blueprint, jsonify, request ,render_template, jsonify, session, g
from app.services.firebase_service import FirebaseService
from app.routes.auth_routes import login_required

game_bp = Blueprint('game', __name__, url_prefix='/api/game')

firebase = FirebaseService() # <-- Make sure this is instantiated


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
# api routes 
@game_bp.route('/characters', methods=['GET'])
@login_required
def get_characters():
    """
    API endpoint to fetch all characters for the logged-in user.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    characters_data = firebase.get_player_characters(user_id)
    
    if characters_data is None:
        return jsonify({"status": "error", "message": "Failed to fetch characters"}), 500
    
    # Convert from Firebase object (with keys) to a list
    characters_list = [character for key, character in characters_data.items()]
    print("success")
    return jsonify({"status": "success", "characters": characters_list}), 200

@game_bp.route('/createCharacter', methods=['POST'])
@login_required
def create_character_api():
    """
    API endpoint to create a new character for the logged-in user.
    """
    try:
        # Get data from the client-side JS
        data = request.get_json()
        character_name = data.get('name')
        character_img_link = data.get('avatar')
        
        # Get the user's ID from the session
        player_id = g.user.get('user_id')

        if not character_name or not character_img_link or not player_id:
            return jsonify({'status': 'error', 'message': 'Missing data'}), 400

        # Use the function from the previous step
        new_character_id = firebase.create_new_player_characters(
            player_id=player_id,
            character_name=character_name,
            character_img_link=character_img_link
        )

        if new_character_id:
            return jsonify({
                'status': 'success', 
                'message': 'Character created', 
                'characterId': new_character_id
            }), 201
        else:
            return jsonify({'status': 'error', 'message': 'Failed to create character'}), 500

    except Exception as e:
        # app.logger.error(f"Error creating character: {e}") # Good for production
        print(f"Error creating character: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
