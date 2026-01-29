// Combat data structure
let combatData = {
    classAbilities: [],
    racialAbilities: []
};

const genericActions = [
    { name: 'Attack', cost: 'Action', description: 'Make a melee or ranged attack against a target' },
    { name: 'Dash', cost: 'Action', description: 'Gain extra movement equal to your speed' },
    { name: 'Disengage', cost: 'Action', description: 'Your movement doesn\'t provoke opportunity attacks' },
    { name: 'Dodge', cost: 'Action', description: 'Attacks against you have disadvantage until your next turn' },
    { name: 'Help', cost: 'Action', description: 'Grant advantage to an ally on their next ability check or attack' },
    { name: 'Hide', cost: 'Action', description: 'Make a Stealth check to hide from enemies' }
];

let currentAbilityType = '';
let editingAbilityIndex = null;
let editingAbilityType = null;
let isLoading = false;

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', function() {
    loadCombatData();
    renderGenericActions();
    
    // Set up edit ability button
    document.getElementById('editAbilityBtn').addEventListener('click', function() {
        if (editingAbilityIndex !== null && editingAbilityType !== null) {
            const abilities = editingAbilityType === 'class' ? combatData.classAbilities : combatData.racialAbilities;
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
});

/**
 * Load combat data from server
 */
async function loadCombatData() {
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) {
        showError('No character selected');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/game/loadCombat/${characterId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            if (result.combat) {
                combatData.classAbilities = result.combat.classAbilities || [];
                combatData.racialAbilities = result.combat.racialAbilities || [];
            }
            renderAbilities();
        } else {
            throw new Error(result.message || 'Failed to load combat data');
        }
    } catch (error) {
        console.error('Error loading combat data:', error);
        showError(`Failed to load combat data: ${error.message}`);
        // Still render with empty data
        renderAbilities();
    } finally {
        showLoading(false);
    }
}

/**
 * Save combat data to server
 */
