from flask import Blueprint, render_template

# Create a blueprint instance
main_bp = Blueprint('main', __name__, template_folder='../templates',static_folder='../static')


@main_bp.route('/test')
def test():
    return {"message": "test works!"}
@main_bp.route('/')
def home():
    print ("home")
    return render_template('home.html')
