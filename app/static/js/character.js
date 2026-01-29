// Get character ID from local storage
const characterId = localStorage.getItem('selectedCharacterId');

if (!characterId) {
    alert('No character selected. Redirecting to character selection...');
    window.location.href = '/player/characterSelect';
}

// Character data structure - will be populated from database
let character = {
    characterId: characterId,
    name: '',
    class: '',
    level: 1,
    race: '',
    hp: 10,
    maxHp: 10,
    ac: 10,
    speed: 30,
    proficiencyBonus: 2,
    abilities: {
        str: { score: 10, savingThrowProficient: false },
        dex: { score: 10, savingThrowProficient: false },
        con: { score: 10, savingThrowProficient: false },
        int: { score: 10, savingThrowProficient: false },
        wis: { score: 10, savingThrowProficient: false },
        cha: { score: 10, savingThrowProficient: false }
    },
    skills: {},
    bonuses: {
        initiative: 0,
        passivePerception: 0
    },
    acSettings: {
        dexLimit: null,
        bonus: 0
    }
};

// Skills data with default structure
const skillsData = {
    'Athletics': { ability: 'str', proficient: false },
    'Acrobatics': { ability: 'dex', proficient: false },
    'Sleight of Hand': { ability: 'dex', proficient: false },
    'Stealth': { ability: 'dex', proficient: false },
    'Arcana': { ability: 'int', proficient: false },
    'History': { ability: 'int', proficient: false },
    'Investigation': { ability: 'int', proficient: false },
    'Nature': { ability: 'int', proficient: false },
    'Religion': { ability: 'int', proficient: false },
    'Animal Handling': { ability: 'wis', proficient: false },
    'Insight': { ability: 'wis', proficient: false },
    'Medicine': { ability: 'wis', proficient: false },
    'Perception': { ability: 'wis', proficient: false },
    'Survival': { ability: 'wis', proficient: false },
    'Deception': { ability: 'cha', proficient: false },
    'Intimidation': { ability: 'cha', proficient: false },
    'Performance': { ability: 'cha', proficient: false },
    'Persuasion': { ability: 'cha', proficient: false }
};

// Initialize skills
character.skills = { ...skillsData };

