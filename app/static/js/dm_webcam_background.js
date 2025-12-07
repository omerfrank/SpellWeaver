// Background Indicator Manager
const WebcamBackgroundIndicator = {
    indicator: null,
    snapshotCount: null,
    lastCapture: null,
    updateInterval: null,

    init() {
        this.indicator = document.getElementById('webcamBackgroundIndicator');
        this.snapshotCount = document.getElementById('bgSnapshotCount');
        this.lastCapture = document.getElementById('bgLastCapture');

        // Start monitoring
        this.startMonitoring();
    },

    startMonitoring() {
        // Check every second
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 1000);
    },

    updateDisplay() {
        if (window.WebcamManager && window.WebcamManager.isActive) {
            // Show indicator
            this.indicator.style.display = 'flex';

            // Update snapshot count
            this.snapshotCount.textContent = window.WebcamManager.snapshotCount;

            // Update last capture time (format as HH:MM:SS)
            const lastUploadEl = document.getElementById('lastUpload');
            if (lastUploadEl && lastUploadEl.textContent !== 'Never') {
                this.lastCapture.textContent = lastUploadEl.textContent;
            } else {
                this.lastCapture.textContent = '--:--';
            }

            // Add auto-capture badge if active
            if (window.WebcamManager.autoCapture) {
                if (!this.indicator.querySelector('.auto-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'auto-badge';
                    badge.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Auto';
                    badge.style.cssText = 'background: rgba(35,39,42,0.3); padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; margin-left: 8px;';
                    this.indicator.insertBefore(badge, this.indicator.querySelector('.stats'));
                }
            } else {
                const badge = this.indicator.querySelector('.auto-badge');
                if (badge) badge.remove();
            }
        } else {
            // Hide indicator
            this.indicator.style.display = 'none';
        }
    },

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
};

// Helper function to open modal
function openWebcamModal() {
    const modal = new bootstrap.Modal(document.getElementById('webcamManagerModal'));
    modal.show();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    WebcamBackgroundIndicator.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    WebcamBackgroundIndicator.destroy();
});
