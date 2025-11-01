let currentAbilityType = '';
let editingAbilityIndex = null;
let editingAbilityType = null;

const genericActions = [
    { name: 'Attack', cost: 'Action', description: 'Make a melee or ranged attack against a target' },
    { name: 'Dash', cost: 'Action', description: 'Gain extra movement equal to your speed' },
    { name: 'Disengage', cost: 'Action', description: 'Your movement doesn\'t provoke opportunity attacks' },
    { name: 'Dodge', cost: 'Action', description: 'Attacks against you have disadvantage until your next turn' },
    { name: 'Help', cost: 'Action', description: 'Grant advantage to an ally on their next ability check or attack' },
    { name: 'Hide', cost: 'Action', description: 'Make a Stealth check to hide from enemies' }
];

const classAbilities = [
    {
        type: 'active',
        name: 'Second Wind',
        summary: 'Regain hit points equal to 1d10 + fighter level',
        description: 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.',
        range: 'Self',
        actionCost: 'Bonus Action',
        maxUses: 1,
        usesLeft: 1
    },
    {
        type: 'active',
        name: 'Action Surge',
        summary: 'Take an additional action on your turn',
        description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action. Once you use this feature, you must finish a short or long rest before you can use it again.',
        range: 'Self',
        actionCost: 'Free Action',
        maxUses: 1,
        usesLeft: 0
    },
    {
        type: 'passive',
        name: 'Fighting Style: Dueling',
        summary: 'Gain +2 to damage rolls with one-handed weapons',
        description: 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.'
    },
    {
        type: 'passive',
        name: 'Extra Attack',
        summary: 'Attack twice whenever you take the Attack action',
        description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn. The number of attacks increases to three when you reach 11th level in this class and to four when you reach 20th level in this class.'
    }
];

const racialAbilities = [
    {
        type: 'active',
        name: 'Breath Weapon',
        summary: 'Exhale destructive energy in a 15-foot cone',
        description: 'You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation. When you use your breath weapon, each creature in the area of the exhalation must make a Dexterity saving throw. The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one.',
        range: '15 feet',
        actionCost: 'Action',
        maxUses: 3,
        usesLeft: 2
    },
    {
        type: 'passive',
        name: 'Darkvision',
        summary: 'See in dim light within 60 feet as if it were bright light',
        description: 'Thanks to your draconic heritage, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can\'t discern color in darkness, only shades of gray.'
    },
    {
        type: 'passive',
        name: 'Draconic Resistance',
        summary: 'Resistance to your draconic ancestry damage type',
        description: 'You have resistance to the damage type associated with your draconic ancestry (acid, cold, fire, lightning, or poison).'
    }
];

function setAbilityType(type) {
    currentAbilityType = type;
}

function toggleActiveFields() {
    const type = document.getElementById('abilityTypeSelect').value;
    const activeFields = document.getElementById('activeFields');
    activeFields.style.display = type === 'active' ? 'block' : 'none';
}

function getActionBadgeClass(action) {
    if (action === 'Action') return 'badge-action';
    if (action === 'Bonus Action') return 'badge-bonus';
    if (action === 'Reaction') return 'badge-reaction';
    return 'badge-free';
}

function resetAbilityUses(abilityType) {
    const abilities = abilityType === 'class' ? classAbilities : racialAbilities;
    abilities.forEach(ability => {
        if (ability.type === 'active') {
            ability.usesLeft = ability.maxUses;
        }
    });
    renderAbilities();
}

function deleteAbilityByIndex(index, abilityType) {
    const abilities = abilityType === 'class' ? classAbilities : racialAbilities;
    const abilityName = abilities[index].name;
    
    if (!confirm(`Are you sure you want to delete "${abilityName}"?`)) {
        return;
    }
    
    abilities.splice(index, 1);
    renderAbilities();
}

