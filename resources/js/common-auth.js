// common-auth.js - Sistema central de autenticación para todas las páginas

/**
 * Este archivo se carga antes que cualquier otro script en cada página
 * Proporciona una capa de autenticación consistente y gestiona:
 * - Inicialización de Firebase 
 * - Redirección a login para páginas protegidas
 * - Actualización automática de la interfaz según estado de sesión
 */

// Ejecutar cuando el DOM está completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Comprobar si Firebase ya está cargado e inicializarlo
    initializeFirebase()
        .then(() => {
            console.log('Firebase initialized and auth ready');
            // Inicializar UI basada en estado de autenticación
            updateUIForAuthState();
            // Configurar observador de cambios de autenticación
            setupAuthStateListener();
        })
        .catch(error => {
            console.error('Failed to initialize Firebase:', error);
        });
});

/**
 * Inicializa Firebase y sus servicios de autenticación
 * @return {Promise} Promesa que se resuelve cuando Firebase está listo
 */
function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            // Configuración de Firebase
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

            // Inicializar Firebase si no está ya inicializado
            if (typeof firebase !== 'undefined') {
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                }
                
                // Crear interfaz de autenticación si no existe
                if (!window.firebaseAuth) {
                    setupFirebaseAuthInterface();
                }
                
                resolve(true);
            } else {
                // Cargar scripts de Firebase dinámicamente
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

/**
 * Carga los scripts de Firebase dinámicamente si no están ya cargados
 * @return {Promise} Promesa que se resuelve cuando todos los scripts han cargado
 */
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

/**
 * Configura la interfaz global de autenticación de Firebase
 * Proporciona métodos unificados para gestionar usuarios
 */
function setupFirebaseAuthInterface() {
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Objeto global con métodos de autenticación disponibles para toda la aplicación
    window.firebaseAuth = {
        // Obtener usuario actual con datos adicionales de la base de datos
        getCurrentUser: function() {
            return new Promise((resolve, reject) => {
                const user = auth.currentUser;
                
                if (!user) {
                    resolve(null);
                    return;
                }
                
                // Obtener datos adicionales del usuario desde la base de datos
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
        
        // Registrar nuevo usuario
        registerUser: async function(email, password, username) {
            try {
                // Mostrar indicador de carga
                showLoading(true);
                
                // Crear usuario con email y contraseña
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Guardar datos adicionales en Firebase Realtime Database
                await database.ref('users/' + user.uid).set({
                    username: username || email.split('@')[0], // Nombre por defecto es prefijo del email
                    email: email,
                    profile_picture: '',
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                });
                
                // Actualizar perfil
                await user.updateProfile({
                    displayName: username || email.split('@')[0]
                });
                
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: true,
                    user: user
                };
            } catch (error) {
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Iniciar sesión
        loginUser: async function(email, password) {
            try {
                // Mostrar indicador de carga
                showLoading(true);
                
                // Iniciar sesión con email y contraseña
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Actualizar timestamp de último login
                await database.ref('users/' + user.uid + '/last_login').set(new Date().toISOString());
                
                // Guardar estado de autenticación en localStorage para persistencia
                localStorage.setItem('musiflow_auth_user', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                }));
                
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: true,
                    user: user
                };
            } catch (error) {
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Cerrar sesión de usuario
        logoutUser: async function() {
            try {
                // Mostrar indicador de carga
                showLoading(true);
                
                // Cerrar sesión
                await auth.signOut();
                
                // Limpiar estado de autenticación de localStorage
                localStorage.removeItem('musiflow_auth_user');
                
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: true
                };
            } catch (error) {
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Actualizar perfil de usuario
        updateUserProfile: async function(displayName, photoURL) {
            try {
                const user = auth.currentUser;
                
                if (!user) {
                    throw new Error('No user logged in');
                }
                
                // Mostrar indicador de carga
                showLoading(true);
                
                // Actualizar perfil en Auth
                await user.updateProfile({
                    displayName: displayName,
                    photoURL: photoURL
                });
                
                // Actualizar perfil en Database
                await database.ref('users/' + user.uid).update({
                    username: displayName,
                    profile_picture: photoURL
                });
                
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: true
                };
            } catch (error) {
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Restablecer contraseña
        resetPassword: async function(email) {
            try {
                // Mostrar indicador de carga
                showLoading(true);
                
                await auth.sendPasswordResetEmail(email);
                
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: true
                };
            } catch (error) {
                // Ocultar indicador de carga
                showLoading(false);
                
                return {
                    success: false,
                    error: error.message
                };
            }
        },
        
        // Verificar si el usuario está autenticado
        isUserLoggedIn: function() {
            return !!auth.currentUser;
        },
        
        // Observador de cambios de estado de autenticación
        onAuthStateChanged: function(callback) {
            return auth.onAuthStateChanged(user => {
                if (user) {
                    // Usuario autenticado
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
                    // Usuario no autenticado
                    callback({
                        user: null,
                        loggedIn: false
                    });
                }
            });
        }
    };
}

/**
 * Actualiza la interfaz según el estado de autenticación
 * Modifica enlaces de login y protege páginas que requieren autenticación
 */
function updateUIForAuthState() {
    const auth = firebase.auth();
    
    auth.onAuthStateChanged(user => {
        const loginLinks = document.querySelectorAll('.nav-link[href*="login"], .nav-link[data-bs-target="#loginModal"]');
        
        if (user) {
            // Usuario autenticado
            // Actualizar enlaces de login para mostrar nombre de usuario y redirigir a página de cuenta
            loginLinks.forEach(link => {
                const displayName = user.displayName || user.email.split('@')[0];
                link.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
                link.setAttribute('href', 'account.html');
                
                // Eliminar atributos de modal si existen
                link.removeAttribute('data-bs-toggle');
                link.removeAttribute('data-bs-target');
            });
            
            // Verificar si estamos en páginas que requieren login
            const currentPage = window.location.pathname.split('/').pop();
            
            // Si estamos en página de cuenta pero no podemos autenticar, mostrar carga primero
            if (currentPage === 'account.html') {
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.add('show');
                }
            }
        } else {
            // Usuario no autenticado
            // Resetear enlaces de login
            loginLinks.forEach(link => {
                if (link.href.includes('account.html')) {
                    // Convertir enlaces de cuenta a enlaces de login
                    if (document.getElementById('loginModal')) {
                        // Si existe el modal de login, configurar como disparador del modal
                        link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                        link.setAttribute('href', '#');
                        link.setAttribute('data-bs-toggle', 'modal');
                        link.setAttribute('data-bs-target', '#loginModal');
                    } else {
                        // De lo contrario, enlazar a página de login
                        link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                        link.setAttribute('href', 'login.html');
                    }
                }
            });
            
            // Redirigir a login si estamos en páginas protegidas
            const currentPage = window.location.pathname.split('/').pop();
            const protectedPages = ['account.html']; 
            
            if (protectedPages.includes(currentPage)) {
                // Guardar página actual como destino de redirección después del login
                localStorage.setItem('redirect_after_login', currentPage);
                window.location.href = 'login.html';
            }
        }
    });
}

/**
 * Configura el observador de cambios de estado de autenticación
 * Dispara un evento personalizado cuando cambia el estado
 */
function setupAuthStateListener() {
    firebase.auth().onAuthStateChanged(user => {
        // Emitir un evento personalizado cuando cambia el estado de autenticación
        const event = new CustomEvent('authStateChanged', { detail: { user } });
        document.dispatchEvent(event);
    });
}

/**
 * Muestra u oculta el indicador de carga (overlay)
 * @param {boolean} show - Indica si mostrar (true) u ocultar (false)
 */
function showLoading(show) {
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    // Crear el overlay de carga si no existe
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = '<div class="spinner"></div>';
        
        // Añadir estilos si son necesarios
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
    
    // Mostrar u ocultar
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}