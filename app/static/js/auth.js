// TODO: Replace this with your project's Firebase configuration
// You can find this in your Firebase project console settings
const firebaseConfig = {
    apiKey: "AIzaSyCMDy-YG7RJuV5ljhccuf9wpz9RhDGEW9g",
    authDomain: "spell-weaver-257d8.firebaseapp.com",
    databaseURL: "https://spell-weaver-257d8-default-rtdb.firebaseio.com",
    projectId: "spell-weaver-257d8",
    storageBucket: "spell-weaver-257d8.firebasestorage.app",
    messagingSenderId: "162897283955",
    appId: "1:162897283955:web:26be48eaa05102a0ec5306",
    measurementId: "G-2YWFCQ91MG"
  };
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Sign In Form Logic (from previous step) ---
    const signInForm = document.getElementById('signInForm');
    const signInButton = document.getElementById('signInButton');
    const signInError = document.getElementById('signInError');

    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const email = document.getElementById('signInEmail').value;
            const password = document.getElementById('signInPassword').value;

            signInButton.disabled = true;
            signInButton.textContent = 'Signing In...';
            signInError.style.display = 'none';

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => userCredential.user.getIdToken())
                .then((idToken) => {
                    return fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ idToken: idToken }),
                    });
                })
                .then(response => {
                    if (!response.ok) throw new Error('Server login failed.');
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        window.location.href = '/player/characterSelect';
                    } else {
                        throw new Error(data.message || 'Unknown server error');
                    }
                })
                .catch((error) => {
                    console.error('Login Error:', error);
                    signInError.textContent = error.message;
                    signInError.style.display = 'block';
                    signInButton.disabled = false;
                    signInButton.textContent = 'Sign In';
                });
        });
    }

    //
    // --- ADD THIS NEW SIGN UP LOGIC ---
    //
    const signUpForm = document.getElementById('signUpForm');
    const signUpButton = document.getElementById('signUpButton');
    const signUpError = document.getElementById('signUpError');

    if (signUpForm) {
        signUpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signUpEmail').value;
            const password = document.getElementById('signUpPassword').value;

            signUpButton.disabled = true;
            signUpButton.textContent = 'Creating Account...';
            signUpError.style.display = 'none';

            // 1. Create the user in Firebase Auth
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // 2. User created, now get their token
                    return userCredential.user.getIdToken();
                })
                .then((idToken) => {
                    // 3. Send this token to our new /api/auth/signup endpoint
                    return fetch('/api/auth/signup', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ idToken: idToken }),
                    });
                })
                .then(response => {
                    if (!response.ok) throw new Error('Server signup failed.');
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        // 4. Server created the DB entry and session. Redirect.
                        window.location.href = '/player/characterSelect';
                    } else {
                        throw new Error(data.message || 'Unknown server error');
                    }
                })
                .catch((error) => {
                    // Handle errors (e.g., email-already-in-use, weak-password)
                    console.error('Sign Up Error:', error);
                    signUpError.textContent = error.message;
                    signUpError.style.display = 'block';
                    signUpButton.disabled = false;
                    signUpButton.textContent = 'Create Account';
                });
        });
    }

});