function showAbilityDetails(index, abilityType) {
    const abilities = abilityType === 'class' ? classAbilities : racialAbilities;
    const ability = abilities[index];
    
    let detailsHTML = `
        <div class="ability-header mb-3">
            <div class="ability-name">${ability.name}</div>
            <span class="ability-type-badge ${ability.type === 'passive' ? 'passive-badge' : ''}">${ability.type === 'passive' ? 'Passive' : 'Active'}</span>
        </div>
        <div class="ability-description mb-3">${ability.description}</div>
    `;
    
    if (ability.type === 'active') {
        detailsHTML += `
            <div class="ability-stats">
                <div class="stat-item mb-2">
                    <span class="stat-label">Range:</span> ${ability.range}
                </div>
                <div class="stat-item mb-2">
                    <span class="stat-label">Cost:</span> 
                    <span class="action-cost-badge ${getActionBadgeClass(ability.actionCost)}">${ability.actionCost}</span>
                </div>
                <div class="stat-item mb-2">
                    <span class="stat-label">Uses Left:</span> ${ability.usesLeft}/${ability.maxUses}
                </div>
            </div>
        `;
    }
    
    document.getElementById('abilityDetailsBody').innerHTML = detailsHTML;
    
    editingAbilityIndex = index;
    editingAbilityType = abilityType;
    
    const detailsModal = new bootstrap.Modal(document.getElementById('abilityDetailsModal'));
    detailsModal.show();
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('editAbilityBtn').addEventListener('click', function() {
        if (editingAbilityIndex !== null && editingAbilityType !== null) {
            const abilities = editingAbilityType === 'class' ? classAbilities : racialAbilities;
            const ability = abilities[editingAbilityIndex];
            
            document.getElementById('abilityTypeSelect').value = ability.type;
            document.getElementById('abilityName').value = ability.name;
            document.getElementById('abilitySummary').value = ability.summary || ability.description;
            document.getElementById('abilityFullDescription').value = ability.description;
            
            if (ability.type === 'active') {
                document.getElementById('abilityRange').value = ability.range;
                document.getElementById('abilityAction').value = ability.actionCost;
                document.getElementById('abilityMaxUses').value = ability.maxUses;
                document.getElementById('activeFields').style.display = 'block';
            }
            
            currentAbilityType = editingAbilityType;
            
            document.getElementById('addAbilityModalLabel').textContent = 'Edit Ability';
            document.querySelector('#addAbilityModal .btn-add').textContent = 'Save Changes';
            document.querySelector('#addAbilityModal .btn-add').onclick = function() {
                updateAbility(editingAbilityIndex, editingAbilityType);
            };
            
            bootstrap.Modal.getInstance(document.getElementById('abilityDetailsModal')).hide();
            
            const addModal = new bootstrap.Modal(document.getElementById('addAbilityModal'));
            addModal.show();
        }
    });

    renderGenericActions();
    renderAbilities();
});

function updateAbility(index, abilityType) {
    const abilities = abilityType === 'class' ? classAbilities : racialAbilities;
    const type = document.getElementById('abilityTypeSelect').value;
    const name = document.getElementById('abilityName').value;
    const summary = document.getElementById('abilitySummary').value;
    const description = document.getElementById('abilityFullDescription').value;

    if (!name || !summary || !description) {
        alert('Please fill in all required fields');
        return;
    }

    const updatedAbility = {
        type: type,
        name: name,
        summary: summary,
        description: description
    };

    if (type === 'active') {
        updatedAbility.range = document.getElementById('abilityRange').value;
        updatedAbility.actionCost = document.getElementById('abilityAction').value;
        updatedAbility.maxUses = parseInt(document.getElementById('abilityMaxUses').value);
        updatedAbility.usesLeft = abilities[index].usesLeft || updatedAbility.maxUses;
    }

    abilities[index] = updatedAbility;
    renderAbilities();
    
    document.getElementById('addAbilityForm').reset();
    document.getElementById('activeFields').style.display = 'none';
    document.getElementById('addAbilityModalLabel').textContent = 'Add New Ability';
    document.querySelector('#addAbilityModal .btn-add').textContent = 'Add Ability';
    document.querySelector('#addAbilityModal .btn-add').onclick = addAbility;
    
    editingAbilityIndex = null;
    editingAbilityType = null;
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('addAbilityModal'));
    modal.hide();
}

