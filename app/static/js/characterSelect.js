// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadCharacters();
});

// Load characters from Flask API
async function loadCharacters() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/game/characters', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            const characters = result.characters || [];
            displayCharacters(characters);
        } else {
            throw new Error(result.message || 'Failed to load characters');
        }
        
    } catch (error) {
        console.error('Error loading characters:', error);
        showError('Failed to load characters. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Display characters on the page
function displayCharacters(characters) {
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = '';

    // Add each character card
    characters.forEach(character => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = createCharacterCard(character);
        grid.appendChild(col);
    });

    // Add "Create New Character" card
    const createCol = document.createElement('div');
    createCol.className = 'col';
    createCol.innerHTML = createNewCharacterCard();
    grid.appendChild(createCol);
}


// Create character card HTML
function createCharacterCard(character) {
    // Handle Firebase data structure - use the pushed key as ID if characterId not set
    const charId = character.characterId || 'unknown';
    const charName = character.name || 'Unknown Character';
    const charImg = character.img || '/static/img/Adventurer.webp'; // Default image
    const charClass = character.class || 'Adventurer';
    const charLevel = character.level || 1;
    const charHp = character.hp || 10;
    const charMaxHp = character.maxHp || 10;
    const charAc = character.ac || 10;
    const charProf = character.proficiencyBonus || 2;

    return `
        <div class="character-card" onclick="selectCharacter('${charId}')">
            <button class="character-card-delete-btn" onclick="event.stopPropagation(); deleteCharacter('${charId}', '${charName}')" title="Delete Character">
                <i class="fas fa-trash"></i>
            </button>
            <img class="character-avatar" src="${charImg}" alt="${charName}">
            <div class="character-name">${charName}</div>
            <div class="character-info">
                ${charClass} • Level ${charLevel}
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
async function deleteCharacter(characterId, characterName) {
    
    // 1. Confirm with the user before doing anything
    if (!confirm(`Are you sure you want to delete "${characterName}"? This action cannot be undone.`)) {
        return; // Stop if the user clicks "Cancel"
    }

    // 2. Show the loading spinner
    showLoading(true);

    try {
        // 3. Call the backend API using the DELETE method
        const response = await fetch(`/api/game/deleteCharacter/${characterId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        // 4. Check if the server responded successfully
        if (response.ok && result.status === 'success') {
            console.log(result.message); // Log success message
            
            // 5. Reload the character list to remove the deleted card.
            //    loadCharacters() will also call showLoading(false) for us when it's done.
            loadCharacters();
            
        } else {
            // 6. Handle errors reported by the server (e.g., "not logged in", "failed to delete")
            throw new Error(result.message || 'An unknown error occurred.');
        }

    } catch (error) {
        // 7. Handle network errors (e.g., fetch failed) or errors thrown above
        console.error('Error deleting character:', error);
        alert(`Error: ${error.message}`);
        
        // 8. Make sure to hide the loading spinner if an error occurs
        showLoading(false);
    }
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

// Show error message
function showError(message) {
    const container = document.getElementById('charactersContainer');
    container.innerHTML = `
        <div class="alert alert-danger text-center" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
            <button class="btn btn-primary mt-3 d-block mx-auto" onclick="loadCharacters()">
                <i class="fas fa-redo me-2"></i>Retry
            </button>
        </div>
    `;
}

// Select a character
function selectCharacter(characterId) {
    console.log('Selected character:', characterId);
    
    // Store selected character ID in localStorage
    localStorage.setItem('selectedCharacterId', characterId);
    
    // Redirect to character sheet or game page
    window.location.href = '/player/showcase';
}

// Create new character
function createNewCharacter() {
    console.log('Creating new character');
    window.location.href = '/player/createCharacter';
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Redirect to logout endpoint
        window.location.href = '/api/auth/logout';
    }
}