async function saveCombatData() {
    if (isLoading) return false;
    
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) {
        console.error('No character selected');
        return false;
    }
    
    try {
        const response = await fetch(`/api/game/saveCombat/${characterId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(combatData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message || 'Failed to save combat data');
        }
    } catch (error) {
        console.error('Error saving combat data:', error);
        showError(`Failed to save: ${error.message}`);
        return false;
    }
}

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

async function resetAbilityUses(abilityType) {
    const abilities = abilityType === 'class' ? combatData.classAbilities : combatData.racialAbilities;
    abilities.forEach(ability => {
        if (ability.type === 'active') {
            ability.usesLeft = ability.maxUses;
        }
    });
    
    const success = await saveCombatData();
    if (success) {
        renderAbilities();
        showSuccess('Ability uses reset');
    }
}

async function deleteAbilityByIndex(index, abilityType) {
    const abilities = abilityType === 'class' ? combatData.classAbilities : combatData.racialAbilities;
    const abilityName = abilities[index].name;
    
    if (!confirm(`Are you sure you want to delete "${abilityName}"?`)) {
        return;
    }
    
    abilities.splice(index, 1);
    
    const success = await saveCombatData();
    if (success) {
        renderAbilities();
        showSuccess('Ability deleted');
    }
}

function showAbilityDetails(index, abilityType) {
    const abilities = abilityType === 'class' ? combatData.classAbilities : combatData.racialAbilities;
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

async function updateAbility(index, abilityType) {
    const abilities = abilityType === 'class' ? combatData.classAbilities : combatData.racialAbilities;
    const type = document.getElementById('abilityTypeSelect').value;
    const name = document.getElementById('abilityName').value;
    const summary = document.getElementById('abilitySummary').value;
    const description = document.getElementById('abilityFullDescription').value;

    if (!name || !summary || !description) {
        showError('Please fill in all required fields');
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
    
    const success = await saveCombatData();
    if (success) {
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
        
        showSuccess('Ability updated');
    }
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
    const classContainer = document.getElementById('classAbilitiesContainer');
    const racialContainer = document.getElementById('racialAbilitiesContainer');
    
    if (combatData.classAbilities.length === 0) {
        classContainer.innerHTML = '<p class="text-muted">No class abilities yet. Click "Add Ability" to create one.</p>';
    } else {
        classContainer.innerHTML = combatData.classAbilities.map((ability, index) => renderAbility(ability, 'class', index)).join('');
    }
    
    if (combatData.racialAbilities.length === 0) {
        racialContainer.innerHTML = '<p class="text-muted">No racial abilities yet. Click "Add Ability" to create one.</p>';
    } else {
        racialContainer.innerHTML = combatData.racialAbilities.map((ability, index) => renderAbility(ability, 'racial', index)).join('');
    }
}

async function useAbility(index, abilityType) {
    const abilities = abilityType === 'class' ? combatData.classAbilities : combatData.racialAbilities;
    const ability = abilities[index];
    
    if (ability && ability.usesLeft > 0) {
        ability.usesLeft--;
        
        const success = await saveCombatData();
        if (success) {
            renderAbilities();
        }
    }
}

async function addAbility() {
    const type = document.getElementById('abilityTypeSelect').value;
    const name = document.getElementById('abilityName').value;
    const summary = document.getElementById('abilitySummary').value;
    const description = document.getElementById('abilityFullDescription').value;

    if (!name || !summary || !description) {
        showError('Please fill in all required fields');
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
        combatData.classAbilities.push(newAbility);
    } else {
        combatData.racialAbilities.push(newAbility);
    }

    const success = await saveCombatData();
    if (success) {
        renderAbilities();
        
        document.getElementById('addAbilityForm').reset();
        document.getElementById('activeFields').style.display = 'none';
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('addAbilityModal'));
        modal.hide();
        
        showSuccess('Ability added');
    }
}

/**
 * Import Abilities using D&D 5e API
 */
async function importAbilities() {
    const classSelect = document.querySelector('input[name="classSelect"]:checked');
    const levelInput = document.getElementById('importLevel');
    
    if (!classSelect || !levelInput.value) {
        showError('Please select a class and level');
        return;
    }
    
    const className = classSelect.value;
    const level = parseInt(levelInput.value);
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('importAbilitiesModal'));
    modal.hide();
    
    showLoading(true);
    
    try {
        // Fetch class levels progression (this includes features for each level)
        const levelsResponse = await fetch(`https://www.dnd5eapi.co/api/classes/${className}/levels`);
        if (!levelsResponse.ok) throw new Error('Failed to fetch class data');
        
        const allLevels = await levelsResponse.json();
        
        // Filter levels up to user selection
        const relevantLevels = allLevels.filter(l => l.level <= level);
        
        // Collect unique features URL
        const featureUrls = new Set();
        const featuresToFetch = [];
        
        relevantLevels.forEach(lvl => {
            if (lvl.features && lvl.features.length > 0) {
                lvl.features.forEach(feature => {
                    if (!featureUrls.has(feature.url)) {
                        featureUrls.add(feature.url);
                        featuresToFetch.push({
                            name: feature.name,
                            url: feature.url
                        });
                    }
                });
            }
        });
        
        if (featuresToFetch.length === 0) {
            showSuccess('No abilities found for this level.');
            showLoading(false);
            return;
        }
        
        // Fetch details for each feature to get the description
        let addedCount = 0;
        
        // Process in batches or parallel
        const featurePromises = featuresToFetch.map(async (featureRef) => {
            // Check for duplicates in existing data first to save API calls
            const exists = combatData.classAbilities.some(a => a.name.toLowerCase() === featureRef.name.toLowerCase());
            if (exists) return null;

            const detailResponse = await fetch(`https://www.dnd5eapi.co${featureRef.url}`);
            if (!detailResponse.ok) return null;
            
            const detailData = await detailResponse.json();
            
            // Format description
            let description = '';
            if (Array.isArray(detailData.desc)) {
                description = detailData.desc.join('\n\n');
            } else {
                description = detailData.desc || 'No description available.';
            }
            
            // Create Summary (first sentence or truncated)
            let summary = description.split('.')[0] + '.';
            if (summary.length > 100) summary = summary.substring(0, 97) + '...';
            
            return {
                type: 'passive', 
                name: detailData.name,
                summary: summary,
                description: description,
                // Default active fields (hidden but initialized)
                range: 'Self',
                actionCost: 'Action',
                maxUses: 1,
                usesLeft: 1
            };
        });
        
        const newAbilities = (await Promise.all(featurePromises)).filter(a => a !== null);
        
        // Add to combatData
        if (newAbilities.length > 0) {
            combatData.classAbilities.push(...newAbilities);
            await saveCombatData();
            renderAbilities();
            showSuccess(`Successfully imported ${newAbilities.length} abilities.`);
        } else {
            showSuccess('No new abilities to import (duplicates skipped).');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        showError('Failed to import abilities. Please check your connection.');
    } finally {
        showLoading(false);
    }
}


/**
 * Show loading state
 */
function showLoading(show) {
    if (show) {
        if (!document.getElementById('combatLoadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'combatLoadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(44, 47, 51, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            overlay.innerHTML = `
                <div style="text-align: center;">
                    <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p style="color: #ffffff; margin-top: 20px;">Loading combat data...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        const overlay = document.getElementById('combatLoadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.querySelector('.container.mt-4');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
    }
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const container = document.querySelector('.container.mt-4');
    
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.role = 'alert';
    successDiv.innerHTML = `
        <i class="bi bi-check-circle-fill me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
    }
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}