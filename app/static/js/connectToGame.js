// Connect to Game JavaScript

let selectedCharacterId = null;
let characters = [];

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', function() {
    loadCharacters();
    setupGameCodeInput();
});

/**
 * Load user's characters
 */
async function loadCharacters() {
    try {
        const response = await fetch('/api/game/characters', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            characters = result.characters || [];
            displayCharacters(characters);
        } else {
            throw new Error(result.message || 'Failed to load characters');
        }
        
    } catch (error) {
        console.error('Error loading characters:', error);
        showAlert('Failed to load characters. Please try again.', 'danger');
    }
}

/**
 * Display character selection cards
 */
function displayCharacters(characters) {
    const container = document.getElementById('characterCardsContainer');
    
    if (characters.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1;">
                <p class="text-muted">No characters found.</p>
                <a href="/player/createCharacter" class="btn btn-primary mt-2">
                    <i class="fas fa-plus-circle me-2"></i>Create Character
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    characters.forEach(character => {
        const card = createCharacterCard(character);
        container.appendChild(card);
    });
    
    // Auto-select if only one character
    if (characters.length === 1) {
        selectCharacter(characters[0].characterId);
    }
}

/**
 * Create character selection card
 */
function createCharacterCard(character) {
    const card = document.createElement('div');
    card.className = 'character-select-card';
    card.onclick = () => selectCharacter(character.characterId);
    
    const charImg = character.img || '/static/img/Adventurer.webp';
    const charName = character.name || 'Unknown';
    const charClass = character.class || 'Adventurer';
    const charLevel = character.level || 1;
    
    card.innerHTML = `
        <div class="character-select-checkmark">
            <i class="fas fa-check"></i>
        </div>
        <div class="character-select-avatar">
            <img src="${charImg}" alt="${charName}">
        </div>
        <div class="character-select-name">${charName}</div>
        <div class="character-select-info">L${charLevel} ${charClass}</div>
    `;
    
    card.dataset.characterId = character.characterId;
    
    return card;
}

/**
 * Select a character
 */
function selectCharacter(characterId) {
    // Remove selected class from all cards
    document.querySelectorAll('.character-select-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    const selectedCard = document.querySelector(`[data-character-id="${characterId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    selectedCharacterId = characterId;
    
    // Enable game code input
    document.getElementById('gameCodeInput').disabled = false;
    document.querySelector('.btn-paste').disabled = false;
    
    // Check if connect button should be enabled
    validateForm();
}

/**
 * Setup game code input
 */
function setupGameCodeInput() {
    const input = document.getElementById('gameCodeInput');
    
    input.addEventListener('input', function(e) {
        // Only allow alphanumeric characters
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        
        // Limit to 6 characters
        if (this.value.length > 6) {
            this.value = this.value.substr(0, 6);
        }
        
        // Validate form
        validateForm();
    });
    
    // Handle paste event
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const cleaned = paste.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 6);
        this.value = cleaned;
        validateForm();
    });
}

/**
 * Paste from clipboard
 */
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const cleaned = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substr(0, 6);
        document.getElementById('gameCodeInput').value = cleaned;
        validateForm();
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        showAlert('Failed to read clipboard. Please paste manually.', 'warning');
    }
}

/**
 * Validate form
 */
function validateForm() {
    const gameCode = document.getElementById('gameCodeInput').value;
    const connectBtn = document.getElementById('connectBtn');
    
    // Enable connect button if both character is selected and game code is 6 digits
    if (selectedCharacterId && gameCode.length === 6) {
        connectBtn.disabled = false;
    } else {
        connectBtn.disabled = true;
    }
}

/**
 * Connect to game
 */
async function connectToGame() {
    const gameCode = document.getElementById('gameCodeInput').value;
    
    if (!selectedCharacterId) {
        showAlert('Please select a character first.', 'warning');
        return;
    }
    
    if (gameCode.length !== 6) {
        showAlert('Please enter a valid 6-digit game code.', 'warning');
        return;
    }
    
    // Disable inputs
    document.getElementById('connectBtn').disabled = true;
    document.getElementById('gameCodeInput').disabled = true;
    document.querySelector('.btn-paste').disabled = true;
    
    // Show connection status
    const statusDiv = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    statusDiv.style.display = 'block';
    statusText.textContent = 'Connecting to game...';
    
    try {
        // Get selected character info
        const selectedCharacter = characters.find(c => c.characterId === selectedCharacterId);
        
        const response = await fetch('/api/player/connectToSession', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_code: gameCode,
                character_id: selectedCharacterId,
                display_name: selectedCharacter.name
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            statusText.textContent = 'Connected! Redirecting...';
            statusDiv.querySelector('.spinner-border').classList.replace('text-primary', 'text-success');
            
            // Store session info
            localStorage.setItem('activeSessionId', result.session_id);
            localStorage.setItem('selectedCharacterId', selectedCharacterId);
            
            showAlert('Successfully connected to game!', 'success');
            
            // Redirect to player game view after 1.5 seconds
            setTimeout(() => {
                window.location.href = '/player/showcase';
            }, 1500);
            
        } else {
            throw new Error(result.message || 'Failed to connect to game');
        }
        
    } catch (error) {
        console.error('Error connecting to game:', error);
        showAlert(`Failed to connect: ${error.message}`, 'danger');
        
        // Re-enable inputs
        document.getElementById('connectBtn').disabled = false;
        document.getElementById('gameCodeInput').disabled = false;
        document.querySelector('.btn-paste').disabled = false;
        
        // Hide status
        statusDiv.style.display = 'none';
    }
}

/**
 * Show alert
 */
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

/**
 * Go back to character select
 */
function goBack() {
    window.location.href = '/player/characterSelect';
}

// Export functions for use in HTML
window.selectCharacter = selectCharacter;
window.pasteFromClipboard = pasteFromClipboard;
window.connectToGame = connectToGame;
window.goBack = goBack;