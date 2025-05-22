// common-auth.js - Sistema central de inicialización de Firebase y autenticación para todas las páginas.
// Este script se encarga de:
// 1. Inicializar la aplicación Firebase
// 2. Configurar una interfaz global `window.firebaseAuth` con funciones de autenticación comunes.
// 3. Manejar la actualización de la UI (ej. links de navegación) según el estado de autenticación.
// 4. Disparar un evento `firebaseReady` cuando Firebase está listo para ser usado por otros módulos.
// 5. Disparar un evento `appAuthStateChanged` cuando el estado de autenticación del usuario cambia.

// Variable global para asegurar que Firebase solo se inicialice una vez en toda la aplicación.
let firebaseInitializationAttempted = false;
let firebaseSuccessfullyInitialized = false;

// Configuración de Firebase. Es importante que sea la misma en toda la aplicación.
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

/**
 * Función principal para inicializar Firebase y configurar la autenticación.
 * Debe ser llamada lo más pronto posible, idealmente después de cargar los SDKs de Firebase.
 * @return {Promise<boolean>} Promesa que se resuelve a `true` si la inicialización fue exitosa, `false` si no.
 */
async function initializeFirebaseAppAndAuth() {
    if (firebaseSuccessfullyInitialized) {
        // Si ya se inicializó correctamente, no hacer nada más.
        console.log("common-auth.js: Firebase ya está inicializado y listo.");
        // Disparar el evento de nuevo por si algún script se cargó tarde.
        document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { status: 'already_initialized' } }));
        return true;
    }

    if (firebaseInitializationAttempted) {
        // Si ya se intentó y falló, no reintentar automáticamente aquí para evitar bucles.
        console.warn("common-auth.js: Ya se intentó inicializar Firebase previamente y falló o aún está en proceso.");
        return false;
    }

    firebaseInitializationAttempted = true; // Marcar que se está intentando la inicialización.
    console.log("common-auth.js: Iniciando proceso de inicialización de Firebase...");

    try {
        // Verificar que el objeto global `firebase` y la función `initializeApp` estén disponibles.
        // Esto implica que los scripts del SDK de Firebase (ej. firebase-app-compat.js) ya se cargaron.
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            console.error("common-auth.js: El SDK base de Firebase (firebase-app-compat.js) no parece estar cargado. No se puede inicializar Firebase.");
            throw new Error("SDK de Firebase (app) no cargado.");
        }

        // Inicializar la aplicación Firebase si no hay ninguna aplicación [DEFAULT] inicializada.
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("common-auth.js: Aplicación Firebase [DEFAULT] inicializada correctamente.");
        } else {
            // Si ya existe una aplicación (posiblemente de otra inicialización o página), se usa la existente.
            firebase.app(); // Esto obtiene la instancia [DEFAULT] si existe.
            console.log("common-auth.js: Usando instancia de Firebase app existente.");
        }
        
        firebaseSuccessfullyInitialized = true; // Marcar como inicialización exitosa.

        // Configurar la interfaz global `window.firebaseAuth` con funciones de utilidad para la autenticación.
        setupFirebaseAuthInterface(); 
        
        console.log('common-auth.js: Firebase y la interfaz de Auth están listos.');
        
        // Disparar un evento personalizado para notificar a otros scripts que Firebase está listo.
        // Otros módulos pueden escuchar este evento para proceder con sus propias inicializaciones dependientes de Firebase.
        document.dispatchEvent(new CustomEvent('firebaseReady', { detail: { status: 'initialized' } }));

        return true;
    } catch (error) {
        console.error('common-auth.js: Falló la inicialización de Firebase:', error);
        // Disparar un evento de error para que otras partes de la aplicación puedan reaccionar si es necesario.
        document.dispatchEvent(new CustomEvent('firebaseError', { detail: error }));
        firebaseSuccessfullyInitialized = false; // Marcar como fallida.
        return false;
    }
}

/**
 * Configura la interfaz global `window.firebaseAuth`.
 * Esta interfaz expone funciones comunes para el registro, login, logout, etc.,
 * facilitando la gestión de la autenticación desde cualquier parte de la aplicación.
 * Se asume que esta función se llama DESPUÉS de que `firebase.initializeApp()` ha sido exitoso.
 */
