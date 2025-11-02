from flask import Blueprint, render_template
from app.routes.auth_routes import login_required
# Create a blueprint instance
player_bp = Blueprint('player', __name__, url_prefix='/player',template_folder='../templates',static_folder='../static')


@player_bp.route('/background')
@login_required
def load_background():
    return render_template('background.html', name='ziv')

@player_bp.route('/character')
@login_required
def load_character():
    return render_template('character.html')

@player_bp.route('/characterSelect')
@login_required
def load_character_select():
    return render_template('characterSelect.html')

@player_bp.route('/combat')
@login_required
def load_combat():
    return render_template('combat.html')

@player_bp.route('/createCharacter')
@login_required
def load_create_character():
    return render_template('createCharacter.html')

@player_bp.route('/inventory')
@login_required
def load_inventory():
    return render_template('inventory.html')

@player_bp.route('/showcase')
@login_required
def load_showcase():
    return render_template('showcase.html')

@player_bp.route('/spells')
@login_required
def load_spells():
    return render_template('spells.html')


@player_bp.route('/test')
@login_required
def test():
    return {"message": "player works!"}