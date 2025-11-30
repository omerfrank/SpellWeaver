// Camera Manager Module
// Handles UI state and server communication for camera streaming

const CameraManager = {
    // Connection states
    STATE: {
        DISCONNECTED: 'disconnected',
        SCANNING: 'scanning',
        CONNECTED: 'connected'
    },

    // Current state
    currentState: 'disconnected',
    
    // DOM elements (initialized when modal opens)
    elements: {},

    /**
     * Initialize the camera manager
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.updateUI();
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            modal: document.getElementById('cameraManagerModal'),
            videoFeed: document.getElementById('cameraFeed'),
            statusBadge: document.getElementById('cameraStatus'),
            connectBtn: document.getElementById('connectCameraBtn'),
            disconnectBtn: document.getElementById('disconnectCameraBtn'),
            statusMessage: document.getElementById('statusMessage')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Connect button
        this.elements.connectBtn.addEventListener('click', () => {
            this.requestConnection();
        });

        // Disconnect button
        this.elements.disconnectBtn.addEventListener('click', () => {
            this.requestDisconnection();
        });

        // Modal events
        this.elements.modal.addEventListener('shown.bs.modal', () => {
            this.checkConnectionStatus();
        });
    },

    /**
     * Request camera connection from server
     */
    async requestConnection() {
        this.setState(this.STATE.SCANNING);
        
        try {
            const response = await fetch('/api/camera/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.setState(this.STATE.CONNECTED);
                this.startVideoStream(result.stream_url);
            } else {
                throw new Error(result.message || 'Connection failed');
            }
        } catch (error) {
            console.error('Connection error:', error);
            this.setState(this.STATE.DISCONNECTED);
            this.showError(error.message);
        }
    },

    /**
     * Request camera disconnection from server
     */
    async requestDisconnection() {
        try {
            // TODO: Replace with actual API endpoint
            const response = await fetch('/api/camera/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.setState(this.STATE.DISCONNECTED);
                this.stopVideoStream();
            }
        } catch (error) {
            console.error('Disconnection error:', error);
            this.showError(error.message);
        }
    },

    /**
     * Check current connection status
     */
    async checkConnectionStatus() {
        try {
            // TODO: Replace with actual API endpoint
            const response = await fetch('/api/camera/status');
            const result = await response.json();

            if (result.connected) {
                this.setState(this.STATE.CONNECTED);
                this.startVideoStream(result.stream_url);
            } else {
                this.setState(this.STATE.DISCONNECTED);
            }
        } catch (error) {
            console.error('Status check error:', error);
            this.setState(this.STATE.DISCONNECTED);
        }
    },

    /**
     * Start video stream
     */
    startVideoStream(streamUrl) {
        // Update image source to server stream
        this.elements.videoFeed.src = streamUrl;
        this.elements.videoFeed.style.display = 'block';
        
        // Hide placeholder
        const placeholder = this.elements.videoFeed.previousElementSibling;
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    },

    /**
     * Stop video stream
     */
    stopVideoStream() {
        // Clear image source
        this.elements.videoFeed.src = '';
        this.elements.videoFeed.style.display = 'none';
        
        // Show placeholder
        const placeholder = this.elements.videoFeed.previousElementSibling;
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    },

    /**
     * Update UI based on current state
     */
    updateUI() {
        const { connectBtn, disconnectBtn, statusBadge, statusMessage } = this.elements;

        switch (this.currentState) {
            case this.STATE.DISCONNECTED:
                // Status badge
                statusBadge.className = 'status-badge status-disconnected';
                statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Disconnected';
                
                // Buttons
                connectBtn.disabled = false;
                connectBtn.innerHTML = '<i class="fas fa-search me-2"></i>Find & Connect Camera';
                disconnectBtn.disabled = true;
                
                // Message
                statusMessage.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    <span>Reset the ESP32-CAM to broadcast its IP, then click "Find & Connect".</span>
                `;
                break;

            case this.STATE.SCANNING:
                // Status badge
                statusBadge.className = 'status-badge status-scanning';
                statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Scanning...';
                
                // Buttons
                connectBtn.disabled = true;
                connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
                disconnectBtn.disabled = true;
                
                // Message
                statusMessage.innerHTML = `
                    <i class="fas fa-satellite-dish me-2"></i>
                    <span>Searching for camera on the network...</span>
                `;
                break;

            case this.STATE.CONNECTED:
                // Status badge
                statusBadge.className = 'status-badge status-connected';
                statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Online & Tracking';
                
                // Buttons
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                
                // Message
                statusMessage.innerHTML = `
                    <i class="fas fa-check-circle me-2"></i>
                    <span>Camera connected and streaming. Server is processing the feed.</span>
                `;
                break;
        }
    },

    /**
     * Set current state and update UI
     */
    setState(newState) {
        this.currentState = newState;
        this.updateUI();
        console.log('Camera state changed to:', newState);
    },

    /**
     * Show error message
     */
    showError(message) {
        const { statusMessage } = this.elements;
        statusMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2 text-danger"></i>
            <span class="text-danger">${message}</span>
        `;
    }
};

// Initialize when modal is added to DOM
document.addEventListener('DOMContentLoaded', function() {
    // Check if camera manager modal exists
    const modal = document.getElementById('cameraManagerModal');
    if (modal) {
        // Initialize on first modal open
        modal.addEventListener('shown.bs.modal', function() {
            if (!CameraManager.elements.modal) {
                CameraManager.init();
            }
        }, { once: true });
    }
});

// Export for use in other scripts
window.CameraManager = CameraManager;