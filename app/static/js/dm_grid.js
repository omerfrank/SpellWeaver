// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    GRID_ROWS: 8,
    GRID_COLS: 10,
    GRID_LINE_WIDTH: 4,
    GRID_COLOR: '#ffffff',
    POLL_INTERVAL: 2000,
    EFFECT_OPACITY: 0.6,
    HIGHLIGHT_COLOR: 'rgba(201, 75, 75, 0.6)',
    RANGE_COLOR: 'rgba(114, 137, 218, 0.5)',
    PING_COLOR: '#faa61a',
    FOG_COLOR: 'rgba(20, 20, 20, 0.95)',
    FOG_TEXTURE_URL: '/static/img/fog.webp'
};
let cell; 

// ============================================
// STATE MANAGEMENT
// ============================================
const STATE = {
    sessionId: null,
    currentMapUrl: null,
    backgroundVisible: true,
    
    // Modes
    rangeModeActive: false,
    fogModeActive: false,
    
    // Data Sets
    selectedCells: new Set(),
    foggedCells: new Set(),
    serverEffects: {}, // NEW: Store effects from server
    
    lastServerState: null,
    pollingActive: true,
    
    // Interaction State
    isDragging: false,
    dragStart: null,      
    paintMode: true,
    
    // Assets
    fogPattern: null, 
    fogImageLoaded: false
};

// ============================================
// LAYER REFERENCES
// ============================================
const layer0 = document.getElementById('layer0');
const layer1 = document.getElementById('layer1');
const layer2 = document.getElementById('layer2');
const ctx1 = layer1.getContext('2d');
const ctx2 = layer2.getContext('2d');

// ============================================
// INITIALIZATION
// ============================================
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    STATE.sessionId = urlParams.get('session') || extractSessionFromPath();
    
    if (!STATE.sessionId) {
        console.error('No session ID found in URL');
        updateConnectionStatus('error');
        return;
    }
    
    document.getElementById('sessionId').textContent = STATE.sessionId;
    
    loadFogTexture();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    drawGrid();
    setupEventListeners();
    startPolling();
    
    console.log('Grid initialized for session:', STATE.sessionId);
}

function loadFogTexture() {
    const img = new Image();
    img.src = CONFIG.FOG_TEXTURE_URL;
    img.onload = () => {
        STATE.fogPattern = ctx2.createPattern(img, 'repeat');
        STATE.fogImageLoaded = true;
        redrawEffects(); 
    };
    img.onerror = () => STATE.fogImageLoaded = false;
}

function extractSessionFromPath() {
    const pathParts = window.location.pathname.split('/');
    const sessionIndex = pathParts.indexOf('session');
    if (sessionIndex !== -1 && pathParts[sessionIndex + 1]) {
        return pathParts[sessionIndex + 1];
    }
    return null;
}

function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    layer1.width = width;
    layer1.height = height;
    layer2.width = width;
    layer2.height = height;
    
    if (STATE.fogImageLoaded) {
        const img = new Image();
        img.src = CONFIG.FOG_TEXTURE_URL;
        STATE.fogPattern = ctx2.createPattern(img, 'repeat');
    }
    drawGrid();
    redrawEffects();
}

// ============================================
// LAYER 1: STATIC GRID
// ============================================
function drawGrid() {
    ctx1.clearRect(0, 0, layer1.width, layer1.height);
    
    const cellWidth = layer1.width / CONFIG.GRID_COLS;
    const cellHeight = layer1.height / CONFIG.GRID_ROWS;
    
    ctx1.strokeStyle = CONFIG.GRID_COLOR;
    ctx1.lineWidth = CONFIG.GRID_LINE_WIDTH;
    ctx1.lineCap = 'square';
    
    // Draw Verticals
    for (let col = 0; col <= CONFIG.GRID_COLS; col++) {
        const x = col * cellWidth;
        ctx1.beginPath(); ctx1.moveTo(x, 0); ctx1.lineTo(x, layer1.height); ctx1.stroke();
    }
    // Draw Horizontals
    for (let row = 0; row <= CONFIG.GRID_ROWS; row++) {
        const y = row * cellHeight;
        ctx1.beginPath(); ctx1.moveTo(0, y); ctx1.lineTo(layer1.width, y); ctx1.stroke();
    }
}

