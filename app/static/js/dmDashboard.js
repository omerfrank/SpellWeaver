// DM Dashboard JavaScript

// Global state
let sessionId = null;
let campaignId = null;
let sessionCode = null;
let isPaused = false;
let refreshInterval = null;

/**
 * Initialize dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    sessionId = localStorage.getItem('activeSessionId');
    campaignId = localStorage.getItem('activeCampaignId');

    if (!sessionId || !campaignId) {
        alert('No active session found. Redirecting to campaign selection...');
        window.location.href = '/dm/campaignSelect';
        return;
    }

    loadCampaignInfo();
    loadSessionCode();
    loadSessionData();
    
    // Auto-refresh every 3 seconds
    refreshInterval = setInterval(loadSessionData, 3000);
});

/**
 * Load campaign information
 */
async function loadCampaignInfo() {
    try {
        const response = await fetch(`/dm/api/campaign/${campaignId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            document.getElementById('campaignName').textContent = result.campaign.name;
        }
    } catch (error) {
        console.error('Error loading campaign info:', error);
    }
}

/**
 * Load session code
 */
async function loadSessionCode() {
    try {
        const response = await fetch(`/dm/api/session/${sessionId}/code`);
        const result = await response.json();
        
        if (result.status === 'success' && result.session_code) {
            sessionCode = result.session_code;
            document.getElementById('sessionCode').textContent = sessionCode;
        } else {
            console.error('Failed to load session code');
            document.getElementById('sessionCode').textContent = 'ERROR';
        }
    } catch (error) {
        console.error('Error loading session code:', error);
        document.getElementById('sessionCode').textContent = 'ERROR';
    }
}

/**
 * Load session data (players, game state, etc.)
 */
async function loadSessionData() {
    try {
        const response = await fetch(`/dm/api/session/${sessionId}/players`);
        const result = await response.json();
        
        if (result.status === 'success') {
            updateActivePlayers(result.players);
            await loadPlayerVitals(result.players);
        }
    } catch (error) {
        console.error('Error loading session data:', error);
    }
}

/**
 * Update active players list
 */
function updateActivePlayers(players) {
    const container = document.getElementById('activePlayers');
    const playerCount = document.getElementById('playerCount');
    
    if (!players || Object.keys(players).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-slash"></i>
                <p>No players connected yet</p>
            </div>
        `;
        playerCount.textContent = '0';
        return;
    }

    const connectedCount = Object.values(players).filter(p => p.connection_status === 'connected').length;
    playerCount.textContent = connectedCount;

    container.innerHTML = Object.entries(players).map(([playerId, player]) => {
        const statusClass = player.connection_status === 'connected' ? 'status-connected' : 'status-disconnected';
        return `
            <div class="player-status-item">
                <div>
                    <span class="status-indicator ${statusClass}"></span>
                    <strong>${player.display_name || 'Unknown Player'}</strong>
                </div>
                <small class="">${player.connection_status}</small>
            </div>
        `;
    }).join('');
}

/**
 * Load player vitals (character stats)
 */
async function loadPlayerVitals(players) {
    const container = document.getElementById('playerVitals');
    
    if (!players || Object.keys(players).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heartbeat"></i>
                <p>No player data available</p>
            </div>
        `;
        return;
    }

    const vitalsHTML = await Promise.all(
        Object.entries(players)
            .filter(([_, player]) => player.connection_status === 'connected')
            .map(async ([playerId, player]) => {
                try {
                    const charResponse = await fetch(`/api/game/character/${player.selected_character_id}`);
                    const charResult = await charResponse.json();
                    
                    if (charResult.status === 'success') {
                        const char = charResult.character;
                        const hpPercent = (char.hp / char.maxHp) * 100;
                        const hpClass = hpPercent <= 25 ? 'hp-critical' : hpPercent <= 50 ? 'hp-warning' : 'hp-healthy';
                        
                        const getModifier = (score) => Math.floor((score - 10) / 2);
                        const formatModifier = (mod) => mod >= 0 ? `+${mod}` : `${mod}`;
                        
                        const wisScore = char.abilities?.wis?.score || 10;
                        const dexMod = formatModifier(getModifier(char.abilities?.dex?.score || 10));
                        const wisMod = formatModifier(getModifier(wisScore));
                        const chaMod = formatModifier(getModifier(char.abilities?.cha?.score || 10));
                        
                        // Calculate passive perception (10 + WIS modifier + proficiency if proficient)
                        const wisModValue = getModifier(wisScore);
                        const perceptionProf = char.skills?.Perception?.proficient ? (char.proficiencyBonus || 2) : 0;
                        const passivePerception = 10 + wisModValue + perceptionProf;
                        
                        return `
                            <div class="vital-card">
                                <div class="vital-card-header">
                                    <strong>${char.name}</strong>
                                    <span class="badge bg-secondary">${char.class || 'Adventurer'} ${char.level || 1}</span>
                                </div>
                                <div class="vital-stat">
                                    <span class="vital-stat-label">HP:</span>
                                    <span class="vital-stat-value ${hpClass}">${char.hp}/${char.maxHp}</span>
                                </div>
                                <div class="vital-stat">
                                    <span class="vital-stat-label">AC:</span>
                                    <span class="vital-stat-value">${char.ac}</span>
                                </div>
                                <div class="vital-stat">
                                    <span class="vital-stat-label">Passive Perception:</span>
                                    <span class="vital-stat-value">${passivePerception}</span>
                                </div>
                                <div class="vital-stat">
                                    <span class="vital-stat-label">DEX Save:</span>
                                    <span class="vital-stat-value">${dexMod}</span>
                                </div>
                                <div class="vital-stat">
                                    <span class="vital-stat-label">WIS Save:</span>
                                    <span class="vital-stat-value">${wisMod}</span>
                                </div>
                                <div class="vital-stat">
                                    <span class="vital-stat-label">CHA Save:</span>
                                    <span class="vital-stat-value">${chaMod}</span>
                                </div>
                            </div>
                        `;
                    }
                } catch (error) {
                    console.error('Error loading character vitals:', error);
                }
                return '';
            })
    );

    const filteredHTML = vitalsHTML.filter(html => html).join('');
    
    if (filteredHTML) {
        container.innerHTML = filteredHTML;
    } else {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heartbeat"></i>
                <p>No player data available</p>
            </div>
        `;
    }
}

/**
 * Copy session code to clipboard
 */
function copySessionCode() {
    const code = sessionCode || document.getElementById('sessionCode').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.btn-copy');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-copy');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-copy');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy code to clipboard');
    });
}

