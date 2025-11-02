from firebase_admin import db

class FirebaseService:
    def __init__(self):
        """
        The Firebase app is already initialized in app/__init__.py.
        We just need to get references to the database.
        """
        pass
    
    def get_player(self, player_id):
        """Get player data from Firebase"""
        try:
            ref = db.reference(f'players/{player_id}')
            return ref.get()
        except Exception as e:
            print(f"Error getting player: {e}")
            return None

    def update_player(self, player_id, data):
        """Update player data in Firebase"""
        try:
            ref = db.reference(f'users/{player_id}')
            ref.update(data)
            return True
        except Exception as e:
            print(f"Error updating player: {e}")
            return False
    def get_player_characters(self, player_id):
        """Get all characters for a specific player"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters')
            characters = ref.get()
            return characters if characters else {}
        except Exception as e:
            print(f"Error getting player characters: {e}")
            return None
        
    def get_game_state(self):
        """Get current game state"""
        try:
            ref = db.reference('game_state')
            return ref.get()
        except Exception as e:
            print(f"Error getting game state: {e}")
            return None

    def update_game_state(self, state_data):
        """Update/set the entire game state"""
        try:
            ref = db.reference('game_state')
            ref.set(state_data)
            return True
        except Exception as e:
            print(f"Error updating game state: {e}")
            return False
    def run_test_query(self):
        """Adds a 'hello world' message to the database under '/test_query'."""
        try:
            # Get a reference to a new node called 'test_query'
            ref = db.reference('test_query')
            
            # Set the data at that node
            ref.set({
                'message': 'hello world',
                'status': 'success'
            })
            
            print("✅ Firebase test query successful.")
            return {'status': 'success', 'path': '/test_query'}
            
        except Exception as e:
            print(f"❌ Error running test query: {e}")
            return {'status': 'error', 'message': str(e)}