// ============================================
// LAYER 2: EFFECTS & OVERLAYS
// ============================================
async function clearEffects() {
    // 1. Clear Locally (Immediate visual feedback)
    ctx2.clearRect(0, 0, layer2.width, layer2.height);
    STATE.selectedCells.clear();
    STATE.foggedCells.clear();
    STATE.serverEffects = {}; // Clear stored server effects
    
    // 2. Clear on Server
    try {
        console.log("Clearing effects on server...");
        // Use STATE.sessionId instead of hardcoded ID to make it work for any session
        const response = await fetch(`/api/grid/session/${STATE.sessionId}/clear`, {
            method: 'POST'
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log("Server cleared successfully");
        } else {
            console.error("Server clear failed:", result.message);
        }
    } catch (error) {
        console.error("Network error clearing server:", error);
    }
}

function redrawEffects() {
    ctx2.clearRect(0, 0, layer2.width, layer2.height);
    
    // 1. SERVER EFFECTS (Draw first so they are below UI interactions)
    if (STATE.serverEffects) {
        Object.values(STATE.serverEffects).forEach(effect => {
            if (effect.type === 'radius' && effect.metadata) {
                // Draw Server Radius
                // Effect X/Y are grid coordinates (col, row)
                drawServerCircle(effect.y, effect.x, effect.metadata.range, effect.metadata.color);
            }
        });
    }

    // 2. FOG (Bottom Layer)
    if (STATE.fogImageLoaded && STATE.fogPattern) {
        ctx2.fillStyle = STATE.fogPattern;
    } else {
        ctx2.fillStyle = CONFIG.FOG_COLOR;
    }
    STATE.foggedCells.forEach(cellKey => {
        const [row, col] = cellKey.split(',').map(Number);
        drawCellRect(row, col); 
    });

    // 3. SELECTIONS (Top Layer)
    ctx2.fillStyle = CONFIG.HIGHLIGHT_COLOR; 
    STATE.selectedCells.forEach(cellKey => {
        const [row, col] = cellKey.split(',').map(Number);
        drawCellRect(row, col);
    });
}

function drawCellRect(row, col) {
    const cellWidth = layer2.width / CONFIG.GRID_COLS;
    const cellHeight = layer2.height / CONFIG.GRID_ROWS;
    const x = col * cellWidth;
    const y = row * cellHeight;
    ctx2.fillRect(x, y, cellWidth, cellHeight);
}

function drawServerCircle(centerRow, centerCol, radiusCells, color) {
    const cellWidth = layer2.width / CONFIG.GRID_COLS;
    const cellHeight = layer2.height / CONFIG.GRID_ROWS;
    
    const centerX = (centerCol + 0.5) * cellWidth;
    const centerY = (centerRow + 0.5) * cellHeight;
    const radius = radiusCells * Math.min(cellWidth, cellHeight); // Simplified radius logic
    
    ctx2.fillStyle = color || CONFIG.RANGE_COLOR;
    ctx2.beginPath();
    ctx2.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx2.fill();
    
    ctx2.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx2.lineWidth = 2;
    ctx2.stroke();
}

function drawRangeCircle(centerRow, centerCol, radiusCells) {
    // Wrapper for client-side measuring
    drawServerCircle(centerRow, centerCol, radiusCells, CONFIG.RANGE_COLOR);
}

function pingCell(row, col) {
    const cellWidth = layer2.width / CONFIG.GRID_COLS;
    const cellHeight = layer2.height / CONFIG.GRID_ROWS;
    const centerX = (col + 0.5) * cellWidth;
    const centerY = (row + 0.5) * cellHeight;
    
    let scale = 0;
    const maxScale = 2;
    const duration = 1000;
    const startTime = Date.now();
    
    function animatePing() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            redrawEffects(); 
            return;
        }
        
        redrawEffects();
        
        scale = progress * maxScale;
        const alpha = 1 - progress;
        const radius = scale * Math.min(cellWidth, cellHeight) * 0.5;
        
        ctx2.strokeStyle = `rgba(250, 166, 26, ${alpha})`;
        ctx2.lineWidth = 3;
        ctx2.beginPath();
        ctx2.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx2.stroke();
        
        requestAnimationFrame(animatePing);
    }
    animatePing();
}

// ============================================
// MOUSE INTERACTION LOGIC
// ============================================
function getCellFromMouse(event) {
    const rect = layer2.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const cellWidth = layer2.width / CONFIG.GRID_COLS;
    const cellHeight = layer2.height / CONFIG.GRID_ROWS;
    
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    
    if (row >= 0 && row < CONFIG.GRID_ROWS && col >= 0 && col < CONFIG.GRID_COLS) {
        return { row, col };
    }
    return null;
}

function updateSet(targetSet, key, shouldAdd) {
    if (shouldAdd) targetSet.add(key);
    else targetSet.delete(key);
}

function handleMouseDown(event) {
    const startCell = getCellFromMouse(event);
    if (!startCell) return;

    STATE.isDragging = true;

    if (STATE.rangeModeActive) {
        STATE.dragStart = startCell;
    } else {
        const cellKey = `${startCell.row},${startCell.col}`;
        const targetSet = STATE.fogModeActive ? STATE.foggedCells : STATE.selectedCells;
        const isPresent = targetSet.has(cellKey);
        STATE.paintMode = !isPresent; 
        
        updateSet(targetSet, cellKey, STATE.paintMode);
        redrawEffects();
    }
}

