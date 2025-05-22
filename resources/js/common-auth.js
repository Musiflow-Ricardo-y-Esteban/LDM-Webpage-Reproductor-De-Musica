// resources/js/common-auth.js
// Sistema central de inicialización de Firebase y autenticación para todas las páginas.

let firebaseInitializationAttempted = false;
let firebaseSuccessfullyInitialized = false;

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

async function initializeFirebaseAppAndAuth() {
    if (firebaseSuccessfullyInitialized) {
        console.log("common-auth.js: Firebase ya está inicializado y listo.");
        document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { status: 'already_initialized' } }));
        return true;
    }
    if (firebaseInitializationAttempted && !firebaseSuccessfullyInitialized) {
        console.warn("common-auth.js: Intento previo de inicializar Firebase falló. No reintentando automáticamente aquí.");
        return false; // No reintentar si ya falló, para evitar bucles si el SDK no carga.
    }

    firebaseInitializationAttempted = true;
    console.log("common-auth.js: Iniciando proceso de inicialización de Firebase...");

    try {
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            console.error("common-auth.js: El SDK base de Firebase (firebase-app-compat.js) no parece estar cargado.");
            throw new Error("SDK de Firebase (app) no cargado.");
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("common-auth.js: Aplicación Firebase [DEFAULT] inicializada correctamente.");
        } else {
            firebase.app(); 
            console.log("common-auth.js: Usando instancia de Firebase app existente.");
        }
        
        // Verificar que los servicios de auth y database estén disponibles después de inicializar la app
        if (typeof firebase.auth !== 'function' || typeof firebase.database !== 'function') {
            console.error("common-auth.js: Los servicios de Firebase Auth o Database no están disponibles después de inicializar la app. Verifica la carga de los SDKs correspondientes (firebase-auth-compat.js, firebase-database-compat.js).");
            throw new Error("Servicios de Firebase Auth/Database no disponibles.");
        }
        
        firebaseSuccessfullyInitialized = true;
        setupFirebaseAuthInterface(); 
        
        console.log('common-auth.js: Firebase y la interfaz de Auth están listos.');
        document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { status: 'initialized' } }));
        return true;
    } catch (error) {
        console.error('common-auth.js: Falló la inicialización de Firebase:', error);
        document.dispatchEvent(new CustomEvent('firebaseError', { detail: error }));
        firebaseSuccessfullyInitialized = false;
        return false;
    }
}

