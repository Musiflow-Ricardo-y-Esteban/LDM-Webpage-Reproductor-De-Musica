// common-auth.js - Load this script before all other scripts on every page
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is already loaded
    initializeFirebase()
        .then(() => {
            console.log('Firebase initialized and auth ready');
            // Initialize UI based on auth state
            updateUIForAuthState();
            // Set up auth state listener
            setupAuthStateListener();
        })
        .catch(error => {
            console.error('Failed to initialize Firebase:', error);
        });
});

// Initialize Firebase and authentication
function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            // Firebase configuration
            const firebaseConfig = {
                apiKey: "AIzaSyBCtn83ZMoWCZaL1QSuzTpOv-hJmXI-o8k",
                authDomain: "musiflow-42411.firebaseapp.com",
                databaseURL: "https://musiflow-42411-default-rtdb.firebaseio.com",
                projectId: "musiflow-42411",
                storageBucket: "musiflow-42411.appspot.com",
                messagingSenderId: "619733935410",
                appId: "1:619733935410:web:11cb4a60a7de4fcd30a32b",
                measurementId: "G-FFVMTR5LVM"
            };

            // Initialize Firebase if not already initialized
            if (typeof firebase !== 'undefined') {
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                
                // Create auth interface if not exists
                if (!window.firebaseAuth) {
                    setupFirebaseAuthInterface();
                }
                
                resolve(true);
            } else {
                // Load Firebase scripts dynamically
                loadFirebaseScripts()
                    .then(() => {
                        firebase.initializeApp(firebaseConfig);
                        setupFirebaseAuthInterface();
                        resolve(true);
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Load Firebase scripts dynamically
function loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
        const scripts = [
            { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js', id: 'firebase-app-script' },
            { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js', id: 'firebase-auth-script' },
            { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js', id: 'firebase-database-script' },
            { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage-compat.js', id: 'firebase-storage-script' }
        ];
        
        let loadedCount = 0;
        
        scripts.forEach(script => {
            if (document.getElementById(script.id)) {
                loadedCount++;
                if (loadedCount === scripts.length) {
                    resolve();
                }
                return;
            }
            
            const scriptElement = document.createElement('script');
            scriptElement.src = script.src;
            scriptElement.id = script.id;
            scriptElement.onload = () => {
                loadedCount++;
                if (loadedCount === scripts.length) {
                    resolve();
                }
            };
            scriptElement.onerror = (error) => {
                reject(new Error(`Failed to load ${script.src}: ${error}`));
            };
            
            document.head.appendChild(scriptElement);
        });
    });
}

// Set up Firebase auth interface
function setupFirebaseAuthInterface() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    window.firebaseAuth = {
        // Get current user
        getCurrentUser: function() {
            return new Promise((resolve, reject) => {
                const user = auth.currentUser;
                
                if (!user) {
                    resolve(null);
                    return;
                }
                
                // Get additional user data from database
                database.ref('users/' + user.uid).once('value')
                    .then(snapshot => {
                        const userData = snapshot.val() || {};
                        resolve({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || userData.username,
                            photoURL: user.photoURL || userData.profile_picture,
                            emailVerified: user.emailVerified,
                            ...userData
                        });
                    })
                    .catch(error => {
                        console.error('Error getting user data:', error);
                        resolve({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            emailVerified: user.emailVerified
                        });
                    });
            });
        },
        
        // Register new user
        registerUser: async function(email, password, username) {
            try {
                // Show loading spinner
                showLoading(true);
                
                // Create user with email and password
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Save additional user data to Firebase Realtime Database
                await database.ref('users/' + user.uid).set({
                    username: username || email.split('@')[0], // Default username is email prefix
                    email: email,
                    profile_picture: '',
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                });
                
                // Update profile
                await user.updateProfile({
                    displayName: username || email.split('@')[0]
                });
                
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: true,
                    user: user
                };
            } catch (error) {
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Login user
        loginUser: async function(email, password) {
            try {
                // Show loading spinner
                showLoading(true);
                
                // Sign in with email and password
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Update last login timestamp
                await database.ref('users/' + user.uid + '/last_login').set(new Date().toISOString());
                
                // Store auth state in localStorage for persistence
                localStorage.setItem('musiflow_auth_user', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                }));
                
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: true,
                    user: user
                };
            } catch (error) {
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Logout user
        logoutUser: async function() {
            try {
                // Show loading spinner
                showLoading(true);
                
                // Sign out
                await auth.signOut();
                
                // Clear auth state from localStorage
                localStorage.removeItem('musiflow_auth_user');
                
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: true
                };
            } catch (error) {
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Update user profile
        updateUserProfile: async function(displayName, photoURL) {
            try {
                const user = auth.currentUser;
                
                if (!user) {
                    throw new Error('No user logged in');
                }
                
                // Show loading spinner
                showLoading(true);
                
                // Update auth profile
                await user.updateProfile({
                    displayName: displayName,
                    photoURL: photoURL
                });
                
                // Update database profile
                await database.ref('users/' + user.uid).update({
                    username: displayName,
                    profile_picture: photoURL
                });
                
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: true
                };
            } catch (error) {
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Reset password
        resetPassword: async function(email) {
            try {
                // Show loading spinner
                showLoading(true);
                
                await auth.sendPasswordResetEmail(email);
                
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: true
                };
            } catch (error) {
                // Hide loading spinner
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Check if user is logged in
        isUserLoggedIn: function() {
            return !!auth.currentUser;
        },
        
        // Auth state observer
        onAuthStateChanged: function(callback) {
            return auth.onAuthStateChanged(user => {
                if (user) {
                    // User is signed in
                    database.ref('users/' + user.uid).once('value')
                        .then(snapshot => {
                            const userData = snapshot.val() || {};
                            callback({
                                user: {
                                    uid: user.uid,
                                    email: user.email,
                                    displayName: user.displayName || userData.username,
                                    photoURL: user.photoURL || userData.profile_picture,
                                    emailVerified: user.emailVerified,
                                    ...userData
                                },
                                loggedIn: true
                            });
                        })
                        .catch(error => {
                            console.error('Error fetching user data:', error);
                            callback({
                                user: {
                                    uid: user.uid,
                                    email: user.email,
                                    displayName: user.displayName,
                                    photoURL: user.photoURL,
                                    emailVerified: user.emailVerified
                                },
                                loggedIn: true
                            });
                        });
                } else {
                    // User is signed out
                    callback({
                        user: null,
                        loggedIn: false
                    });
                }
            });
        }
    };
}

// Update UI based on authentication state
function updateUIForAuthState() {
    const auth = firebase.auth();
    
    auth.onAuthStateChanged(user => {
        const loginLinks = document.querySelectorAll('.nav-link[href*="login"], .nav-link[data-bs-target="#loginModal"]');
        
        if (user) {
            // User is logged in
            // Update login links to show user's name and redirect to account page
            loginLinks.forEach(link => {
                const displayName = user.displayName || user.email.split('@')[0];
                link.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
                link.setAttribute('href', 'account.html');
                
                // Remove modal attributes if present
                link.removeAttribute('data-bs-toggle');
                link.removeAttribute('data-bs-target');
            });
            
            // Check if we're on pages that require login
            const currentPage = window.location.pathname.split('/').pop();
            
            // If on account page but can't authenticate, show loading first
            if (currentPage === 'account.html') {
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.add('show');
                }
            }
        } else {
            // User is not logged in
            // Reset login links
            loginLinks.forEach(link => {
                if (link.href.includes('account.html')) {
                    // Reset account links to login link/modal
                    if (document.getElementById('loginModal')) {
                        // If login modal exists, set up modal trigger
                        link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                        link.setAttribute('href', '#');
                        link.setAttribute('data-bs-toggle', 'modal');
                        link.setAttribute('data-bs-target', '#loginModal');
                    } else {
                        // Otherwise link to login page
                        link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                        link.setAttribute('href', 'login.html');
                    }
                }
            });
            
            // Redirect to login page if on protected pages
            const currentPage = window.location.pathname.split('/').pop();
            const protectedPages = ['account.html']; 
            
            if (protectedPages.includes(currentPage)) {
                // Store current page as redirect destination after login
                localStorage.setItem('redirect_after_login', currentPage);
                window.location.href = 'login.html';
            }
        }
    });
}

// Set up auth state change listener
function setupAuthStateListener() {
    firebase.auth().onAuthStateChanged(user => {
        // Dispatch a custom event when auth state changes
        const event = new CustomEvent('authStateChanged', { detail: { user } });
        document.dispatchEvent(event);
    });
}

// Helper function to show/hide loading overlay
function showLoading(show) {
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    // Create loading overlay if doesn't exist
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="spinner"></div>';
        
        // Add styles if needed
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    visibility: hidden;
                    opacity: 0;
                    transition: all 0.3s ease;
                }
                .loading-overlay.show {
                    visibility: visible;
                    opacity: 1;
                }
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid rgba(255, 255, 255, 0.1);
                    border-left-color: #1DB954;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingOverlay);
    }
    
    // Show or hide
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}