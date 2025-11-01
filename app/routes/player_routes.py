from flask import Blueprint, render_template

# Create a blueprint instance
player_bp = Blueprint('player', __name__, url_prefix='/player',template_folder='../templates',static_folder='../static')

@player_bp.route('/users')
def get_users():
    return {"message": "List of users"}
@player_bp.route('/background')
def load_background():
    return render_template('background.html', name='ziv')

@player_bp.route('/character')
def load_character():
    return render_template('character.html')

@player_bp.route('/characterSelect')
def load_character_select():
    return render_template('characterSelect.html')

@player_bp.route('/combat')
def load_combat():
    return render_template('combat.html')

@player_bp.route('/createCharacter')
def load_create_character():
    return render_template('createCharacter.html')

@player_bp.route('/inventory')
def load_inventory():
    return render_template('inventory.html')

@player_bp.route('/showcase')
def load_showcase():
    return render_template('showcase.html')

@player_bp.route('/spells')
def load_spells():
    return render_template('spells.html')


@player_bp.route('/test')
def test():
    return {"message": "player works!"}