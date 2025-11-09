from firebase_admin import db
import datetime
from app.models.game_session import GameSession, Campaign
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
                    'cha': {'score': 10, 'savingThrowProficient': False}
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
                # === MODIFIED SPELLS STRUCTURE ===
                'spells': {
                    'spellDC': 10,
                    'spellAttack': 0,
                    'spellcastingAbility': None,
                    'spellSlots': {
                        '0': {'max': 0, 'remaining': 0, 'spells': []},
                        '1': {'max': 0, 'remaining': 0, 'spells': []},
                        '2': {'max': 0, 'remaining': 0, 'spells': []},
                        '3': {'max': 0, 'remaining': 0, 'spells': []},
                        '4': {'max': 0, 'remaining': 0, 'spells': []},
                        '5': {'max': 0, 'remaining': 0, 'spells': []},
                        '6': {'max': 0, 'remaining': 0, 'spells': []},
                        '7': {'max': 0, 'remaining': 0, 'spells': []},
                        '8': {'max': 0, 'remaining': 0, 'spells': []},
                        '9': {'max': 0, 'remaining': 0, 'spells': []}
                    }
                },
                # === END MODIFIED SPELLS STRUCTURE ===
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
            
    def get_background_info(self,player_id,character_id):
        """GET a specif character via character id"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/background')
            characters = ref.get()
            return characters if characters else {}
        except Exception as e:
            print(f"Error getting player characters: {e}")
            return None
            
    def save_background_info(self,player_id,character_id,data):
        """GET a specif character via character id"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/background')
            ref.set(data)
            return True
        except Exception as e:
            print(f"Error getting player characters: {e}")
            return False

    # === NEW SPELL FUNCTIONS START ===

    def get_spells(self, player_id, character_id):
        """Get all spell data for a specific character"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/spells')
            spells = ref.get()
            return spells if spells else {}
        except Exception as e:
            print(f"Error getting spells: {e}")
            return None

    def save_spells(self, player_id, character_id, data):
        """Save the entire spell data object for a specific character"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/spells')
            ref.set(data)
            return True
        except Exception as e:
            print(f"Error saving spells: {e}")
            return False

    def update_spell_stats(self, player_id, character_id, data):
        """Update spell stats (DC, Attack, Ability)"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/spells')
            # Data should be a dict: {'spellDC': 15, 'spellAttack': 7, 'spellcastingAbility': 'INT'}
            ref.update(data)
            return True
        except Exception as e:
            print(f"Error updating spell stats: {e}")
            return False

    def update_spell_slots(self, player_id, character_id, level, data):
        """Update max and remaining spell slots for a specific level"""
        try:
            # Data should be a dict: {'max': 4, 'remaining': 2}
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/spells/spellSlots/{level}')
            ref.update(data)
            return True
        except Exception as e:
            print(f"Error updating spell slots: {e}")
            return False

    def add_spell(self, player_id, character_id, level, spell_data):
        """Add a new spell to a specific level's spell list"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/spells/spellSlots/{level}/spells')
            
            # Get current spells to append
            current_spells = ref.get()
            if current_spells is None:
                current_spells = []
                
            current_spells.append(spell_data)
            ref.set(current_spells)
            return True
        except Exception as e:
            print(f"Error adding spell: {e}")
            return False

    def delete_spell(self, player_id, character_id, level, spell_index):
        """Delete a spell from a specific level's list by its index"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/spells/spellSlots/{level}/spells')
            
            current_spells = ref.get()
            print(type(spell_index), "\n", type(current_spells))
            if current_spells is None or not isinstance(current_spells, list) or spell_index >= len(current_spells):
                print(f"Error deleting spell: Invalid index or no spells found.")
                return False
                
            # Remove spell by index
            current_spells.pop(spell_index)
            
            # Set the modified list back
            ref.set(current_spells)
            return True
        except Exception as e:
            print(f"Error deleting spell: {e}")
            return False

    # === NEW SPELL FUNCTIONS END ===

    def get_inventory(self, player_id, character_id):
        """Get inventory data for a specific character"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/inventory')
            inventory = ref.get()
            return inventory if inventory else {}
        except Exception as e:
            print(f"Error getting inventory: {e}")
            return None
    
    def save_inventory(self, player_id, character_id, data):
        """Save inventory data for a specific character"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/inventory')
            ref.set(data)
            return True
        except Exception as e:
            print(f"Error saving inventory: {e}")
            return False
    def get_combat(self, player_id, character_id):
        """Get combat data for a specific character"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/combat')
            combat = ref.get()
            return combat if combat else {}
        except Exception as e:
            print(f"Error getting combat data: {e}")
            return None

    def save_combat(self, player_id, character_id, data):
        """Save combat data for a specific character"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}/combat')
            ref.set(data)
            return True
        except Exception as e:
            print(f"Error saving combat data: {e}")
            return False
    def delete_character(self, player_id, character_id):
        """Delete a character from Firebase"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}')
            ref.delete()
            print(f"✅ Character {character_id} deleted successfully")
            return True
        except Exception as e:
            print(f"❌ Error deleting character: {e}")
            return False
    def update_character(self, player_id, character_id, data):
        """Update specific character data in Firebase"""
        try:
            ref = db.reference(f'users/{player_id}/player/characters/{character_id}')
            ref.update(data)
            print(f"✅ Character {character_id} updated successfully")
            return True
        except Exception as e:
            print(f"❌ Error updating character: {e}")
            return False

    # ===== CAMPAIGN MANAGEMENT METHODS =====

    def get_dm_campaigns(self, dm_id):
        """Get all campaigns for a specific DM"""
        try:
            ref = db.reference(f'users/{dm_id}/dm/campaigns')
            campaigns_data = ref.get()
            
            if not campaigns_data:
                return {}
            
            # Convert to Campaign objects
            campaigns = {}
            for campaign_id, data in campaigns_data.items():
                campaigns[campaign_id] = Campaign.from_dict(campaign_id, data).to_dict()
            
            return campaigns
            
        except Exception as e:
            print(f"Error getting DM campaigns: {e}")
            return None

    def get_campaign(self, dm_id, campaign_id):
        """Get a specific campaign as a Campaign object"""
        try:
            ref = db.reference(f'users/{dm_id}/dm/campaigns/{campaign_id}')
            data = ref.get()
            
            if not data:
                return None
            
            # Return as Campaign object
            campaign = Campaign.from_dict(campaign_id, data)
            return campaign.to_dict()
            
        except Exception as e:
            print(f"Error getting campaign: {e}")
            return None

    def create_campaign(self, dm_id, campaign_name, description=""):
        """Create a new campaign using Campaign model"""
        try:
            ref = db.reference(f'users/{dm_id}/dm/campaigns')
            
            # Create temporary campaign with placeholder ID
            campaign_ref = ref.push()
            campaign_id = campaign_ref.key
            
            # Create Campaign object
            campaign = Campaign(
                campaign_id=campaign_id,
                dm_id=dm_id,
                name=campaign_name,
                description=description
            )
            
            # Save to Firebase
            campaign_ref.set(campaign.to_dict())
            
            print(f"✅ Campaign '{campaign_name}' created with ID: {campaign_id}")
            return campaign_id
            
        except Exception as e:
            print(f"❌ Error creating campaign: {e}")
            return None

    def update_campaign(self, dm_id, campaign_id, data):
        """Update campaign data"""
        try:
            ref = db.reference(f'users/{dm_id}/dm/campaigns/{campaign_id}')
            ref.update(data)
            print(f"✅ Campaign {campaign_id} updated successfully")
            return True
        except Exception as e:
            print(f"❌ Error updating campaign: {e}")
            return False

    def delete_campaign(self, dm_id, campaign_id):
        """Delete a campaign"""
        try:
            ref = db.reference(f'users/{dm_id}/dm/campaigns/{campaign_id}')
            ref.delete()
            print(f"✅ Campaign {campaign_id} deleted successfully")
            return True
        except Exception as e:
            print(f"❌ Error deleting campaign: {e}")
            return False

    # ===== GAME SESSION METHODS (Using GameSession Model) =====

    def create_game_session(self, dm_id, campaign_id, campaign_name):
        """Create a new game session using GameSession model"""
        try:
            ref = db.reference('sessions')
            
            # Create session reference to get ID
            session_ref = ref.push()
            session_id = session_ref.key
            
            # Create GameSession object
            session = GameSession(
                session_id=session_id,
                dm_id=dm_id,
                campaign_id=campaign_id,
                campaign_name=campaign_name
            )
            
            # Save to Firebase
            session_ref.set(session.to_dict())
            
            # Update campaign's lastPlayed timestamp
            self.update_campaign(dm_id, campaign_id, {
                'lastPlayed': datetime.datetime.utcnow().isoformat()
            })
            
            print(f"✅ Game session created: {session_id}")
            return session_id
            
        except Exception as e:
            print(f"❌ Error creating game session: {e}")
            return None

    def get_game_session(self, session_id):
        """Get a GameSession object"""
        try:
            ref = db.reference(f'sessions/{session_id}')
            data = ref.get()
            
            if not data:
                return None
            
            # Return as GameSession object
            session = GameSession.from_dict(session_id, data)
            return session
            
        except Exception as e:
            print(f"❌ Error getting game session: {e}")
            return None

    def save_game_session(self, session: GameSession):
        """Save a GameSession object to Firebase"""
        try:
            ref = db.reference(f'sessions/{session.session_id}')
            ref.set(session.to_dict())
            print(f"✅ Session {session.session_id} saved")
            return True
        except Exception as e:
            print(f"❌ Error saving session: {e}")
            return False

    def get_session_players(self, session_id):
        """Get all active players in a session"""
        try:
            session = self.get_game_session(session_id)
            if session:
                return session.get_all_players()
            return {}
        except Exception as e:
            print(f"❌ Error getting session players: {e}")
            return None

    def add_player_to_session(self, session_id, player_id, character_id, display_name):
        """Add a player to an active game session using GameSession model"""
        try:
            # Get session
            session = self.get_game_session(session_id)
            if not session:
                print(f"❌ Session {session_id} not found")
                return False
            
            # Add player using model method
            session.add_player(player_id, character_id, display_name)
            
            # Save back to Firebase
            self.save_game_session(session)
            
            print(f"✅ Player {player_id} added to session {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error adding player to session: {e}")
            return False

    def assign_mini_to_player(self, session_id, player_id, mini_id):
        """Assign a mini to a player's character using GameSession model"""
        try:
            # Get session
            session = self.get_game_session(session_id)
            if not session:
                print(f"❌ Session {session_id} not found")
                return False
            
            # Assign mini using model method
            success = session.assign_mini(player_id, mini_id)
            
            if success:
                # Save back to Firebase
                self.save_game_session(session)
                print(f"✅ Mini {mini_id} assigned to player {player_id}")
                return True
            
            print(f"❌ Player {player_id} not found in session")
            return False
            
        except Exception as e:
            print(f"❌ Error assigning mini: {e}")
            return False

    def get_dm_sessions(self, dm_id):
        """Get all sessions for a specific DM"""
        try:
            ref = db.reference('sessions')
            all_sessions = ref.get()
            
            if not all_sessions:
                return {}
            
            # Filter by DM and convert to GameSession objects
            dm_sessions = {}
            for session_id, data in all_sessions.items():
                session_info = data.get('sessionInfo', {})
                if session_info.get('dm_id') == dm_id:
                    session = GameSession.from_dict(session_id, data)
                    dm_sessions[session_id] = session.to_dict()
            
            return dm_sessions
            
        except Exception as e:
            print(f"❌ Error getting DM sessions: {e}")
            return None

    def update_player_status(self, session_id, player_id, status):
        """Update player connection status using GameSession model"""
        try:
            # Get session
            session = self.get_game_session(session_id)
            if not session:
                return False
            
            # Update status using model method
            success = session.update_player_status(player_id, status)
            
            if success:
                # Save back to Firebase
                self.save_game_session(session)
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ Error updating player status: {e}")
            return False

    def remove_player_from_session(self, session_id, player_id):
        """Remove a player from a session using GameSession model"""
        try:
            # Get session
            session = self.get_game_session(session_id)
            if not session:
                return False
            
            # Remove player using model method
            success = session.remove_player(player_id)
            
            if success:
                # Save back to Firebase
                self.save_game_session(session)
                print(f"✅ Player {player_id} removed from session {session_id}")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ Error removing player from session: {e}")
            return False

    def end_game_session(self, session_id):
        """End a game session using GameSession model"""
        try:
            # Get session
            session = self.get_game_session(session_id)
            if not session:
                return False
            
            # End session using model method
            session.end_session()
            
            # Save back to Firebase
            self.save_game_session(session)
            
            print(f"✅ Session {session_id} ended")
            return True
            
        except Exception as e:
            print(f"❌ Error ending session: {e}")
            return False

    # ===== TURN MANAGEMENT METHODS =====

    def set_turn_order(self, session_id, player_ids):
        """Set the turn order for combat"""
        try:
            session = self.get_game_session(session_id)
            if not session:
                return False
            
            session.set_turn_order(player_ids)
            self.save_game_session(session)
            
            print(f"✅ Turn order set for session {session_id}")
            return True
            
        except Exception as e:
            print(f"❌ Error setting turn order: {e}")
            return False

    def next_turn(self, session_id):
        """Move to the next player's turn"""
        try:
            session = self.get_game_session(session_id)
            if not session:
                return None
            
            next_player = session.next_turn()
            self.save_game_session(session)
            
            return next_player
            
        except Exception as e:
            print(f"❌ Error advancing turn: {e}")
            return None