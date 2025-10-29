from flask import Blueprint, render_template

# Create a blueprint instance
user_bp = Blueprint('player', __name__, template_folder='../templates',static_folder='../static')

@user_bp.route('/users')
def get_users():
    return {"message": "List of users"}
@user_bp.route('/profile')
def bish():
    return render_template('index.html', name='ziv')