import functools
import datetime  # <-- Import datetime
from flask import (
    Blueprint, request, jsonify, session, redirect, url_for, g
)
from firebase_admin import auth
from app.services.firebase_service import FirebaseService  # <-- Import FirebaseService

# Create the auth blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# Instantiate the service
firebase_service = FirebaseService()

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Verify Firebase ID token and create a server-side session.
    """
    try:
        id_token = request.json.get('idToken')
        decoded_token = auth.verify_id_token(id_token)
        
        session.clear()
        session['user_id'] = decoded_token['uid']
        session['email'] = decoded_token.get('email')
        g.user = decoded_token
        
        return jsonify({"status": "success", "message": "Login successful"}), 200

    except auth.InvalidIdTokenError:
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

#
# --- ADD THIS NEW SIGNUP ROUTE ---
#
@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    Verify a new user's Firebase ID token, create their
    database entry, and create a server-side session.
    """
    try:
        id_token = request.json.get('idToken')
        
        # Verify the token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')

        # Create the initial user data object in the database
        initial_user_data = {
            'email': email,
            'createdAt': datetime.datetime.utcnow().isoformat(),
            'characters': {} # Initialize with an empty characters object
        }
        
        # Use your FirebaseService to create the new player entry
        # We use update() here, but it will create the entry if it doesn't exist
        firebase_service.update_player(uid, initial_user_data)

        # Log the user in by creating their session
        session.clear()
        session['user_id'] = uid
        session['email'] = email
        g.user = decoded_token

        return jsonify({"status": "success", "message": "Signup successful"}), 200

    except auth.InvalidIdTokenError:
        return jsonify({"status": "error", "message": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('main.home'))

@auth_bp.before_app_request
def load_logged_in_user():
    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        g.user = session # Just load from session for efficiency

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('main.home'))
        return view(**kwargs)
    
    return wrapped_view