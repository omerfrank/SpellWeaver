// Sample data for testing (Firebase will be added later)
let spellData = {
    spellDC: 15,
    spellAttack: 7,
    spellSlots: {
        0: {
            max: 0,
            remaining: 0,
            spells: [
                {
                    name: "Fire Bolt",
                    school: "Evocation",
                    casting: "1 Action",
                    range: "120 feet",
                    description: "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.",
                    higherLevel: "This spell's damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10)."
                },
                {
                    name: "Mage Hand",
                    school: "Conjuration",
                    casting: "1 Action",
                    range: "30 feet",
                    description: "A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action.",
                    higherLevel: ""
                }
            ]
        },
        1: {
            max: 4,
            remaining: 2,
            spells: [
                {
                    name: "Magic Missile",
                    school: "Evocation",
                    casting: "1 Action",
                    range: "120 feet",
                    description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.",
                    higherLevel: "When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st."
                },
                {
                    name: "Shield",
                    school: "Abjuration",
                    casting: "1 Reaction",
                    range: "Self",
                    description: "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC.",
                    higherLevel: ""
                }
            ]
        },
        2: {
            max: 3,
            remaining: 3,
            spells: [
                {
                    name: "Misty Step",
                    school: "Conjuration",
                    casting: "1 Bonus Action",
                    range: "Self",
                    description: "Briefly surrounded by silvery mist, you teleport up to 30 feet to an unoccupied space that you can see.",
                    higherLevel: ""
                }
            ]
        },
        3: {
            max: 3,
            remaining: 1,
            spells: [
                {
                    name: "Fireball",
                    school: "Evocation",
                    casting: "1 Action",
                    range: "150 feet",
                    description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.",
                    higherLevel: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd."
                }
            ]
        },
        4: { max: 2, remaining: 2, spells: [] },
        5: { max: 1, remaining: 0, spells: [] },
        6: { max: 0, remaining: 0, spells: [] },
        7: { max: 0, remaining: 0, spells: [] },
        8: { max: 0, remaining: 0, spells: [] },
        9: { max: 0, remaining: 0, spells: [] }
    }
};

// Load data (currently uses sample data, will use Firebase later)
function loadData() {
    renderUI();
}

// Save data (currently logs to console, will use Firebase later)
function saveData() {
    console.log('Data saved:', spellData);
}

// Render the entire UI
function renderUI() {
    document.getElementById('spellDC').textContent = spellData.spellDC;
    document.getElementById('spellAttack').textContent = `+${spellData.spellAttack}`;
    renderSpellLevels();
}

// Render spell levels
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

// Generate slot circles
function generateSlotCircles(level, max, remaining) {
    let html = '';
    for (let i = 0; i < max; i++) {
        const used = i >= remaining;
        html += `<div class="spell-slot ${used ? 'used' : ''}" onclick="window.toggleSlot(${level}, ${i})"></div>`;
    }
    return html;
}

// Render spell list
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

// Global functions
window.openSpellModal = function(level) {
    document.getElementById('spellLevel').value = level;
    document.getElementById('spellId').value = '';
    document.getElementById('spellForm').reset();
    document.getElementById('spellModalTitle').textContent = 'Add New Spell';
    new bootstrap.Modal(document.getElementById('spellModal')).show();
};
window.saveSpell = function() {
    const level = parseInt(document.getElementById('spellLevel').value);
    const spell = {
        name: document.getElementById('spellName').value,
        school: document.getElementById('spellSchool').value,
        casting: document.getElementById('spellCasting').value,
        range: document.getElementById('spellRange').value,
        description: document.getElementById('spellDescription').value,
        higherLevel: document.getElementById('spellHigherLevel').value
    };

    if (!spellData.spellSlots[level].spells) {
        spellData.spellSlots[level].spells = [];
    }

    spellData.spellSlots[level].spells.push(spell);
    saveData();
    renderUI();
    
    bootstrap.Modal.getInstance(document.getElementById('spellModal')).hide();
};
let currentSpell = null;
window.viewSpell = function(level, index) {
    const spell = spellData.spellSlots[level].spells[index];
    currentSpell = {name:spell.name,range:spell.range};
    // Populate modal with spell details
    document.getElementById('viewSpellName').textContent = spell.name;
    document.getElementById('viewSpellSchool').textContent = spell.school;
    document.getElementById('viewSpellCasting').textContent = spell.casting;
    document.getElementById('viewSpellRange').textContent = spell.range;
    document.getElementById('viewSpellDescription').textContent = spell.description;
    
    // Show/hide "At Higher Levels" section
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
    // Add the current school class
    school.classList.add(`school-${spell.school}`);

    // Show the modal
    new bootstrap.Modal(document.getElementById('viewSpellModal')).show();
};
window.useSpell = function () {
    alert(currentSpell.name);
}
window.deleteSpell = function(level, index) {
    if (confirm('Are you sure you want to delete this spell?')) {
        spellData.spellSlots[level].spells.splice(index, 1);
        saveData();
        renderUI();
    }
};

window.updateMaxSlots = function(level, value) {
    const max = parseInt(value);
    spellData.spellSlots[level].max = max;
    spellData.spellSlots[level].remaining = Math.min(spellData.spellSlots[level].remaining, max);
    saveData();
    renderUI();
};

window.toggleSlot = function(level, index) {
    const levelData = spellData.spellSlots[level];
    if (index < levelData.remaining) {
        levelData.remaining = index;
    } else {
        levelData.remaining = index + 1;
    }
    saveData();
    renderUI();
};
// Update spell stats
document.getElementById('spellDCInput').addEventListener('change', (e) => {
    spellData.spellDC = parseInt(e.target.value);
    saveData();
    renderUI();
});

document.getElementById('spellAttackInput').addEventListener('change', (e) => {
    spellData.spellAttack = parseInt(e.target.value);
    saveData();
    renderUI();
});

// Initialize
loadData();