// Load character data from server
async function loadCharacterData() {
    try {
        const response = await fetch(`/api/game/character/${characterId}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const charData = data.character;
            
            // Update character object with database data
            character.name = charData.name || '';
            character.class = charData.class || 'Adventurer';
            character.level = charData.level || 1;
            character.race = charData.race || 'Unknown';
            character.hp = charData.hp || 10;
            character.maxHp = charData.maxHp || 10;
            character.ac = charData.ac || 10;
            character.speed = charData.speed || 30;
            character.proficiencyBonus = charData.proficiencyBonus || 2;
            
            // Load abilities
            if (charData.abilities) {
                character.abilities = charData.abilities;
            }
            
            // Load skills
            if (charData.skills) {
                character.skills = charData.skills;
            }
            
            // Calculate derived stats from saved AC
            // If AC is different from base 10, calculate the bonus
            const dexMod = getAbilityModifier(character.abilities.dex.score);
            character.acSettings.bonus = character.ac - (10 + dexMod);
            
            // Update UI with loaded data
            updateUIWithCharacterData();
            refreshDisplay();
            
            console.log('✅ Character data loaded successfully');
        } else {
            console.error('Failed to load character:', data.message);
            alert('Failed to load character data');
        }
    } catch (error) {
        console.error('Error loading character:', error);
        alert('Error loading character data');
    }
}

// Update UI elements with character data
function updateUIWithCharacterData() {
    document.getElementById('name').value = character.name;
    document.getElementById('level').value = `${character.class} ${character.level}`;    
    document.getElementById('currentHP').value = character.hp;
    document.getElementById('maxHP').value = character.maxHp;
    document.getElementById('speed').value = character.speed;
    
    // Update HP styling
    const currentHPInput = document.getElementById('currentHP');
    if (character.hp > character.maxHp) {
        currentHPInput.classList.add("tmp-hp");
        currentHPInput.classList.remove("bleeding");
    } else if (character.hp < character.maxHp / 2) {
        currentHPInput.classList.add("bleeding");
        currentHPInput.classList.remove("tmp-hp");
    } else {
        currentHPInput.classList.remove("bleeding");
        currentHPInput.classList.remove("tmp-hp");
    }
}
function processString(inputStr) {
  
  // Find all numbers (sequences of digits)
  // The 'g' flag means 'global' (find all matches)
  const numbers = inputStr.match(/\d+/g) || [];
  
  // Calculate the sum
  // .reduce() iterates over the array of number strings
  // parseInt() converts each string to an integer
  // 'acc' is the 'accumulator' (the running total), starting at 0
  const sum = numbers.reduce((acc, numStr) => acc + parseInt(numStr, 10), 0);
  
  // Find all words (sequences of letters)
  const words = inputStr.match(/[a-zA-Z]+/g) || [];
  const wordString = words.join(',');
  
  return {
    sum: sum,
    words: wordString
  };
}

// Save character data to server
async function saveCharacterData() {
    try {
        // Prepare data to save
        console.log(character.level, character.class);
        const { sum, words } = processString(document.getElementById('level').value);
        const dataToSave = {
            name: document.getElementById('name').value,
            level: sum,
            class: words,
            race: character.race,
            hp: parseInt(document.getElementById('currentHP').value),
            maxHp: parseInt(document.getElementById('maxHP').value),
            ac: parseInt(document.getElementById('ac').textContent),
            speed: parseInt(document.getElementById('speed').value),
            proficiencyBonus: character.proficiencyBonus,
            abilities: character.abilities,
            skills: character.skills
        };
        
        const response = await fetch(`/api/game/character/${characterId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSave)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('Character data saved successfully');
        } else {
            console.error('Failed to save character:', result.message);
        }
    } catch (error) {
        console.error('Error saving character:', error);
    }
}


// Auto-save functionality - save whenever data changes
let saveTimeout;
function scheduleSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCharacterData();
    }, 1000); // Save 1 second after last change
}

// Calculate ability modifier
function getAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

function checkedSkill(ability, state) {
    const checkedSkill = document.getElementById(ability);
    if (state) {
        checkedSkill.classList.add("checked-skill");
    } else {
        checkedSkill.classList.remove("checked-skill");
    }
}

// Generate ability scores HTML
function generateAbilityScores() {
    const container = document.getElementById('abilityScores');
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const abilityNames = {
        str: 'Strength',
        dex: 'Dexterity',
        con: 'Constitution',
        int: 'Intelligence',
        wis: 'Wisdom',
        cha: 'Charisma'
    };

    container.innerHTML = '';
    abilities.forEach(ability => {
        const modifier = getAbilityModifier(character.abilities[ability].score);
        const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
        
        container.innerHTML += `
            <div class="col-md-4 col-lg-2 mb-3">
                <div class="stat-box" id="${ability}s">
                    <h6>${abilityNames[ability]}</h6>
                    <input type="number" class="form-control text-center mb-2" 
                           value="${character.abilities[ability].score}" 
                           onchange="updateAbilityScore('${ability}', this.value)">
                    <div class="stat-bonus">${modifierText}</div>
                    <div class="custom-checkbox mt-2">
                        <input type="checkbox" id="${ability}Save" ${character.abilities[ability].savingThrowProficient ? 'checked' : ''}
                               onchange="updateSavingThrowProficiency('${ability}', this.checked); checkedSkill('${ability}s',this.checked)">
                        <span class="checkmark"></span>
                    </div>
                    <label for="${ability}Save" style="font-size: 0.8rem; cursor: pointer;" class="mt-1">
                        Save Proficient
                    </label>
                    <div class="mt-1">
                        <small>Save: ${getSavingThrowBonus(ability)}</small>
                    </div>
                </div>
            </div>
        `;
        if (character.abilities[ability].savingThrowProficient) {
            checkedSkill(ability + 's', true);
        }
    });
}

