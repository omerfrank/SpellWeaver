import functools
from flask import (
    Blueprint, request, jsonify, session, redirect, url_for, g
)
from firebase_admin import auth
from app.services.firebase_service import FirebaseService 
from app.services.auth_service import signup

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


@auth_bp.route('/signup', methods=['POST'])
def signup_player():
    return signup(request=request)


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
        g.user = session 

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('main.home'))
        return view(**kwargs)
    
    return wrapped_view