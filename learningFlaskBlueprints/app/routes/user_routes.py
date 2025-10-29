from flask import Blueprint, render_template

# Create a blueprint instance
user_bp = Blueprint('user', __name__, template_folder='../templates')

@user_bp.route('/users')
def get_users():
    return {"message": "List of users"}
@user_bp.route('/profile')
def bish():
    return render_template('index.html', name='ziv')