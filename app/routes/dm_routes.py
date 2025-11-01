from flask import Blueprint, render_template

# Create a blueprint instance
dm_bp = Blueprint('dm', __name__, template_folder='../templates',static_folder='../static')

@dm_bp.route('/users')
def get_users():
    return {"message": "List of users"}

@dm_bp.route('/test')
def test():
    return {"message": "dm works!"}

@dm_bp.route('/profile')
def bish():
    return render_template('index.html', name='ziv')