// Generate skills HTML
function generateSkills() {
    const container = document.getElementById('skillsList');
    const skillCategories = {
        'Strength': ['Athletics'],
        'Dexterity': ['Acrobatics', 'Sleight of Hand', 'Stealth'],
        'Intelligence': ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
        'Wisdom': ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
        'Charisma': ['Deception', 'Intimidation', 'Performance', 'Persuasion']
    };

    container.innerHTML = '';
    Object.entries(skillCategories).forEach(([category, skills]) => {
        container.innerHTML += `<h6 class="mt-3 mb-2">${category}</h6>`;
        
        skills.forEach(skill => {
            const skillData = character.skills[skill];
            const bonus = getSkillBonus(skill);
            const bonusText = bonus >= 0 ? `+${bonus}` : `${bonus}`;
            
            container.innerHTML += `
                <div class="skill-row d-flex justify-content-between align-items-center" id="${skill}">
                    <div class="d-flex align-items-center">
                        <div class="custom-checkbox me-3">
                            <input type="checkbox" id="skill${skill.replace(/\s+/g, '')}" ${skillData.proficient ? 'checked' : ''}
                                   onchange="updateSkillProficiency('${skill}', this.checked); checkedSkill('${skill}',this.checked)">
                            <span class="checkmark"></span>
                        </div>
                        <label for="skill${skill.replace(/\s+/g, '')}" class="mb-0" style="cursor: pointer; font-weight: 500;">${skill}</label>
                    </div>
                    <span class="stat-bonus">${bonusText}</span>
                </div>
            `;
            if (character.skills[skill].proficient) {
                checkedSkill(skill, true);
            }
        });
    });
}

// Update ability score
function updateAbilityScore(ability, newScore) {
    character.abilities[ability].score = parseInt(newScore) || 10;
    refreshDisplay();
    scheduleSave();
}

// Update saving throw proficiency
function updateSavingThrowProficiency(ability, proficient) {
    character.abilities[ability].savingThrowProficient = proficient;
    refreshDisplay();
    scheduleSave();
}

// Update skill proficiency
function updateSkillProficiency(skill, proficient) {
    character.skills[skill].proficient = proficient;
    refreshDisplay();
    scheduleSave();
}

// Get saving throw bonus
function getSavingThrowBonus(ability) {
    const modifier = getAbilityModifier(character.abilities[ability].score);
    const proficiencyBonus = character.abilities[ability].savingThrowProficient ? character.proficiencyBonus : 0;
    const total = modifier + proficiencyBonus;
    return total >= 0 ? `+${total}` : `${total}`;
}

// Get skill bonus
function getSkillBonus(skillName) {
    const skill = character.skills[skillName];
    const abilityModifier = getAbilityModifier(character.abilities[skill.ability].score);
    const proficiencyBonus = skill.proficient ? character.proficiencyBonus : 0;
    return abilityModifier + proficiencyBonus;
}

// Calculate initiative
function calculateInitiative() {
    const dexModifier = getAbilityModifier(character.abilities.dex.score);
    const total = dexModifier + character.bonuses.initiative;
    const totalText = total >= 0 ? `+${total}` : `${total}`;
    document.getElementById('initiativeTotal').textContent = totalText;
}

// Calculate passive perception
function calculatePassivePerception() {
    const wisModifier = getAbilityModifier(character.abilities.wis.score);
    const proficiencyBonus = character.skills['Perception'].proficient ? character.proficiencyBonus : 0;
    const total = 10 + wisModifier + proficiencyBonus + character.bonuses.passivePerception;
    document.getElementById('passivePerceptionTotal').textContent = total;
}

// Calculate AC
function calculateAC() {
    const dexModifier = getAbilityModifier(character.abilities.dex.score);
    const effectiveDexModifier = character.acSettings.dexLimit !== null ? 
        Math.min(dexModifier, character.acSettings.dexLimit) : dexModifier;
    const total = 10 + effectiveDexModifier + character.acSettings.bonus;
    document.getElementById('ac').textContent = total;
}

