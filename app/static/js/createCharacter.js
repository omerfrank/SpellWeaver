// Available character images
const availableImages = [
    '/bigproj/img/paldin.webp',
    '/bigproj/img/wizard.webp',
    '/bigproj/img/warlock.webp',
    // Add more images as needed
];

// Firebase configuration (to be filled in later)
const firebaseConfig = {
    // apiKey: "YOUR_API_KEY",
    // authDomain: "YOUR_AUTH_DOMAIN",
    // databaseURL: "YOUR_DATABASE_URL",
    // projectId: "YOUR_PROJECT_ID",
    // storageBucket: "YOUR_STORAGE_BUCKET",
    // messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    // appId: "YOUR_APP_ID"
};

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

// Create character
async function createCharacter() {
    const name = document.getElementById('characterName').value.trim();
    
    if (!name || !selectedImage) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }

    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';

    // Create character object
    const newCharacter = {
        id: generateCharacterId(),
        name: name,
        avatar: selectedImage,
        class: 'Adventurer', // Default class
        race: 'Human', // Default race
        level: 1,
        hp: 10,
        maxHp: 10,
        ac: 10,
        proficiencyBonus: 2,
        createdAt: new Date().toISOString()
    };

    try {
        // TODO: Replace with Firebase save
        // await saveCharacterToFirebase(newCharacter);
        
        // Simulate saving delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Character created:', newCharacter);
        showAlert('Character created successfully!', 'success');
        
        // Redirect to character select after 1.5 seconds
        setTimeout(() => {
            window.location.href = '/bigproj/html/characterSelect.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error creating character:', error);
        showAlert('Failed to create character. Please try again.', 'danger');
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Create Character';
    }
}

// Generate unique character ID
function generateCharacterId() {
    return 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Go back to character select
function goBack() {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
        window.location.href = '/bigproj/html/characterSelect.html';
    }
}

// Firebase functions (to be implemented)
/*
async function saveCharacterToFirebase(character) {
    // TODO: Implement Firebase save
    const user = firebase.auth().currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }
    
    await firebase.database()
        .ref(`users/${user.uid}/characters/${character.id}`)
        .set(character);
}

// Initialize Firebase
function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}
*/