/**
 * Add narration to game log
 */
function addNarration() {
    const input = document.getElementById('narrateInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    addLogEntry(text, 'dm');
    input.value = '';
}

/**
 * Handle enter key in narrate input
 */
function handleNarrateKeypress(event) {
    if (event.key === 'Enter') {
        addNarration();
    }
}

/**
 * Add entry to game log
 */
function addLogEntry(message, type = 'system') {
    const log = document.getElementById('gameLog');
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const typeLabel = type === 'dm' ? 'DM' : type === 'player' ? 'Player' : 'System';
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-timestamp">[${timestamp} - ${typeLabel}]</span> ${message}`;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

/**
 * Preview selected map
 */
function previewMap() {
    const selector = document.getElementById('mapSelector');
    const preview = document.getElementById('mapPreview');
    const mapUrl = selector.value;
    
    if (mapUrl) {
        preview.innerHTML = `<img src="${mapUrl}" alt="Map preview">`;
    } else {
        preview.innerHTML = '<span class="text-muted">No map selected</span>';
    }
}

/**
 * Push map to players
 */
async function pushMapToPlayers() {
    const selector = document.getElementById('mapSelector');
    const mapUrl = selector.value;
    
    if (!mapUrl) {
        alert('Please select a map first');
        return;
    }
    
    // In a real implementation, this would update the game_state in Firebase
    addLogEntry(`Map changed to: ${selector.options[selector.selectedIndex].text}`, 'system');
    
    const btn = document.querySelector('.btn-push-map');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check me-2"></i>Map Pushed!';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }, 2000);
}

/**
 * Toggle pause state
 */
function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseBtn');
    
    if (isPaused) {
        btn.classList.add('paused');
        btn.innerHTML = '<i class="fas fa-play me-2"></i>Resume Game';
        addLogEntry('Game paused by DM', 'system');
    } else {
        btn.classList.remove('paused');
        btn.innerHTML = '<i class="fas fa-pause me-2"></i>Pause Game';
        addLogEntry('Game resumed by DM', 'system');
    }
    
    // In real implementation, update game_state.is_paused in Firebase
}

/**
 * Confirm end session
 */
function confirmEndSession() {
    const modal = new bootstrap.Modal(document.getElementById('endSessionModal'));
    modal.show();
}

/**
 * End session
 */
async function endSession() {
    try {
        const response = await fetch(`/dm/api/session/${sessionId}/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            clearInterval(refreshInterval);
            addLogEntry('Session ended by DM', 'system');
            
            // Clear localStorage
            localStorage.removeItem('activeSessionId');
            localStorage.removeItem('activeCampaignId');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('endSessionModal'));
            if (modal) {
                modal.hide();
            }
            
            setTimeout(() => {
                window.location.href = '/dm/campaignSelect';
            }, 1000);
        } else {
            alert('Failed to end session: ' + result.message);
        }
    } catch (error) {
        console.error('Error ending session:', error);
        alert('Error ending session');
    }
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

// Export functions for use in HTML
window.copySessionCode = copySessionCode;
window.addNarration = addNarration;
window.handleNarrateKeypress = handleNarrateKeypress;
window.previewMap = previewMap;
window.pushMapToPlayers = pushMapToPlayers;
window.togglePause = togglePause;
window.confirmEndSession = confirmEndSession;
window.endSession = endSession;