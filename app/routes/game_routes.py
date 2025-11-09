from flask import Blueprint, jsonify, request ,render_template, jsonify, session, g
from app.services.firebase_service import FirebaseService
from app.routes.auth_routes import login_required

game_bp = Blueprint('game', __name__, url_prefix='/api/game')

firebase = FirebaseService() # <-- Make sure this is instantiated


@game_bp.route('/test', methods=['GET','POST'])
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

@game_bp.route('/character/<character_id>', methods=['GET'])
@login_required
def get_character(character_id):
    """
    API endpoint to fetch a specific character for the logged-in user.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    if not character_id:
        return jsonify({"status": "error", "message": "Character ID is required"}), 400
    
    character_data = firebase.get_player_character(user_id, character_id)
    
    if character_data is None:
        return jsonify({"status": "error", "message": "Failed to fetch character"}), 500
    
    if not character_data:
        return jsonify({"status": "error", "message": "Character not found"}), 404
    
    print(f"✅ Character fetched successfully: {character_data.get('name', 'Unknown')}")
    return jsonify({"status": "success", "character": character_data}), 200
@game_bp.route('/character/<character_id>', methods=['POST'])
@login_required
def save_character(character_id):
    """
    API endpoint to save/update a specific character for the logged-in user.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    if not character_id:
        return jsonify({"status": "error", "message": "Character ID is required"}), 400
    
    try:
        data = request.get_json()
        
        # Update character data in Firebase
        success = firebase.update_character(user_id, character_id, data)
        
        if success:
            print(f"✅ Character saved successfully: {data.get('name', 'Unknown')}")
            return jsonify({"status": "success", "message": "Character saved"}), 200
        else:
            return jsonify({"status": "error", "message": "Failed to save character"}), 500
            
    except Exception as e:
        print(f"Error saving character: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
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

@game_bp.route('/saveBackground/<character_id>', methods=['POST'])
@login_required
def save_background(character_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    data = request.get_json()
    success = firebase.save_background_info(user_id,character_id,data)
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save data to database"}), 500

@game_bp.route('/loadBackground/<character_id>', methods=['GET'])
@login_required
def load_background(character_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    background_data = firebase.get_background_info(user_id,character_id)
    
    if background_data is None:
        return jsonify({"status": "error", "message": "Failed to fetch characters"}), 500
    
    print("success")
    return jsonify(background_data), 200

@game_bp.route('/loadInventory/<character_id>', methods=['GET'])
@login_required
def load_inventory(character_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    inventory_data = firebase.get_inventory(user_id, character_id)
    
    if inventory_data is None:
        return jsonify({"status": "error", "message": "Failed to fetch inventory"}), 500
    
    return jsonify({"status": "success", "inventory": inventory_data}), 200

@game_bp.route('/saveInventory/<character_id>', methods=['POST'])
@login_required
def save_inventory(character_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    success = firebase.save_inventory(user_id, character_id, data)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save inventory to database"}), 500

@game_bp.route('/loadSpells/<character_id>', methods=['GET'])
@login_required
def load_spells(character_id):
    """Load spell data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    spells_data = firebase.get_spells(user_id, character_id)
    
    if spells_data is None:
        return jsonify({"status": "error", "message": "Failed to fetch spells"}), 500
    
    return jsonify({"status": "success", "spells": spells_data}), 200

@game_bp.route('/saveSpells/<character_id>', methods=['POST'])
@login_required
def save_spells(character_id):
    """Save spell data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    success = firebase.save_spells(user_id, character_id, data)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save spells to database"}), 500

@game_bp.route('/deleteSpell/<character_id>/<level>/<index>', methods=['DELETE'])
@login_required
def delete_spell(character_id,level,index):
    """Save spell data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    success = firebase.delete_spell(user_id, character_id, level, int(index))
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save spells to database"}), 500
    
@game_bp.route('/addSpell/<character_id>/<level>', methods=['POST'])
@login_required
def add_spell(character_id,level):
    """Save spell data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    success = firebase.add_spell(user_id, character_id, level,data)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save spells to database"}), 500
@game_bp.route('/updateSpellSlots/<character_id>/<level>', methods=['POST'])
@login_required
def update_spell_slots(character_id,level):
    """Save spell data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    success = firebase.update_spell_slots(user_id, character_id, level,data)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save spells to database"}), 500
@game_bp.route('/updateSpellStats/<character_id>/', methods=['POST'])
@login_required
def update_spell_stats(character_id):
    """Save spell data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    success = firebase.update_spell_stats(user_id, character_id,data)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save spells to database"}), 500
@game_bp.route('/loadCombat/<character_id>', methods=['GET'])
@login_required
def load_combat(character_id):
    """Load combat data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    combat_data = firebase.get_combat(user_id, character_id)
    
    if combat_data is None:
        return jsonify({"status": "error", "message": "Failed to fetch combat data"}), 500
    
    return jsonify({"status": "success", "combat": combat_data}), 200

@game_bp.route('/saveCombat/<character_id>', methods=['POST'])
@login_required
def save_combat(character_id):
    """Save combat data for a specific character"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    success = firebase.save_combat(user_id, character_id, data)
    
    if success:
        return jsonify({"status": "success"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to save combat data to database"}), 500
@game_bp.route('/deleteCharacter/<character_id>', methods=['DELETE'])
@login_required
def delete_character(character_id):
    """Delete a character for the logged-in user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    if not character_id:
        return jsonify({"status": "error", "message": "Character ID is required"}), 400
    
    success = firebase.delete_character(user_id, character_id)
    
    if success:
        return jsonify({"status": "success", "message": "Character deleted successfully"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to delete character"}), 500