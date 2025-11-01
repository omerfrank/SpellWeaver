from flask import Blueprint, render_template

# Create a blueprint instance
main_bp = Blueprint('main', __name__, template_folder='../templates',static_folder='../static')

@main_bp.route('/users')
def get_users():
    return {"message": "List of users"}
@main_bp.route('/profile')
def bish():
    return render_template('index.html', name='ziv')
@main_bp.route('/test')
def test():
    return {"message": "test works!"}