function renderGenericActions() {
    const container = document.getElementById('genericActionsContainer');
    container.innerHTML = genericActions.map(action => `
        <div class="generic-action-item">
            <div class="action-info">
                <div>
                    <div class="ability-name">${action.name}</div>
                    <div class="ability-description">${action.description}</div>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="action-cost-badge ${getActionBadgeClass(action.cost)}">${action.cost}</span>
                <button class="btn btn-use">Use</button>
            </div>
        </div>
    `).join('');
}

function renderAbility(ability, abilityType, index) {
    if (ability.type === 'passive') {
        return `
            <div class="ability-card" onclick="event.target.closest('.btn-danger') ? null : showAbilityDetails(${index}, '${abilityType}')">
                <div class="ability-header">
                    <div class="ability-name">${ability.name}</div>
                    <div class="d-flex gap-2 align-items-center">
                        <span class="ability-type-badge passive-badge">Passive</span>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteAbilityByIndex(${index}, '${abilityType}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="ability-description">${ability.summary || ability.description}</div>
            </div>
        `;
    } else {
        const useDots = Array(ability.maxUses).fill(0).map((_, i) => 
            `<span class="use-dot ${i >= ability.usesLeft ? 'used' : ''}"></span>`
        ).join('');
        
        return `
            <div class="ability-card" onclick="event.target.closest('.btn-danger, .btn-use') ? null : showAbilityDetails(${index}, '${abilityType}')">
                <div class="ability-header">
                    <div class="ability-name">${ability.name}</div>
                    <div class="d-flex gap-2 align-items-center">
                        <span class="ability-type-badge">Active</span>
                        <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteAbilityByIndex(${index}, '${abilityType}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="ability-description">${ability.summary || ability.description}</div>
                <div class="ability-stats">
                    <div class="stat-item">
                        <span class="stat-label">Range:</span> ${ability.range}
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Cost:</span> 
                        <span class="action-cost-badge ${getActionBadgeClass(ability.actionCost)}">${ability.actionCost}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Uses:</span> 
                        <span class="uses-display">${useDots}</span>
                        ${ability.usesLeft}/${ability.maxUses}
                    </div>
                </div>
                <button class="btn btn-use" ${ability.usesLeft === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); useAbility(${index}, '${abilityType}')">
                    Use Ability
                </button>
            </div>
        `;
    }
}

function renderAbilities() {
    document.getElementById('classAbilitiesContainer').innerHTML = 
        classAbilities.map((ability, index) => renderAbility(ability, 'class', index)).join('');
    document.getElementById('racialAbilitiesContainer').innerHTML = 
        racialAbilities.map((ability, index) => renderAbility(ability, 'racial', index)).join('');
}

function useAbility(index, abilityType) {
    const abilities = abilityType === 'class' ? classAbilities : racialAbilities;
    const ability = abilities[index];
    if (ability && ability.usesLeft > 0) {
        ability.usesLeft--;
        renderAbilities();
    }
}

function addAbility() {
    const type = document.getElementById('abilityTypeSelect').value;
    const name = document.getElementById('abilityName').value;
    const summary = document.getElementById('abilitySummary').value;
    const description = document.getElementById('abilityFullDescription').value;

    if (!name || !summary || !description) {
        alert('Please fill in all required fields');
        return;
    }

    const newAbility = {
        type: type,
        name: name,
        summary: summary,
        description: description
    };

    if (type === 'active') {
        newAbility.range = document.getElementById('abilityRange').value;
        newAbility.actionCost = document.getElementById('abilityAction').value;
        newAbility.maxUses = parseInt(document.getElementById('abilityMaxUses').value);
        newAbility.usesLeft = newAbility.maxUses;
    }

    if (currentAbilityType === 'class') {
        classAbilities.push(newAbility);
    } else {
        racialAbilities.push(newAbility);
    }

    renderAbilities();
    
    document.getElementById('addAbilityForm').reset();
    document.getElementById('activeFields').style.display = 'none';
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('addAbilityModal'));
    modal.hide();
}