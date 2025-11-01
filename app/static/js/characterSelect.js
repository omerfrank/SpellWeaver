// Sample character data structure (will be replaced with Firebase data)
const sampleCharacters = [
    {
        id: 'char1',
        name: 'Thorin Ironshield',
        class: 'Fighter',
        race: 'Dwarf',
        level: 5,
        imageUrl: '/bigproj/img/paldin.webp',
        hp: 45,
        maxHp: 45,
        ac: 18,
        proficiencyBonus: 3
    },
    {
        id: 'char2',
        name: 'Elara Moonwhisper',
        class: 'Wizard',
        race: 'Elf',
        level: 4,
        imageUrl: '/bigproj/img/wizard.webp',
        hp: 22,
        maxHp: 22,
        ac: 13,
        proficiencyBonus: 2
    },
    {
        id: 'char3',
        name: 'Ragnar the Bold',
        class: 'Barbarian',
        race: 'Human',
        level: 6,
        imageUrl: '/bigproj/img/warlock.webp',
        hp: 68,
        maxHp: 68,
        ac: 15,
        proficiencyBonus: 3
    }
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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadCharacters();
});

// Load characters (will be from Firebase later)
function loadCharacters() {
    showLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
        // TODO: Replace with Firebase fetch
        // const characters = await fetchCharactersFromFirebase();
        const characters = sampleCharacters;
        
        displayCharacters(characters);
        showLoading(false);
    }, 500);
}

// Display characters on the page
function displayCharacters(characters) {
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = '';

    // Add each character card
    characters.forEach(character => {
        const col = document.createElement('div');
        col.className = 'col';
        col.innerHTML = createCharacterCard(character);
        grid.appendChild(col);
    });

    // Add "Create New Character" card
    const createCol = document.createElement('div');
    createCol.className = 'col';
    createCol.innerHTML = createNewCharacterCard();
    grid.appendChild(createCol);
}

// Create character card HTML
function createCharacterCard(character) {
    return `
        <div class="character-card" onclick="selectCharacter('${character.id}')">
            <img class="character-avatar" src="${character.imageUrl}" alt="${character.name}">
            <div class="character-name">${character.name}</div>
            <div class="character-info">
                ${character.race} ${character.class} • Level ${character.level}
            </div>
            <div class="character-stats">
                <div class="stat-item">
                    <div class="stat-label">HP</div>
                    <div class="stat-value">${character.hp}/${character.maxHp}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">AC</div>
                    <div class="stat-value">${character.ac}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Prof</div>
                    <div class="stat-value">+${character.proficiencyBonus}</div>
                </div>
            </div>
        </div>
    `;
}

// Create "New Character" card HTML
function createNewCharacterCard() {
    return `
        <div class="create-character-card" onclick="createNewCharacter()">
            <div class="create-icon">
                <i class="fas fa-plus-circle"></i>
            </div>
            <h4>Create New Character</h4>
            <p class="text-muted">Start a new adventure</p>
        </div>
    `;
}

// Show/hide loading state
function showLoading(show) {
    document.getElementById('loadingContainer').style.display = show ? 'block' : 'none';
    document.getElementById('charactersContainer').style.display = show ? 'none' : 'block';
}

// Select a character
function selectCharacter(characterId) {
    console.log('Selected character:', characterId);
    // TODO: Save selected character to session/storage
    // TODO: Redirect to character sheet or game page
    window.localStorage.clear();
    window.localStorage.setItem("characterId", characterId)
    window.location.href = "/bigproj/html/player/showcase.html"
}

// Create new character
function createNewCharacter() {
    console.log('Creating new character');
    window.location.href = "/bigproj/html/createCharacter.html"
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // TODO: Firebase logout
        console.log('Logging out...');
        window.location.href = 'index.html';
    }
}

// Firebase functions (to be implemented)
/*
async function fetchCharactersFromFirebase() {
    // TODO: Implement Firebase fetch
    // const user = firebase.auth().currentUser;
    // const snapshot = await firebase.database()
    //     .ref(`users/${user.uid}/characters`)
    //     .once('value');
    // return snapshot.val() || [];
}

async function saveCharacterToFirebase(character) {
    // TODO: Implement Firebase save
    // const user = firebase.auth().currentUser;
    // await firebase.database()
    //     .ref(`users/${user.uid}/characters/${character.id}`)
    //     .set(character);
}

async function deleteCharacterFromFirebase(characterId) {
    // TODO: Implement Firebase delete
    // const user = firebase.auth().currentUser;
    // await firebase.database()
    //     .ref(`users/${user.uid}/characters/${characterId}`)
    //     .remove();
}
*/