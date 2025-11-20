from flask import Blueprint, render_template

# Create a blueprint instance
grid_bp = Blueprint('grid', __name__, template_folder='../templates',static_folder='../static',url_prefix='/api/grid')


@grid_bp.route('/test')
def test():
    return {"message": "test works!"}
# :5000/dm/api/session/-OeXHWkk5uXy2HJtJGsj/gridState:1
@grid_bp.route('/session/<session_id>/gridState')
def update_grid(session_id):
    return {"message": "test works!"}
