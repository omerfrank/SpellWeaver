// Available character images
const availableImages = [
    '/static/img/Adventurer.webp',
    '/static/img/cleric.webp',
    '/static/img/angel.webp',
    '/static/img/dragon.webp',
    '/static/img/food.webp',
    '/static/img/goblin.webp',
    '/static/img/luka.webp',
    '/static/img/oracle.webp',
    '/static/img/paldin.webp',
    '/static/img/dark-paladin.webp',
    '/static/img/telepath.webp',
    '/static/img/ranger.webp',
    '/static/img/samurai.webp',
    '/static/img/warloc.webp',
    '/static/img/warlock2.webp',
    '/static/img/zombie.webp',
    
    // Add more images as needed
];

let selectedImage = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadImageGallery();
});

// Load image gallery
function loadImageGallery() {
    const gallery = document.getElementById('imageGallery');
    
    availableImages.forEach((imageUrl, index) => {
        const imageOption = document.createElement('div');
        imageOption.className = 'image-option';
        imageOption.innerHTML = `
            <img src="${imageUrl}" alt="Character ${index + 1}">
            <div class="check-icon">
                <i class="fas fa-check"></i>
            </div>
        `;
        imageOption.onclick = () => selectImage(imageUrl, imageOption);
        gallery.appendChild(imageOption);
    });
}

// Select image
function selectImage(imageUrl, element) {
    // Remove previous selection
    document.querySelectorAll('.image-option').forEach(option => {
        option.classList.remove('selected');
    });

    // Add selection to clicked image
    element.classList.add('selected');
    selectedImage = imageUrl;

    // Update preview
    updatePreview();
}

// Update preview
function updatePreview() {
    const name = document.getElementById('characterName').value.trim();
    const previewName = document.getElementById('previewName');
    const previewAvatar = document.getElementById('previewAvatar');

    // Update name
    previewName.textContent = name || 'New Character';

    // Update avatar
    if (selectedImage) {
        previewAvatar.innerHTML = `<img src="${selectedImage}" alt="Character preview">`;
    } else {
        previewAvatar.innerHTML = '👤';
    }

    // Enable/disable create button
    validateForm();
}

// Validate form
function validateForm() {
    const name = document.getElementById('characterName').value.trim();
    const createBtn = document.getElementById('createBtn');
    
    if (name && selectedImage) {
        createBtn.disabled = false;
    } else {
        createBtn.disabled = true;
    }
}

// Show alert
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Create character - Updated to use Flask API
async function createCharacter() {
    const name = document.getElementById('characterName').value.trim();
    
    if (!name || !selectedImage) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }

    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';

    // Create character object to send to API
    const characterData = {
        name: name,
        avatar: selectedImage
    };

    try {
        // Call your Flask API
        const response = await fetch('/api/game/createCharacter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(characterData)
        });

        const result = await response.json();

        if (response.ok && result.status === 'success') {
            console.log('Character created successfully:', result);
            showAlert('Character created successfully!', 'success');
            
            // Redirect to character select after 1.5 seconds
            setTimeout(() => {
                window.location.href = '/player/characterSelect';
            }, 1500);
        } else {
            // Handle error response from server
            throw new Error(result.message || 'Failed to create character');
        }
        
    } catch (error) {
        console.error('Error creating character:', error);
        showAlert(`Failed to create character: ${error.message}`, 'danger');
        
        // Re-enable button
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Create Character';
    }
}

// Go back to character select
function goBack() {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
        window.location.href = '/player/characterSelect';
    }
}