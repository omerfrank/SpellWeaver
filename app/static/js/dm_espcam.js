// ESP32-CAM Manager Module - Client-Side Stream Connection
// Handles direct MJPEG stream connection and snapshot uploads

const ESPCamManager = {
    // State
    streamUrl: null,
    isActive: false,
    autoCapture: false,
    captureInterval: null,
    snapshotCount: 0,
    sessionId: null,
    cameraIp: null,
    
    // DOM elements
    elements: {},
    
    // Settings
    captureIntervalMs: 3000,

    /**
     * Initialize the ESP32-CAM manager
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.sessionId = localStorage.getItem('activeSessionId');
        
        if (!this.sessionId) {
            console.warn('No active session ID found');
        }
        
        // Check if stream was running before modal closed
        this.restoreBackgroundState();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            modal: document.getElementById('espcamManagerModal'),
            stream: document.getElementById('espcamStream'),
            canvas: document.getElementById('espcamSnapshotCanvas'),
            placeholder: document.querySelector('.espcam-placeholder'),
            statusBadge: document.getElementById('espcamStatus'),
            statusMessage: document.getElementById('espcamStatusMessage'),
            connectBtn: document.getElementById('connectESPCamBtn'),
            disconnectBtn: document.getElementById('disconnectESPCamBtn'),
            captureBtn: document.getElementById('captureESPSnapshotBtn'),
            autoCapture: document.getElementById('espcamAutoCapture'),
            snapshotCount: document.getElementById('espcamSnapshotCount'),
            lastUpload: document.getElementById('espcamLastUpload'),
            cameraIpDisplay: document.getElementById('espcamIP'),
            snapshotPreview: document.getElementById('espcamSnapshotPreview'),
            previewContainer: document.getElementById('espcamSnapshotPreviewContainer')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Connect button
        this.elements.connectBtn.addEventListener('click', () => {
            this.connectToStream();
        });

        // Disconnect button
        this.elements.disconnectBtn.addEventListener('click', () => {
            this.disconnectStream();
        });

        // Capture snapshot
        this.elements.captureBtn.addEventListener('click', () => {
            this.captureAndUpload();
        });

        // Auto-capture toggle
        this.elements.autoCapture.addEventListener('change', (e) => {
            this.toggleAutoCapture(e.target.checked);
        });

        // Keep stream running when modal closes
        this.elements.modal.addEventListener('hidden.bs.modal', () => {
            if (this.isActive) {
                console.log('Modal closed, ESP32-CAM continues in background');
                this.showBackgroundNotification();
            }
        });
    },

    /**
     * Connect to ESP32-CAM stream
     */
    async connectToStream() {
        try {
            this.updateStatus('starting', 'Discovering ESP32-CAM...');
            
            // get camera ip
            const discoverResponse = await fetch('/api/espcam/discover');
            const discoverResult = await discoverResponse.json();
            
            if (discoverResult.status !== 'success') {
                throw new Error(discoverResult.message);
            }
            
            this.cameraIp = discoverResult.camera_ip;
            this.streamUrl = discoverResult.stream_url;
            
            console.log('Found ESP32-CAM at:', this.cameraIp);
            
            // tell the server about activation
            const activateResponse = await fetch('/api/espcam/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: this.sessionId })
            });
            
            const activateResult = await activateResponse.json();
            if (activateResult.status !== 'success') {
                throw new Error(activateResult.message);
            }
            
            // Connect img element directly to ESP32-CAM MJPEG stream
            // Add cache-busting parameter to force fresh connection
            const streamUrl = this.streamUrl + '?t=' + Date.now();
            
            console.log('Connecting to stream:', streamUrl);
            
            // Set the image source
            this.elements.stream.src = streamUrl;
            
            // Wait for stream to start loading
            await new Promise((resolve, reject) => {
                const loadTimeout = setTimeout(() => {
                    reject(new Error('Stream connection timeout. ESP32-CAM may be unreachable from your browser.'));
                }, 10000);
                
                this.elements.stream.onload = () => {
                    clearTimeout(loadTimeout);
                    console.log('Stream image loaded successfully');
                    resolve();
                };
                
                this.elements.stream.onerror = (e) => {
                    clearTimeout(loadTimeout);
                    console.error('❌ Stream load error:', e);
                    reject(new Error('Failed to load stream. Check if ESP32-CAM is accessible from your browser.'));
                };
            });
            
            // Update UI
            this.isActive = true;
            this.elements.stream.style.display = 'block';
            this.elements.placeholder.style.display = 'none';
            this.elements.cameraIpDisplay.textContent = this.cameraIp;
            
            this.updateStatus('active', 'Connected to ESP32-CAM. Stream active.');
            this.elements.connectBtn.style.display = 'none';
            this.elements.disconnectBtn.style.display = 'block';
            this.elements.captureBtn.disabled = false;
            this.elements.autoCapture.disabled = false;
            
            console.log('ESP32-CAM stream connected');
            
        } catch (error) {
            console.error('❌ Failed to connect to ESP32-CAM:', error);
            this.updateStatus('error', `Connection failed: ${error.message}`);
            this.cleanup();
        }
    },

    /**
     * Disconnect from stream
     */
    async disconnectStream() {
        try {
            // Stop auto-capture if active
            if (this.autoCapture) {
                this.toggleAutoCapture(false);
                this.elements.autoCapture.checked = false;
            }
            
            // Deactivate on server
            await fetch('/api/espcam/deactivate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            // Cleanup
            this.cleanup();
            
            // Update UI
            this.isActive = false;
            this.elements.stream.style.display = 'none';
            this.elements.placeholder.style.display = 'flex';
            this.elements.cameraIpDisplay.textContent = 'Not connected';
            
            this.updateStatus('inactive', 'Disconnected. Click "Connect" to restart.');
            this.elements.connectBtn.style.display = 'block';
            this.elements.disconnectBtn.style.display = 'none';
            this.elements.captureBtn.disabled = true;
            this.elements.autoCapture.disabled = true;
            
            console.log('⏹️ ESP32-CAM disconnected');
            
        } catch (error) {
            console.error('❌ Error disconnecting:', error);
        }
    },

    /**
     * Cleanup stream connection
     */
    cleanup() {
        if (this.elements.stream.src) {
            this.elements.stream.src = '';
        }
        this.streamUrl = null;
        this.cameraIp = null;
    },

    /**
     * Capture snapshot and upload to server
     */
    async captureAndUpload() {
        if (!this.isActive) {
            console.warn('Stream not active');
            return;
        }
        
        try {
            // Disable button during capture
            this.elements.captureBtn.disabled = true;
            this.elements.captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';
            
            // Capture frame from video
            const imageData = this.captureFrame();
            
            // Show local preview
            this.elements.snapshotPreview.src = imageData;
            this.elements.previewContainer.style.display = 'block';
            
            // Upload to server
            const response = await fetch('/api/espcam/snapshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_data: imageData })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Update stats
                this.snapshotCount++;
                this.elements.snapshotCount.textContent = this.snapshotCount;
                this.elements.lastUpload.textContent = new Date().toLocaleTimeString();
                
                console.log('📸 ESP32-CAM snapshot uploaded:', result.dimensions);
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Capture failed:', error);
            this.showErrorMessage(`Capture failed: ${error.message}`);
        } finally {
            // Re-enable button
            this.elements.captureBtn.disabled = false;
            this.elements.captureBtn.innerHTML = '<i class="fas fa-camera me-2"></i>Capture & Upload';
        }
    },

    /**
     * Capture a frame from the stream image
     */
    captureFrame() {
        const stream = this.elements.stream;
        const canvas = this.elements.canvas;
        
        // Set canvas dimensions to match image natural size
        canvas.width = stream.naturalWidth || 640;
        canvas.height = stream.naturalHeight || 480;
        
        // Draw current frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(stream, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 JPEG (quality: 0.85)
        return canvas.toDataURL('image/jpeg', 0.85);
    },

    /**
     * Toggle auto-capture mode
     */
    toggleAutoCapture(enabled) {
        this.autoCapture = enabled;
        
        if (enabled) {
            this.captureInterval = setInterval(() => {
                this.captureAndUpload();
            }, this.captureIntervalMs);
            
            console.log('ESP32-CAM auto-capture enabled');
        } else {
            if (this.captureInterval) {
                clearInterval(this.captureInterval);
                this.captureInterval = null;
            }
            
            console.log('ESP32-CAM auto-capture disabled');
        }
    },

    /**
     * Update status display
     */
    updateStatus(state, message) {
        const { statusBadge, statusMessage } = this.elements;
        
        // Update badge
        statusBadge.className = 'status-badge';
        
        switch (state) {
            case 'inactive':
                statusBadge.classList.add('status-disconnected');
                statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Inactive';
                break;
                
            case 'starting':
                statusBadge.classList.add('status-scanning');
                statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Connecting...';
                break;
                
            case 'active':
                statusBadge.classList.add('status-connected');
                statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Active';
                break;
                
            case 'error':
                statusBadge.classList.add('status-disconnected');
                statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Error';
                break;
        }
        
        // Update message
        statusMessage.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            <span>${message}</span>
        `;
    },

    /**
     * Show error message
     */
    showErrorMessage(message) {
        this.elements.statusMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2 text-danger"></i>
            <span class="text-danger">${message}</span>
        `;
    },

    /**
     * Restore background state when modal reopens
     */
    restoreBackgroundState() {
        if (this.isActive && this.streamUrl) {
            console.log('🔄 Restoring ESP32-CAM UI state');
            
            this.elements.stream.style.display = 'block';
            this.elements.placeholder.style.display = 'none';
            
            this.elements.connectBtn.style.display = 'none';
            this.elements.disconnectBtn.style.display = 'block';
            this.elements.captureBtn.disabled = false;
            this.elements.autoCapture.disabled = false;
            
            this.updateStatus('active', 'Stream running in background.');
            this.elements.autoCapture.checked = this.autoCapture;
        }
    },

    /**
     * Show notification that stream is running in background
     */
    showBackgroundNotification() {
        const toast = document.createElement('div');
        toast.className = 'espcam-background-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-video" style="font-size: 1.5rem; color: #57f287;"></i>
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 4px;">ESP32-CAM Running</strong>
                    <small style="opacity: 0.8;">
                        ${this.autoCapture ? 'Auto-capturing every 3 seconds' : 'Stream active'}
                    </small>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #ffffff; opacity: 0.6; cursor: pointer; font-size: 1.2rem;">
                    ×
                </button>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #2c2f33 0%, #23272a 100%);
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            border: 1px solid #4f545c;
            z-index: 9999;
            min-width: 320px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Initialize when modal is opened
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('espcamManagerModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function() {
            if (!ESPCamManager.elements.modal) {
                ESPCamManager.init();
            }
        }, { once: true });
    }
});

// Export for use in other scripts
window.ESPCamManager = ESPCamManager;