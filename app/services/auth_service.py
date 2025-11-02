import functools
import datetime  # <-- Import datetime
from flask import (
    Blueprint,  jsonify, session, redirect, url_for, g
)
from firebase_admin import auth
from app.services.firebase_service import FirebaseService
firebase_service = FirebaseService()

def signup(request):
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
            'player': {},
            'dm': {}
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