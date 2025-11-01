// Character data structure
const character = {
    abilities: {
        str: { score: 10, savingThrowProficient: false },
        dex: { score: 14, savingThrowProficient: false },
        con: { score: 12, savingThrowProficient: false },
        int: { score: 13, savingThrowProficient: false },
        wis: { score: 15, savingThrowProficient: false },
        cha: { score: 8, savingThrowProficient: false }
    },
    skills: {},
    bonuses: {
        initiative: 0,
        passivePerception: 0
    },
    acSettings: {
        dexLimit: null, // null means no limit
        bonus: 0
    },
    proficiencyBonus: 2
};

// Skills data
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

// Calculate ability modifier
function getAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}
function checkedSkill(ability, state){
    const checkedSkill = document.getElementById(ability)
    if (state){
        checkedSkill.classList.add("checked-skill")
    }
    else{

        checkedSkill.classList.remove("checked-skill")
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
}

// Update saving throw proficiency
function updateSavingThrowProficiency(ability, proficient) {
    character.abilities[ability].savingThrowProficient = proficient;
    refreshDisplay();
}

// Update skill proficiency
function updateSkillProficiency(skill, proficient) {
    character.skills[skill].proficient = proficient;
    refreshDisplay();
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
    const total = 10 + dexModifier + character.bonuses.initiative;
    const totalText = total >= 10 ? `+${total - 10}` : `${total - 10}`;
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
    if (newHP > maxHP){
        currentHPInput.classList.remove("bleeding");
        currentHPInput.classList.add("tmp-hp");
    }
    else if (newHP < maxHP/2){
        currentHPInput.classList.add("bleeding");
        currentHPInput.classList.remove("tmp-hp");
    }
    else{
        currentHPInput.classList.remove("bleeding");
        currentHPInput.classList.remove("tmp-hp");
    }
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

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    generateAbilityScores();
    generateSkills();
    calculateInitiative();
    calculatePassivePerception();
    calculateAC();
});