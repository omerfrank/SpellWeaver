// Webcam Manager Module - Client-Side Camera Control
// Handles MediaStream API and snapshot uploads
// File: app/static/js/dm_webcam.js

const WebcamManager = {
    stream: null,
    isActive: false,
    autoCapture: false,
    captureInterval: null,
    annotatedPollInterval: null,
    snapshotCount: 0,
    sessionId: null,
    elements: {},
    captureIntervalMs: 3000,
    videoConstraints: {
        width:      { ideal: 1280 },
        height:     { ideal: 720  },
        facingMode: 'user',
    },

    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.sessionId = localStorage.getItem('activeSessionId');
        if (!this.sessionId) console.warn('No active session ID found');
        this.restoreBackgroundState();
    },

    cacheElements() {
        this.elements = {
            modal:           document.getElementById('webcamManagerModal'),
            video:           document.getElementById('webcamVideo'),
            canvas:          document.getElementById('snapshotCanvas'),
            placeholder:     document.querySelector('.webcam-placeholder'),
            statusBadge:     document.getElementById('webcamStatus'),
            statusMessage:   document.getElementById('webcamStatusMessage'),
            startBtn:        document.getElementById('startWebcamBtn'),
            stopBtn:         document.getElementById('stopWebcamBtn'),
            captureBtn:      document.getElementById('captureSnapshotBtn'),
            autoCapture:     document.getElementById('autoCapture'),
            snapshotCount:   document.getElementById('snapshotCount'),
            lastUpload:      document.getElementById('lastUpload'),
            videoResolution: document.getElementById('videoResolution'),
            snapshotPreview:     document.getElementById('snapshotPreview'),
            previewContainer:    document.getElementById('snapshotPreviewContainer'),
            visionResult:        document.getElementById('visionResult'),
        };
    },

    attachEventListeners() {
        this.elements.startBtn.addEventListener('click',  () => this.startWebcam());
        this.elements.stopBtn.addEventListener('click',   () => this.stopWebcam());
        this.elements.captureBtn.addEventListener('click', () => this.captureAndUpload());
        this.elements.autoCapture.addEventListener('change', (e) => {
            this.toggleAutoCapture(e.target.checked);
        });
        this.elements.modal.addEventListener('hidden.bs.modal', () => {
            if (this.isActive) {
                console.log('ℹ️ Modal closed, webcam continues in background');
                this.showBackgroundNotification();
            }
        });
    },

    async startWebcam() {
        try {
            this.updateStatus('starting', 'Requesting camera access...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: this.videoConstraints,
                audio: false,
            });
            const activateResult = await this.activateOnServer();
            if (activateResult.status !== 'success') throw new Error(activateResult.message);
            this.elements.video.srcObject = this.stream;
            await new Promise((resolve) => { this.elements.video.onloadedmetadata = resolve; });
            const { videoWidth, videoHeight } = this.elements.video;
            this.elements.videoResolution.textContent = `${videoWidth}x${videoHeight}`;
            this.elements.video.style.display       = 'block';
            this.elements.placeholder.style.display = 'none';
            this.isActive = true;
            this.updateStatus('active', 'Webcam active and ready to capture.');
            this.elements.startBtn.style.display  = 'none';
            this.elements.stopBtn.style.display   = 'block';
            this.elements.captureBtn.disabled     = false;
            this.elements.autoCapture.disabled    = false;
            console.log('✅ Webcam started');
        } catch (error) {
            console.error('❌ Failed to start webcam:', error);
            this.updateStatus('error', `Failed to start webcam: ${error.message}`);
            this.cleanup();
        }
    },

    async stopWebcam() {
        try {
            if (this.autoCapture) {
                this.toggleAutoCapture(false);
                this.elements.autoCapture.checked = false;
            }
            this._stopAnnotatedPoll();
            await this.deactivateOnServer();
            this.cleanup();
            this.isActive = false;
            this.elements.video.style.display       = 'none';
            this.elements.placeholder.style.display = 'flex';
            this.updateStatus('inactive', 'Webcam stopped. Click "Start Webcam" to reactivate.');
            this.elements.startBtn.style.display   = 'block';
            this.elements.stopBtn.style.display    = 'none';
            this.elements.captureBtn.disabled      = true;
            this.elements.autoCapture.disabled     = true;
            if (this.elements.previewContainer) this.elements.previewContainer.style.display = 'none';
            console.log('⏹️ Webcam stopped');
        } catch (error) {
            console.error('❌ Error stopping webcam:', error);
        }
    },

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.elements.video.srcObject) this.elements.video.srcObject = null;
    },

    async captureAndUpload() {
        if (!this.isActive) { console.warn('Webcam not active'); return; }
        try {
            this.elements.captureBtn.disabled  = true;
            this.elements.captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Capturing...';
            const imageData = this.captureFrame();
            const result    = await this.uploadSnapshot(imageData);
            if (result.status === 'success') {
                this.snapshotCount++;
                this.elements.snapshotCount.textContent = this.snapshotCount;
                this.elements.lastUpload.textContent    = new Date().toLocaleTimeString();
                this._refreshAnnotatedPreview();
                this._updateVisionDisplay(result.vision);
                console.log('📸 Snapshot uploaded:', result.dimensions, '| Vision:', result.vision?.message);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('❌ Capture failed:', error);
            this.showErrorMessage(`Capture failed: ${error.message}`);
        } finally {
            this.elements.captureBtn.disabled  = false;
            this.elements.captureBtn.innerHTML = '<i class="fas fa-camera me-2"></i>Capture & Upload';
        }
    },

    captureFrame() {
        const video  = this.elements.video;
        const canvas = this.elements.canvas;
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    },

    toggleAutoCapture(enabled) {
        this.autoCapture = enabled;
        if (enabled) {
            this.captureInterval = setInterval(() => this.captureAndUpload(), this.captureIntervalMs);
            console.log('🔄 Auto-capture enabled');
        } else {
            if (this.captureInterval) { clearInterval(this.captureInterval); this.captureInterval = null; }
            console.log('⏹️ Auto-capture disabled');
        }
    },

    _refreshAnnotatedPreview() {
        const preview   = this.elements.snapshotPreview;
        const container = this.elements.previewContainer;
        if (!preview) return;
        preview.style.opacity = '0.4';
        const img  = new Image();
        img.onload = () => {
            preview.src = img.src;
            preview.style.opacity = '1';
            if (container) container.style.display = 'block';
        };
        img.onerror = () => {
            preview.style.opacity = '1';
            console.warn('⚠️ Annotated preview not yet available');
        };
        img.src = `/api/webcam/annotated-preview?t=${Date.now()}`;
    },

    _stopAnnotatedPoll() {
        if (this.annotatedPollInterval) {
            clearInterval(this.annotatedPollInterval);
            this.annotatedPollInterval = null;
        }
    },

    _updateVisionDisplay(vision) {
        const el = this.elements.visionResult;
        if (!el) return;
        if (!vision || vision.status !== 'success') {
            el.innerHTML = `<span class="text-warning">
                <i class="fas fa-exclamation-triangle me-1"></i>
                ${vision?.message ?? 'Vision not available'}
            </span>`;
            return;
        }
        el.innerHTML = `
            <span class="text-success">
                <i class="fas fa-bullseye me-1"></i>
                Figure at <strong>row ${vision.row}, col ${vision.col}</strong>
                &nbsp;·&nbsp;
                <small class="text-muted">warped (${vision.warped_x}, ${vision.warped_y})</small>
            </span>`;
    },

    async activateOnServer() {
        const response = await fetch('/api/webcam/activate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ session_id: this.sessionId }),
        });
        return response.json();
    },

    async deactivateOnServer() {
        const response = await fetch('/api/webcam/deactivate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return response.json();
    },

    async uploadSnapshot(imageData) {
        const response = await fetch('/api/webcam/snapshot', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ image_data: imageData }),
        });
        return response.json();
    },

    updateStatus(state, message) {
        const { statusBadge, statusMessage } = this.elements;
        statusBadge.className = 'status-badge';
        const states = {
            inactive: { cls: 'status-disconnected', icon: 'fa-circle',              label: 'Inactive'    },
            starting: { cls: 'status-scanning',     icon: 'fa-spinner fa-spin',     label: 'Starting...' },
            active:   { cls: 'status-connected',    icon: 'fa-circle',              label: 'Active'      },
            error:    { cls: 'status-disconnected', icon: 'fa-exclamation-triangle', label: 'Error'      },
        };
        const s = states[state] ?? states.error;
        statusBadge.classList.add(s.cls);
        statusBadge.innerHTML = `<i class="fas ${s.icon} me-1"></i>${s.label}`;
        statusMessage.innerHTML = `<i class="fas fa-info-circle me-2"></i><span>${message}</span>`;
    },

    showErrorMessage(message) {
        this.elements.statusMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2 text-danger"></i>
            <span class="text-danger">${message}</span>`;
    },

    restoreBackgroundState() {
        if (this.isActive && this.stream) {
            console.log('🔄 Restoring webcam UI state');
            this.elements.video.style.display       = 'block';
            this.elements.placeholder.style.display = 'none';
            this.elements.startBtn.style.display    = 'none';
            this.elements.stopBtn.style.display     = 'block';
            this.elements.captureBtn.disabled       = false;
            this.elements.autoCapture.disabled      = false;
            this.elements.autoCapture.checked       = this.autoCapture;
            this.updateStatus('active', 'Webcam is running in background.');
            this._refreshAnnotatedPreview();
        }
    },

    getState() {
        return {
            isActive:      this.isActive,
            autoCapture:   this.autoCapture,
            snapshotCount: this.snapshotCount,
            sessionId:     this.sessionId,
        };
    },

    showBackgroundNotification() {
        const toast = document.createElement('div');
        toast.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
                <i class="fas fa-camera" style="font-size:1.5rem;color:#57f287;"></i>
                <div style="flex:1;">
                    <strong style="display:block;margin-bottom:4px;">Webcam Running in Background</strong>
                    <small style="opacity:.8;">
                        ${this.autoCapture ? 'Auto-capturing every 3 seconds' : 'Ready to capture snapshots'}
                    </small>
                </div>
                <button onclick="this.parentElement.parentElement.remove()"
                        style="background:none;border:none;color:#fff;opacity:.6;cursor:pointer;font-size:1.2rem;">×</button>
            </div>`;
        toast.style.cssText = `
            position:fixed;top:80px;right:20px;
            background:linear-gradient(135deg,#2c2f33,#23272a);
            color:#fff;padding:16px 20px;border-radius:12px;
            box-shadow:0 8px 24px rgba(0,0,0,.4);
            border:1px solid #4f545c;z-index:9999;
            min-width:320px;max-width:400px;
            animation:slideInRight .3s ease;font-size:.9rem;`;
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight  { from{transform:translateX(400px);opacity:0} to{transform:none;opacity:1} }
            @keyframes slideOutRight { from{transform:none;opacity:1} to{transform:translateX(400px);opacity:0} }`;
        document.head.appendChild(style);
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
};

document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('webcamManagerModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function () {
            if (!WebcamManager.elements.modal) WebcamManager.init();
        }, { once: true });
    }
});

window.WebcamManager = WebcamManager;