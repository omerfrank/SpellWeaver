// Webcam Manager Module - Client-Side Camera Control
// Handles MediaStream API and snapshot uploads
// Create file: app/static/js/dm_webcam.js

const WebcamManager = {
    // State
    stream: null,
    isActive: false,
    autoCapture: false,
    captureInterval: null,
    snapshotCount: 0,
    sessionId: null,
    
    // DOM elements
    elements: {},
    
    // Settings
    captureIntervalMs: 3000,
    videoConstraints: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
    },

    /**
     * Initialize the webcam manager
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.sessionId = localStorage.getItem('activeSessionId');
        
        if (!this.sessionId) {
            console.warn('No active session ID found');
        }
        
        // Check if webcam was running before modal closed
        this.restoreBackgroundState();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            modal: document.getElementById('webcamManagerModal'),
            video: document.getElementById('webcamVideo'),
            canvas: document.getElementById('snapshotCanvas'),
            placeholder: document.querySelector('.webcam-placeholder'),
            statusBadge: document.getElementById('webcamStatus'),
            statusMessage: document.getElementById('webcamStatusMessage'),
            startBtn: document.getElementById('startWebcamBtn'),
            stopBtn: document.getElementById('stopWebcamBtn'),
            captureBtn: document.getElementById('captureSnapshotBtn'),
            autoCapture: document.getElementById('autoCapture'),
            snapshotCount: document.getElementById('snapshotCount'),
            lastUpload: document.getElementById('lastUpload'),
            videoResolution: document.getElementById('videoResolution'),
            snapshotPreview: document.getElementById('snapshotPreview'),
            previewContainer: document.getElementById('snapshotPreviewContainer')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Start webcam
        this.elements.startBtn.addEventListener('click', () => {
            this.startWebcam();
        });

        // Stop webcam
        this.elements.stopBtn.addEventListener('click', () => {
            this.stopWebcam();
        });

        // Capture snapshot
        this.elements.captureBtn.addEventListener('click', () => {
            this.captureAndUpload();
        });

        // Auto-capture toggle
        this.elements.autoCapture.addEventListener('change', (e) => {
            this.toggleAutoCapture(e.target.checked);
        });

        // Keep webcam running when modal closes
        this.elements.modal.addEventListener('hidden.bs.modal', () => {
            // Do NOT stop webcam - let it run in background
            if (this.isActive) {
                console.log('ℹ️ Modal closed, webcam continues in background');
                this.showBackgroundNotification();
            }
        });
    },

    /**
     * Start the webcam stream
     */
    async startWebcam() {
        try {
            this.updateStatus('starting', 'Requesting camera access...');
            
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: this.videoConstraints,
                audio: false
            });
            
            // Activate on server
            const activateResult = await this.activateOnServer();
            if (activateResult.status !== 'success') {
                throw new Error(activateResult.message);
            }
            
            // Set video source
            this.elements.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.elements.video.onloadedmetadata = resolve;
            });
            
            // Update resolution display
            const { videoWidth, videoHeight } = this.elements.video;
            this.elements.videoResolution.textContent = `${videoWidth}x${videoHeight}`;
            
            // Show video, hide placeholder
            this.elements.video.style.display = 'block';
            this.elements.placeholder.style.display = 'none';
            
            // Update UI
            this.isActive = true;
            this.updateStatus('active', 'Webcam active and ready to capture.');
            this.elements.startBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'block';
            this.elements.captureBtn.disabled = false;
            this.elements.autoCapture.disabled = false;
            
            console.log('Webcam started successfully');
            
        } catch (error) {
            console.error('❌ Failed to start webcam:', error);
            this.updateStatus('error', `Failed to start webcam: ${error.message}`);
            this.cleanup();
        }
    },

    /**
     * Stop the webcam stream
     */
    async stopWebcam() {
        try {
            // Stop auto-capture if active
            if (this.autoCapture) {
                this.toggleAutoCapture(false);
                this.elements.autoCapture.checked = false;
            }
            
            // Deactivate on server
            await this.deactivateOnServer();
            
            // Stop all tracks
            this.cleanup();
            
            // Update UI
            this.isActive = false;
            this.elements.video.style.display = 'none';
            this.elements.placeholder.style.display = 'flex';
            this.updateStatus('inactive', 'Webcam stopped. Click "Start Webcam" to reactivate.');
            this.elements.startBtn.style.display = 'block';
            this.elements.stopBtn.style.display = 'none';
            this.elements.captureBtn.disabled = true;
            this.elements.autoCapture.disabled = true;
            
            console.log(' Webcam stopped');
            
        } catch (error) {
            console.error(' Error stopping webcam:', error);
        }
    },

    /**
     * Cleanup media stream
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.elements.video.srcObject) {
            this.elements.video.srcObject = null;
        }
    },

    /**
     * Capture snapshot and upload to server
     */
    async captureAndUpload() {
        if (!this.isActive) {
            console.warn('Webcam not active');
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
            const result = await this.uploadSnapshot(imageData);
            
            if (result.status === 'success') {
                // Update stats
                this.snapshotCount++;
                this.elements.snapshotCount.textContent = this.snapshotCount;
                this.elements.lastUpload.textContent = new Date().toLocaleTimeString();
                
                console.log('📸 Snapshot uploaded:', result.dimensions);
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
     * Capture a frame from the video element
     */
    captureFrame() {
        const video = this.elements.video;
        const canvas = this.elements.canvas;
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current frame to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to base64 JPEG (quality: 0.85)
        return canvas.toDataURL('image/jpeg', 0.85);
    },

    /**
     * Toggle auto-capture mode
     */
    toggleAutoCapture(enabled) {
        this.autoCapture = enabled;
        
        if (enabled) {
            // Start interval
            this.captureInterval = setInterval(() => {
                this.captureAndUpload();
            }, this.captureIntervalMs);
            
            console.log('Auto-capture enabled');
        } else {
            // Stop interval
            if (this.captureInterval) {
                clearInterval(this.captureInterval);
                this.captureInterval = null;
            }
            
            console.log('Auto-capture disabled');
        }
    },

    /**
     * Activate webcam on server
     */
    async activateOnServer() {
        const response = await fetch('/api/webcam/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: this.sessionId
            })
        });
        
        return await response.json();
    },

    /**
     * Deactivate webcam on server
     */
    async deactivateOnServer() {
        const response = await fetch('/api/webcam/deactivate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        return await response.json();
    },

    /**
     * Upload snapshot to server
     */
    async uploadSnapshot(imageData) {
        const response = await fetch('/api/webcam/snapshot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_data: imageData
            })
        });
        
        return await response.json();
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
                statusBadge.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Starting...';
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
        if (this.isActive && this.stream) {
            console.log('Restoring webcam UI state');
            
            // Video should still be connected
            this.elements.video.style.display = 'block';
            this.elements.placeholder.style.display = 'none';
            
            // Update UI to match running state
            this.elements.startBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'block';
            this.elements.captureBtn.disabled = false;
            this.elements.autoCapture.disabled = false;
            
            // Update status
            this.updateStatus('active', 'Webcam is running in background. Auto-capture active.');
            
            // Restore auto-capture checkbox state
            this.elements.autoCapture.checked = this.autoCapture;
        }
    },

    /**
     * Get current state for persistence
     */
    getState() {
        return {
            isActive: this.isActive,
            autoCapture: this.autoCapture,
            snapshotCount: this.snapshotCount,
            sessionId: this.sessionId
        };
    },

    /**
     * Show notification that webcam is running in background
     */
    showBackgroundNotification() {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'webcam-background-toast';
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-camera" style="font-size: 1.5rem; color: #57f287;"></i>
                <div style="flex: 1;">
                    <strong style="display: block; margin-bottom: 4px;">Webcam Running in Background</strong>
                    <small style="opacity: 0.8;">
                        ${this.autoCapture ? 'Auto-capturing every 3 seconds' : 'Ready to capture snapshots'}
                    </small>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: #ffffff; opacity: 0.6; cursor: pointer; font-size: 1.2rem; padding: 0; width: 24px; height: 24px;">
                    ×
                </button>
            </div>
        `;
        
        // Add styles
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
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            font-size: 0.9rem;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Initialize when modal is opened
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('webcamManagerModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function() {
            if (!WebcamManager.elements.modal) {
                WebcamManager.init();
            }
        }, { once: true });
    }
});

// Export for use in other scripts
window.WebcamManager = WebcamManager;