function handleMouseUp(event) {
    STATE.isDragging = false;
    STATE.dragStart = null;
}

function handleMouseMove(event) {
    cell = getCellFromMouse(event);
    
    if (cell) document.getElementById('currentCell').textContent = `[${cell.row}, ${cell.col}]`;
    else document.getElementById('currentCell').textContent = '-';

    if (STATE.isDragging && cell) {
        if (STATE.rangeModeActive && STATE.dragStart) {
            const dx = cell.col - STATE.dragStart.col;
            const dy = cell.row - STATE.dragStart.row;
            const radius = Math.sqrt(dx * dx + dy * dy);
            redrawEffects(); 
            drawRangeCircle(STATE.dragStart.row, STATE.dragStart.col, radius);

        } else if (!STATE.rangeModeActive) {
            const cellKey = `${cell.row},${cell.col}`;
            const targetSet = STATE.fogModeActive ? STATE.foggedCells : STATE.selectedCells;
            updateSet(targetSet, cellKey, STATE.paintMode);
            redrawEffects();
        }
    }
}

// ============================================
// HELPER: Trigger Test Effect
// ============================================
async function triggerTestEffect() {
    console.log("Triggering test effect...");
    try {
        const response = await fetch(`/api/grid/session/${STATE.sessionId}/testgrid`, {
            method: 'POST'
        });
        const result = await response.json();
        console.log("Test Trigger Result:", result);
        // Note: We don't update UI here directly. 
        // We wait for the Polling Loop to catch the new state from Firebase.
    } catch (error) {
        console.error("Failed to trigger test:", error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    layer2.addEventListener('mousedown', handleMouseDown);
    layer2.addEventListener('mousemove', handleMouseMove);
    layer2.addEventListener('mouseup', handleMouseUp);
    layer2.addEventListener('mouseleave', handleMouseUp);
    
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        switch(e.key.toLowerCase()) {
            case 'c': clearEffects(); break;
            case 'h': toggleBackground(); break;
            case 'm': 
                STATE.rangeModeActive = true;
                layer2.style.cursor = 'ne-resize';
                break;
            case 'f':
                STATE.fogModeActive = !STATE.fogModeActive;
                layer2.style.cursor = STATE.fogModeActive ? 'not-allowed' : 'crosshair';
                const statusEl = document.getElementById('gridStatus');
                statusEl.textContent = STATE.fogModeActive ? "FOG MODE" : "10x8";
                statusEl.style.color = STATE.fogModeActive ? "#faa61a" : "inherit";
                break;
            case 't': 
                // Shift + T = Server Test, T = Local Ping
                if (e.shiftKey) triggerTestEffect();
                else if (cell) pingCell(cell.row, cell.col);
                break;
            case '?': toggleHelp(); break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 'm') {
            STATE.rangeModeActive = false;
            layer2.style.cursor = STATE.fogModeActive ? 'not-allowed' : 'crosshair';
            handleMouseUp();
        }
    });
}

function toggleBackground() {
    STATE.backgroundVisible = !STATE.backgroundVisible;
    layer0.style.opacity = STATE.backgroundVisible ? '1' : '0';
}

function toggleHelp() {
    const help = document.getElementById('keybindHelp');
    const hud = document.getElementById('hud');
    help.style.display = help.style.display === 'block' ? 'none' : 'block';
    hud.style.display = hud.style.display === 'block' ? 'none' : 'block';
}

// ============================================
// SERVER POLLING
// ============================================
function startPolling() {
    fetchGameState();
    setInterval(() => {
        if (STATE.pollingActive) fetchGameState();
    }, CONFIG.POLL_INTERVAL);
}

async function fetchGameState() {
    try {
        const response = await fetch(`/api/grid/session/${STATE.sessionId}/gridState`);
        if (!response.ok) throw new Error('Failed to fetch game state');
        
        const data = await response.json();
        
        if (data.status === 'success') {
            updateGameState(data.gameState);
            updateConnectionStatus('connected');
        }
    } catch (error) {
        console.error('Polling error:', error);
        updateConnectionStatus('error');
    }
}

function updateGameState(newState) {
    const newUrlString = newState.mapUrl?.url || newState.mapUrl;
    if (newUrlString && newUrlString !== STATE.currentMapUrl) {
        updateBackgroundImage(newUrlString);
    }

    if (newState.effects) {
        STATE.serverEffects = newState.effects;
        redrawEffects(); 
    } else {
        STATE.serverEffects = {}; 
    }

    STATE.lastServerState = newState;
}

function updateBackgroundImage(url) {
    STATE.currentMapUrl = url;
    layer0.style.backgroundImage = `url('${url}')`;
}

function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.className = (status === 'connected') ? 'connected' : 'error';
}

// ============================================
// START APPLICATION
// ============================================
window.addEventListener('DOMContentLoaded', init);