// Change HP
function changeHP(amount) {
    const currentHPInput = document.getElementById('currentHP');
    const maxHP = parseInt(document.getElementById('maxHP').value) || 0;
    let newHP = parseInt(currentHPInput.value) + amount;
    newHP = Math.max(0, newHP);
    currentHPInput.value = newHP;
    
    if (newHP > maxHP) {
        currentHPInput.classList.remove("bleeding");
        currentHPInput.classList.add("tmp-hp");
    } else if (newHP < maxHP / 2) {
        currentHPInput.classList.add("bleeding");
        currentHPInput.classList.remove("tmp-hp");
    } else {
        currentHPInput.classList.remove("bleeding");
        currentHPInput.classList.remove("tmp-hp");
    }
    
    scheduleSave();
}

// Modal handling
let currentBonusType = '';

function openBonusModal(bonusType) {
    currentBonusType = bonusType;
    const modal = new bootstrap.Modal(document.getElementById('bonusModal'));
    const modalTitle = document.getElementById('bonusModalTitle');
    const bonusInput = document.getElementById('bonusInput');
    const proficiencyContainer = document.getElementById('proficiencyCheckContainer');
    const proficiencyCheck = document.getElementById('proficiencyCheck');
    const dexLimitContainer = document.getElementById('dexLimitContainer');
    const dexLimitInput = document.getElementById('dexLimitInput');

    if (bonusType === 'initiative') {
        modalTitle.textContent = 'Initiative Bonuses';
        bonusInput.value = character.bonuses.initiative;
        proficiencyContainer.style.display = 'none';
        dexLimitContainer.style.display = 'none';
    } else if (bonusType === 'passivePerception') {
        modalTitle.textContent = 'Passive Perception Bonuses';
        bonusInput.value = character.bonuses.passivePerception;
        proficiencyContainer.style.display = 'block';
        proficiencyCheck.checked = character.skills['Perception'].proficient;
        dexLimitContainer.style.display = 'none';
    } else if (bonusType === 'ac') {
        modalTitle.textContent = 'Armor Class Settings';
        bonusInput.value = character.acSettings.bonus;
        proficiencyContainer.style.display = 'none';
        dexLimitContainer.style.display = 'block';
        dexLimitInput.value = character.acSettings.dexLimit || '';
    }

    modal.show();
}

function saveBonuses() {
    const bonusInput = document.getElementById('bonusInput');
    const proficiencyCheck = document.getElementById('proficiencyCheck');
    const dexLimitInput = document.getElementById('dexLimitInput');

    if (currentBonusType === 'initiative') {
        character.bonuses.initiative = parseInt(bonusInput.value) || 0;
        calculateInitiative();
    } else if (currentBonusType === 'passivePerception') {
        character.bonuses.passivePerception = parseInt(bonusInput.value) || 0;
        character.skills['Perception'].proficient = proficiencyCheck.checked;
        calculatePassivePerception();
        refreshDisplay();
    } else if (currentBonusType === 'ac') {
        character.acSettings.bonus = parseInt(bonusInput.value) || 0;
        character.acSettings.dexLimit = dexLimitInput.value ? parseInt(dexLimitInput.value) : null;
        calculateAC();
    }

    bootstrap.Modal.getInstance(document.getElementById('bonusModal')).hide();
    scheduleSave();
}

// Refresh display
function refreshDisplay() {
    // Clear containers
    document.getElementById('abilityScores').innerHTML = '';
    document.getElementById('skillsList').innerHTML = '';
    
    // Regenerate
    generateAbilityScores();
    generateSkills();
    calculateInitiative();
    calculatePassivePerception();
    calculateAC();
}

// Add event listeners for fields that should trigger save
function setupAutoSave() {
    document.getElementById('name').addEventListener('change', scheduleSave);
    document.getElementById('level').addEventListener('change', scheduleSave);
    document.getElementById('currentHP').addEventListener('change', scheduleSave);
    document.getElementById('maxHP').addEventListener('change', scheduleSave);
    document.getElementById('speed').addEventListener('change', scheduleSave);
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    await loadCharacterData();
    setupAutoSave();
});