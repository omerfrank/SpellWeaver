document.addEventListener('DOMContentLoaded', function() {
    loadCharacters();
});

// Load characters from our Flask server
async function loadCharacters() {
    showLoading(true);
    
    try {
        const response = await fetch('/player/api/characters');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayCharacters(data.characters);
        } else {
            console.error('Failed to load characters:', data.message);
            displayCharacters([]); // Show empty grid
        }
        
    } catch (error) {
        console.error('Error fetching characters:', error);
        displayCharacters([]); // Show empty grid on error
    } finally {
        showLoading(false);
    }
}

// Display characters on the page
function displayCharacters(characters) {
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = '';

    // Add each character card
    if (characters.length > 0) {
        characters.forEach(character => {
            const col = document.createElement('div');
            col.className = 'col';
            col.innerHTML = createCharacterCard(character);
            grid.appendChild(col);
        });
    }

    // Add "Create New Character" card
    const createCol = document.createElement('div');
    createCol.className = 'col';
    createCol.innerHTML = createNewCharacterCard();
    grid.appendChild(createCol);
}

// Create character card HTML
function createCharacterCard(character) {
    // Use default values if data is missing
    const imageUrl = character.imageUrl || '/static/img/paldin.webp'; // A default image
    const charName = character.name || 'No Name';
    const charRace = character.race || 'Unknown';
    const charClass = character.class || 'Adventurer';
    const charLevel = character.level || 1;
    const charHp = character.hp || 10;
    const charMaxHp = character.maxHp || 10;
    const charAc = character.ac || 10;
    const charProf = character.proficiencyBonus || 2;

    return `
        <div class="character-card" onclick="selectCharacter('${character.id}')">
            <img class="character-avatar" src="${imageUrl}" alt="${charName}">
            <div class="character-name">${charName}</div>
            <div class="character-info">
                ${charRace} ${charClass} • Level ${charLevel}
            </div>
            <div class="character-stats">
                <div class="stat-item">
                    <div class="stat-label">HP</div>
                    <div class="stat-value">${charHp}/${charMaxHp}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">AC</div>
                    <div class="stat-value">${charAc}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Prof</div>
                    <div class="stat-value">+${charProf}</div>
                </div>
            </div>
        </div>
    `;
}

// Create "New Character" card HTML
function createNewCharacterCard() {
    return `
        <div class="create-character-card" onclick="createNewCharacter()">
            <div class="create-icon">
                <i class="fas fa-plus-circle"></i>
            </div>
            <h4>Create New Character</h4>
            <p class="text-muted">Start a new adventure</p>
        </div>
    `;
}

// Show/hide loading state
function showLoading(show) {
    document.getElementById('loadingContainer').style.display = show ? 'block' : 'none';
    document.getElementById('charactersContainer').style.display = show ? 'none' : 'block';
}

// Select a character
function selectCharacter(characterId) {
    console.log('Selected character:', characterId);
    
    // Save selected character ID to local storage to be picked up by other pages
    window.localStorage.setItem("characterId", characterId);
    
    // Redirect to the character showcase page
    window.location.href = "/player/showcase";
}

// Create new character
function createNewCharacter() {
    console.log('Redirecting to create character page');
    // Redirect to the create character page
    window.location.href = "/player/createCharacter";
}

function logout() {
    // We can use the server's logout route
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        window.location.href = '/api/auth/logout';
    }
}