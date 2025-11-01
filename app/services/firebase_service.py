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
            ref = db.reference(f'players/{player_id}')
            ref.update(data)
            return True
        except Exception as e:
            print(f"Error updating player: {e}")
            return False
    
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