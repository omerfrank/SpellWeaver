from flask import Blueprint, render_template, jsonify, request, session, g
from app.services.firebase_service import FirebaseService
from app.routes.auth_routes import login_required

# Create a blueprint instance
dm_bp = Blueprint('dm', __name__, url_prefix='/dm', template_folder='../templates', static_folder='../static')

firebase = FirebaseService()

# ===== PAGE ROUTES =====

@dm_bp.route('/campaignSelect')
@login_required
def load_campaign_select():
    """Load the campaign selection page"""
    return render_template('campaignSelect.html')

@dm_bp.route('/createCampaign')
@login_required
def load_create_campaign():
    """Load the create campaign page (to be implemented)"""
    return render_template('createCampaign.html')

@dm_bp.route('/dashboard')
@login_required
def dashboard():
    """DM dashboard page (main game screen)"""
    return render_template('dm_dashboard.html')

# ===== CAMPAIGN API ROUTES =====

@dm_bp.route('/api/campaigns', methods=['GET'])
@login_required
def get_campaigns():
    """Get all campaigns for the logged-in DM"""
    dm_id = session.get('user_id')
    if not dm_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    campaigns = firebase.get_dm_campaigns(dm_id)
    
    if campaigns is None:
        return jsonify({"status": "error", "message": "Failed to fetch campaigns"}), 500
    
    # Convert from Firebase object to list
    campaigns_list = [campaign for key, campaign in campaigns.items()]
    
    return jsonify({"status": "success", "campaigns": campaigns_list}), 200

@dm_bp.route('/api/campaign/<campaign_id>', methods=['GET'])
@login_required
def get_campaign(campaign_id):
    """Get a specific campaign"""
    dm_id = session.get('user_id')
    if not dm_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    campaign = firebase.get_campaign(dm_id, campaign_id)
    
    if campaign is None:
        return jsonify({"status": "error", "message": "Failed to fetch campaign"}), 500
    
    if not campaign:
        return jsonify({"status": "error", "message": "Campaign not found"}), 404
    
    return jsonify({"status": "success", "campaign": campaign}), 200

@dm_bp.route('/api/campaign/create', methods=['POST'])
@login_required
def create_campaign():
    """Create a new campaign"""
    dm_id = session.get('user_id')
    if not dm_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    try:
        data = request.get_json()
        campaign_name = data.get('name')
        description = data.get('description', '')
        image_url = data.get('imageUrl', '')
        settings = data.get('settings', {})
        
        if not campaign_name or not campaign_name.strip():
            return jsonify({"status": "error", "message": "Campaign name is required"}), 400
        
        # Create the campaign
        campaign_id = firebase.create_campaign(
            dm_id=dm_id,
            campaign_name=campaign_name,
            description=description,
            image_url=image_url,
        )
        
        if campaign_id:
            return jsonify({
                'status': 'success',
                'message': 'Campaign created successfully',
                'campaign_id': campaign_id
            }), 201
        else:
            return jsonify({'status': 'error', 'message': 'Failed to create campaign'}), 500
    
    except Exception as e:
        print(f"Error in create_campaign route: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@dm_bp.route('/api/campaign/<campaign_id>', methods=['DELETE'])
@login_required
def delete_campaign(campaign_id):
    """Delete a campaign"""
    dm_id = session.get('user_id')
    if not dm_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    if not campaign_id:
        return jsonify({"status": "error", "message": "Campaign ID is required"}), 400
    
    success = firebase.delete_campaign(dm_id, campaign_id)
    
    if success:
        return jsonify({"status": "success", "message": "Campaign deleted successfully"}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to delete campaign"}), 500

# ===== SESSION MANAGEMENT API =====

@dm_bp.route('/api/session/create', methods=['POST'])
@login_required
def create_session():
    """Create a new game session"""
    dm_id = session.get('user_id')
    if not dm_id:
        return jsonify({"status": "error", "message": "User not logged in"}), 401
    
    data = request.get_json()
    campaign_id = data.get('campaign_id')
    
    if not campaign_id:
        return jsonify({"status": "error", "message": "Campaign ID is required"}), 400
    
    # Get campaign name
    campaign = firebase.get_campaign(dm_id, campaign_id)
    if not campaign:
        return jsonify({"status": "error", "message": "Campaign not found"}), 404
    
    campaign_name = campaign.get('name', 'Unnamed Campaign')
    
    # Create session
    session_id = firebase.create_game_session(dm_id, campaign_id, campaign_name)
    
    if session_id:
        return jsonify({'status': 'success', 'session_id': session_id}), 201
    else:
        return jsonify({'status': 'error', 'message': 'Failed to create session'}), 500

@dm_bp.route('/api/session/<session_id>/players', methods=['GET'])
@login_required
def get_session_players(session_id):
    """Get all players in a session"""
    players = firebase.get_session_players(session_id)
    
    if players is not None:
        return jsonify({'status': 'success', 'players': players}), 200
    else:
        return jsonify({'status': 'error', 'message': 'Failed to fetch players'}), 500

@dm_bp.route('/api/session/<session_id>/assign-mini', methods=['POST'])
@login_required
def assign_mini(session_id):
    """Assign a mini to a player"""
    data = request.get_json()
    player_id = data.get('player_id')
    mini_id = data.get('mini_id')
    
    if not player_id or not mini_id:
        return jsonify({'status': 'error', 'message': 'Missing data'}), 400
    
    success = firebase.assign_mini_to_player(session_id, player_id, mini_id)
    
    if success:
        return jsonify({'status': 'success'}), 200
    else:
        return jsonify({'status': 'error', 'message': 'Failed to assign mini'}), 500

@dm_bp.route('/api/sessions', methods=['GET'])
@login_required
def get_my_sessions():
    """Get all sessions for the logged-in DM"""
    dm_id = session.get('user_id')
    sessions = firebase.get_dm_sessions(dm_id)
    
    if sessions is not None:
        return jsonify({'status': 'success', 'sessions': sessions}), 200
    else:
        return jsonify({'status': 'error', 'message': 'Failed to fetch sessions'}), 500

@dm_bp.route('/api/session/<session_id>/end', methods=['POST'])
@login_required
def end_session(session_id):
    """End a game session"""
    success = firebase.end_game_session(session_id)
    
    if success:
        return jsonify({'status': 'success'}), 200
    else:
        return jsonify({'status': 'error', 'message': 'Failed to end session'}), 500