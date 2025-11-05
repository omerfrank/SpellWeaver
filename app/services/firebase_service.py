from firebase_admin import db
import datetime
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
            ref = db.reference(f'users/{player_id}')
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
    def get_player_character(self,player_id,character_id):
        """GET a specif character via character id"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}')
            characters = ref.get()
            return characters if characters else {}
        except Exception as e:
            print(f"Error getting player characters: {e}")
            return None
            
    def create_new_player_characters(self, player_id, character_name, character_img_link):
        """Create new character in Firebase with validation"""
        
        # Input validation
        if not player_id or not isinstance(player_id, str):
            raise ValueError("Invalid player_id")
        
        if not character_name or not character_name.strip():
            raise ValueError("Character name cannot be empty")
        
        if not character_img_link or not character_img_link.strip():
            raise ValueError("Character image link cannot be empty")
        
        try:
            ref = db.reference(f'users/{player_id}/player/characters')
            
            data = {
                'img': character_img_link.strip(),
                'name': character_name.strip(),
                'race': 'Unknown',
                'class': 'Adventurer',
                'level': 1,
                'hp': 10,
                'maxHp': 10,
                'ac': 10,
                'speed': 30,
                'proficiencyBonus': 2,
                'abilities': {
                    'str': {'score': 10, 'savingThrowProficient': False},
                    'dex': {'score': 10, 'savingThrowProficient': False},
                    'con': {'score': 10, 'savingThrowProficient': False},
                    'int': {'score': 10, 'savingThrowProficient': False},
                    'wis': {'score': 10, 'savingThrowProficient': False},
                    'cha': {'score': 10, 'savingThrowProficient': False}  # Fixed typo
                },
                'skills': {
                    'Acrobatics': {'ability': 'dex', 'proficient': False},
                    'Animal Handling': {'ability': 'wis', 'proficient': False},
                    'Arcana': {'ability': 'int', 'proficient': False},
                    'Athletics': {'ability': 'str', 'proficient': False},
                    'Deception': {'ability': 'cha', 'proficient': False},
                    'History': {'ability': 'int', 'proficient': False},
                    'Insight': {'ability': 'wis', 'proficient': False},
                    'Intimidation': {'ability': 'cha', 'proficient': False},
                    'Investigation': {'ability': 'int', 'proficient': False},
                    'Medicine': {'ability': 'wis', 'proficient': False},
                    'Nature': {'ability': 'int', 'proficient': False},
                    'Perception': {'ability': 'wis', 'proficient': False},
                    'Performance': {'ability': 'cha', 'proficient': False},
                    'Persuasion': {'ability': 'cha', 'proficient': False},
                    'Religion': {'ability': 'int', 'proficient': False},
                    'Sleight of Hand': {'ability': 'dex', 'proficient': False},
                    'Stealth': {'ability': 'dex', 'proficient': False},
                    'Survival': {'ability': 'wis', 'proficient': False}
                },
                'inventory': {
                    'currency': {
                        'copper': 0,
                        'silver': 0,
                        'gold': 0,
                        'platinum': 0,
                        'emerald': 0
                    },
                    'items': {
                        'equipped': [],
                        'consumables': [],
                        'general': []
                    }
                },
                'spells': {
                    0: {'max': 0, 'remaining': 0, 'spells': []},
                    1: {'max': 0, 'remaining': 0, 'spells': []},
                    2: {'max': 0, 'remaining': 0, 'spells': []},
                    3: {'max': 0, 'remaining': 0, 'spells': []},
                    4: {'max': 0, 'remaining': 0, 'spells': []},
                    5: {'max': 0, 'remaining': 0, 'spells': []},
                    6: {'max': 0, 'remaining': 0, 'spells': []},
                    7: {'max': 0, 'remaining': 0, 'spells': []},
                    8: {'max': 0, 'remaining': 0, 'spells': []},
                    9: {'max': 0, 'remaining': 0, 'spells': []}
                },
                'combat': {
                    'classAbilities': [],
                    'raceAbilities': []
                },
                'background': {
                    'charBackground': "",
                    'npcs': "",
                    'plotProgress': "",
                    'clues': '',
                    'sessionNotes': '',
                    'locations': '',
                    'goals': '',
                    'goalCount': '',
                    'additionalNotes': ''
                },
                'createdAt': datetime.datetime.utcnow().isoformat()  # Track creation time
            }
            
            # Push returns a reference with a key
            new_character_ref = ref.push(data)
            character_id = new_character_ref.key
            
            # Store the character's own ID in the data
            new_character_ref.update({'characterId': character_id})
            
            print(f"✅ Character '{character_name}' created with ID: {character_id}")
            
            return character_id  
            
        except ValueError as ve:
            print(f"❌ Validation error: {ve}")
            raise
        except Exception as e:
            print(f"❌ Error creating character: {e}")
            return {
                'success': False,
                'error': str(e)
            }   
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