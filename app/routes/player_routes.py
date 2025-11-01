from flask import Blueprint, render_template

# Create a blueprint instance
player_bp = Blueprint('player', __name__, template_folder='../templates',static_folder='../static')

@player_bp.route('/users')
def get_users():
    return {"message": "List of users"}
@player_bp.route('/profile')
def bish():
    return render_template('index.html', name='ziv')
@player_bp.route('/test')
def test():
    return {"message": "player works!"}