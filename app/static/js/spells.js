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
    if (!characterId || !spellData.spellcastingAbility) return;
    try {
        const response = await fetch(`/api/game/character/${characterId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            const character = result.character;
            const abilityScore = character.abilities[spellData.spellcastingAbility.toLowerCase()]?.score || 10;
            const abilityModifier = Math.floor((abilityScore - 10) / 2);
            const proficiencyBonus = character.proficiencyBonus || 2;
            spellData.spellDC = 8 + proficiencyBonus + abilityModifier;
            spellData.spellAttack = proficiencyBonus + abilityModifier;
            await saveSpellStats();
            renderUI();
            console.log(`Spell stats calculated: DC=${spellData.spellDC}, Attack=${spellData.spellAttack}`);
        }
    } catch (error) {
        console.error('Error calculating spell stats:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    const abilitySelect = document.getElementById('abilitySelect');
    if (abilitySelect) {
        abilitySelect.addEventListener('change', async function() {
            spellData.spellcastingAbility = this.value;
            await calculateSpellStats();
        });
    }
});

async function loadData() {
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) { showError('No character selected'); return; }
    showLoading(true);
    try {
        const response = await fetch(`/api/game/loadSpells/${characterId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            if (result.spells) {
                spellData = result.spells;
                for (let i = 0; i <= 9; i++) {
                    if (!spellData.spellSlots[i]) {
                        spellData.spellSlots[i] = { max: 0, remaining: 0, spells: [] };
                    }
                }
            }
            renderUI();
            if (spellData.spellcastingAbility) await calculateSpellStats();
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

async function saveData() {
    if (isLoading) return;
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) { console.error('No character selected'); return false; }
    try {
        const response = await fetch(`/api/game/saveSpells/${characterId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spellData)
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') return true;
        throw new Error(result.message || 'Failed to save spells');
    } catch (error) {
        console.error('Error saving spells:', error);
        showError(`Failed to save: ${error.message}`);
        return false;
    }
}

async function saveSpellStats() {
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) return;
    try {
        const response = await fetch(`/api/game/updateSpellStats/${characterId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

function renderUI() {
    document.getElementById('spellDC').textContent = spellData.spellDC;
    document.getElementById('spellAttack').textContent = spellData.spellAttack >= 0 ?
        `+${spellData.spellAttack}` : `${spellData.spellAttack}`;
    const abilitySelect = document.getElementById('abilitySelect');
    if (abilitySelect && spellData.spellcastingAbility) {
        abilitySelect.value = spellData.spellcastingAbility;
    }
    renderSpellLevels();
}

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

function generateSlotCircles(level, max, remaining) {
    let html = '';
    for (let i = 0; i < max; i++) {
        const used = i >= remaining;
        html += `<div class="spell-slot ${used ? 'used' : ''}" onclick="window.toggleSlot(${level}, ${i})"></div>`;
    }
    return html;
}

function renderSpellList(level, spells) {
    if (!spells || spells.length === 0) return '<p class="text-muted">No spells at this level</p>';
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

window.openSpellModal = function(level) {
    document.getElementById('spellLevel').value = level;
    document.getElementById('spellId').value = '';
    document.getElementById('spellForm').reset();
    document.getElementById('spellModalTitle').textContent = 'Add New Spell';
    new bootstrap.Modal(document.getElementById('spellModal')).show();
};

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
    if (!spell.name || !spell.school || !spell.casting || !spell.range || !spell.description) {
        showError('Please fill in all required fields');
        return;
    }
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) { showError('No character selected'); return; }
    try {
        const response = await fetch(`/api/game/addSpell/${characterId}/${level}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spell)
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            if (!spellData.spellSlots[level].spells) spellData.spellSlots[level].spells = [];
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
    ["school-Abjuration","school-Conjuration","school-Divination","school-Enchantment",
     "school-Evocation","school-Illusion","school-Necromancy","school-Transmutation"]
        .forEach(cls => school.classList.remove(cls));
    school.classList.add(`school-${spell.school}`);
    new bootstrap.Modal(document.getElementById('viewSpellModal')).show();
};

// ============================================================
// Grid area-effect helpers
// ============================================================

const GRID_ROWS = 8;
const GRID_COLS = 12;

function getSpellAreaCells(centerRow, centerCol) {
    const cells = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r = centerRow + dr;
            const c = centerCol + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
                cells.push({ row: r, col: c });
            }
        }
    }
    return cells;
}

async function highlightGridCells(cells, spellName) {
    const sessionId = localStorage.getItem('activeSessionId');
    if (!sessionId) {
        showError('No active game session found. Join a session before casting.');
        return;
    }
    const centre = cells[Math.floor(cells.length / 2)];
    try {
        const response = await fetch(`/api/grid/session/${sessionId}/effect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                row:   centre.row,
                col:   centre.col,
                color: '#9B59B6',
                label: spellName
            })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            console.warn('Grid effect failed:', result.message);
            showError(`Grid effect failed: ${result.message}`);
        } else {
            console.log(`✨ "${spellName}" effect placed at row=${centre.row}, col=${centre.col}`);
        }
    } catch (err) {
        console.error('Grid effect request error:', err);
        showError('Network error sending spell effect to grid.');
    }
}

window.useSpell = async function() {
    if (!currentSpell) return;

    const spellName = currentSpell.name;
    let figureRow = null;
    let figureCol = null;

    try {
        const statusRes = await fetch('/api/webcam/status');
        if (!statusRes.ok) { showError('Could not reach the webcam service.'); return; }

        const status = await statusRes.json();

        if (!status.active) {
            showError('Webcam is not active. Start the webcam feed before casting.');
            return;
        }
        if (!status.has_snapshot) {
            showError('No snapshot taken yet. Capture a frame from the webcam first.');
            return;
        }

        const vision = status.last_vision_result;
        if (!vision) {
            showError("Snapshot exists but vision hasn't run. Try capturing a new frame.");
            return;
        }
        if (vision.status !== 'success') {
            showError(`Vision error: ${vision.message}`);
            return;
        }

        figureRow = vision.row;
        figureCol = vision.col;

    } catch (err) {
        console.error('Failed to fetch webcam status:', err);
        showError('Network error reaching webcam service.');
        return;
    }

    const areaCells = getSpellAreaCells(figureRow, figureCol);
    console.log(
        `🔮 "${spellName}" fired at row=${figureRow}, col=${figureCol} →`,
        areaCells.map(c => `(${c.row},${c.col})`).join(' ')
    );

    await highlightGridCells(areaCells, spellName);
    showSuccess(`${spellName} cast! 3×3 area at row ${figureRow}, col ${figureCol}.`);
};

window.deleteSpell = async function(level, index) {
    if (!confirm('Are you sure you want to delete this spell?')) return;
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) { showError('No character selected'); return; }
    try {
        const response = await fetch(`/api/game/deleteSpell/${characterId}/${level}/${index}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
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

window.updateMaxSlots = async function(level, value) {
    const max = parseInt(value) || 0;
    const remaining = Math.min(spellData.spellSlots[level].remaining, max);
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) return;
    try {
        const response = await fetch(`/api/game/updateSpellSlots/${characterId}/${level}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max, remaining })
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

window.toggleSlot = async function(level, index) {
    const levelData = spellData.spellSlots[level];
    const newRemaining = index < levelData.remaining ? index : index + 1;
    const characterId = localStorage.getItem('selectedCharacterId');
    if (!characterId) return;
    try {
        const response = await fetch(`/api/game/updateSpellSlots/${characterId}/${level}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max: levelData.max, remaining: newRemaining })
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

document.getElementById('spellDCInput').addEventListener('change', (e) => {
    spellData.spellDC = parseInt(e.target.value) || 10;
    saveSpellStats();
    renderUI();
});

document.getElementById('spellAttackInput').addEventListener('change', (e) => {
    spellData.spellAttack = parseInt(e.target.value) || 0;
    saveSpellStats();
    renderUI();
});

function showLoading(show) {
    if (show) {
        if (!document.getElementById('spellsLoadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'spellsLoadingOverlay';
            overlay.style.cssText = `
                position:fixed;top:0;left:0;width:100%;height:100%;
                background-color:rgba(44,47,51,0.9);display:flex;
                justify-content:center;align-items:center;z-index:9999;`;
            overlay.innerHTML = `
                <div style="text-align:center;">
                    <div class="spinner-border text-primary" style="width:3rem;height:3rem;" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p style="color:#ffffff;margin-top:20px;">Loading spells...</p>
                </div>`;
            document.body.appendChild(overlay);
        }
    } else {
        document.getElementById('spellsLoadingOverlay')?.remove();
    }
}

function showError(message) {
    const container = document.querySelector('.container.mt-4');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    if (container) container.insertBefore(errorDiv, container.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const container = document.querySelector('.container.mt-4');
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success alert-dismissible fade show';
    successDiv.role = 'alert';
    successDiv.innerHTML = `
        <i class="bi bi-check-circle-fill me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    if (container) container.insertBefore(successDiv, container.firstChild);
    setTimeout(() => successDiv.remove(), 3000);
}