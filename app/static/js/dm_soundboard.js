// Sound Board Manager Module
// Handles sound effect triggers for ESP32-CAM

const SoundBoardManager = {
    // State
    isPlaying: false,
    currentEffect: null,
    sessionId: null,
    
    // DOM elements
    elements: {},
    
    /**
     * Initialize the sound board manager
     */
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.sessionId = localStorage.getItem('activeSessionId');
        
        if (!this.sessionId) {
            console.warn('No active session ID found');
        }
        
        // Check current status when modal opens
        this.checkStatus();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            modal: document.getElementById('soundBoardModal'),
            status: document.getElementById('soundboardStatus'),
            statusText: document.getElementById('soundboardStatusText'),
            clearBtn: document.getElementById('clearSoundBtn')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Clear button
        if (this.elements.clearBtn) {
            this.elements.clearBtn.addEventListener('click', () => {
                this.clearEffect();
            });
        }

        // Modal open event
        if (this.elements.modal) {
            this.elements.modal.addEventListener('shown.bs.modal', () => {
                this.checkStatus();
            });
        }
    },

    /**
     * Trigger a sound effect
     */
    async triggerSound(effectName, buttonElement) {

        try {
            this.isPlaying = true;
            
            // Add playing animation to button
            if (buttonElement) {
                buttonElement.classList.add('playing');
                buttonElement.disabled = true;
            }
            
            // Update status
            this.updateStatus('playing', `Playing: ${effectName}`);
            
            // Send trigger to server
            const response = await fetch('/api/soundboard/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    effect_name: effectName
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                this.currentEffect = effectName;                
                // Auto-clear after 2 seconds (assuming sound plays on ESP32)
                setTimeout(() => {
                    this.clearEffect();
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to trigger sound');
            }

        } catch (error) {
            console.error('❌ Error triggering sound:', error);
            this.showError(`Failed to play sound: ${error.message}`);
            this.isPlaying = false;
            
            if (buttonElement) {
                buttonElement.classList.remove('playing');
                buttonElement.disabled = false;
            }
        }
    },

    /**
     * Clear the current effect
     */
    async clearEffect() {
        try {
            this.currentEffect = null;
            this.isPlaying = false;
            this.updateStatus('idle', 'Ready to play sounds');
            
            // Remove playing class from all buttons
            document.querySelectorAll('.sound-button.playing').forEach(btn => {
                btn.classList.remove('playing');
                btn.disabled = false;
            });
                
            

        } catch (error) {
            console.error('❌ Error clearing effect:', error);
        }
    },

    /**
     * Check current status from server
     */
    async checkStatus() {
        try {
            const response = await fetch('/api/soundboard/status');
            const result = await response.json();

            if (result.status === 'success') {
                if (result.current_effect != "NULL") {
                    this.currentEffect = result.current_effect;
                    this.isPlaying = true;
                    this.updateStatus('playing', `Currently playing: ${result.current_effect}`);
                } else {
                    this.currentEffect = null;
                    this.isPlaying = false;
                    this.updateStatus('idle', 'Ready to play sounds');
                }
            }

        } catch (error) {
            console.error('❌ Error checking status:', error);
            this.updateStatus('idle', 'Ready to play sounds');
        }
    },

    /**
     * Update status display
     */
    updateStatus(state, message) {
        const { status, statusText } = this.elements;

        if (state === 'playing') {
            status.classList.add('playing');
            statusText.innerHTML = `<i class="fas fa-volume-up"></i><span>${message}</span>`;
        } else if (state === 'idle') {
            status.classList.remove('playing');
            statusText.innerHTML = `<i class="fas fa-music"></i><span>${message}</span>`;
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const { statusText } = this.elements;
        statusText.innerHTML = `<i class="fas fa-exclamation-triangle text-danger"></i><span class="text-danger">${message}</span>`;
        
        // Reset after 3 seconds
        setTimeout(() => {
            this.updateStatus('idle', 'Ready to play sounds');
        }, 3000);
    }
};

/**
 * Global function to trigger sound from HTML onclick
 */
window.triggerSound = function(soundName, buttonElement) {
    SoundBoardManager.triggerSound(soundName, buttonElement);
};

// Initialize when modal is opened
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('soundBoardModal');
    if (modal) {
        modal.addEventListener('shown.bs.modal', function() {
            if (!SoundBoardManager.elements.modal) {
                SoundBoardManager.init();
            }
        }, { once: true });
    }
});

// Export for use in other scripts
window.SoundBoardManager = SoundBoardManager;