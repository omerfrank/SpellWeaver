// A list of all textarea elements and their corresponding character counters
const textareas = [
    { id: 'charBackground', countId: 'bgCount' },
    { id: 'npcs', countId: 'npcCount' },
    { id: 'plotProgress', countId: 'plotCount' },
    { id: 'clues', countId: 'clueCount' },
    { id: 'sessionNotes', countId: 'sessionCount' },
    { id: 'locations', countId: 'locCount' },
    { id: 'goals', countId: 'goalCount' },
    { id: 'additionalNotes', countId: 'addCount' }
];

/**
 * Runs when the page content is fully loaded.
 * Attaches all event listeners and loads initial data.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Load all notes from the server
    loadAllNotes();

    // 2. Add character count functionality to all textareas
    textareas.forEach(textarea => {
        const element = document.getElementById(textarea.id);
        const counter = document.getElementById(textarea.countId);
        
        if (element) {
            element.addEventListener('input', () => {
                counter.textContent = `${element.value.length} characters`;
            });
        }
    });

    // 3. Attach the save function to the save button
    const saveButton = document.querySelector('.save-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveAllNotes);
    }
});

/**
 * Fetches all notes from the Flask server (which should get them from Firebase).
 */
async function loadAllNotes() {
    console.log("Loading notes from server...");
    const characterId = localStorage.getItem('selectedCharacterId');
    try {
        // This endpoint needs to be created in your Flask app        
        const response = await fetch(`/api/game/loadBackground/${characterId}`); 
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const notes = await response.json();

        // Populate all textareas with the loaded data
        textareas.forEach(textarea => {
            const element = document.getElementById(textarea.id);
            const counter = document.getElementById(textarea.countId);
            
            if (element && notes[textarea.id]) {
                const text = notes[textarea.id];
                element.value = text;
                counter.textContent = `${text.length} characters`;
            }
        });

    } catch (error) {
        console.error("Failed to load notes:", error);
        // You could show an error message to the user here
    }
}

/**
 * Collects all notes and saves them to server
 */
async function saveAllNotes() {
    const btn = document.querySelector('.save-btn');
    const originalText = btn.innerHTML;
    
    const characterId = localStorage.getItem('selectedCharacterId');

    if (!characterId) {
        console.error("No character ID found on page!");
        // Show error feedback
        btn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> No Character!';
        btn.style.backgroundColor = '#f87171';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '#ff80ed';
        }, 2000);
        return;
    }
    // Collect all data from the textareas
    const notesData = {};
    textareas.forEach(textarea => {
        const element = document.getElementById(textarea.id);
        notesData[textarea.id] = element.value;
    });

    // Show "Saving..." feedback
    btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Saving...';
    btn.disabled = true; // Disable button to prevent multiple clicks

    try {
        // Send the data to the server
        // This endpoint needs to be created in your Flask app
        const response = await fetch(`/api/game/saveBackground/${characterId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notesData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Show success feedback
        if (response.ok && result.status === 'success') {
            btn.innerHTML = '<i class="bi bi-check-circle"></i> Saved!';
            btn.style.backgroundColor = '#4ade80';
        } else {
            throw new Error(result.message || "Save failed on server");
        }

    } catch (error) {
        console.error("Failed to save notes:", error);
        btn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Error!';
        btn.style.backgroundColor = '#f87171'; // A red color
    
    } finally {
        // Revert button text after 2 seconds
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '#ff80ed';
            btn.disabled = false;
        }, 2000);
    }
}