function setupFirebaseAuthInterface() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    window.firebaseAuth = {
        getCurrentUser: function() {
            return new Promise((resolve) => { // No usar reject aquí para simplificar el flujo de espera
                const user = auth.currentUser;
                if (!user) {
                    resolve(null); return;
                }
                database.ref('users/' + user.uid).once('value')
                    .then(snapshot => {
                        const userDataFromDB = snapshot.val() || {};
                        resolve({
                            uid: user.uid, email: user.email,
                            displayName: user.displayName || userDataFromDB.username,
                            photoURL: user.photoURL || userDataFromDB.profile_picture,
                            emailVerified: user.emailVerified, ...userDataFromDB 
                        });
                    })
                    .catch(error => {
                        console.error('common-auth.js: getCurrentUser - Error al obtener datos de DB:', error);
                        resolve({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, emailVerified: user.emailVerified });
                    });
            });
        },
        registerUser: async function(email, password, username) {
            try {
                showLoadingGlobal(true);
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                const displayName = username || (email ? email.split('@')[0] : 'Nuevo Usuario');
                await database.ref('users/' + user.uid).set({
                    username: displayName, email: email, profile_picture: '', 
                    created_at: firebase.database.ServerValue.TIMESTAMP, 
                    last_login: firebase.database.ServerValue.TIMESTAMP
                });
                await user.updateProfile({ displayName: displayName });
                return { success: true, user: user };
            } catch (error) { return { success: false, error: error.message }; }
            finally { showLoadingGlobal(false); }
        },
        loginUser: async function(email, password) {
            try {
                showLoadingGlobal(true);
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                await database.ref('users/' + user.uid + '/last_login').set(firebase.database.ServerValue.TIMESTAMP);
                localStorage.setItem('musiflow_auth_user_simple_info', JSON.stringify({ uid: user.uid, displayName: user.displayName }));
                return { success: true, user: user };
            } catch (error) { return { success: false, error: error.message }; }
            finally { showLoadingGlobal(false); }
        },
        logoutUser: async function() {
            try {
                showLoadingGlobal(true);
                await auth.signOut();
                localStorage.removeItem('musiflow_auth_user_simple_info');
                // Limpiar cachés de managers si existen
                window.LikesManager?.reinitialize?.();
                window.PlaylistManager?.reinitialize?.();
                window.LibraryManager?.reinitialize?.();
                return { success: true };
            } catch (error) { return { success: false, error: error.message }; }
            finally { showLoadingGlobal(false); }
        },
        updateUserProfile: async function(displayName, photoURL, bio = null) { // Añadido bio
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('Usuario no autenticado para actualizar perfil.');
                showLoadingGlobal(true);
                
                const profileUpdates = {};
                if (displayName !== undefined) profileUpdates.displayName = displayName;
                if (photoURL !== undefined) profileUpdates.photoURL = photoURL;
                if (Object.keys(profileUpdates).length > 0) {
                    await user.updateProfile(profileUpdates);
                }

                const dbUpdates = {};
                if (displayName !== undefined) dbUpdates.username = displayName;
                if (photoURL !== undefined) dbUpdates.profile_picture = photoURL;
                // Actualizar bio en un sub-objeto profileInfo
                if (bio !== null && bio !== undefined) { // bio puede ser string vacío para borrarlo
                     if (!dbUpdates.profileInfo) dbUpdates.profileInfo = {};
                     dbUpdates.profileInfo.bio = bio;
                } else if (bio === null) { // Para explícitamente borrar la bio
                     if (!dbUpdates.profileInfo) dbUpdates.profileInfo = {};
                     dbUpdates.profileInfo.bio = null;
                }

                if (Object.keys(dbUpdates).length > 0) {
                    await database.ref('users/' + user.uid).update(dbUpdates);
                }
                return { success: true };
            } catch (error) { return { success: false, error: error.message }; }
            finally { showLoadingGlobal(false); }
        },
        resetPassword: async function(email) {
            try {
                showLoadingGlobal(true);
                await auth.sendPasswordResetEmail(email);
                return { success: true };
            } catch (error) { return { success: false, error: error.message }; }
            finally { showLoadingGlobal(false); }
        },
        isUserLoggedIn: function() { return !!auth.currentUser; },
        onAuthStateChanged: function(callback) {
            return auth.onAuthStateChanged(user => {
                if (user) {
                    this.getCurrentUser().then(fullUser => { // Usar this.getCurrentUser para datos combinados
                        callback({ user: fullUser, loggedIn: true });
                    });
                } else {
                    callback({ user: null, loggedIn: false });
                }
            });
        }
    };
    console.log("common-auth.js: Interfaz global window.firebaseAuth configurada.");
}

// Lógica de ejecución al cargar common-auth.js
initializeFirebaseAppAndAuth()
    .then(initializedSuccessfully => {
        if (initializedSuccessfully) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    console.log("common-auth.js: DOM cargado. Configurando UI y listener de estado de Auth.");
                    updateGlobalUIForAuthState(); 
                    setupGlobalAuthStateListener(); 
                });
            } else { 
                console.log("common-auth.js: DOM ya cargado. Configurando UI y listener de estado de Auth.");
                updateGlobalUIForAuthState();
                setupGlobalAuthStateListener();
            }
        } else {
            console.error("common-auth.js: La inicialización de Firebase falló. Algunas funcionalidades pueden no estar disponibles.");
        }
    })
    .catch(error => { 
        console.error("common-auth.js: Error catastrófico durante la configuración inicial de Firebase y Auth:", error);
    });

