# app/models/game_session.py

import datetime
from typing import Dict, List, Optional

class GameSession:
    """
    Represents an active DM game session with connected players.
    
    This class provides a clean interface for managing game sessions,
    abstracting away the Firebase implementation details.
    """
    
    def __init__(self, session_id: str, dm_id: str, campaign_id: str, campaign_name: str):
        self.session_id = session_id
        self.dm_id = dm_id
        self.campaign_id = campaign_id
        self.campaign_name = campaign_name
        self.status = "active"
        self.created_at = datetime.datetime.utcnow().isoformat()
        self.last_updated = datetime.datetime.utcnow().isoformat()
        self.active_players: Dict = {}
        self.game_state: Dict = {
            'current_turn': None,
            'turn_order': [],
            'grid_state': {},
            'initiative_tracker': []
        }
    
    def to_dict(self) -> Dict:
        """Convert session to dictionary for Firebase storage"""
        return {
            'sessionInfo': {
                'dm_id': self.dm_id,
                'campaign_id': self.campaign_id,
                'campaign_name': self.campaign_name,
                'status': self.status,
                'created_at': self.created_at,
                'last_updated': self.last_updated
            },
            'activePlayers': self.active_players,
            'gameState': self.game_state
        }
    
    @classmethod
    def from_dict(cls, session_id: str, data: Dict) -> 'GameSession':
        """Create GameSession object from Firebase data"""
        session_info = data.get('sessionInfo', {})
        
        session = cls(
            session_id=session_id,
            dm_id=session_info.get('dm_id'),
            campaign_id=session_info.get('campaign_id'),
            campaign_name=session_info.get('campaign_name', 'Unnamed Campaign')
        )
        
        session.status = session_info.get('status', 'active')
        session.created_at = session_info.get('created_at')
        session.last_updated = session_info.get('last_updated')
        session.active_players = data.get('activePlayers', {})
        session.game_state = data.get('gameState', {})
        
        return session
    
    def add_player(self, player_id: str, character_id: str, display_name: str) -> Dict:
        """Add a player to the session"""
        player_data = {
            'user_id': player_id,
            'display_name': display_name,
            'selected_character_id': character_id,
            'mini_id': None,
            'connection_status': 'connected',
            'last_seen': datetime.datetime.utcnow().isoformat()
        }
        
        self.active_players[player_id] = player_data
        self.last_updated = datetime.datetime.utcnow().isoformat()
        
        return player_data
    
    def remove_player(self, player_id: str) -> bool:
        """Remove a player from the session"""
        if player_id in self.active_players:
            del self.active_players[player_id]
            self.last_updated = datetime.datetime.utcnow().isoformat()
            return True
        return False
    
    def assign_mini(self, player_id: str, mini_id: str) -> bool:
        """Assign a mini to a player"""
        if player_id in self.active_players:
            self.active_players[player_id]['mini_id'] = mini_id
            self.last_updated = datetime.datetime.utcnow().isoformat()
            return True
        return False
    
    def update_player_status(self, player_id: str, status: str) -> bool:
        """Update a player's connection status"""
        if player_id in self.active_players:
            self.active_players[player_id]['connection_status'] = status
            self.active_players[player_id]['last_seen'] = datetime.datetime.utcnow().isoformat()
            self.last_updated = datetime.datetime.utcnow().isoformat()
            return True
        return False
    
    def get_player(self, player_id: str) -> Optional[Dict]:
        """Get a specific player's data"""
        return self.active_players.get(player_id)
    
    def get_all_players(self) -> Dict:
        """Get all players in the session"""
        return self.active_players
    
    def get_connected_players(self) -> Dict:
        """Get only connected players"""
        return {
            pid: player for pid, player in self.active_players.items()
            if player.get('connection_status') == 'connected'
        }
    
    def set_turn_order(self, player_ids: List[str]) -> None:
        """Set the turn order for combat"""
        self.game_state['turn_order'] = player_ids
        self.last_updated = datetime.datetime.utcnow().isoformat()
    
    def next_turn(self) -> Optional[str]:
        """Move to the next player's turn"""
        turn_order = self.game_state.get('turn_order', [])
        if not turn_order:
            return None
        
        current_turn = self.game_state.get('current_turn')
        
        if current_turn is None or current_turn not in turn_order:
            # Start with first player
            next_player = turn_order[0]
        else:
            # Move to next player
            current_index = turn_order.index(current_turn)
            next_index = (current_index + 1) % len(turn_order)
            next_player = turn_order[next_index]
        
        self.game_state['current_turn'] = next_player
        self.last_updated = datetime.datetime.utcnow().isoformat()
        
        return next_player
    
    def end_session(self) -> None:
        """End the game session"""
        self.status = 'ended'
        self.last_updated = datetime.datetime.utcnow().isoformat()
        
        # Mark all players as disconnected
        for player in self.active_players.values():
            player['connection_status'] = 'disconnected'


class Campaign:
    """
    Represents a DM's campaign.
    """
    
    def __init__(self, campaign_id: str, dm_id: str, name: str, description: str = "", image_url: str = ""):
        self.campaign_id = campaign_id
        self.dm_id = dm_id
        self.name = name
        self.description = description
        self.image_url = image_url
        self.status = 'active'
        self.player_count = 0
        self.created_at = datetime.datetime.utcnow().isoformat()
        self.last_played = None
        self.settings = {
            'gridSize': {'rows': 10, 'cols': 8},
            'defaultSpeed': 30
        }
    
    def to_dict(self) -> Dict:
        """Convert campaign to dictionary for Firebase storage"""
        return {
            'campaignId': self.campaign_id,
            'name': self.name,
            'description': self.description,
            'imageUrl': self.image_url,
            'status': self.status,
            'playerCount': self.player_count,
            'createdAt': self.created_at,
            'lastPlayed': self.last_played,
            'settings': self.settings
        }
    
    @classmethod
    def from_dict(cls, campaign_id: str, data: Dict) -> 'Campaign':
        """Create Campaign object from Firebase data"""
        campaign = cls(
            campaign_id=campaign_id,
            dm_id=data.get('dm_id', ''),
            name=data.get('name', 'Unnamed Campaign'),
            description=data.get('description', ''),
            image_url=data.get('imageUrl', '')
        )
        
        campaign.status = data.get('status', 'active')
        campaign.player_count = data.get('playerCount', 0)
        campaign.created_at = data.get('createdAt')
        campaign.last_played = data.get('lastPlayed')
        campaign.settings = data.get('settings', campaign.settings)
        
        return campaign
    
    def update_last_played(self) -> None:
        """Update the last played timestamp"""
        self.last_played = datetime.datetime.utcnow().isoformat()
    
    def archive(self) -> None:
        """Archive the campaign"""
        self.status = 'archived'
    
    def activate(self) -> None:
        """Activate an archived campaign"""
        self.status = 'active'