function setupFirebaseAuthInterface() {
    // Obtener instancias de los servicios de Firebase Auth y Database.
    // Es crucial que esto se haga después de `initializeApp`.
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Definir el objeto `window.firebaseAuth`.
    window.firebaseAuth = {
        /**
         * Obtiene el usuario actualmente autenticado, incluyendo datos adicionales de la base de datos.
         * @return {Promise<Object|null>} Promesa que se resuelve con el objeto de usuario completo, o `null` si no hay sesión.
         */
        getCurrentUser: function() {
            return new Promise((resolve, reject) => {
                const user = auth.currentUser; // Usuario de Firebase Auth.
                
                if (!user) { // Si no hay usuario en Firebase Auth.
                    resolve(null);
                    return;
                }
                
                // Obtener datos adicionales del perfil del usuario desde Realtime Database.
                database.ref('users/' + user.uid).once('value')
                    .then(snapshot => {
                        const userDataFromDB = snapshot.val() || {}; // Datos de la DB (ej. username, profile_picture).
                        // Combinar datos de Auth y DB.
                        resolve({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || userDataFromDB.username, // Priorizar displayName de Auth.
                            photoURL: user.photoURL || userDataFromDB.profile_picture, // Priorizar photoURL de Auth.
                            emailVerified: user.emailVerified,
                            ...userDataFromDB 
                        });
                    })
                    .catch(error => { // Si hay error al leer de DB, devolver solo datos de Auth.
                        console.error('common-auth.js: getCurrentUser - Error al obtener datos adicionales de DB:', error);
                        resolve({ // Devolver datos básicos de Auth como fallback.
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            emailVerified: user.emailVerified
                        });
                    });
            });
        },
        
        /**
         * Registra un nuevo usuario con email, contraseña y nombre de usuario opcional.
         * @param {string} email - Correo electrónico del nuevo usuario.
         * @param {string} password - Contraseña para el nuevo usuario.
         * @param {string} [username] - Nombre de usuario (opcional).
         * @return {Promise<Object>} Objeto con `success` (boolean) y `user` o `error`.
         */
        registerUser: async function(email, password, username) {
            // Implementación de la función registerUser.
            try {
                showLoading(true);
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                const displayName = username || (email ? email.split('@')[0] : 'Nuevo Usuario');
                
                await database.ref('users/' + user.uid).set({
                    username: displayName,
                    email: email,
                    profile_picture: '', // URL de imagen de perfil por defecto o placeholder.
                    created_at: firebase.database.ServerValue.TIMESTAMP, // Usar timestamp del servidor.
                    last_login: firebase.database.ServerValue.TIMESTAMP
                });
                
                await user.updateProfile({ displayName: displayName });
                showLoading(false);
                return { success: true, user: user };
            } catch (error) {
                showLoading(false);
                console.error("common-auth.js: registerUser - Error:", error.message);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * Inicia sesión de un usuario existente con email y contraseña.
         * @param {string} email - Correo electrónico del usuario.
         * @param {string} password - Contraseña del usuario.
         * @return {Promise<Object>} Objeto con `success` (boolean) y `user` o `error`.
         */
        loginUser: async function(email, password) {
            // Implementación de la función loginUser.

            try {
                showLoading(true);
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                await database.ref('users/' + user.uid + '/last_login').set(firebase.database.ServerValue.TIMESTAMP);
                
                // Guardar un indicador de sesión en localStorage para persistencia básica.
                localStorage.setItem('musiflow_auth_user_simple_info', JSON.stringify({ uid: user.uid, displayName: user.displayName }));
                
                showLoading(false);
                return { success: true, user: user };
            } catch (error) {
                showLoading(false);
                console.error("common-auth.js: loginUser - Error:", error.message);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * Cierra la sesión del usuario actual.
         * @return {Promise<Object>} Objeto con `success` (boolean) o `error`.
         */
        logoutUser: async function() {
            // Implementación de la función logoutUser.
            try {
                showLoading(true);
                await auth.signOut();
                // localStorage.removeItem('musiflow_auth_user_simple_info'); // Limpiar indicador de sesión.
                showLoading(false);
                return { success: true };
            } catch (error) {
                showLoading(false);
                console.error("common-auth.js: logoutUser - Error:", error.message);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * Actualiza el perfil del usuario (nombre a mostrar y URL de foto).
         * @param {string} displayName - Nuevo nombre a mostrar.
         * @param {string} photoURL - Nueva URL de la foto de perfil.
         * @return {Promise<Object>} Objeto con `success` (boolean) o `error`.
         */
        updateUserProfile: async function(displayName, photoURL) {
            // Implementación de updateUserProfile.
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('Usuario no autenticado para actualizar perfil.');
                showLoading(true);
                await user.updateProfile({ displayName: displayName, photoURL: photoURL });
                await database.ref('users/' + user.uid).update({ username: displayName, profile_picture: photoURL });
                showLoading(false);
                return { success: true };
            } catch (error) {
                showLoading(false);
                console.error("common-auth.js: updateUserProfile - Error:", error.message);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * Envía un correo para restablecer la contraseña del usuario.
         * @param {string} email - Correo electrónico del usuario.
         * @return {Promise<Object>} Objeto con `success` (boolean) o `error`.
         */
        resetPassword: async function(email) {
            // Implementación de resetPassword.
            try {
                showLoading(true);
                await auth.sendPasswordResetEmail(email);
                showLoading(false);
                return { success: true };
            } catch (error) {
                showLoading(false);
                console.error("common-auth.js: resetPassword - Error:", error.message);
                return { success: false, error: error.message };
            }
        },
        
        /**
         * Verifica si hay un usuario actualmente autenticado en Firebase Auth.
         * @return {boolean} `true` si hay un usuario logueado, `false` si no.
         */
        isUserLoggedIn: function() {
            return !!auth.currentUser; // `!!` convierte el objeto usuario (o null) a booleano.
        },
        
        /**
         * Configura un observador para los cambios en el estado de autenticación.
         * Es una envoltura alrededor de `auth.onAuthStateChanged` para proveer datos combinados.
         * @param {Function} callback - Función que se llamará con `{ user, loggedIn }` cuando cambie el estado.
         * @return {firebase.Unsubscribe} Función para desuscribirse del observador.
         */
        onAuthStateChanged: function(callback) {
            // Implementación de onAuthStateChanged.
            return auth.onAuthStateChanged(user => {
                if (user) { // Usuario autenticado.
                    database.ref('users/' + user.uid).once('value')
                        .then(snapshot => {
                            const userData = snapshot.val() || {};
                            callback({
                                user: { uid: user.uid, email: user.email, displayName: user.displayName || userData.username, photoURL: user.photoURL || userData.profile_picture, emailVerified: user.emailVerified, ...userData },
                                loggedIn: true
                            });
                        })
                        .catch(error => { // Fallback si hay error en DB.
                            console.error('common-auth.js: onAuthStateChanged - Error al obtener datos de DB:', error);
                            callback({ user: { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, emailVerified: user.emailVerified }, loggedIn: true });
                        });
                } else { // Usuario no autenticado.
                    callback({ user: null, loggedIn: false });
                }
            });
        }
    };
    console.log("common-auth.js: Interfaz global window.firebaseAuth configurada correctamente.");
}


// --- Lógica que se ejecuta al cargar el script common-auth.js ---

// Intentar inicializar Firebase tan pronto como este script se cargue.
// No se espera al DOMContentLoaded para la inicialización de `firebase.initializeApp`
// porque otros scripts (que podrían cargarse antes que el DOM esté listo) pueden depender de que `firebase` esté listo.
initializeFirebaseAppAndAuth()
    .then(initializedSuccessfully => {
        if (initializedSuccessfully) {
            // Si la inicialización de Firebase fue exitosa, ahora se puede proceder con la lógica
            // que depende del DOM (como actualizar la UI) y del estado de autenticación.
            // Se espera al DOMContentLoaded para estas operaciones.
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    console.log("common-auth.js: DOM cargado. Configurando UI y listener de estado de Auth.");
                    updateUIForAuthState(); // Actualizar UI basada en si el usuario está logueado.
                    setupLocalAuthStateListener(); // Configurar listener para cambios futuros en auth.
                });
            } else { // Si el DOM ya está cargado.
                console.log("common-auth.js: DOM ya cargado. Configurando UI y listener de estado de Auth.");
                updateUIForAuthState();
                setupLocalAuthStateListener();
            }
        } else {
            console.error("common-auth.js: La inicialización de Firebase falló. Algunas funcionalidades pueden no estar disponibles.");
            // Se podría mostrar un mensaje de error global al usuario aquí.
        }
    })
    .catch(error => { // Capturar cualquier error no manejado de initializeFirebaseAppAndAuth.
        console.error("common-auth.js: Error catastrófico durante la configuración inicial de Firebase y Auth:", error);
    });


/**
 * Actualiza elementos de la interfaz de usuario (ej. links de navegación) 
 * según el estado de autenticación actual del usuario.
 * Esta función SÍ debe esperar a que el DOM esté cargado.
 */
function updateUIForAuthState() {
    console.log("common-auth.js: updateUIForAuthState - Actualizando elementos de la UI según el estado de autenticación.");
    // Asegurarse de que `firebase.auth()` esté disponible (debería estarlo si initializeFirebaseAppAndAuth tuvo éxito).
    if (!firebase || !firebase.auth) {
        console.error("common-auth.js: updateUIForAuthState - firebase.auth no está disponible. No se puede actualizar la UI.");
        return;
    }
    const auth = firebase.auth();
    
    // Escuchar cambios en el estado de autenticación para actualizar la UI dinámicamente.
    auth.onAuthStateChanged(user => {
        // Seleccionar todos los enlaces que podrían necesitar cambiar (login, cuenta, etc.).
        const loginLinks = document.querySelectorAll('.nav-link[href*="login.html"], .nav-link[href*="account.html"], .nav-link[data-bs-target="#loginModal"]');
        
        if (user) { // Si hay un usuario autenticado.
            console.log("common-auth.js: updateUIForAuthState - Usuario autenticado. Actualizando UI para sesión activa.");
            loginLinks.forEach(link => {
                const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Mi Cuenta');
                link.innerHTML = `<i class="fas fa-user"></i> ${displayName}`; // Mostrar nombre/email.
                link.href = 'account.html'; // Enlazar a la página de cuenta.
                // Quitar atributos de modal si los tuviera (ej. si antes era un disparador de modal de login).
                link.removeAttribute('data-bs-toggle');
                link.removeAttribute('data-bs-target');
            });


        } else { // Si no hay usuario autenticado.
            console.log("common-auth.js: updateUIForAuthState - Usuario no autenticado. Actualizando UI para sesión cerrada.");
            loginLinks.forEach(link => {
                // Restablecer enlaces para que lleven a "Ingresar".
                link.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
                link.href = 'login.html'; // Enlazar a la página de login.
                // Quitar atributos de modal por si estaban configurados para la cuenta.
                link.removeAttribute('data-bs-toggle'); 
                link.removeAttribute('data-bs-target');
            });

            // Redirigir desde páginas protegidas si el usuario no está logueado.
            const currentPage = window.location.pathname.split('/').pop();
            // Definir qué páginas requieren autenticación.
            const protectedPages = ['account.html', 'premium.html']; // Añadir otras páginas protegidas según sea necesario.
            
            if (protectedPages.includes(currentPage)) {
                console.log(`common-auth.js: Usuario no autenticado intentando acceder a página protegida (${currentPage}). Redirigiendo a login.html.`);
                // Guardar la página actual para poder redirigir de vuelta después del login.
                // Solo redirigir si no estamos ya en login.html para evitar bucles.
                if (currentPage !== 'login.html') { 
                    localStorage.setItem('redirect_after_login', currentPage);
                    window.location.href = 'login.html';
                }
            }
        }
    });
}

/**
 * Configura un observador local para los cambios en el estado de autenticación.
 * Dispara un evento personalizado `appAuthStateChanged` en el `document`
 * para que otros módulos de la aplicación puedan reaccionar a estos cambios.
 * Esta función debe llamarse después de que el DOM esté cargado.
 */
function setupLocalAuthStateListener() {
    console.log("common-auth.js: setupLocalAuthStateListener - Configurando listener para disparar evento 'appAuthStateChanged'.");
    if (!firebase || !firebase.auth) {
        console.error("common-auth.js: setupLocalAuthStateListener - firebase.auth no disponible.");
        return;
    }
    firebase.auth().onAuthStateChanged(user => {
        console.log("common-auth.js: Evento 'appAuthStateChanged' - Nuevo estado de autenticación. Usuario:", user ? user.uid : 'No logueado');
        // Crear y disparar el evento personalizado.
        const event = new CustomEvent('appAuthStateChanged', { detail: { user } });
        document.dispatchEvent(event);
    });
}


/**
 * Muestra u oculta el indicador de carga (overlay).
 * Esta función es utilizada por la interfaz `window.firebaseAuth` para operaciones asíncronas.
 * @param {boolean} show - `true` para mostrar el overlay, `false` para ocultarlo.
 */
function showLoading(show) {
    // Asegurarse de que este ID 'loadingOverlay' exista en el HTML de todas las páginas donde se use.
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    // Crear el overlay dinámicamente si no existe.
    if (!loadingOverlay) { 
        console.warn("common-auth.js: showLoading - Elemento 'loadingOverlay' no encontrado en el DOM. Intentando crearlo dinámicamente.");
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay'; // Clase para estilos CSS.
        loadingOverlay.innerHTML = '<div class="spinner"></div>'; // Spinner CSS.
        
        // Si no se han añadido estilos para el overlay, hacerlo.
        if (!document.getElementById('common-auth-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'common-auth-loading-styles';
            style.textContent = `
                .loading-overlay { /* Estilos básicos del overlay */
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.6); /* Fondo semitransparente */
                    display: flex; justify-content: center; align-items: center;
                    z-index: 10000; /* Asegurar que esté por encima de otros elementos */
                    visibility: hidden; opacity: 0;
                    transition: visibility 0s linear 0.3s, opacity 0.3s ease-in-out; /* Transición suave */
                }
                .loading-overlay.show { /* Estado visible */
                    visibility: visible; opacity: 1;
                    transition-delay: 0s;
                }
                .spinner { /* Estilo del spinner */
                    width: 40px; height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.2); /* Borde claro */
                    border-top-color: #FFF; /* Color principal del spinner */
                    border-radius: 50%;
                    animation: commonAuthSpinnerSpin 0.8s linear infinite;
                }
                @keyframes commonAuthSpinnerSpin { to { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(loadingOverlay);
    }
    
    // Mostrar u ocultar el overlay cambiando la clase 'show'.
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}