function updateGlobalUIForAuthState() {
    console.log("common-auth.js: updateGlobalUIForAuthState - Actualizando elementos globales de la UI.");
    if (!firebase || !firebase.auth) {
        console.error("common-auth.js: updateGlobalUIForAuthState - firebase.auth no está disponible.");
        return;
    }
    const auth = firebase.auth();
    
    auth.onAuthStateChanged(user => {
        const loginLinks = document.querySelectorAll('#loginLink'); // ID específico para el enlace de login/perfil
        
        if (user) {
            console.log("common-auth.js: updateGlobalUIForAuthState - Usuario autenticado. Actualizando enlaces.");
            window.firebaseAuth.getCurrentUser().then(fullUser => { // Obtener nombre de usuario de la DB
                loginLinks.forEach(link => {
                    const displayName = fullUser?.displayName || fullUser?.username || (fullUser?.email ? fullUser.email.split('@')[0] : 'Mi Cuenta');
                    link.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
                    link.href = 'account.html';
                    link.removeAttribute('data-bs-toggle');
                    link.removeAttribute('data-bs-target');
                });
            });
        } else {
            console.log("common-auth.js: updateGlobalUIForAuthState - Usuario no autenticado. Restableciendo enlaces.");
            loginLinks.forEach(link => {
                link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                // Si la página actual es index.html y tiene el modal de login, apuntar al modal.
                // Sino, apuntar a login.html.
                const loginModalElement = document.getElementById('loginModal');
                if (window.location.pathname.endsWith('index.html') && loginModalElement) {
                    link.href = '#';
                    link.setAttribute('data-bs-toggle', 'modal');
                    link.setAttribute('data-bs-target', '#loginModal');
                } else {
                    link.href = 'login.html';
                    link.removeAttribute('data-bs-toggle');
                    link.removeAttribute('data-bs-target');
                }
            });

            const currentPage = window.location.pathname.split('/').pop();
            const protectedPages = ['account.html', 'biblioteca.html']; // premium.html no es estrictamente protegida
            
            if (protectedPages.includes(currentPage) && currentPage !== 'login.html') {
                console.log(`common-auth.js: Usuario no autenticado en página protegida (${currentPage}). Redirigiendo.`);
                localStorage.setItem('redirect_after_login', currentPage);
                window.location.href = 'login.html';
            }
        }
    });
}

function setupGlobalAuthStateListener() {
    console.log("common-auth.js: setupGlobalAuthStateListener - Configurando listener para 'appAuthStateChanged'.");
    if (!firebase || !firebase.auth) {
        console.error("common-auth.js: setupGlobalAuthStateListener - firebase.auth no disponible.");
        return;
    }
    firebase.auth().onAuthStateChanged(user => {
        console.log("common-auth.js: Evento 'appAuthStateChanged' - Nuevo estado. Usuario:", user ? user.uid : 'No logueado');
        const event = new CustomEvent('appAuthStateChanged', { detail: { user } });
        document.dispatchEvent(event);
    });
}

function showLoadingGlobal(show) { // Renombrado para evitar conflictos si otra pág define showLoading
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) { 
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay'; 
        loadingOverlay.innerHTML = '<div class="spinner"></div>'; 
        
        if (!document.getElementById('common-auth-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'common-auth-loading-styles';
            style.textContent = `
                .loading-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.6); 
                    display: flex; justify-content: center; align-items: center;
                    z-index: 10000; visibility: hidden; opacity: 0;
                    transition: visibility 0s linear 0.3s, opacity 0.3s ease-in-out; 
                }
                .loading-overlay.show { visibility: visible; opacity: 1; transition-delay: 0s; }
                .spinner { width: 40px; height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.2); 
                    border-top-color: var(--acento-actual, #1DB954); /* Usar variable CSS o fallback */
                    border-radius: 50%;
                    animation: commonAuthSpinnerSpin 0.8s linear infinite;
                }
                @keyframes commonAuthSpinnerSpin { to { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(loadingOverlay);
    }
    
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}