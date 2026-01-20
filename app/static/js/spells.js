// Spell data structure
let spellData = {
    spellDC: 10,
    spellAttack: 0,
    spellcastingAbility: null,
    spellSlots: {
        0: { max: 0, remaining: 0, spells: [] },
        1: { max: 0, remaining: 0, spells: [] },
        2: { max: 0, remaining: 0, spells: [] },
        3: { max: 0, remaining: 0, spells: [] },
        4: { max: 0, remaining: 0, spells: [] },
        5: { max: 0, remaining: 0, spells: [] },
        6: { max: 0, remaining: 0, spells: [] },
        7: { max: 0, remaining: 0, spells: [] },
        8: { max: 0, remaining: 0, spells: [] },
        9: { max: 0, remaining: 0, spells: [] }
    }
};

let currentSpell = null;
let isLoading = false;
async function calculateSpellStats() {
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId || !spellData.spellcastingAbility) {
        return;
    }
    
    try {
        // Fetch character data to get ability scores and proficiency bonus
        const response = await fetch(`/api/game/character/${characterId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            const character = result.character;
            
            // Get the spellcasting ability score
            const abilityScore = character.abilities[spellData.spellcastingAbility.toLowerCase()]?.score || 10;
            
            // Calculate ability modifier
            const abilityModifier = Math.floor((abilityScore - 10) / 2);
            
            // Get proficiency bonus (default to +2 if not set)
            const proficiencyBonus = character.proficiencyBonus || 2;
            
            // Calculate Spell Save DC = 8 + proficiency + ability modifier
            spellData.spellDC = 8 + proficiencyBonus + abilityModifier;
            
            // Calculate Spell Attack Bonus = proficiency + ability modifier
            spellData.spellAttack = proficiencyBonus + abilityModifier;
            
            // Save and render
            await saveSpellStats();
            renderUI();
            
            console.log(`Spell stats calculated: DC=${spellData.spellDC}, Attack=${spellData.spellAttack}`);
        }
    } catch (error) {
        console.error('Error calculating spell stats:', error);
    }
}

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    
    // Set up ability select change handler
    const abilitySelect = document.getElementById('abilitySelect');
    // if (abilitySelect) {
    //     abilitySelect.addEventListener('change', function() {
    //         spellData.spellcastingAbility = this.value;
    //         saveSpellStats();
    //     });
    // }
    if (abilitySelect) {
        abilitySelect.addEventListener('change', async function() {
            spellData.spellcastingAbility = this.value;
            
            // Auto-calculate when ability is selected
            await calculateSpellStats();
        });
    }
});

/**
 * Load spell data from server
 */
async function loadData() {
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) {
        showError('No character selected');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/game/loadSpells/${characterId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            if (result.spells) {
                spellData = result.spells;
                
                // Ensure all spell levels exist
                for (let i = 0; i <= 9; i++) {
                    if (!spellData.spellSlots[i]) {
                        spellData.spellSlots[i] = { max: 0, remaining: 0, spells: [] };
                    }
                }
            }
            
            renderUI();
            
            // Auto-calculate spell stats if ability is selected
            if (spellData.spellcastingAbility) {
                await calculateSpellStats();
            }
        } else {
            throw new Error(result.message || 'Failed to load spells');
        }
    } catch (error) {
        console.error('Error loading spells:', error);
        showError(`Failed to load spells: ${error.message}`);
        renderUI();
    } finally {
        showLoading(false);
    }
}
/**
 * Save complete spell data to server
 */
async function saveData() {
    if (isLoading) return;
    
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) {
        console.error('No character selected');
        return false;
    }
    
    try {
        const response = await fetch(`/api/game/saveSpells/${characterId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(spellData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            return true;
        } else {
            throw new Error(result.message || 'Failed to save spells');
        }
    } catch (error) {
        console.error('Error saving spells:', error);
        showError(`Failed to save: ${error.message}`);
        return false;
    }
}

/**
 * Save spell stats (DC, Attack, Ability)
 */
async function saveSpellStats() {
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) return;
    
    try {
        const response = await fetch(`/api/game/updateSpellStats/${characterId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spellDC: spellData.spellDC,
                spellAttack: spellData.spellAttack,
                spellcastingAbility: spellData.spellcastingAbility
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            console.log('Spell stats saved');
        } else {
            throw new Error(result.message || 'Failed to save spell stats');
        }
    } catch (error) {
        console.error('Error saving spell stats:', error);
        showError(`Failed to save spell stats: ${error.message}`);
    }
}

/**
 * Render the entire UI
 */
function renderUI() {
    document.getElementById('spellDC').textContent = spellData.spellDC;
    document.getElementById('spellAttack').textContent = spellData.spellAttack >= 0 ? 
        `+${spellData.spellAttack}` : `${spellData.spellAttack}`;
    
    // Set ability dropdown
    const abilitySelect = document.getElementById('abilitySelect');
    if (abilitySelect && spellData.spellcastingAbility) {
        abilitySelect.value = spellData.spellcastingAbility;
    }
    
    renderSpellLevels();
}

/**
 * Render spell levels
 */
function renderSpellLevels() {
    const container = document.getElementById('spellLevelsContainer');
    container.innerHTML = '';

    for (let level = 0; level <= 9; level++) {
        const levelData = spellData.spellSlots[level];
        const levelCard = document.createElement('div');
        levelCard.className = 'spell-level-card';
        
        const levelName = level === 0 ? 'Cantrips' : `Level ${level}`;
        
        levelCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="mb-0">${levelName}</h4>
                <button class="btn btn-primary btn-sm" onclick="window.openSpellModal(${level})">
                    <i class="bi bi-plus-circle"></i> Add Spell
                </button>
            </div>
            
            ${level > 0 ? `
            <div class="row mb-3">
                <div class="col-md-4">
                    <label class="form-label">Maximum Slots</label>
                    <input type="number" class="form-control" value="${levelData.max}" 
                        onchange="window.updateMaxSlots(${level}, this.value)" min="0">
                </div>
                <div class="col-md-8">
                    <label class="form-label">Remaining Spell Slots</label>
                    <div class="spell-slot-counter" id="slotCounter${level}">
                        ${generateSlotCircles(level, levelData.max, levelData.remaining)}
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div id="spellList${level}">
                ${renderSpellList(level, levelData.spells)}
            </div>
        `;
        
        container.appendChild(levelCard);
    }
}

/**
 * Generate slot circles
 */
function generateSlotCircles(level, max, remaining) {
    let html = '';
    for (let i = 0; i < max; i++) {
        const used = i >= remaining;
        html += `<div class="spell-slot ${used ? 'used' : ''}" onclick="window.toggleSlot(${level}, ${i})"></div>`;
    }
    return html;
}

/**
 * Render spell list
 */
function renderSpellList(level, spells) {
    if (!spells || spells.length === 0) {
        return '<p class="text-muted">No spells at this level</p>';
    }

    return spells.map((spell, index) => `
        <div class="spell-item" onclick="window.viewSpell(${level}, ${index})">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${spell.name}</h6>
                    <span class="badge spell-school-badge bg-secondary school-${spell.school}">${spell.school}</span>
                    <small class="d-block mt-1 text-muted" style="color: #B2BEB5 !important;">${spell.casting} • ${spell.range}</small>
                </div>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); window.deleteSpell(${level}, ${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Open spell modal to add new spell
 */
window.openSpellModal = function(level) {
    document.getElementById('spellLevel').value = level;
    document.getElementById('spellId').value = '';
    document.getElementById('spellForm').reset();
    document.getElementById('spellModalTitle').textContent = 'Add New Spell';
    new bootstrap.Modal(document.getElementById('spellModal')).show();
};

/**
 * Save spell
 */
window.saveSpell = async function() {
    const level = parseInt(document.getElementById('spellLevel').value);
    const spell = {
        name: document.getElementById('spellName').value,
        school: document.getElementById('spellSchool').value,
        casting: document.getElementById('spellCasting').value,
        range: document.getElementById('spellRange').value,
        description: document.getElementById('spellDescription').value,
        higherLevel: document.getElementById('spellHigherLevel').value || ''
    };

    // Validate
    if (!spell.name || !spell.school || !spell.casting || !spell.range || !spell.description) {
        showError('Please fill in all required fields');
        return;
    }

    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) {
        showError('No character selected');
        return;
    }
    
    try {
        const response = await fetch(`/api/game/addSpell/${characterId}/${level}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(spell)
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            // Add to local data
            if (!spellData.spellSlots[level].spells) {
                spellData.spellSlots[level].spells = [];
            }
            spellData.spellSlots[level].spells.push(spell);
            
            renderUI();
            bootstrap.Modal.getInstance(document.getElementById('spellModal')).hide();
            showSuccess('Spell added successfully');
        } else {
            throw new Error(result.message || 'Failed to add spell');
        }
    } catch (error) {
        console.error('Error adding spell:', error);
        showError(`Failed to add spell: ${error.message}`);
    }
};

/**
 * View spell details
 */
window.viewSpell = function(level, index) {
    const spell = spellData.spellSlots[level].spells[index];
    currentSpell = { name: spell.name, range: spell.range, level: level, index: index };
    
    document.getElementById('viewSpellName').textContent = spell.name;
    document.getElementById('viewSpellSchool').textContent = spell.school;
    document.getElementById('viewSpellCasting').textContent = spell.casting;
    document.getElementById('viewSpellRange').textContent = spell.range;
    document.getElementById('viewSpellDescription').textContent = spell.description;
    
    const higherLevelContainer = document.getElementById('viewSpellHigherLevelContainer');
    if (spell.higherLevel && spell.higherLevel.trim() !== '') {
        document.getElementById('viewSpellHigherLevel').textContent = spell.higherLevel;
        higherLevelContainer.style.display = 'block';
    } else {
        higherLevelContainer.style.display = 'none';
    }
    
    const school = document.getElementById('viewSpellSchool');
    [
        "school-Abjuration",
        "school-Conjuration",
        "school-Divination",
        "school-Enchantment",
        "school-Evocation",
        "school-Illusion",
        "school-Necromancy",
        "school-Transmutation"
    ].forEach(cls => school.classList.remove(cls));
    school.classList.add(`school-${spell.school}`);

    new bootstrap.Modal(document.getElementById('viewSpellModal')).show();
};

/**
 * Use spell (you can customize this)
 */
window.useSpell = function() {
    if (currentSpell) {
        alert(`Using spell: ${currentSpell.name}`);
        // You can add logic here to consume spell slots if needed
    }
};

/**
 * Delete spell
 */
window.deleteSpell = async function(level, index) {
    if (!confirm('Are you sure you want to delete this spell?')) {
        return;
    }
    
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) {
        showError('No character selected');
        return;
    }
    
    try {
        const response = await fetch(`/api/game/deleteSpell/${characterId}/${level}/${index}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            spellData.spellSlots[level].spells.splice(index, 1);
            renderUI();
            showSuccess('Spell deleted successfully');
        } else {
            throw new Error(result.message || 'Failed to delete spell');
        }
    } catch (error) {
        console.error('Error deleting spell:', error);
        showError(`Failed to delete spell: ${error.message}`);
    }
};

/**
 * Update max slots
 */
window.updateMaxSlots = async function(level, value) {
    const max = parseInt(value) || 0;
    const remaining = Math.min(spellData.spellSlots[level].remaining, max);
    
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) return;
    
    try {
        const response = await fetch(`/api/game/updateSpellSlots/${characterId}/${level}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max: max,
                remaining: remaining
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            spellData.spellSlots[level].max = max;
            spellData.spellSlots[level].remaining = remaining;
            renderUI();
        } else {
            throw new Error(result.message || 'Failed to update spell slots');
        }
    } catch (error) {
        console.error('Error updating spell slots:', error);
        showError(`Failed to update spell slots: ${error.message}`);
    }
};

/**
 * Toggle spell slot
 */
window.toggleSlot = async function(level, index) {
    const levelData = spellData.spellSlots[level];
    let newRemaining;
    
    if (index < levelData.remaining) {
        newRemaining = index;
    } else {
        newRemaining = index + 1;
    }
    
    const characterId = localStorage.getItem('selectedCharacterId');
    
    if (!characterId) return;
    
    try {
        const response = await fetch(`/api/game/updateSpellSlots/${characterId}/${level}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max: levelData.max,
                remaining: newRemaining
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            spellData.spellSlots[level].remaining = newRemaining;
            renderUI();
        } else {
            throw new Error(result.message || 'Failed to update spell slots');
        }
    } catch (error) {
        console.error('Error toggling spell slot:', error);
        showError(`Failed to toggle spell slot: ${error.message}`);
    }
};

/**
 * Update spell DC
 */
document.getElementById('spellDCInput').addEventListener('change', (e) => {
    spellData.spellDC = parseInt(e.target.value) || 10;
    saveSpellStats();
    renderUI();
});

/**
 * Update spell attack
 */
document.getElementById('spellAttackInput').addEventListener('change', (e) => {
    spellData.spellAttack = parseInt(e.target.value) || 0;
    saveSpellStats();
    renderUI();
});

/**
 * Show loading state
 */
function showLoading(show) {
    if (show) {
        if (!document.getElementById('spellsLoadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'spellsLoadingOverlay';
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
                    <p style="color: #ffffff; margin-top: 20px;">Loading spells...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        const overlay = document.getElementById('spellsLoadingOverlay');
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