// showcase.js - Fetches and displays character data

let currentCharacter = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadCharacterData();
});

/**
 * Load character data from the server
 */
async function loadCharacterData() {
    try {
        // Get the selected character ID from localStorage
        const characterId = localStorage.getItem('selectedCharacterId');
        
        if (!characterId) {
            showError('No character selected. Redirecting to character select...');
            setTimeout(() => {
                window.location.href = '/player/characterSelect';
            }, 2000);
            return;
        }

        // Show loading state
        showLoading(true);

        // Fetch the specific character directly
        const response = await fetch(`/api/game/character/${characterId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            currentCharacter = result.character;
            displayCharacter(currentCharacter);
        } else {
            throw new Error(result.message || 'Failed to load character data');
        }
        
    } catch (error) {
        console.error('Error loading character:', error);
        showError(`Failed to load character: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

/**
 * Display character data in the UI
 */
function displayCharacter(character) {
    // Character image
    const imageElement = document.querySelector('.character-art');
    if (imageElement && character.img) {
        imageElement.src = character.img;
        imageElement.alt = character.name || 'Character';
    }

    // Character name
    const nameElement = document.querySelector('.showcase-main-card h1');
    if (nameElement) {
        nameElement.textContent = character.name || 'Unknown Character';
    }

    // Character class and level
    const classElement = document.querySelector('.showcase-main-card .text-secondary');
    if (classElement) {
        const level = character.level || 1;
        const charClass = character.class || 'Adventurer';
        let title = level < 3 ? 'Unkonwn': level < 5 ? "Trained" : level < 10 ? "Expert" : level < 15 ? "Master" : "Legendary";
        classElement.textContent = `Level ${level} ${title} ${charClass}`.trim();
    }

    // HP
    const hpElement = document.querySelector('.text-danger');
    if (hpElement) {
        const currentHp = character.hp || 0;
        const maxHp = character.maxHp || 10;
        hpElement.textContent = `${currentHp}/${maxHp}`;
        
        // Add color coding based on HP percentage
        const hpPercentage = (currentHp / maxHp) * 100;
        if (hpPercentage > 50) {
            hpElement.classList.remove('text-danger');
            hpElement.classList.add('text-success');
        } else if (hpPercentage > 25) {
            hpElement.classList.remove('text-danger', 'text-success');
            hpElement.classList.add('text-warning');
        }
    }

    // AC
    const acElements = document.querySelectorAll('.text-light');
    if (acElements.length >= 1) {
        acElements[0].textContent = character.ac || 10;
    }

    // Speed
    if (acElements.length >= 2) {
        const speed = character.speed || 30;
        acElements[1].textContent = `${speed}ft`;
    }

    // Ability scores (STR, DEX, CON, INT, WIS, CHA)
    if (character.abilities) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const statCircles = document.querySelectorAll('.stat-circle span');
        
        abilities.forEach((ability, index) => {
            if (statCircles[index] && character.abilities[ability]) {
                const score = character.abilities[ability].score || 10;
                const modifier = calculateModifier(score);
                const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                statCircles[index].textContent = modifierText;
            }
        });
    }

    // Background
    const backgroundElement = document.getElementById('Background');
    if (backgroundElement && character.background) {
        const background = character.background.charBackground || 
                          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
        backgroundElement.textContent = background;
    }
}

/**
 * Calculate ability modifier from score
 */
function calculateModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Show/hide loading state
 */
function showLoading(show) {
    const mainContent = document.querySelector('.main-content');
    
    if (show) {
        // Create loading overlay if it doesn't exist
        if (!document.getElementById('loadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
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
                    <p style="color: #ffffff; margin-top: 20px;">Loading character...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
    } else {
        // Remove loading overlay
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
}

/**
 * Show error message
 */
function showError(message) {
    const mainContent = document.querySelector('.main-content');
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger m-4';
    errorDiv.role = 'alert';
    errorDiv.innerHTML = `
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        ${message}
    `;
    
    // Insert at the beginning of main content
    if (mainContent) {
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
    }
}

/**
 * Refresh character data
 */
function refreshCharacter() {
    loadCharacterData();
}

// Export functions for potential use by other scripts
window.refreshCharacter = refreshCharacter;