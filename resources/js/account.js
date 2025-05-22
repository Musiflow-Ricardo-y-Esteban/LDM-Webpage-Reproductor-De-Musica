// account.js - Sistema completo para gestión de cuentas de usuario en MusiFlow

/**
 * FUNCIÓN PRINCIPAL: Este script gestiona todas las funcionalidades de la cuenta de usuario 
 * en MusiFlow, incluyendo la visualización de datos del perfil, historial de reproducción, 
 * canciones favoritas, playlists y preferencias de usuario.
 * 
 * Notas del desarrollador:
 * - Se asume que Firebase (app, auth, database) se inicializa globalmente ANTES de que este script
 *   intente usar `firebase.auth()` o `firebase.database()`. El script `firebase-init.js`
 *   es responsable de esta inicialización.
 * - Se depende de `window.LikesManager` y `window.PlaylistManager` para la gestión de datos
 *   relacionados con likes y playlists, con fallbacks a lógica directa si estos managers
 *   no están disponibles o no son completamente funcionales.
 * - La UI se actualiza dinámicamente basada en los datos cargados desde Firebase y los managers.
 * - Es crucial que los IDs de los elementos HTML en `account.html` coincidan con los usados aquí.
 */

// Variable global para controlar la inicialización y evitar ejecuciones múltiples.
let accountSystemInitialized = false;

// Función que espera a que Firebase esté completamente disponible.
// Verifica la existencia de `firebase.app()` y que una app haya sido inicializada
// para confirmar que la inicialización de Firebase (hecha por firebase-init.js) ha ocurrido.
function waitForFirebaseAndInitialize() {
    if (typeof firebase !== 'undefined' && 
        typeof firebase.app === 'function' && 
        firebase.apps && firebase.apps.length > 0 && 
        firebase.auth && 
        firebase.database) {
        
        console.log("account.js: Firebase está listo (app inicializada, auth y database disponibles). Procediendo a inicializar el sistema de cuenta.");
        initializeAccountSystem();
    } else {
        // Firebase no está completamente listo. Se reintentará.
        // Esto puede ocurrir si account.js se ejecuta antes de que firebase-init.js termine.
        let firebaseStatus = "Firebase no definido.";
        if (typeof firebase !== 'undefined') {
            firebaseStatus = `firebase definido. app: ${typeof firebase.app}, apps.length: ${firebase.apps ? firebase.apps.length : 'N/A'}, auth: ${!!firebase.auth}, database: ${!!firebase.database}`;
        }
        console.log(`account.js: Esperando a Firebase... Estado actual: ${firebaseStatus}`);
        setTimeout(waitForFirebaseAndInitialize, 250); // Intervalo ligeramente mayor para asegurar que otros scripts de inicialización tengan tiempo.
    }
}

// Función principal de inicialización del sistema de cuenta.
// Previene la doble inicialización.
function initializeAccountSystem() {
    if (accountSystemInitialized) {
        console.log("account.js: El sistema de cuenta ya ha sido inicializado. Omitiendo.");
        return;
    }
    accountSystemInitialized = true;
    console.log("account.js: Iniciando el sistema de cuenta (initializeAccountSystem)...");

    // Asegurar que el DOM esté completamente cargado antes de ejecutar `startAccountSystem`.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startAccountSystem);
    } else {
        startAccountSystem(); // Si el DOM ya está cargado, ejecutar inmediatamente.
    }
}

// Función que se ejecuta una vez que el DOM está listo y Firebase disponible.
// Contiene la lógica principal de la página de cuenta.
function startAccountSystem() {
    console.log("account.js: DOM cargado, ejecutando startAccountSystem...");
    // Inicializar AOS (Animate On Scroll) si la biblioteca está disponible en la página.
    if (typeof AOS !== 'undefined' && typeof AOS.init === 'function') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true // Las animaciones se ejecutan solo una vez.
        });
    }

    // --- Obtención de referencias a elementos del DOM ---
    // Perfil del usuario:
    const profileNameElement = document.getElementById('profileName');
    const profileEmailElement = document.getElementById('profileEmail');
    const profileAvatarElement = document.getElementById('profileAvatar');
    const memberSinceElement = document.getElementById('memberSince');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    // Contadores de estadísticas en la UI:
    const likedSongsCountElement = document.getElementById('likedSongsCount');
    const playlistsCountElement = document.getElementById('playlistsCount');
    const followedArtistsCountElement = document.getElementById('followedArtistsCount');
    
    // Contenedores para listas de contenido musical:
    const likedSongsListElement = document.getElementById('likedSongsList');
    const recentlyPlayedListElement = document.getElementById('recentlyPlayedList');
    const userPlaylistsListElement = document.getElementById('userPlaylistsList');
    
    // Botones de acción principales:
    const playAllLikedBtn = document.getElementById('playAllLikedBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const createPlaylistBtn = document.getElementById('createPlaylistBtn'); // Botón general "Nueva Playlist".
    const savePlaylistBtn = document.getElementById('savePlaylistBtn'); // Botón "Crear" en el modal de nueva playlist.
    
    // Elementos del reproductor de música inferior:
    const currentPlayer = document.getElementById('currentPlayer');
    const currentTrackImage = document.getElementById('currentTrackImage');
    const currentTrackName = document.getElementById('currentTrackName');
    const currentTrackArtist = document.getElementById('currentTrackArtist');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const loopBtn = document.getElementById('loopBtn');
    const progressBar = document.getElementById('progressBar'); // El elemento visual del progreso.
    const currentTimeDisplay = document.getElementById('currentTime');
    const totalTimeDisplay = document.getElementById('totalTime');
    const volumeControl = document.getElementById('volumeControl');
    
    // --- Variables de estado del módulo ---
    // Datos del usuario y su contenido musical:
    let currentUser = null;         // Objeto con información del usuario autenticado.
    let likedSongs = {};            // Caché local de canciones favoritas del usuario.
    let recentlyPlayed = [];        // Caché local del historial de reproducción.
    let userPlaylists = [];         // Caché local de las playlists creadas por el usuario.
    let followedArtists = [];       // Caché local de artistas seguidos por el usuario.
    
    // Estado y control del reproductor de música:
    let audioPlayer = null;         // Instancia del elemento HTMLAudioElement para reproducción local.
    let currentPlayingTrack = null; // Objeto de la pista que se está reproduciendo actualmente.
    let isPlaying = false;          // Booleano: true si una pista está sonando, false si está pausada o detenida.
    let currentPlaylist = [];       // Array de canciones que forman la cola de reproducción actual.
    let currentTrackIndex = -1;     // Índice de la `currentPlayingTrack` dentro de `currentPlaylist`.
    let isShuffleMode = false;      // Booleano: true si el modo aleatorio está activado.
    let isLoopMode = false;         // Booleano: true si el modo bucle (repetir pista actual) está activado.
    let progressInterval = null;    // ID del intervalo usado para actualizar la barra de progreso.
    let currentPlaylistId = null;   // ID de la playlist que se está reproduciendo actualmente (si aplica).
    let selectedSongForPlaylist = null; // Objeto de canción temporalmente guardado para añadir a una playlist.
    
    // Inicializar efectos visuales (notas flotantes, efectos hover).
    initializeEffects();
    
    // Observador del estado de autenticación de Firebase.
    // Este es el punto de entrada principal para la lógica de la página que depende del usuario.
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Si hay un usuario autenticado, se procede a cargar sus datos.
            console.log("account.js: Usuario autenticado detectado por onAuthStateChanged. UID:", user.uid);
            await initializeUserData(user);
        } else {
            // Si no hay usuario autenticado, se redirige a la página de login.
            console.log('account.js: Usuario no autenticado. Redirigiendo a login.html.');
            // Solo redirigir si estamos efectivamente en account.html para evitar bucles en otras páginas.
            if (window.location.pathname.includes('account.html')) {
                 window.location.href = 'login.html';
            }
        }
    });
    
    /**
     * Inicializa todos los datos del usuario una vez que se ha autenticado.
     * Carga información del perfil, canciones favoritas, playlists e historial.
     * Configura los listeners de eventos y el reproductor.
     * @param {firebase.User} user - Objeto de usuario proporcionado por Firebase Auth.
     */
    async function initializeUserData(user) {
        try {
            showLoading(true); // Mostrar el overlay de carga.
            console.log("account.js: initializeUserData - Iniciando carga de datos para UID:", user.uid);
             if (!user || !user.uid) { // Validación básica del objeto usuario.
                console.error("account.js: Objeto usuario inválido o sin UID en initializeUserData.", user);
                throw new Error("Objeto de usuario inválido.");
            }
            
            // Clonar el objeto `user` de Auth para poder añadir más propiedades (como `profileInfo`).
            currentUser = { ...user }; 
            
            // Cargar información adicional del perfil (ej. biografía) desde Firebase Realtime Database.
            // Esta información no se almacena en Firebase Auth por defecto.
            try {
                const profileInfoSnapshot = await firebase.database().ref(`users/${user.uid}/profileInfo`).once('value');
                currentUser.profileInfo = profileInfoSnapshot.val() || {}; // Asignar objeto vacío si no hay datos.
                console.log("account.js: initializeUserData - Información adicional del perfil (profileInfo) cargada:", currentUser.profileInfo);
            } catch (profileError) {
                console.warn('account.js: initializeUserData - No se pudo cargar profileInfo desde Firebase DB:', profileError.message);
                currentUser.profileInfo = {}; // Asegurar que `profileInfo` exista, incluso si está vacío.
            }
            
            // Actualizar la sección del perfil en la UI con los datos cargados.
            updateUserProfile(currentUser);
            
            // Inicializar módulos de gestión externos si están disponibles (LikesManager, PlaylistManager).
            // Estos manejan la lógica específica de likes y playlists.
            await initializeManagementSystems();
            
            // Cargar todos los datos específicos del usuario (likes, playlists, historial de reproducción).
            await loadUserData();
            
            // Configurar todos los event listeners para los elementos interactivos de la página.
            setupEventListeners();
            
            // Inicializar la funcionalidad del reproductor de música.
            setupMusicPlayer();
            
            showLoading(false); // Ocultar el overlay de carga.
            console.log("account.js: initializeUserData - Datos de usuario inicializados completamente.");
        } catch (error) {
            // Manejo de errores durante la inicialización de datos del usuario.
            console.error('account.js: initializeUserData - Error crítico durante la inicialización:', error.message, "Usuario en el momento del error:", currentUser);
            showToast('Error grave al cargar los datos de tu cuenta. Por favor, recarga la página.', 'error');
            showLoading(false);
        }
    }
    
    /**
     * Inicializa los sistemas de gestión externos (LikesManager, PlaylistManager).
     * Estos módulos deben estar definidos en el scope global (`window`) por sus respectivos scripts.
     */
    async function initializeManagementSystems() {
        console.log("account.js: initializeManagementSystems - Intentando inicializar managers externos...");
        try {
            // Inicializar LikesManager si está disponible y es funcional.
            if (window.LikesManager && typeof window.LikesManager.init === 'function') {
                await window.LikesManager.init(); // `init` debería manejar la carga de datos de likes.
                console.log('account.js: initializeManagementSystems - LikesManager inicializado.');
                // Añadir un listener para reaccionar a cambios en los likes (ej. si se da like en otra parte de la app).
                if (typeof window.LikesManager.addLikeChangeListener === 'function') {
                    window.LikesManager.addLikeChangeListener((songId, isLiked) => {
                        console.log(`account.js: Evento de LikesManager - Cambio de like para la canción ${songId}: ${isLiked ? 'ahora le gusta' : 'ya no le gusta'}.`);
                        updateLikeStatusInUI(songId, isLiked); // Actualizar la UI de esta página en respuesta.
                    });
                } else {
                     console.warn("account.js: initializeManagementSystems - LikesManager.addLikeChangeListener no está definido.");
                }
            } else { 
                console.warn("account.js: initializeManagementSystems - LikesManager no está disponible o su función 'init' no existe.");
            }
            
            // Inicializar PlaylistManager si está disponible y es funcional.
            if (window.PlaylistManager && typeof window.PlaylistManager.init === 'function') {
                await window.PlaylistManager.init(); // `init` debería manejar la carga de playlists.
                console.log('account.js: initializeManagementSystems - PlaylistManager inicializado.');
                // Añadir un listener para reaccionar a cambios en las playlists.
                if (typeof window.PlaylistManager.addPlaylistChangeListener === 'function') {
                    window.PlaylistManager.addPlaylistChangeListener((action, playlist, song) => {
                        console.log(`account.js: Evento de PlaylistManager - Acción: ${action} en la playlist ${playlist ? playlist.name : 'N/A'}.`);
                        updatePlaylistsAfterChange(action, playlist, song); // Actualizar la UI de esta página.
                    });
                } else {
                    console.warn("account.js: initializeManagementSystems - PlaylistManager.addPlaylistChangeListener no está definido.");
                }
            } else { 
                console.warn("account.js: initializeManagementSystems - PlaylistManager no está disponible o su función 'init' no existe.");
            }
        } catch (error) {
            console.error('account.js: initializeManagementSystems - Error durante la inicialización de managers externos:', error);
        }
    }
    
    /**
     * Carga todos los datos específicos del usuario desde Firebase (o a través de los managers).
     * Utiliza `Promise.all` para ejecutar las cargas en paralelo y mejorar la eficiencia.
     */
    async function loadUserData() {
        console.log("account.js: loadUserData - Iniciando la carga de todos los datos del usuario (likes, historial, playlists, etc.).");
        try {
            showLoading(true);
            // Doble verificación de autenticación, aunque onAuthStateChanged ya debería haberlo hecho.
            if (!firebase.auth().currentUser) { 
                throw new Error('Usuario no autenticado al intentar cargar datos específicos (loadUserData).');
            }
            
            // Ejecutar todas las funciones de carga de datos en paralelo.
            // Cada función de carga es responsable de llenar su respectiva variable de estado (ej. `likedSongs`).
            await Promise.all([
                loadLikedSongsFromSystem(),      // Cargar canciones favoritas.
                loadRecentlyPlayed(),            // Cargar historial de reproducción.
                loadUserPlaylistsFromSystem(),   // Cargar playlists del usuario.
                loadFollowedArtists()            // Cargar artistas seguidos.
            ]);
            
            // Una vez que todos los datos han sido cargados, actualizar las secciones correspondientes de la UI.
            updateUserStats();          // Actualizar contadores (número de likes, playlists, etc.).
            updateLikedSongsUI();       // Renderizar la lista de canciones favoritas.
            updateRecentlyPlayedUI();   // Renderizar la lista del historial.
            updatePlaylistsUI();        // Renderizar la lista de playlists.
            console.log("account.js: loadUserData - Todos los datos del usuario cargados y la UI ha sido actualizada.");
            showLoading(false);
        } catch (error) {
            console.error('account.js: loadUserData - Error durante la carga de datos:', error);
            showToast('Hubo un error al cargar los datos de tu cuenta. Por favor, intenta recargar la página.', 'error');
            showLoading(false);
        }
    }
    
    /**
     * Carga las canciones favoritas, priorizando el uso de `LikesManager` si está disponible.
     * Si `LikesManager` no está, se recurre a una carga directa desde Firebase.
     * @return {Promise<Object>} Un objeto que representa el mapa de canciones favoritas.
     */
    async function loadLikedSongsFromSystem() {
        console.log("account.js: loadLikedSongsFromSystem - Intentando cargar canciones favoritas...");
        try {
            if (window.LikesManager && typeof window.LikesManager.getAllLikedSongs === 'function') {
                // Usar LikesManager para obtener las canciones favoritas.
                likedSongs = window.LikesManager.getAllLikedSongs();
                console.log('account.js: loadLikedSongsFromSystem - Canciones favoritas cargadas a través de LikesManager:', Object.keys(likedSongs).length, 'canciones.');
            } else {
                // Fallback: Cargar directamente desde Firebase si LikesManager no está disponible.
                console.warn("account.js: loadLikedSongsFromSystem - LikesManager no funcional, usando fallback a Firebase DB.");
                if(!firebase.auth().currentUser) throw new Error("Usuario no autenticado para fallback de carga de likes.");
                const uid = firebase.auth().currentUser.uid;
                const snapshot = await firebase.database().ref(`users/${uid}/liked_songs`).once('value');
                likedSongs = snapshot.val() || {}; // Si no hay datos, `likedSongs` será un objeto vacío.
                console.log('account.js: loadLikedSongsFromSystem - Canciones favoritas cargadas directamente desde Firebase (fallback):', Object.keys(likedSongs).length, 'canciones.');
            }
            return likedSongs;
        } catch (error) {
            console.error('account.js: loadLikedSongsFromSystem - Error crítico al cargar canciones favoritas:', error); 
            likedSongs = {}; // Asegurar que `likedSongs` sea un objeto vacío en caso de error para evitar problemas posteriores.
            return {};
        }
    }
    
    /**
     * Carga las playlists del usuario, priorizando `PlaylistManager` si está disponible.
     * Si `PlaylistManager` no está, se recurre a una carga directa desde Firebase.
     * @return {Promise<Array>} Un array de objetos de playlist.
     */
    async function loadUserPlaylistsFromSystem() {
        console.log("account.js: loadUserPlaylistsFromSystem - Intentando cargar playlists del usuario...");
        try {
            if (window.PlaylistManager && typeof window.PlaylistManager.getAllPlaylists === 'function') {
                // Usar PlaylistManager para obtener las playlists.
                userPlaylists = window.PlaylistManager.getAllPlaylists();
                console.log('account.js: loadUserPlaylistsFromSystem - Playlists cargadas a través de PlaylistManager:', userPlaylists.length, 'playlists.');
            } else {
                // Fallback: Cargar directamente desde Firebase.
                console.warn("account.js: loadUserPlaylistsFromSystem - PlaylistManager no funcional, usando fallback a Firebase DB.");
                 if(!firebase.auth().currentUser) throw new Error("Usuario no autenticado para fallback de carga de playlists.");
                const uid = firebase.auth().currentUser.uid;
                const snapshot = await firebase.database().ref(`users/${uid}/playlists`).once('value');
                userPlaylists = Object.values(snapshot.val() || {}); // Convertir el objeto de playlists a un array.
                console.log('account.js: loadUserPlaylistsFromSystem - Playlists cargadas directamente desde Firebase (fallback):', userPlaylists.length, 'playlists.');
            }
            return userPlaylists;
        } catch (error) {
            console.error('account.js: loadUserPlaylistsFromSystem - Error crítico al cargar playlists:', error); 
            userPlaylists = []; // Asegurar que `userPlaylists` sea un array vacío en caso de error.
            return [];
        }
    }
    
    /**
     * Actualiza la información del perfil del usuario en la interfaz (UI).
     * Muestra el nombre, email, avatar y fecha de registro del usuario.
     * @param {Object} userProfileData - El objeto `currentUser` que contiene los datos de Auth y de la base de datos (profileInfo).
     */
    function updateUserProfile(userProfileData) {
        // Validación de entrada.
        if (!userProfileData) {
            console.error("account.js: updateUserProfile - userProfileData es nulo o indefinido. No se puede actualizar la UI del perfil.");
            // Se podría mostrar un estado de error en la UI aquí si los elementos existen.
            if(profileNameElement) profileNameElement.textContent = "Error de datos";
            if(profileEmailElement) profileEmailElement.textContent = "No disponible";
            if(memberSinceElement) memberSinceElement.textContent = "Miembro desde: N/A";
            return;
        }
        console.log("account.js: updateUserProfile - Actualizando UI del perfil con los datos:", userProfileData);

        // Nombre del perfil.
        if (profileNameElement) {
            // Usar displayName, o el prefijo del email, o un nombre genérico como fallback.
            profileNameElement.textContent = userProfileData.displayName || 
                                             (userProfileData.email ? userProfileData.email.split('@')[0] : 'Usuario de MusiFlow');
        }
        
        // Email del perfil.
        if (profileEmailElement) {
            profileEmailElement.textContent = userProfileData.email || 'Email no proporcionado';
        }
        
        // Fecha de registro ("Miembro desde").
        if (memberSinceElement && userProfileData.metadata && userProfileData.metadata.creationTime) {
            // Usar `metadata.creationTime` de Firebase Auth si está disponible.
            const memberSinceDate = new Date(userProfileData.metadata.creationTime);
            // Formatear la fecha a un formato legible en español.
            const formattedDate = new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(memberSinceDate);
            memberSinceElement.textContent = `Miembro desde: ${formattedDate}`;
        } else if (memberSinceElement) {
             memberSinceElement.textContent = `Miembro desde: fecha desconocida`; // Fallback si no hay datos de metadata.
        }
        
        // Avatar del perfil.
        if (profileAvatarElement) {
            if (userProfileData.photoURL) {
                // Si el usuario tiene una URL de foto de perfil, usarla.
                profileAvatarElement.innerHTML = `<img src="${userProfileData.photoURL}" alt="Avatar del usuario" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                // Si no hay foto, generar un avatar con la inicial del nombre/email y un color de fondo aleatorio (consistente).
                let firstLetter = 'M'; // Fallback para la inicial (M de MusiFlow).
                if (userProfileData.displayName && userProfileData.displayName.trim() !== "") {
                    firstLetter = userProfileData.displayName.trim().charAt(0).toUpperCase();
                } else if (userProfileData.email && userProfileData.email.includes('@')) {
                    firstLetter = userProfileData.email.split('@')[0].charAt(0).toUpperCase();
                }
                profileAvatarElement.innerHTML = firstLetter;
                // Usar un identificador consistente (displayName, email o UID) para generar un color de fondo determinista.
                const identifierForColor = userProfileData.displayName || userProfileData.email || userProfileData.uid || 'defaultUserColorSeed';
                const hue = Math.abs(hashCode(identifierForColor)) % 360; // Generar un matiz (0-359) basado en el hash.
                profileAvatarElement.style.background = `hsl(${hue}, 70%, 50%)`; // Usar HSL para colores vibrantes.
                profileAvatarElement.style.color = 'white'; // Asegurar que la letra sea visible.
            }
        }
    }
    
    /**
     * Carga el historial de reproducción del usuario desde Firebase.
     * Obtiene las últimas 20 canciones reproducidas.
     * @return {Promise<Array>} Un array con objetos de canciones del historial.
     */
    async function loadRecentlyPlayed() {
        console.log("account.js: loadRecentlyPlayed - Intentando cargar historial de reproducción...");
        try {
            if (!firebase.auth().currentUser) {
                console.warn("account.js: loadRecentlyPlayed - Usuario no autenticado. No se puede cargar el historial.");
                return []; // Si no hay usuario, devolver array vacío.
            }
            const uid = firebase.auth().currentUser.uid;
            // Obtener las últimas 20 canciones, ordenadas por `timestamp`.
            const snapshot = await firebase.database().ref(`users/${uid}/recently_played`).orderByChild('timestamp').limitToLast(20).once('value');
            const data = snapshot.val() || {};
            // Convertir el objeto de Firebase a un array y ordenar descendente por `timestamp` (más reciente primero).
            recentlyPlayed = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            console.log('account.js: loadRecentlyPlayed - Historial de reproducción cargado:', recentlyPlayed.length, 'canciones.');
            return recentlyPlayed;
        } catch (error) { 
            console.error('account.js: loadRecentlyPlayed - Error al cargar historial de reproducción:', error); 
            recentlyPlayed = []; // Asegurar array vacío en error.
            return []; 
        }
    }
    
    /**
     * Carga los artistas seguidos por el usuario desde Firebase.
     * @return {Promise<Array>} Un array con objetos de artistas seguidos.
     */
    async function loadFollowedArtists() {
        console.log("account.js: loadFollowedArtists - Intentando cargar artistas seguidos...");
         try {
            if (!firebase.auth().currentUser) {
                 console.warn("account.js: loadFollowedArtists - Usuario no autenticado. No se pueden cargar artistas seguidos.");
                return [];
            }
            const uid = firebase.auth().currentUser.uid;
            const snapshot = await firebase.database().ref(`users/${uid}/followed_artists`).once('value');
            const data = snapshot.val() || {};
            followedArtists = Object.values(data);
            console.log('account.js: loadFollowedArtists - Artistas seguidos cargados:', followedArtists.length, 'artistas.');
            return followedArtists;
        } catch (error) { 
            console.error('account.js: loadFollowedArtists - Error al cargar artistas seguidos:', error); 
            followedArtists = []; // Asegurar array vacío en error.
            return []; 
        }
    }
    
    /**
     * Actualiza los contadores de estadísticas en la UI (número de likes, playlists, artistas seguidos).
     */
    function updateUserStats() { 
        if (likedSongsCountElement) likedSongsCountElement.textContent = Object.keys(likedSongs).length;
        if (playlistsCountElement) playlistsCountElement.textContent = userPlaylists.length;
        if (followedArtistsCountElement) followedArtistsCountElement.textContent = followedArtists.length;
        animateCounters(); // Aplicar animación a los contadores para un efecto visual.
    }

    /**
     * Actualiza la sección de canciones favoritas en la UI.
     * Renderiza la lista de canciones o un mensaje si no hay favoritas.
     */
    function updateLikedSongsUI() { 
        if (!likedSongsListElement) {
            console.warn("account.js: updateLikedSongsUI - Elemento likedSongsListElement no encontrado en el DOM.");
            return;
        }
        const songsArray = Object.values(likedSongs); // Convertir el objeto de likes a un array.
        
        // Habilitar o deshabilitar el botón "Reproducir todo" según si hay canciones.
        if (playAllLikedBtn) playAllLikedBtn.disabled = songsArray.length === 0;
        
        if (songsArray.length === 0) {
            // Mostrar mensaje si no hay canciones favoritas.
            likedSongsListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="far fa-heart fa-2x mb-3"></i><p>Aún no has marcado canciones como favoritas.</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light"><i class="fas fa-compass me-2"></i> Explorar música</a>
                </div>`;
            return;
        }
        
        likedSongsListElement.innerHTML = ''; // Limpiar contenido previo antes de renderizar.
        songsArray.forEach(song => {
            // Crear y configurar el elemento HTML para cada canción favorita.
            const sourceLabel = song.sourceOrigin === 'spotify' ? '<span class="song-source spotify">Spotify</span>' : '<span class="song-source local">Local</span>';
            const songItem = document.createElement('div');
            songItem.className = 'song-item fade-in'; // Clases para estilo y animación.
            songItem.dataset.id = song.id; // Guardar ID y origen en atributos data-*.
            songItem.dataset.source = song.sourceOrigin || 'local';
            songItem.innerHTML = `
                <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title || 'Canción sin título'}" class="song-cover">
                <div class="song-details">
                    <h5 class="song-title">${song.title || 'Título Desconocido'} ${sourceLabel}</h5>
                    <p class="song-artist">${song.artist || 'Artista Desconocido'}</p>
                </div>
                <div class="song-like active" title="Quitar de favoritos"><i class="fas fa-heart"></i></div>
                <div class="song-actions">
                    <button class="song-action-btn add-to-playlist-btn" title="Añadir a playlist"><i class="fas fa-list-ul"></i></button>
                    <button class="song-action-btn remove-from-liked-btn" title="Eliminar de favoritos"><i class="fas fa-times"></i></button>
                </div>`;
            // Event listener para reproducir la canción al hacer clic en el item (no en botones de acción).
            songItem.addEventListener('click', (e) => { 
                if (e.target.closest('.song-action-btn') || e.target.closest('.song-like')) return; // No interferir con botones.
                playSong(song); 
            });
            // Event listeners para los botones de acción.
            songItem.querySelector('.remove-from-liked-btn')?.addEventListener('click', (e) => { e.stopPropagation(); removeSongFromLiked(song.id); });
            songItem.querySelector('.add-to-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); showAddToPlaylistModal(song); });
            songItem.querySelector('.song-like')?.addEventListener('click', (e) => { e.stopPropagation(); removeSongFromLiked(song.id); }); // El corazón aquí quita de favoritos.
            likedSongsListElement.appendChild(songItem); // Añadir el item a la lista.
        });
        
        // Configurar el evento del botón "Reproducir todo" si hay canciones.
        if (playAllLikedBtn && songsArray.length > 0) {
            playAllLikedBtn.onclick = null; // Limpiar listener anterior para evitar duplicados.
            playAllLikedBtn.addEventListener('click', () => playPlaylist(songsArray, 0, "liked_songs"));
        }
    }
    
    /**
     * Actualiza la sección de historial de reproducción en la UI.
     * Renderiza la lista de canciones recientes o un mensaje si el historial está vacío.
     */
    function updateRecentlyPlayedUI() { 
        if (!recentlyPlayedListElement) {
             console.warn("account.js: updateRecentlyPlayedUI - Elemento recentlyPlayedListElement no encontrado.");
            return;
        }
        // Habilitar o deshabilitar el botón "Limpiar historial".
         if (clearHistoryBtn) clearHistoryBtn.disabled = recentlyPlayed.length === 0;
        
        if (recentlyPlayed.length === 0) {
            // Mostrar mensaje si no hay historial.
            recentlyPlayedListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-2x mb-3"></i><p>Aún no has escuchado ninguna canción.</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light"><i class="fas fa-compass me-2"></i> Descubrir música</a>
                </div>`;
            return;
        }
        
        recentlyPlayedListElement.innerHTML = ''; // Limpiar.
        recentlyPlayed.forEach(song => {
            // Crear y configurar el elemento HTML para cada canción del historial.
            const timeAgo = getTimeAgo(song.timestamp); // Formatear tiempo relativo.
            const sourceLabel = song.sourceOrigin === 'spotify' ? '<span class="song-source spotify">Spotify</span>' : '<span class="song-source local">Local</span>';
            const isLiked = likedSongs[song.id] ? 'active' : ''; // Verificar si la canción también está en favoritos.
            const heartIcon = isLiked ? 'fas' : 'far'; // Icono de corazón lleno o vacío.
            const songItem = document.createElement('div');
            songItem.className = 'song-item slide-in'; songItem.dataset.id = song.id; songItem.dataset.source = song.sourceOrigin || 'local';
            songItem.innerHTML = `
                <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title || 'Canción'}" class="song-cover">
                <div class="song-details"><h5 class="song-title">${song.title || 'Desconocido'} ${sourceLabel}</h5><p class="song-artist">${song.artist || 'Desconocido'}</p></div>
                <div class="song-time">${timeAgo}</div>
                <div class="song-like ${isLiked}" title="${isLiked ? 'Quitar de favoritos' : 'Añadir a favoritos'}"><i class="${heartIcon} fa-heart"></i></div>
                <div class="song-actions"><button class="song-action-btn add-to-playlist-btn" title="Añadir a playlist"><i class="fas fa-list-ul"></i></button></div>`;
            // Event listeners.
            songItem.addEventListener('click', (e) => { if (e.target.closest('.song-action-btn') || e.target.closest('.song-like')) return; playSong(song); });
            songItem.querySelector('.song-like')?.addEventListener('click', (e) => { e.stopPropagation(); toggleLikeSong(song); });
            songItem.querySelector('.add-to-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); showAddToPlaylistModal(song); });
            recentlyPlayedListElement.appendChild(songItem);
        });
        
        // Configurar evento para "Limpiar historial" si hay historial.
        if (clearHistoryBtn && recentlyPlayed.length > 0) {
            clearHistoryBtn.onclick = null; // Limpiar.
            clearHistoryBtn.addEventListener('click', () => { if (confirm('¿Estás seguro de que quieres limpiar tu historial de reproducción?')) clearPlayHistory(); });
        }
    }
    
    /**
     * Actualiza la sección de playlists del usuario en la interfaz.
     * Renderiza la lista de playlists o un mensaje si no hay ninguna.
     */
    function updatePlaylistsUI() { 
        if (!userPlaylistsListElement) {
            console.warn("account.js: updatePlaylistsUI - Elemento userPlaylistsListElement no encontrado.");
            return;
        }
        if (userPlaylists.length === 0) {
            // Mostrar mensaje y botón para crear la primera playlist si no hay ninguna.
            userPlaylistsListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-music fa-2x mb-3"></i><p>Aún no tienes playlists.</p>
                    <button class="btn btn-sm btn-outline-light" id="createFirstPlaylistBtnUI">
                        <i class="fas fa-plus me-2"></i> Crear mi primera playlist
                    </button>
                </div>`;
            // El ID `createFirstPlaylistBtnUI` es específico para este botón.
            const createFirstBtnUI = document.getElementById('createFirstPlaylistBtnUI');
            if (createFirstBtnUI) createFirstBtnUI.addEventListener('click', showCreatePlaylistModal);
            return;
        }
        
        userPlaylistsListElement.innerHTML = ''; // Limpiar.
        userPlaylists.forEach(playlist => {
            // Crear y configurar el elemento HTML para cada playlist.
            const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
            const playlistItem = document.createElement('div');
            playlistItem.className = 'playlist-item fade-in'; playlistItem.dataset.id = playlist.id;
            playlistItem.innerHTML = `
                <div class="playlist-cover"><i class="fas fa-music"></i></div>
                <div class="flex-grow-1">
                    <h5 class="playlist-title">${playlist.name}</h5>
                    <p class="playlist-info">${songCount} ${songCount === 1 ? 'canción' : 'canciones'}</p>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn play-playlist-btn" title="Reproducir playlist"><i class="fas fa-play"></i></button>
                    <button class="song-action-btn view-playlist-btn" title="Ver detalles de la playlist"><i class="fas fa-info-circle"></i></button>
                </div>`;
            // Event listeners.
            playlistItem.addEventListener('click', (e) => { if (e.target.closest('.song-action-btn')) return; showPlaylistDetails(playlist); });
            playlistItem.querySelector('.play-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); playPlaylistById(playlist.id); });
            playlistItem.querySelector('.view-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); showPlaylistDetails(playlist); });
            userPlaylistsListElement.appendChild(playlistItem);
        });
    }

    //===================================================================
    // --- SECCIÓN DE FUNCIONES DE GESTIÓN DE LIKES, HISTORIAL Y PLAYLISTS ---
    // Funciones para interactuar con los datos del usuario (likes, historial, playlists),
    // utilizando los Managers (LikesManager, PlaylistManager) si están disponibles,
    // o accediendo directamente a Firebase como fallback.
    //===================================================================

    /**
     * Alterna el estado de "me gusta" de una canción.
     * Si la canción ya tiene "me gusta", se lo quita. Si no, se lo añade.
     * Utiliza LikesManager o fallback a lógica directa.
     * @param {Object} song - Objeto de la canción con al menos `id`.
     */
    async function toggleLikeSong(song) { 
        if (!song || !song.id) { 
            console.warn("account.js: toggleLikeSong - Se intentó operar con una canción o ID inválido."); 
            showToast('No se pudo procesar la acción para esta canción.', 'error');
            return; 
        }
        console.log(`account.js: toggleLikeSong - Cambiando estado de like para la canción ID: ${song.id}`);
        try {
            if (window.LikesManager && typeof window.LikesManager.toggleLike === 'function') {
                // Usar el sistema LikesManager si está disponible.
                await window.LikesManager.toggleLike(song);
                // LikesManager debería disparar un evento que updateLikeStatusInUI maneja,
                // pero podemos mostrar un toast general aquí.
                const isNowLiked = window.LikesManager.isLiked(song.id);
                showToast(`Canción ${isNowLiked ? 'añadida a' : 'eliminada de'} favoritos.`, 'success');
            } else { 
                // Fallback: lógica directa si LikesManager no está.
                console.warn("account.js: toggleLikeSong - LikesManager no disponible, usando fallback.");
                if (likedSongs[song.id]) { // Si ya está en `likedSongs` (caché local).
                    await removeSongFromLiked(song.id); // Quitar like.
                } else {
                    await addSongToLiked(song); // Añadir like.
                }
            }
        } catch (error) { 
            console.error('account.js: toggleLikeSong - Error al cambiar estado de like:', error); 
            showToast('Error al actualizar favoritos. Inténtalo de nuevo.', 'error'); 
        }
    }

    /**
     * Añade una canción a la lista de favoritos del usuario.
     * Actualiza Firebase y la caché local.
     * @param {Object} song - Objeto de la canción a añadir.
     */
    async function addSongToLiked(song) { 
        if (!song || !song.id || !currentUser || !firebase.auth().currentUser) { 
            console.warn("account.js: addSongToLiked - Datos inválidos o usuario no autenticado."); 
            showToast('No se pudo añadir a favoritos. Intenta iniciar sesión.', 'warning');
            return; 
        }
        console.log(`account.js: addSongToLiked - Añadiendo a favoritos la canción ID: ${song.id}`);
        try {
            if (window.LikesManager && typeof window.LikesManager.addSongToLiked === 'function') { 
                await window.LikesManager.addSongToLiked(song); 
                // LikesManager dispara evento, no es necesario actualizar `likedSongs` manualmente aquí si el listener funciona.
            } else { 
                console.warn("account.js: addSongToLiked - LikesManager no disponible, usando fallback.");
                // Fallback: actualizar Firebase y caché local directamente.
                const songDataForFirebase = { ...song, added_at: Date.now() }; // Añadir timestamp.
                await firebase.database().ref(`users/${currentUser.uid}/liked_songs/${song.id}`).set(songDataForFirebase);
                likedSongs[song.id] = songDataForFirebase; // Actualizar caché local.
            }
            showToast('Canción añadida a favoritos.', 'success');
            // Refrescar secciones relevantes de la UI.
            updateUserStats(); 
            updateLikedSongsUI(); 
            updateRecentlyPlayedUI(); // Para actualizar iconos de corazón en el historial.
        } catch (error) { 
            console.error('account.js: addSongToLiked - Error:', error); 
            showToast('Error al añadir la canción a favoritos.', 'error'); 
        }
    }

    /**
     * Elimina una canción de la lista de favoritos del usuario.
     * Actualiza Firebase y la caché local.
     * @param {string} songId - ID de la canción a eliminar.
     */
    async function removeSongFromLiked(songId) { 
        if (!songId || !currentUser || !firebase.auth().currentUser) {
             console.warn("account.js: removeSongFromLiked - ID de canción inválido o usuario no autenticado."); 
             showToast('No se pudo quitar de favoritos. Intenta iniciar sesión.', 'warning');
             return; 
        }
        console.log(`account.js: removeSongFromLiked - Quitando de favoritos la canción ID: ${songId}`);
        try {
            if (window.LikesManager && typeof window.LikesManager.removeSongFromLiked === 'function') { 
                await window.LikesManager.removeSongFromLiked(songId); 
            } else { 
                console.warn("account.js: removeSongFromLiked - LikesManager no disponible, usando fallback.");
                // Fallback: actualizar Firebase y caché local directamente.
                await firebase.database().ref(`users/${currentUser.uid}/liked_songs/${songId}`).remove();
                delete likedSongs[songId]; // Actualizar caché local.
            }
            showToast('Canción eliminada de favoritos.', 'success');
            // Refrescar UI.
            updateUserStats(); 
            updateLikedSongsUI(); 
            updateRecentlyPlayedUI();
        } catch (error) { 
            console.error('account.js: removeSongFromLiked - Error:', error); 
            showToast('Error al eliminar la canción de favoritos.', 'error');
        }
    }

    /**
     * Actualiza el estado visual de "me gusta" en la UI para una canción específica.
     * Esta función es llamada generalmente por el listener de `LikesManager` o después de una acción local.
     * @param {string} songId - ID de la canción cuyo estado de like ha cambiado.
     * @param {boolean} isLiked - El nuevo estado de like (true si ahora le gusta, false si no).
     */
    function updateLikeStatusInUI(songId, isLiked) { 
        console.log(`account.js: updateLikeStatusInUI - Actualizando UI para canción ${songId}, nuevo estado de like: ${isLiked}`);
        let songDataForCache;
        if (isLiked) {
            // Si la canción ahora tiene "me gusta", se intenta obtener sus datos completos para la caché.
            // Se busca en el historial, en la playlist actual, o se recurre a LikesManager si puede proveer los datos.
            songDataForCache = recentlyPlayed.find(s => s.id === songId) || 
                               (currentPlaylist && currentPlaylist.find(s => s.id === songId)) ||
                               (window.LikesManager && typeof window.LikesManager.getLikedSong === 'function' && window.LikesManager.getLikedSong(songId)) ||
                               { id: songId, title: 'Canción (Datos no disponibles)', artist: 'Artista Desconocido' }; // Fallback muy básico.
            likedSongs[songId] = { ...songDataForCache, id: songId, added_at: Date.now() }; // Actualizar caché local.
        } else {
            delete likedSongs[songId]; // Eliminar de la caché local si se quita el like.
        }
        // Actualizar todos los elementos de la UI (botones de corazón) que correspondan a esta canción.
        document.querySelectorAll(`.song-item[data-id="${songId}"]`).forEach(item => {
            const likeBtn = item.querySelector('.song-like'); // Botón de like dentro del item.
            if (likeBtn) {
                likeBtn.classList.toggle('active', isLiked); // Añadir/quitar clase 'active'.
                const icon = likeBtn.querySelector('i');
                if(icon) icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart'; // Cambiar icono.
            }
        });
        updateUserStats(); // Actualizar contadores.
        updateLikedSongsUI(); // Re-renderizar la lista de canciones favoritas si es necesario.
    }

    /**
     * Añade una canción al historial de reproducción del usuario.
     * Guarda en Firebase y actualiza la caché local del historial.
     * @param {Object} song - Objeto de la canción reproducida.
     */
    async function addToPlayHistory(song) { 
        if (!song || !song.id || !currentUser) {
            console.warn("account.js: addToPlayHistory - Datos de canción inválidos o usuario no autenticado."); 
            return;
        }
        console.log(`account.js: addToPlayHistory - Añadiendo al historial la canción: ${song.title}`);
        try {
            const uid = currentUser.uid; 
            const timestamp = Date.now(); // Timestamp de la reproducción.
            // Guardar en Firebase.
            // Asegurar que se guarda `sourceOrigin` para saber si es local o Spotify.
            const songDataForHistory = {...song, timestamp, sourceOrigin: song.sourceOrigin || 'local'};
            await firebase.database().ref(`users/${uid}/recently_played/${song.id}`).set(songDataForHistory);
            
            // Actualizar caché local del historial:
            // Eliminar duplicados (si la canción ya estaba en el historial, se mueve al principio).
            const existingIndex = recentlyPlayed.findIndex(s => s.id === song.id);
            if (existingIndex !== -1) recentlyPlayed.splice(existingIndex, 1);
            recentlyPlayed.unshift(songDataForHistory); // Añadir al principio de la lista.
            if (recentlyPlayed.length > 20) recentlyPlayed = recentlyPlayed.slice(0, 20); // Limitar historial a 20 canciones.
            
            updateRecentlyPlayedUI(); // Refrescar la UI del historial.
        } catch (error) { 
            console.error('account.js: addToPlayHistory - Error al añadir al historial:', error); 
        }
    }

    /**
     * Limpia completamente el historial de reproducción del usuario.
     * Elimina los datos de Firebase y de la caché local.
     */
    async function clearPlayHistory() { 
        if (!currentUser) {
             console.warn("account.js: clearPlayHistory - Usuario no autenticado. No se puede limpiar el historial."); 
             return;
        }
        console.log("account.js: clearPlayHistory - Limpiando historial de reproducción.");
        try {
            // Limpiar en Firebase y localmente.
            await firebase.database().ref(`users/${currentUser.uid}/recently_played`).remove();
            recentlyPlayed = []; // Vaciar caché local.
            updateRecentlyPlayedUI(); // Refrescar UI (debería mostrar mensaje de historial vacío).
            showToast('Historial de reproducción eliminado correctamente.', 'success');
        } catch (error) { 
            console.error('account.js: clearPlayHistory - Error al limpiar historial:', error); 
            showToast('Error al limpiar el historial. Inténtalo de nuevo.', 'error');
        }
    }
    
    /**
     * Muestra el modal para que el usuario pueda añadir una canción a una de sus playlists.
     * @param {Object} song - Objeto de la canción que se quiere añadir.
     */
    function showAddToPlaylistModal(song) { 
        if (!song) { 
            console.warn("account.js: showAddToPlaylistModal - No se proporcionó una canción."); 
            return; 
        }
        selectedSongForPlaylist = song; // Guardar la canción seleccionada para usarla después.
        console.log(`account.js: showAddToPlaylistModal - Abriendo modal para añadir canción "${song.title}" a playlist.`);
        
        // Actualizar la información de la canción en el modal.
        // Se asume que el modal tiene un elemento con ID `selectedSongInfo`.
        const songInfoElement = document.getElementById('selectedSongInfo'); 
        if (songInfoElement) { 
            songInfoElement.innerHTML = `
                <div class="d-flex align-items-center mb-3">
                    <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title || 'Canción'}" 
                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;">
                    <div>
                        <h5 class="m-0">${song.title || 'Título Desconocido'}</h5>
                        <p class="text-muted m-0">${song.artist || 'Artista Desconocido'}</p>
                    </div>
                </div>
                <p class="mb-2">Selecciona una playlist para añadir esta canción:</p>`;
        }
        
        // Cargar y mostrar las playlists del usuario en el modal.
        // Se asume que el modal tiene un contenedor con ID `userPlaylistsForSelection`.
        const playlistsContainerElement = document.getElementById('userPlaylistsForSelection'); 
        if (playlistsContainerElement) { 
            if (userPlaylists.length === 0) {
                // Si el usuario no tiene playlists, mostrar opción para crear una nueva.
                playlistsContainerElement.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <p>No tienes playlists disponibles.</p>
                        <button class="btn btn-sm btn-outline-light" id="createPlaylistFromAddToModalBtnInternal">
                            <i class="fas fa-plus me-2"></i> Crear nueva playlist
                        </button>
                    </div>`;
                // El ID `createPlaylistFromAddToModalBtnInternal` es para este botón específico dentro del modal.
                document.getElementById('createPlaylistFromAddToModalBtnInternal')?.addEventListener('click', () => {
                    bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide(); // Cerrar modal actual.
                    showCreatePlaylistModal(); // Abrir modal de creación de playlist.
                });
            } else {
                // Si hay playlists, listarlas.
                playlistsContainerElement.innerHTML = ''; // Limpiar contenido previo.
                userPlaylists.forEach(playlist => {
                    const playlistItem = document.createElement('div');
                    // Estilizar para que parezca un elemento de lista clickeable.
                    playlistItem.className = 'playlist-item-selection list-group-item list-group-item-action bg-dark text-light mb-2 rounded';
                    playlistItem.style.cursor = 'pointer';
                    playlistItem.innerHTML = `
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1 playlist-title">${playlist.name}</h5>
                            <small>${playlist.songs ? Object.keys(playlist.songs).length : 0} canciones</small>
                        </div>
                        <p class="mb-1 playlist-info text-muted small">${playlist.description || 'Sin descripción'}</p>`;
                    // Event listener para añadir la canción a esta playlist al hacer clic.
                    playlistItem.addEventListener('click', async () => {
                        try {
                            if (window.PlaylistManager && typeof window.PlaylistManager.addSongToPlaylist === 'function') {
                                await window.PlaylistManager.addSongToPlaylist(selectedSongForPlaylist, playlist.id);
                            } else { // Fallback si PlaylistManager no está.
                                console.warn("account.js: showAddToPlaylistModal - PlaylistManager no disponible, usando fallback.");
                                await addSongToPlaylistDirect(selectedSongForPlaylist, playlist.id);
                            }
                            showToast('Canción añadida a la playlist correctamente.', 'success');
                            bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide(); // Cerrar modal.
                        } catch (error) { 
                            console.error('account.js: showAddToPlaylistModal - Error al añadir canción a playlist:', error); 
                            showToast(error.message || 'Error al añadir la canción a la playlist.', 'error'); 
                        }
                    });
                    playlistsContainerElement.appendChild(playlistItem);
                });
                // Añadir opción para crear una nueva playlist al final de la lista.
                const createNewItem = document.createElement('div');
                createNewItem.className = 'text-center mt-3';
                createNewItem.innerHTML = `<button class="btn btn-sm btn-outline-light" id="createPlaylistFromSelectionBtnInternal"><i class="fas fa-plus me-2"></i> Crear nueva playlist</button>`;
                createNewItem.querySelector('#createPlaylistFromSelectionBtnInternal')?.addEventListener('click', () => {
                     bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide();
                     showCreatePlaylistModal();
                });
                playlistsContainerElement.appendChild(createNewItem);
            }
        }
        // Mostrar el modal (se asume que el HTML del modal ya existe en la página).
        const modalElement = document.getElementById('addToPlaylistModal');
        if (modalElement) {
            new bootstrap.Modal(modalElement).show();
        } else {
            console.error("account.js: showAddToPlaylistModal - Elemento modal 'addToPlaylistModal' no encontrado en el DOM.");
        }
    }

    /**
     * Muestra el modal para que el usuario cree una nueva playlist.
     * Resetea el formulario del modal antes de mostrarlo.
     */
    function showCreatePlaylistModal() { 
        console.log("account.js: showCreatePlaylistModal - Abriendo modal para crear nueva playlist.");
        // Resetear el formulario del modal de creación (IDs del HTML de la página).
        const createPlaylistForm = document.getElementById('createPlaylistForm');
        if(createPlaylistForm) createPlaylistForm.reset(); 
        
        const modalElement = document.getElementById('createPlaylistModal'); // ID del HTML de la página.
        if (modalElement) {
            new bootstrap.Modal(modalElement).show();
        } else {
            console.error("account.js: showCreatePlaylistModal - Elemento modal 'createPlaylistModal' no encontrado.");
        }
    }

    /**
     * Crea una nueva playlist con los datos introducidos en el formulario del modal.
     * Utiliza PlaylistManager o fallback a lógica directa.
     */
    async function createNewPlaylist() { 
        if (!currentUser) { 
            console.warn("account.js: createNewPlaylist - Usuario no autenticado. No se puede crear playlist."); 
            showToast('Debes iniciar sesión para crear playlists.', 'warning');
            return; 
        }
        console.log("account.js: createNewPlaylist - Intentando crear nueva playlist...");
        
        // Obtener datos del formulario del modal de creación (IDs del HTML de la página).
        const nameInput = document.getElementById('playlistName'); 
        const descriptionInput = document.getElementById('playlistDescription');
        const publicInput = document.getElementById('playlistPublic');

        if (!nameInput || !descriptionInput || !publicInput) {
            console.error('account.js: createNewPlaylist - Elementos del formulario de creación de playlist no encontrados.');
            showToast('Error interno al intentar crear la playlist.', 'error'); 
            return;
        }

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const isPublic = publicInput.checked;
        
        if (!name) { // Validar que el nombre no esté vacío.
            showToast('Por favor, ingresa un nombre para la playlist.', 'error'); 
            return; 
        }
        
        try {
            showLoading(true);
            const playlistData = { name, description, public: isPublic }; // Datos para la nueva playlist.
            
            let newPlaylist;
            if (window.PlaylistManager && typeof window.PlaylistManager.createPlaylist === 'function') {
                // Usar PlaylistManager.
                newPlaylist = await window.PlaylistManager.createPlaylist(playlistData);
            } else { 
                // Fallback si PlaylistManager no está.
                console.warn("account.js: createNewPlaylist - PlaylistManager no disponible, usando fallback.");
                const uid = currentUser.uid; 
                const timestamp = Date.now();
                const playlistId = `playlist_${uid}_${timestamp}`; // Generar ID único.
                newPlaylist = { id: playlistId, name, description, public: isPublic, owner: uid, ownerName: currentUser.displayName || currentUser.email.split('@')[0] , created_at: timestamp, updated_at: timestamp, songs: {} };
                await firebase.database().ref(`users/${uid}/playlists/${playlistId}`).set(newPlaylist);
                userPlaylists.push(newPlaylist); // Actualizar caché local.
            }
            
            bootstrap.Modal.getInstance(document.getElementById('createPlaylistModal'))?.hide(); // Cerrar modal.
            showToast('Playlist creada con éxito.', 'success');
            
            // Si había una canción seleccionada previamente (desde `showAddToPlaylistModal`), añadirla a la nueva playlist.
            if (selectedSongForPlaylist && newPlaylist && newPlaylist.id) {
                console.log(`account.js: createNewPlaylist - Añadiendo canción seleccionada "${selectedSongForPlaylist.title}" a la nueva playlist "${newPlaylist.name}".`);
                try {
                    if (window.PlaylistManager) await window.PlaylistManager.addSongToPlaylist(selectedSongForPlaylist, newPlaylist.id);
                    else await addSongToPlaylistDirect(selectedSongForPlaylist, newPlaylist.id); // Fallback.
                    showToast('Canción añadida a la nueva playlist.', 'success');
                } catch (error) { 
                    console.error('account.js: createNewPlaylist - Error al añadir canción seleccionada a nueva playlist:', error); 
                    showToast(error.message || 'Error al añadir la canción a la nueva playlist.', 'error'); 
                }
                selectedSongForPlaylist = null; // Limpiar la selección.
            }
            
            // Refrescar UI.
            updateUserStats(); 
            updatePlaylistsUI(); 
            showLoading(false);
        } catch (error) { 
            console.error('account.js: createNewPlaylist - Error al crear playlist:', error); 
            showToast('Error al crear la playlist. Inténtalo de nuevo.', 'error'); 
            showLoading(false); 
        }
    }
    
    /**
     * Función auxiliar para añadir una canción a una playlist directamente en Firebase.
     * Se usa como fallback si `PlaylistManager` no está disponible.
     * @param {Object} song - Objeto de la canción a añadir.
     * @param {string} playlistId - ID de la playlist destino.
     */
    async function addSongToPlaylistDirect(song, playlistId) {
        if(!currentUser) { 
            console.error("account.js: addSongToPlaylistDirect - Usuario no autenticado.");
            throw new Error("Usuario no autenticado para añadir canción a playlist."); 
        }
        console.log(`account.js: addSongToPlaylistDirect - Añadiendo (fallback) canción "${song.title}" a playlist ID ${playlistId}`);
        const uid = currentUser.uid;
        const playlistRef = firebase.database().ref(`users/${uid}/playlists/${playlistId}`);
        
        // Verificar si la canción ya está en la playlist para evitar duplicados.
        const songSnapshot = await playlistRef.child(`songs/${song.id}`).once('value');
        if (songSnapshot.exists()) { 
            console.warn("account.js: addSongToPlaylistDirect - La canción ya está en la playlist.");
            throw new Error('Esta canción ya está en la playlist.'); 
        }
        
        // Añadir canción a la sub-colección `songs` de la playlist.
        const songDataForPlaylist = { ...song, added_at: Date.now() }; // Añadir timestamp de adición.
        await playlistRef.child(`songs/${song.id}`).set(songDataForPlaylist);
        // Actualizar el timestamp `updated_at` de la playlist.
        await playlistRef.child('updated_at').set(Date.now());
        
        // Actualizar caché local de `userPlaylists`.
        const playlistIndex = userPlaylists.findIndex(p => p.id === playlistId);
        if (playlistIndex !== -1) {
            if (!userPlaylists[playlistIndex].songs) userPlaylists[playlistIndex].songs = {};
            userPlaylists[playlistIndex].songs[song.id] = songDataForPlaylist;
            userPlaylists[playlistIndex].updated_at = Date.now();
            // Considerar si es necesario re-renderizar `updatePlaylistsUI()` aquí,
            // aunque si esto es un fallback, el flujo principal podría ya manejarlo.
        }
    }
    
    /**
     * Maneja los cambios en las playlists recibidos desde `PlaylistManager` (a través de su listener).
     * Actualiza la caché local (`userPlaylists`) y la UI correspondientemente.
     * @param {string} action - Tipo de acción ('create', 'update', 'delete', 'addSong', 'removeSong').
     * @param {Object} playlist - Objeto de la playlist afectada por la acción.
     * @param {Object|null} song - Objeto de la canción afectada (solo para 'addSong' y 'removeSong').
     */
    function updatePlaylistsAfterChange(action, playlist, song) {
        console.log(`account.js: updatePlaylistsAfterChange - Recibida acción '${action}' para playlist '${playlist ? playlist.name : "N/A"}'`);
        let playlistChangedInCache = false; // Bandera para determinar si se debe refrescar la UI.

        switch (action) {
            case 'create': // Una nueva playlist fue creada.
                // Añadirla a la caché local si no existe ya (para evitar duplicados si hay múltiples eventos).
                if (playlist && playlist.id && !userPlaylists.find(p => p.id === playlist.id)) {
                    userPlaylists.push(playlist); 
                    playlistChangedInCache = true;
                }
                break;
            case 'update': // Una playlist existente fue actualizada (nombre, descripción, etc.).
                 if (playlist && playlist.id) {
                    const updateIndex = userPlaylists.findIndex(p => p.id === playlist.id);
                    if (updateIndex !== -1) {
                        // Reemplazar o fusionar la playlist en la caché local con los datos actualizados.
                        userPlaylists[updateIndex] = { ...userPlaylists[updateIndex], ...playlist }; 
                        playlistChangedInCache = true;
                    }
                }
                break;
            case 'delete': // Una playlist fue eliminada.
                if (playlist && playlist.id) {
                    const initialLength = userPlaylists.length;
                    userPlaylists = userPlaylists.filter(p => p.id !== playlist.id); // Filtrar para quitarla.
                    if (userPlaylists.length !== initialLength) playlistChangedInCache = true;
                }
                break;
            case 'addSong': // Una canción fue añadida a una playlist.
            case 'removeSong': // Una canción fue eliminada de una playlist.
                // Para estas acciones, la `playlist` recibida ya debería tener el estado actualizado de sus canciones.
                 if (playlist && playlist.id) {
                    const songChangeIndex = userPlaylists.findIndex(p => p.id === playlist.id);
                    if (songChangeIndex !== -1) {
                        userPlaylists[songChangeIndex] = { ...playlist }; // Actualizar la playlist completa en la caché.
                        playlistChangedInCache = true;
                    }
                }
                break;
            default:
                console.warn(`account.js: updatePlaylistsAfterChange - Acción desconocida: ${action}`);
        }
        
        if (playlistChangedInCache) {
            // Si hubo cambios en la caché de playlists, actualizar las estadísticas y la UI.
            console.log("account.js: updatePlaylistsAfterChange - Cache de playlists actualizada, refrescando UI.");
            updateUserStats();
            updatePlaylistsUI();
        }
    }

 
    //===================================================================
    // --- SECCIÓN DE CONFIGURACIÓN DE EVENT LISTENERS ---
    // Aquí se configuran todos los manejadores de eventos para los elementos
    // interactivos de la página de cuenta, como botones y filtros.
    //===================================================================

    /**
     * Configura los event listeners para los botones y elementos interactivos de la página.
     * Se llama una vez que el DOM está listo y los datos iniciales del usuario están cargados.
     */
    function setupEventListeners() {
        console.log("account.js: setupEventListeners - Configurando listeners de eventos...");

        // Event listener para el botón de cerrar sesión.
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    stopPlayback(); // Detener música antes de salir.
                    logout();       // Llamar a la función de logout.
                }
            });
        } else {
            console.warn("account.js: setupEventListeners - Botón de logout (logoutBtn) no encontrado.");
        }
        
        // Event listener para el botón de editar perfil.
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', openEditProfileModal); // Abre el modal de edición.
        } else {
            console.warn("account.js: setupEventListeners - Botón de editar perfil (editProfileBtn) no encontrado.");
        }
        
        // Event listeners para los filtros de vista de playlists (Todas, Creadas, Seguidas).
        document.querySelectorAll('.view-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                // Quitar la clase 'active' de todos los filtros.
                document.querySelectorAll('.view-filter').forEach(f => f.classList.remove('active'));
                // Añadir la clase 'active' al filtro seleccionado.
                filter.classList.add('active');
                
                // Obtener el tipo de filtro del atributo 'data-filter'.
                const filterType = filter.dataset.filter;
                console.log(`account.js: setupEventListeners - Filtro de playlist seleccionado: ${filterType}`);
                filterPlaylists(filterType); // Llamar a la función para filtrar y actualizar la UI.
            });
        });
        
        // Event listener para el botón principal de "Nueva" playlist (fuera de modales).
        if (createPlaylistBtn) {
            createPlaylistBtn.addEventListener('click', showCreatePlaylistModal); // Abre el modal de creación.
        } else {
            console.warn("account.js: setupEventListeners - Botón principal de crear playlist (createPlaylistBtn) no encontrado.");
        }
        
        // Event listener para el botón "Crear playlist" DENTRO del modal de creación de playlist.
        // (El ID `savePlaylistBtn` debe estar en el botón del modal `createPlaylistModal`).
        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', createNewPlaylist); // Llama a la función para crear la playlist.
        } else {
            console.warn("account.js: setupEventListeners - Botón de guardar playlist en modal (savePlaylistBtn) no encontrado.");
        }

        // Event listener para el botón "Guardar Cambios" DENTRO del modal de edición de perfil.
        // (El ID `saveProfileChangesBtn` debe estar en el botón del modal `editProfileModal`).
        const saveProfileChangesBtn = document.getElementById('saveProfileChangesBtn');
        if (saveProfileChangesBtn) {
            saveProfileChangesBtn.addEventListener('click', saveProfileChanges); // Llama a la función para guardar el perfil.
        } else {
            console.warn("account.js: setupEventListeners - Botón de guardar cambios de perfil (saveProfileChangesBtn) no encontrado.");
        }

        // Event listener para el botón "Guardar Cambios" DENTRO del modal de edición de playlist.
        // (El ID `savePlaylistChangesBtn` debe estar en el botón del modal `editPlaylistModal`).
        const savePlaylistChangesBtn = document.getElementById('savePlaylistChangesBtn');
        if (savePlaylistChangesBtn) {
            savePlaylistChangesBtn.addEventListener('click', savePlaylistChanges); // Llama a la función para guardar la playlist.
        } else {
            console.warn("account.js: setupEventListeners - Botón de guardar cambios de playlist (savePlaylistChangesBtn) no encontrado.");
        }
        
        // Event listeners para las cajas de estadísticas (para hacer scroll a la sección correspondiente al hacer clic).
        const likedSongsStatBox = document.getElementById('likedSongsStatBox');
        if (likedSongsStatBox) {
            likedSongsStatBox.addEventListener('click', () => {
                // Buscar la sección de canciones favoritas (asegurarse de que la clase CSS sea correcta en el HTML).
                const likedSongsSection = document.querySelector('.liked-songs.liked-songs-section') || document.querySelector('.liked-songs');
                if (likedSongsSection) {
                    console.log("account.js: setupEventListeners - Scroll a la sección de canciones favoritas.");
                    likedSongsSection.scrollIntoView({ behavior: 'smooth' }); // Scroll suave.
                } else {
                    console.warn("account.js: setupEventListeners - Sección '.liked-songs' no encontrada para scroll.");
                }
            });
        }
        
        const playlistsStatBox = document.getElementById('playlistsStatBox');
        if (playlistsStatBox) {
            playlistsStatBox.addEventListener('click', () => {
                // Buscar la sección de playlists (asegurarse de que la clase CSS sea correcta).
                const playlistsSection = document.querySelector('.user-playlists.user-playlists-section') || document.querySelector('.user-playlists');
                if (playlistsSection) {
                    console.log("account.js: setupEventListeners - Scroll a la sección de playlists.");
                    playlistsSection.scrollIntoView({ behavior: 'smooth' });
                } else {
                    console.warn("account.js: setupEventListeners - Sección '.user-playlists' no encontrada para scroll.");
                }
            });
        }
        console.log("account.js: setupEventListeners - Configuración de listeners de eventos completada.");
    }

    //===================================================================
    // --- SECCIÓN DE FUNCIONES DEL REPRODUCTOR DE MÚSICA ---
    // Todas las funciones relacionadas con la inicialización, control,
    // y actualización de la UI del reproductor de música local.
    // También incluye la lógica para manejar la reproducción de playlists.
    //===================================================================

    /**
     * Configura el reproductor de música: inicializa el elemento de audio,
     * los controles de reproducción y carga las preferencias del usuario.
     * Se llama una vez al inicio, después de que los datos del usuario están listos.
     */
    function setupMusicPlayer() { 
        console.log("account.js: setupMusicPlayer - Configurando el reproductor de música...");
        // Ocultar el reproductor inicialmente si no hay ninguna pista seleccionada.
        if (currentPlayer && !currentPlayingTrack) {
            currentPlayer.style.display = 'none';
        }
        
        audioPlayer = new Audio(); // Crear la instancia del elemento HTMLAudioElement.
        
        // --- Configuración de event listeners para los controles del reproductor ---
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', togglePlayPause);
        } else {
            console.warn("account.js: setupMusicPlayer - Botón Play/Pause (playPauseBtn) no encontrado.");
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', playPrevious);
        } else {
            console.warn("account.js: setupMusicPlayer - Botón Anterior (prevBtn) no encontrado.");
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', playNext);
        } else {
            console.warn("account.js: setupMusicPlayer - Botón Siguiente (nextBtn) no encontrado.");
        }
        
        if (loopBtn) {
            loopBtn.addEventListener('click', toggleLoop);
        } else {
            console.warn("account.js: setupMusicPlayer - Botón Bucle (loopBtn) no encontrado.");
        }
        
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', toggleShuffle);
        } else {
            console.warn("account.js: setupMusicPlayer - Botón Aleatorio (shuffleBtn) no encontrado.");
        }
        
        // Event listener para la barra de progreso (para permitir que el usuario haga clic y cambie la posición).
        // El elemento con clase '.progress-bar-container' es el contenedor clickeable.
        const progressBarContainer = document.querySelector('.progress-bar-container');
        if (progressBarContainer) {
            progressBarContainer.addEventListener('click', (e) => {
                if (!audioPlayer || !currentPlayingTrack || isNaN(audioPlayer.duration)) return; // Solo si hay audio y duración válida.
                
                const rect = progressBarContainer.getBoundingClientRect(); // Dimensiones y posición del contenedor.
                const clickX = e.clientX - rect.left; // Posición X del clic relativa al contenedor.
                const containerWidth = rect.width; // Ancho total del contenedor.
                
                if (containerWidth === 0) return; // Evitar división por cero si el ancho es 0.
                const clickPercent = clickX / containerWidth; // Porcentaje del clic en la barra.
                
                audioPlayer.currentTime = clickPercent * audioPlayer.duration; // Establecer nuevo tiempo.
                updateProgress(); // Actualizar la UI de la barra inmediatamente.
            });
        } else {
            console.warn("account.js: setupMusicPlayer - Contenedor de la barra de progreso ('.progress-bar-container') no encontrado.");
        }
        
        // Event listener para el control de volumen.
        if (volumeControl) {
            volumeControl.addEventListener('input', () => {
                if (audioPlayer) { // Aplicar el valor del slider al volumen del audio.
                    audioPlayer.volume = parseFloat(volumeControl.value);
                }
            });
            // Establecer volumen inicial del audioPlayer si ya existe.
            if (audioPlayer && volumeControl.value) {
                audioPlayer.volume = parseFloat(volumeControl.value);
            }
        } else {
             console.warn("account.js: setupMusicPlayer - Control de volumen (volumeControl) no encontrado.");
        }
        
        // --- Event listeners para el propio elemento de audio ---
        // Se dispara cuando una canción termina de reproducirse.
        audioPlayer.addEventListener('ended', () => {
            console.log("account.js: Evento 'ended' del audioPlayer disparado.");
            if (isLoopMode && audioPlayer.loop) { // Si el modo bucle está activo.
                // Reiniciar la misma canción.
                audioPlayer.currentTime = 0;
                audioPlayer.play().catch(e => console.error("account.js: Error al reiniciar canción en modo bucle:", e.message));
            } else {
                // Si no hay bucle, pasar a la siguiente canción de la playlist.
                playNext();
            }
        });
        // Se dispara cuando los metadatos del audio (como la duración) se han cargado.
        audioPlayer.addEventListener('loadedmetadata', () => {
            console.log("account.js: Evento 'loadedmetadata' del audioPlayer disparado.");
            if (totalTimeDisplay && !isNaN(audioPlayer.duration)) {
                totalTimeDisplay.textContent = formatTime(audioPlayer.duration); // Mostrar duración total.
            }
        });
        // Manejo de errores del elemento de audio (ej. archivo no encontrado, formato no soportado).
        audioPlayer.addEventListener('error', (e) => {
            console.error("account.js: Error en el elemento audioPlayer:", audioPlayer.error, e);
            showToast('Error al cargar o reproducir la canción seleccionada.', 'error');
            isPlaying = false; 
            updatePlayPauseButton(); 
            stopProgressUpdate();
            currentPlayingTrack = null; // Limpiar la pista actual si falla.
            updatePlayerUI(); // Actualizar la UI para reflejar que no hay pista.
        });
        
        // Cargar las preferencias guardadas del reproductor (volumen, bucle, aleatorio).
        loadPlayerPreferences();
        console.log("account.js: setupMusicPlayer - Configuración del reproductor completada.");
    }
    
    /**
     * Inicia la reproducción de una canción específica.
     * Maneja tanto canciones locales como de Spotify (aunque Spotify se abre externamente aquí).
     * @param {Object} song - Objeto con los datos de la canción a reproducir.
     */
    function playSong(song) { 
        if (!song) { 
            console.warn("account.js: playSong - No se proporcionó una canción para reproducir."); 
            return; 
        }
        console.log(`account.js: playSong - Intentando reproducir canción: "${song.title || 'Desconocido'}" (ID: ${song.id})`);
        
        stopPlayback(); // Detener cualquier reproducción actual.
        currentPlayingTrack = song; // Establecer la nueva canción como la actual.
        updatePlayerUI(); // Actualizar la UI del reproductor con la información de la nueva canción.
        
        // Determinar el origen de la canción (local o Spotify).
        if (song.sourceOrigin === 'spotify' || song.source === 'spotify') {
            // Para canciones de Spotify, actualmente se abre en una nueva pestaña/aplicación.
            // Una integración más profunda requeriría el SDK de Web Playback de Spotify.
            if (song.externalUrl) {
                window.open(song.externalUrl, '_blank'); // Abrir URL externa de Spotify.
                showToast('Abriendo la canción en Spotify...', 'info');
            } else {
                showToast('No se pudo reproducir esta canción de Spotify (URL externa no disponible).', 'error');
                console.warn("account.js: playSong - Canción de Spotify sin URL externa:", song);
            }
        } else { 
            // Para canciones locales (almacenadas en el proyecto).
            if (!song.source) { // Verificar que la canción tenga una fuente (URL del archivo de audio).
                showToast('La fuente de esta canción no está disponible.', 'error');
                console.error('account.js: playSong - La canción local no tiene una URL de fuente válida:', song);
                currentPlayingTrack = null; // Limpiar pista actual.
                updatePlayerUI(); // Actualizar UI para reflejar que no hay pista.
                return;
            }
            audioPlayer.src = song.source; // Establecer la fuente del audioPlayer.
            audioPlayer.loop = isLoopMode; // Sincronizar el estado de bucle del audioPlayer.
            audioPlayer.volume = volumeControl ? parseFloat(volumeControl.value) : 0.7; // Establecer volumen.
            
            // Intentar reproducir el audio.
            audioPlayer.play()
                .then(() => {
                    isPlaying = true; // Marcar como reproduciendo.
                    updatePlayPauseButton(); // Actualizar icono del botón play/pause.
                    startProgressUpdate(); // Iniciar actualización de la barra de progreso.
                    addToPlayHistory(song); // Añadir la canción al historial de reproducción.
                    console.log(`account.js: playSong - Reproduciendo localmente: "${song.title}"`);
                })
                .catch(error => { // Manejar error si play() falla (ej. por políticas de autoplay del navegador).
                    console.error('account.js: playSong - Error al intentar reproducir la canción local:', error.message);
                    showToast(`Error al reproducir la canción: ${error.message}. Intenta interactuar con la página primero.`, 'error');
                    isPlaying = false; 
                    updatePlayPauseButton();
                    currentPlayingTrack = null; // Limpiar pista.
                    updatePlayerUI(); // Actualizar UI.
                });
        }
        // Actualizar el estado de "me gusta" en la UI para la canción actual (si tiene ID).
        if (song && song.id) {
            updateLikeStatus(song.id);
        }
    }
    
    /**
     * Inicia la reproducción de una playlist completa.
     * @param {Array} songs - Array de objetos de canción que componen la playlist.
     * @param {number} [startIndex=0] - Índice de la canción por la que empezar (0 por defecto).
     * @param {string|null} [playlistId=null] - ID de la playlist.
     */
    function playPlaylist(songs, startIndex = 0, playlistId = null) {
        if (!songs || songs.length === 0) { 
            showToast('No hay canciones en esta playlist para reproducir.', 'warning'); 
            return; 
        }
        console.log(`account.js: playPlaylist - Iniciando reproducción de playlist (ID: ${playlistId || 'Desconocido'}), ${songs.length} canciones, empezando por índice ${startIndex}.`);
        
        currentPlaylist = [...songs]; // Crear una copia de la lista de canciones para la cola actual.
        // Asegurar que el índice de inicio sea válido dentro de los límites de la playlist.
        currentTrackIndex = Math.max(0, Math.min(startIndex, currentPlaylist.length - 1)); 
        currentPlaylistId = playlistId; // Guardar el ID de la playlist actual.
        
        // Si el modo aleatorio está activado y hay más de una canción en la playlist.
        if (isShuffleMode && currentPlaylist.length > 1) {
            console.log("account.js: playPlaylist - Modo aleatorio activado, mezclando playlist.");
            const songToStartWith = currentPlaylist[currentTrackIndex]; // Mantener la canción seleccionada.
            // Filtrar el resto de canciones y mezclarlas.
            let restOfSongs = currentPlaylist.filter((_,idx) => idx !== currentTrackIndex);
            shuffleArray(restOfSongs);
            // Reconstruir la playlist con la canción seleccionada al inicio, seguida del resto mezclado.
            currentPlaylist = [songToStartWith, ...restOfSongs];
            currentTrackIndex = 0; // El índice de la canción actual ahora es 0.
        }
        
        // Reproducir la canción correspondiente al `currentTrackIndex`.
        if (currentPlaylist[currentTrackIndex]) {
            playSong(currentPlaylist[currentTrackIndex]);
        } else {
            console.error("account.js: playPlaylist - No se pudo encontrar la canción en el índice especificado para iniciar la playlist.");
            showToast('Error al iniciar la reproducción de la playlist.', 'error');
        }
    }
    
    /**
     * Busca una playlist por su ID y, si la encuentra, inicia su reproducción.
     * @param {string} playlistId - ID de la playlist a reproducir.
     */
    function playPlaylistById(playlistId) {
        console.log(`account.js: playPlaylistById - Intentando reproducir playlist con ID: ${playlistId}`);
        // Buscar la playlist en la caché local `userPlaylists`.
        const playlist = userPlaylists.find(p => p.id === playlistId);
        if (!playlist) { 
            showToast('La playlist seleccionada no fue encontrada.', 'error'); 
            console.warn("account.js: playPlaylistById - Playlist no encontrada en caché local.");
            return; 
        }
        
        // Obtener las canciones de la playlist (asumiendo que están en `playlist.songs` como un objeto).
        const songs = playlist.songs ? Object.values(playlist.songs) : []; 
        if (songs.length === 0) { 
            showToast('Esta playlist está vacía y no se puede reproducir.', 'warning'); 
            return; 
        }
        
        playPlaylist(songs, 0, playlistId); // Llamar a `playPlaylist` para iniciar la reproducción.
    }
    
    /**
     * Detiene la reproducción actual del audioPlayer local.
     * Pausa el audio y limpia la fuente para liberar el recurso.
     */
    function stopPlayback() {
        if (audioPlayer) {
            audioPlayer.pause(); 
            audioPlayer.src = ''; // Limpiar la fuente para detener completamente y liberar.
            console.log("account.js: stopPlayback - Reproducción local detenida.");
        }
        isPlaying = false; // Marcar como no reproduciendo.
        updatePlayPauseButton(); // Actualizar icono del botón.
        stopProgressUpdate(); // Detener actualización de la barra de progreso.
        // No se limpia `currentPlayingTrack` aquí para que la UI del reproductor pueda seguir mostrando
        // la información de la última canción reproducida hasta que se seleccione una nueva.
    }
    
    /**
     * Alterna entre el estado de reproducción (play) y pausa (pause) del audioPlayer local.
     */
    function togglePlayPause() {
        // Si no hay audioPlayer o no hay una pista actual cargada.
        if (!audioPlayer || !currentPlayingTrack) {
            // Intentar reproducir la primera canción de la cola actual si existe.
            if (currentPlaylist.length > 0 && currentTrackIndex !== -1 && currentPlaylist[currentTrackIndex]) {
                playSong(currentPlaylist[currentTrackIndex]);
            } else { 
                showToast('No hay ninguna canción seleccionada para reproducir.', 'info'); 
            }
            return;
        }
        
        if (isPlaying) { // Si actualmente está sonando, pausar.
            audioPlayer.pause(); 
            isPlaying = false; 
            stopProgressUpdate(); // Detener la actualización de la barra de progreso.
            console.log("account.js: togglePlayPause - Audio pausado.");
        } else { // Si está pausada o detenida, (re)iniciar la reproducción.
            // Verificar si el audioPlayer tiene una fuente válida cargada.
            // A veces `audioPlayer.src` puede ser la URL de la página actual si se limpió incorrectamente.
            if (!audioPlayer.src || audioPlayer.src === window.location.href) {
                 console.log("account.js: togglePlayPause - No hay fuente válida en audioPlayer, recargando canción actual.");
                 playSong(currentPlayingTrack); // Recargar la canción si no hay fuente.
            } else {
                audioPlayer.play()
                    .then(() => { 
                        isPlaying = true; 
                        startProgressUpdate(); // Reiniciar la actualización de la barra.
                        console.log("account.js: togglePlayPause - Audio reanudado/iniciado.");
                    })
                    .catch(error => { 
                        console.error('account.js: togglePlayPause - Error al reanudar/iniciar audio:', error.message); 
                        showToast('Error al reanudar la reproducción.', 'error'); 
                        isPlaying = false; // Asegurar que `isPlaying` sea false si hay error.
                    });
            }
        }
        updatePlayPauseButton(); // Actualizar el icono del botón play/pause.
    }
    
    /**
     * Reproduce la canción anterior en la `currentPlaylist`.
     * Si el modo aleatorio está activado, elige otra canción aleatoria (diferente de la actual).
     */
    function playPrevious() {
        if (!currentPlaylist || currentPlaylist.length === 0) { 
            showToast('No hay una playlist activa para ir a la canción anterior.', 'info'); 
            return; 
        }
        
        if (currentTrackIndex === -1 && currentPlaylist.length > 0) { // Si no se ha iniciado la reproducción de la playlist.
            // Empezar por la última canción de la lista.
            currentTrackIndex = currentPlaylist.length -1;
        } else {
            // Lógica para el modo aleatorio o secuencial.
            if (isShuffleMode && currentPlaylist.length > 1) {
                let prevIndex;
                do { // Elegir una canción aleatoria que no sea la actual.
                    prevIndex = Math.floor(Math.random() * currentPlaylist.length);
                } while (prevIndex === currentTrackIndex);
                currentTrackIndex = prevIndex;
            } else { // Modo secuencial.
                currentTrackIndex--;
                if (currentTrackIndex < 0) { // Si se llega al inicio, ir al final (wraparound).
                    currentTrackIndex = currentPlaylist.length - 1; 
                }
            }
        }
        
        // Reproducir la canción en el nuevo índice.
        if (currentPlaylist[currentTrackIndex]) {
            playSong(currentPlaylist[currentTrackIndex]);
        } else {
            console.warn("account.js: playPrevious - No se encontró canción en el índice calculado.");
        }
    }
    
    /**
     * Reproduce la siguiente canción en la `currentPlaylist`.
     * Si el modo aleatorio está activado, elige otra canción aleatoria (diferente de la actual).
     */
    function playNext() {
        if (!currentPlaylist || currentPlaylist.length === 0) { 
            showToast('No hay una playlist activa para ir a la siguiente canción.', 'info'); 
            return; 
        }

        if (currentTrackIndex === -1 && currentPlaylist.length > 0) { // Si no se ha iniciado la reproducción.
             currentTrackIndex = 0; // Empezar por la primera.
        } else {
            // Lógica para modo aleatorio o secuencial.
             if (isShuffleMode && currentPlaylist.length > 1) {
                let nextIndex;
                do { // Elegir aleatoria diferente de la actual.
                    nextIndex = Math.floor(Math.random() * currentPlaylist.length);
                } while (nextIndex === currentTrackIndex);
                currentTrackIndex = nextIndex;
            } else { // Modo secuencial.
                currentTrackIndex++;
                if (currentTrackIndex >= currentPlaylist.length) { // Si se llega al final, ir al inicio (wraparound).
                    currentTrackIndex = 0; 
                }
            }
        }
        
        if (currentPlaylist[currentTrackIndex]) {
            playSong(currentPlaylist[currentTrackIndex]);
        } else {
            console.warn("account.js: playNext - No se encontró canción en el índice calculado.");
        }
    }
    
    /**
     * Alterna el modo bucle (repetir la canción actual).
     * Actualiza la UI del botón y guarda la preferencia.
     */
    function toggleLoop() {
        isLoopMode = !isLoopMode; // Invertir el estado.
        if (loopBtn) loopBtn.classList.toggle('active', isLoopMode); // Actualizar clase CSS del botón.
        if (audioPlayer) audioPlayer.loop = isLoopMode; // Aplicar al elemento de audio.
        
        savePlayerPreferences(); // Guardar la preferencia.
        showToast(`Modo bucle ${isLoopMode ? 'activado' : 'desactivado'}.`, 'info');
    }
    
    /**
     * Alterna el modo de reproducción aleatoria (shuffle).
     * Actualiza la UI del botón, reorganiza la playlist si se activa, y guarda la preferencia.
     */
    function toggleShuffle() {
        isShuffleMode = !isShuffleMode; // Invertir estado.
        if (shuffleBtn) shuffleBtn.classList.toggle('active', isShuffleMode); // Actualizar clase CSS.
        
        // Si se activa el modo aleatorio y hay una playlist en reproducción con más de una canción.
        if (isShuffleMode && currentPlaylist && currentPlaylist.length > 1 && currentTrackIndex !== -1) {
            console.log("account.js: toggleShuffle - Modo aleatorio activado. Reorganizando playlist actual.");
            const currentSong = currentPlaylist[currentTrackIndex]; // Guardar la canción actual.
            // Crear una nueva lista mezclada excluyendo la canción actual.
            const remainingSongs = currentPlaylist.filter(song => song.id !== currentSong.id); // Comparar por ID.
            shuffleArray(remainingSongs); // Mezclar las canciones restantes.
            // Reconstruir la playlist con la canción actual al inicio, seguida del resto mezclado.
            currentPlaylist = [currentSong, ...remainingSongs];
            currentTrackIndex = 0; // La canción actual es ahora la primera de la lista (reorganizada).
        }
        // Nota: Si se desactiva el modo aleatorio, la playlist actual no se "desmezcla" automáticamente.
        // El orden original se restauraría al volver a cargar la playlist original (ej. desde la UI de playlists).
        
        savePlayerPreferences(); // Guardar la preferencia.
        showToast(`Modo aleatorio ${isShuffleMode ? 'activado' : 'desactivado'}.`, 'info');
    }
    
    /**
     * Actualiza el icono del botón principal de reproducción/pausa.
     */
    function updatePlayPauseButton() {
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' :  // Icono de pausa si está sonando.
                '<i class="fas fa-play"></i>';   // Icono de play si está pausado/detenido.
        }
    }
    
    /**
     * Actualiza la interfaz del reproductor (información de la canción, tiempos, etc.).
     */
    function updatePlayerUI() {
        // Si no hay una pista actualmente seleccionada (o se limpió).
        if (!currentPlayingTrack) {
            if (currentPlayer) currentPlayer.style.display = 'none'; // Ocultar el reproductor.
            // Restablecer a valores por defecto por si acaso.
            if(currentTrackImage) currentTrackImage.src = 'resources/album covers/placeholder.png';
            if(currentTrackName) currentTrackName.textContent = 'Selecciona una canción';
            if(currentTrackArtist) currentTrackArtist.textContent = 'Para comenzar';
            if(progressBar) progressBar.style.width = '0%';
            if(currentTimeDisplay) currentTimeDisplay.textContent = "0:00";
            if(totalTimeDisplay) totalTimeDisplay.textContent = "0:00";
            return;
        }
        
        // Actualizar imagen, título y artista de la canción.
        if (currentTrackImage) { 
            currentTrackImage.src = currentPlayingTrack.image || 'resources/album covers/placeholder.png'; 
            currentTrackImage.alt = currentPlayingTrack.title || 'Portada de la canción'; 
        }
        if (currentTrackName) currentTrackName.textContent = currentPlayingTrack.title || 'Título Desconocido';
        if (currentTrackArtist) currentTrackArtist.textContent = currentPlayingTrack.artist || 'Artista Desconocido';
        
        // Resetear barra de progreso y visualización de tiempos.
        if (progressBar) progressBar.style.width = '0%';
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        // Mostrar duración total si está disponible en el objeto `song` o si `audioPlayer` ya la cargó.
        if (totalTimeDisplay) {
             totalTimeDisplay.textContent = (audioPlayer && !isNaN(audioPlayer.duration)) 
                                            ? formatTime(audioPlayer.duration) 
                                            : (currentPlayingTrack.duration || '0:00');
        }
        if (currentPlayer) currentPlayer.style.display = 'flex'; // Asegurar que el reproductor esté visible.
    }
    
    /**
     * Inicia la actualización periódica de la barra de progreso y los tiempos.
     * Usa `setInterval`.
     */
    function startProgressUpdate() {
        stopProgressUpdate(); // Limpiar cualquier intervalo existente para evitar duplicados.
        // Crear un nuevo intervalo para llamar a `updateProgress` cada medio segundo (500ms).
        // Una frecuencia más alta da una actualización más suave.
        progressInterval = setInterval(updateProgress, 500); 
        updateProgress(); // Llamar una vez inmediatamente para la actualización inicial.
    }
    
    /**
     * Detiene la actualización de la barra de progreso (limpia el intervalo).
     */
    function stopProgressUpdate() {
        if (progressInterval) { 
            clearInterval(progressInterval); 
            progressInterval = null; 
        }
    }
    
    /**
     * Actualiza la barra de progreso visual y los textos de tiempo (actual y total).
     * Se llama periódicamente por `startProgressUpdate`.
     */
    function updateProgress() {
        // Solo actualizar si hay un audioPlayer, está reproduciendo, y la duración es un número válido.
        if (!audioPlayer || !isPlaying || isNaN(audioPlayer.duration)) {
            // Si la duración no es válida (ej. audio no cargado), resetear la barra.
            if (progressBar && (!audioPlayer || isNaN(audioPlayer.duration))) {
                 progressBar.style.width = '0%';
            }
            return;
        }
        
        const duration = audioPlayer.duration;
        const currentTime = audioPlayer.currentTime;
        
        // Actualizar la barra de progreso visual (el `div` con clase `progress`).
        if (progressBar && duration > 0) { // Evitar división por cero si la duración es 0.
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }
        
        // Actualizar los textos de tiempo.
        if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(currentTime);
        // El tiempo total (`totalTimeDisplay`) se actualiza principalmente en `loadedmetadata`
        // y al inicio de `updatePlayerUI`. Aquí se asegura que esté correcto si no lo estaba.
        if (totalTimeDisplay && (totalTimeDisplay.textContent === "0:00" || isNaN(parseFloat(totalTimeDisplay.textContent.replace(':','.'))))) {
             if (!isNaN(duration)) totalTimeDisplay.textContent = formatTime(duration);
        }
    }
    
    /**
     * Guarda las preferencias del reproductor (volumen, bucle, aleatorio)
     * en `localStorage` (para acceso rápido) y en Firebase DB (para persistencia entre dispositivos).
     */
    function savePlayerPreferences() {
        // No guardar si no hay un usuario actual o si Firebase Auth no tiene un usuario.
        if (!currentUser || !currentUser.uid || !firebase.auth().currentUser) {
            console.warn("account.js: savePlayerPreferences - No hay usuario actual o UID, no se guardan preferencias.");
            return;
        } 
        
        const preferences = {
            loop: isLoopMode,
            shuffle: isShuffleMode,
            volume: audioPlayer ? audioPlayer.volume : (volumeControl ? parseFloat(volumeControl.value) : 0.7) // Volumen actual.
        };
        console.log("account.js: savePlayerPreferences - Guardando preferencias:", preferences);
        
        // Guardar en localStorage (clave específica del usuario).
        try { 
            localStorage.setItem(`player_preferences_${currentUser.uid}`, JSON.stringify(preferences)); 
        }
        catch (e) { console.warn("account.js: savePlayerPreferences - No se pudo guardar preferencias en localStorage:", e.message); }
        
        // Guardar en Firebase Realtime Database.
        firebase.database().ref(`users/${currentUser.uid}/player_preferences`).set(preferences)
            .catch(error => console.error('account.js: savePlayerPreferences - Error al guardar preferencias en Firebase DB:', error.message));
    }
    
    /**
     * Carga las preferencias del reproductor al iniciar.
     * Intenta cargar primero desde `localStorage` (más rápido), y si no, desde Firebase DB.
     */
    function loadPlayerPreferences() {
        if (!currentUser || !currentUser.uid) { 
            console.log("account.js: loadPlayerPreferences - No hay usuario actual o UID, no se cargan preferencias.");
            return; 
        }
        console.log("account.js: loadPlayerPreferences - Cargando preferencias para UID:", currentUser.uid);
        let savedPreferences = null;
        try { 
            savedPreferences = localStorage.getItem(`player_preferences_${currentUser.uid}`); 
        }
        catch (e) { console.warn("account.js: loadPlayerPreferences - No se pudo leer preferencias de localStorage:", e.message); }
        
        if (savedPreferences) { // Si se encontraron en localStorage.
            console.log("account.js: loadPlayerPreferences - Preferencias encontradas en localStorage.");
            try { 
                applyPlayerPreferences(JSON.parse(savedPreferences)); // Parsear y aplicar.
            }
            catch (error) { // Si hay error al parsear, intentar cargar de Firebase.
                console.error('account.js: loadPlayerPreferences - Error al parsear preferencias de localStorage. Intentando Firebase.', error.message); 
                loadPlayerPreferencesFromFirebase(); 
            }
        } else { // Si no están en localStorage, cargar de Firebase.
            console.log("account.js: loadPlayerPreferences - No hay preferencias en localStorage. Intentando Firebase.");
            loadPlayerPreferencesFromFirebase(); 
        }
    }

    /**
     * Carga las preferencias del reproductor específicamente desde Firebase Realtime Database.
     * Si se cargan, también se guardan en `localStorage` para la próxima vez.
     */
    async function loadPlayerPreferencesFromFirebase() {
        if (!firebase.auth().currentUser) {
             console.warn("account.js: loadPlayerPreferencesFromFirebase - Usuario no autenticado.");
            return;
        }
        const uid = firebase.auth().currentUser.uid;
        console.log("account.js: loadPlayerPreferencesFromFirebase - Cargando desde Firebase DB para UID:", uid);
        try {
            const snapshot = await firebase.database().ref(`users/${uid}/player_preferences`).once('value');
            const preferences = snapshot.val();
            if (preferences) {
                console.log("account.js: loadPlayerPreferencesFromFirebase - Preferencias cargadas desde Firebase:", preferences);
                applyPlayerPreferences(preferences); // Aplicar.
                // Guardar en localStorage para la próxima vez.
                try { 
                    localStorage.setItem(`player_preferences_${uid}`, JSON.stringify(preferences)); 
                }
                catch (e) { console.warn("account.js: loadPlayerPreferencesFromFirebase - No se pudo guardar preferencias de Firebase en localStorage:", e.message); }
            } else {
                console.log("account.js: loadPlayerPreferencesFromFirebase - No hay preferencias guardadas en Firebase.");
                // Se podrían aplicar valores por defecto aquí si es necesario.
                applyPlayerPreferences({ loop: false, shuffle: false, volume: 0.7 }); // Valores por defecto.
            }
        } catch (error) { 
            console.error('account.js: loadPlayerPreferencesFromFirebase - Error al cargar preferencias desde Firebase DB:', error.message); 
        }
    }

    /**
     * Aplica un objeto de preferencias al estado actual del reproductor y a la UI.
     * @param {Object} preferences - Objeto con las preferencias (`loop`, `shuffle`, `volume`).
     */
    function applyPlayerPreferences(preferences) {
        console.log("account.js: applyPlayerPreferences - Aplicando preferencias:", preferences);
        isLoopMode = preferences.loop || false; 
        isShuffleMode = preferences.shuffle || false;
        
        // Actualizar UI de botones de bucle y aleatorio.
        if (loopBtn) loopBtn.classList.toggle('active', isLoopMode);
        if (audioPlayer) audioPlayer.loop = isLoopMode; // Aplicar a elemento audio.
        if (shuffleBtn) shuffleBtn.classList.toggle('active', isShuffleMode);
        
        // Aplicar volumen.
        const volumeValue = (preferences.volume !== undefined && preferences.volume !== null) ? parseFloat(preferences.volume) : 0.7;
        if (audioPlayer) audioPlayer.volume = volumeValue;
        if (volumeControl) volumeControl.value = volumeValue; // Actualizar slider.
    }
    
    /**
     * Actualiza el estado visual de "me gusta" (icono de corazón) en la UI para una canción específica.
     * Esta función es diferente de `updateLikeStatusInUI` ya que solo se enfoca en actualizar
     * el icono de la canción que se está reproduciendo o que se acaba de seleccionar.
     * `updateLikeStatusInUI` es más general y actualiza todos los items en la página.
     * @param {string} songId - ID de la canción cuyo estado de like se va a actualizar en la UI.
     */
    function updateLikeStatus(songId) {
        // Esta función parece ser un duplicado conceptual de lo que hace `updateLikeStatusInUI`.
        // Se recomienda unificar la lógica o asegurar que sus propósitos estén bien diferenciados.
        // Por ahora, se asume que se quiere actualizar los iconos de like de cualquier item de canción con ese ID.
        console.log(`account.js: updateLikeStatus - Actualizando estado de like en UI para canción ID: ${songId}`);
        document.querySelectorAll(`.song-item[data-id="${songId}"]`).forEach(item => {
            const likeBtn = item.querySelector('.song-like');
            if (likeBtn) {
                const isLiked = !!likedSongs[songId]; // Verificar si está en la caché de `likedSongs`.
                likeBtn.classList.toggle('active', isLiked);
                const iconElement = likeBtn.querySelector('i');
                if (iconElement) iconElement.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            }
        });
    }
    
    /**
     * Filtra las playlists mostradas en la UI según el tipo seleccionado (Todas, Creadas, Seguidas).
     * @param {string} filterType - Tipo de filtro ('all', 'created', 'followed').
     */
    function filterPlaylists(filterType) {
        console.log('account.js: filterPlaylists - Filtrando playlists por tipo:', filterType);
        
        updatePlaylistsUI(); 
    }

    /**
     * Muestra los detalles de una playlist en un modal.
     * Carga la información de la playlist y sus canciones, y configura los botones de acción del modal.
     * @param {Object} playlist - Objeto con datos de la playlist.
     */
    function showPlaylistDetails(playlist) {
        if (!playlist || !playlist.id) { 
            console.error("account.js: showPlaylistDetails - Playlist inválida o sin ID proporcionada:", playlist); 
            showToast('No se pudieron cargar los detalles de la playlist.', 'error');
            return; 
        }
        console.log(`account.js: showPlaylistDetails - Mostrando detalles para playlist: "${playlist.name}" (ID: ${playlist.id})`);
        
        // --- Referencias a elementos del DOM dentro del modal `playlistDetailModal` ---
        const modalTitle = document.getElementById('playlistDetailModalLabel');
        const playlistNameEl = document.getElementById('playlistDetailName');
        const playlistDescriptionEl = document.getElementById('playlistDetailDescription');
        const playlistCreatorEl = document.getElementById('playlistDetailCreator');
        const playlistSongCountEl = document.getElementById('playlistDetailSongCount');
        const playlistCreatedAtEl = document.getElementById('playlistDetailCreatedAt');
        const playlistSongsListEl = document.getElementById('playlistSongsList'); // Contenedor UL/OL para las canciones.

        // --- Llenar información básica de la playlist ---
        if (modalTitle) modalTitle.textContent = playlist.name;
        if (playlistNameEl) playlistNameEl.textContent = playlist.name;
        if (playlistDescriptionEl) {
            playlistDescriptionEl.textContent = playlist.description || 'Esta playlist no tiene descripción.';
        }
        
        const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
        if (playlistCreatorEl && currentUser) { // Mostrar nombre del creador.
            playlistCreatorEl.textContent = playlist.owner === currentUser.uid 
                                            ? (currentUser.displayName || currentUser.email.split('@')[0] || 'Tú') 
                                            : (playlist.ownerName || 'Otro usuario');
        } else if (playlistCreatorEl) {
            playlistCreatorEl.textContent = "Desconocido";
        }
        if (playlistSongCountEl) playlistSongCountEl.textContent = `${songCount}`; // Solo el número.
        if (playlistCreatedAtEl && playlist.created_at) {
            playlistCreatedAtEl.textContent = new Date(playlist.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        } else if (playlistCreatedAtEl) {
             playlistCreatedAtEl.textContent = "Fecha desconocida";
        }

        // --- Mostrar la lista de canciones de la playlist ---
        if (playlistSongsListEl) {
            if (songCount === 0) {
                playlistSongsListEl.innerHTML = `<li class="list-group-item text-center text-muted py-4"><i class="fas fa-compact-disc fa-2x mb-3"></i><p>Esta playlist está vacía.</p><small>Puedes añadir canciones desde tus favoritas o el historial.</small></li>`;
            } else {
                const songsArray = Object.values(playlist.songs).sort((a,b) => (a.added_at || 0) - (b.added_at || 0)); // Ordenar por fecha de adición.
                playlistSongsListEl.innerHTML = ''; // Limpiar lista previa.
                songsArray.forEach(song => {
                    const songItem = document.createElement('li');
                    songItem.className = 'list-group-item bg-transparent text-light p-0 song-item-in-playlist-detail d-flex align-items-center py-2';
                    songItem.innerHTML = `
                        <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title || 'Canción'}" class="song-cover-sm me-3" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                        <div class="song-details flex-grow-1">
                            <h6 class="song-title mb-0 ellipsis-text" style="max-width: 300px;">${song.title || 'Título Desconocido'}</h6>
                            <small class="song-artist text-muted ellipsis-text" style="max-width: 300px;">${song.artist || 'Artista Desconocido'}</small>
                        </div>
                        <div class="song-actions ms-auto">
                            <button class="btn btn-sm btn-outline-light play-song-from-playlist-btn me-1" title="Reproducir canción"><i class="fas fa-play"></i></button>
                            <button class="btn btn-sm btn-outline-danger remove-from-playlist-detail-btn" title="Eliminar canción de la playlist"><i class="fas fa-trash-alt"></i></button>
                        </div>`;
                    
                    // Event listener para el botón de reproducir canción individual.
                    songItem.querySelector('.play-song-from-playlist-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const currentPlaylistSongs = Object.values(playlist.songs).sort((a,b) => (a.added_at || 0) - (b.added_at || 0));
                        const songIndex = currentPlaylistSongs.findIndex(s => s.id === song.id);
                        playPlaylist(currentPlaylistSongs, songIndex, playlist.id); // Iniciar reproducción de esta playlist desde esta canción.
                        // Opcional: cerrar el modal después de iniciar la reproducción.
                        // bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'))?.hide();
                    });

                    // Event listener para el botón de eliminar canción de la playlist.
                    songItem.querySelector('.remove-from-playlist-detail-btn').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`¿Estás seguro de que quieres eliminar "${song.title}" de la playlist "${playlist.name}"?`)) return;
                        try {
                            showLoading(true);
                            if (window.PlaylistManager && typeof window.PlaylistManager.removeSongFromPlaylist === 'function') {
                                await window.PlaylistManager.removeSongFromPlaylist(song.id, playlist.id);
                                // PlaylistManager debería disparar un evento que actualice la UI.
                                // Se necesita recargar los detalles de esta playlist para reflejar el cambio en el modal.
                                const updatedPlaylistData = window.PlaylistManager.getPlaylistById(playlist.id);
                                if (updatedPlaylistData) {
                                    // Refrescar el contenido del modal actual con los datos actualizados.
                                    // Esto evita cerrar y reabrir, manteniendo al usuario en contexto.
                                    showPlaylistDetails(updatedPlaylistData); 
                                } else { 
                                    // Si la playlist ya no se encuentra (ej. eliminada si era la última canción y se borró la playlist),
                                    // cerrar el modal y refrescar la lista principal.
                                    bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'))?.hide();
                                    updatePlaylistsUI(); 
                                }
                            } else { 
                                console.warn("account.js: showPlaylistDetails - PlaylistManager.removeSongFromPlaylist no disponible. Usar fallback si es necesario.");
                                // Implementar lógica de fallback aquí si se desea (actualizar Firebase y caché local directamente).
                                // Esto sería más complejo de mantener sincronizado sin el manager.
                            }
                            showToast('Canción eliminada de la playlist.', 'success');
                        } catch (error) { 
                            console.error("account.js: showPlaylistDetails - Error al eliminar canción de la playlist:", error); 
                            showToast('Error al eliminar la canción de la playlist.', 'error');
                        } finally {
                            showLoading(false);
                        }
                    });
                    playlistSongsListEl.appendChild(songItem);
                });
            }
        }

        // --- Configurar botones de acción principales del modal ---
        // Usar los IDs del HTML que me proporcionaste para `playlistDetailModal`.
        const playAllPlaylistBtnModal = document.getElementById('playAllPlaylistBtn'); 
        const editPlaylistBtnModalAction = document.getElementById('editPlaylistBtnModal'); 
        const deletePlaylistBtnModalAction = document.getElementById('deletePlaylistBtnModal'); 
        
        // Botón "Reproducir" (o "Reproducir Todo") la playlist.
        if (playAllPlaylistBtnModal) {
            // Limpiar listeners anteriores para evitar duplicaciones si el modal se muestra varias veces.
            const newPlayAllBtn = playAllPlaylistBtnModal.cloneNode(true);
            playAllPlaylistBtnModal.parentNode.replaceChild(newPlayAllBtn, playAllPlaylistBtnModal);
            
            newPlayAllBtn.addEventListener('click', () => {
                console.log(`account.js: showPlaylistDetails - Botón "Reproducir" playlist ID: ${playlist.id} clickeado.`);
                playPlaylistById(playlist.id); // Función que reproduce la playlist completa.
                bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'))?.hide(); // Cerrar modal.
            });
            newPlayAllBtn.disabled = (songCount === 0); // Deshabilitar si la playlist no tiene canciones.
        } else {
            console.warn("account.js: showPlaylistDetails - Botón 'playAllPlaylistBtn' no encontrado en el modal.");
        }
        
        // Botón "Editar" la playlist.
        if (editPlaylistBtnModalAction) {
            const newEditBtn = editPlaylistBtnModalAction.cloneNode(true);
            editPlaylistBtnModalAction.parentNode.replaceChild(newEditBtn, editPlaylistBtnModalAction);

            newEditBtn.addEventListener('click', () => {
                console.log(`account.js: showPlaylistDetails - Botón "Editar" playlist ID: ${playlist.id} clickeado.`);
                bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'))?.hide(); // Cerrar modal actual.
                openEditPlaylistModal(playlist); // Abrir el modal de edición de playlist.
            });
        } else {
             console.warn("account.js: showPlaylistDetails - Botón 'editPlaylistBtnModal' no encontrado en el modal.");
        }
        
        // Botón "Eliminar" la playlist.
        if (deletePlaylistBtnModalAction) {
            const newDeleteBtn = deletePlaylistBtnModalAction.cloneNode(true);
            deletePlaylistBtnModalAction.parentNode.replaceChild(newDeleteBtn, deletePlaylistBtnModalAction);

            newDeleteBtn.addEventListener('click', async () => {
                console.log(`account.js: showPlaylistDetails - Botón "Eliminar" playlist ID: ${playlist.id} clickeado.`);
                if (confirm(`¿Estás seguro de que quieres eliminar la playlist "${playlist.name}"? Esta acción no se puede deshacer.`)) {
                    try {
                        showLoading(true);
                        if (window.PlaylistManager && typeof window.PlaylistManager.deletePlaylist === 'function') {
                            await window.PlaylistManager.deletePlaylist(playlist.id);
                            // PlaylistManager debería disparar un evento que `updatePlaylistsAfterChange` maneja,
                            // actualizando `userPlaylists` y la UI de la lista principal.
                        } else { 
                            console.warn("account.js: showPlaylistDetails - PlaylistManager.deletePlaylist no disponible. Implementar fallback si es necesario.");
                            // Fallback para eliminar directamente (más complejo de mantener sincronizado).
                        }
                        showToast('Playlist eliminada correctamente.', 'success');
                        bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'))?.hide(); // Cerrar modal.
                    } catch(error) { 
                        console.error("account.js: showPlaylistDetails - Error al eliminar la playlist:", error); 
                        showToast('Error al eliminar la playlist. Inténtalo de nuevo.', 'error');
                    } finally {
                        showLoading(false);
                    }
                }
            });
        } else {
            console.warn("account.js: showPlaylistDetails - Botón 'deletePlaylistBtnModal' no encontrado en el modal.");
        }
        
        // Mostrar el modal.
        const modalElement = document.getElementById('playlistDetailModal');
        if (modalElement) {
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (!modalInstance) { // Si no hay instancia, crear una nueva.
                modalInstance = new bootstrap.Modal(modalElement);
            }
            modalInstance.show(); // Mostrar el modal.
        } else {
            console.error("account.js: showPlaylistDetails - Elemento modal 'playlistDetailModal' no encontrado en el DOM.");
        }
    }
    //===================================================================
    // --- SECCIÓN DE FUNCIONES PARA EDICIÓN DE PERFIL Y PLAYLIST (MODALES) ---
    // Funciones dedicadas a manejar la apertura de modales para editar
    // el perfil del usuario y los detalles de sus playlists, así como
    // para guardar los cambios realizados en dichos modales.
    //===================================================================

    /**
     * Abre el modal para que el usuario pueda editar su perfil.
     * Carga los datos actuales del usuario (nombre, URL de foto, biografía) en el formulario del modal.
     * Se asume que el HTML del modal `editProfileModal` y sus campos de formulario existen.
     */
    function openEditProfileModal() {
        if (!currentUser) { // Verificar que haya un usuario cargado.
            showToast('No hay información de usuario cargada para editar el perfil.', 'error');
            console.warn("account.js: openEditProfileModal - Se intentó abrir sin `currentUser`.");
            return;
        }
        console.log("account.js: openEditProfileModal - Abriendo modal para editar perfil.");

        // Obtener referencias a los campos del formulario dentro del modal `editProfileModal`.
        // Estos IDs deben coincidir con los del HTML que añadiste para este modal.
        const nameInput = document.getElementById('editProfileNameInput');
        const photoURLInput = document.getElementById('editProfilePhotoURLInput');
        const bioInput = document.getElementById('editProfileBioInput');

        if (!nameInput || !photoURLInput || !bioInput) {
            console.error('account.js: openEditProfileModal - Uno o más elementos del formulario de edición de perfil no fueron encontrados en el DOM.');
            showToast('Error al intentar abrir el editor de perfil. Elementos no encontrados.', 'error');
            return;
        }

        // Llenar los campos del formulario con los datos actuales del usuario.
        nameInput.value = currentUser.displayName || '';
        photoURLInput.value = currentUser.photoURL || '';
        // La biografía se asume que está en `currentUser.profileInfo.bio`.
        bioInput.value = currentUser.profileInfo && currentUser.profileInfo.bio ? currentUser.profileInfo.bio : '';
        
        // Mostrar el modal de edición de perfil.
        const modalElement = document.getElementById('editProfileModal');
        if (modalElement) {
            // Asegurar que se obtiene o crea una nueva instancia de Modal de Bootstrap.
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (!modalInstance) {
                modalInstance = new bootstrap.Modal(modalElement);
            }
            modalInstance.show();
        } else {
            console.error('account.js: openEditProfileModal - Elemento modal "editProfileModal" no encontrado en el DOM.');
        }
    }

    /**
     * Guarda los cambios realizados en el perfil del usuario desde el modal de edición.
     * Actualiza los datos en Firebase Authentication (displayName, photoURL)
     * y en Firebase Realtime Database (para la biografía).
     * Luego, refresca la UI del perfil.
     */
    async function saveProfileChanges() {
        if (!currentUser || !firebase.auth().currentUser) { // Doble verificación de autenticación.
            showToast('No estás autenticado. No se pueden guardar los cambios del perfil.', 'error');
            console.warn("account.js: saveProfileChanges - Intento de guardar sin usuario autenticado.");
            return;
        }
        console.log("account.js: saveProfileChanges - Guardando cambios del perfil...");

        // Obtener referencias a los campos del formulario (IDs del modal `editProfileModal`).
        const nameInput = document.getElementById('editProfileNameInput');
        const photoURLInput = document.getElementById('editProfilePhotoURLInput');
        const bioInput = document.getElementById('editProfileBioInput');

        if (!nameInput || !photoURLInput || !bioInput) {
            console.error('account.js: saveProfileChanges - Elementos del formulario no encontrados al intentar guardar.');
            showToast('Error interno al guardar el perfil. Elementos no encontrados.', 'error');
            return;
        }

        // Obtener los nuevos valores del formulario.
        const newDisplayName = nameInput.value.trim();
        const newPhotoURL = photoURLInput.value.trim(); // URL de la imagen.
        const newBio = bioInput.value.trim();

        if (!newDisplayName) { // Validar que el nombre de usuario no esté vacío.
            showToast('El nombre de usuario no puede estar vacío.', 'warning');
            return;
        }

        showLoading(true); // Mostrar indicador de carga.
        try {
            const userAuth = firebase.auth().currentUser; // Referencia al usuario de Firebase Auth.
            
            // Actualizar el perfil en Firebase Authentication (nombre y foto).
            // Solo llamar a `updateProfile` si hay cambios para evitar operaciones innecesarias.
            if (newDisplayName !== (userAuth.displayName || '') || newPhotoURL !== (userAuth.photoURL || '')) {
                await userAuth.updateProfile({
                    displayName: newDisplayName,
                    photoURL: newPhotoURL || null // Enviar `null` si el campo está vacío para limpiar la foto.
                });
                console.log('account.js: saveProfileChanges - Perfil de Firebase Auth actualizado (displayName/photoURL).');
                // Actualizar el objeto `currentUser` local con los nuevos datos de Auth.
                currentUser.displayName = newDisplayName;
                currentUser.photoURL = newPhotoURL || null;
            }

            // Actualizar la biografía en Firebase Realtime Database.
            // Se asume que la biografía se guarda en `users/{uid}/profileInfo/bio`.
            const currentBioInCache = currentUser.profileInfo && currentUser.profileInfo.bio ? currentUser.profileInfo.bio : '';
            if (newBio !== currentBioInCache) { // Solo actualizar si la biografía cambió.
                 await firebase.database().ref(`users/${userAuth.uid}/profileInfo/bio`).set(newBio || null); // Guardar `null` si está vacía para borrarla.
                 console.log('account.js: saveProfileChanges - Biografía actualizada en Realtime Database.');
                 // Actualizar la biografía en el objeto `currentUser` local.
                 if (!currentUser.profileInfo) currentUser.profileInfo = {}; // Asegurar que `profileInfo` exista.
                 currentUser.profileInfo.bio = newBio || null;
            }
            
            updateUserProfile(currentUser); // Refrescar la UI del perfil en la página.

            // Cerrar el modal de edición de perfil.
            const modalElement = document.getElementById('editProfileModal');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
            }
            showToast('Perfil actualizado con éxito.', 'success');

        } catch (error) {
            console.error('account.js: saveProfileChanges - Error al actualizar el perfil:', error);
            showToast(`Error al actualizar el perfil: ${error.message}`, 'error');
        } finally {
            showLoading(false); // Ocultar indicador de carga.
        }
    }

    /**
     * Abre el modal para editar los detalles de una playlist existente.
     * Carga los datos actuales de la playlist (nombre, descripción, visibilidad) en el formulario.
     * @param {Object} playlist - El objeto de la playlist que se va a editar.
     */
    function openEditPlaylistModal(playlist) {
        if (!playlist || !playlist.id) { // Validar que se proporcionó una playlist válida.
            showToast('No se puede editar la playlist. Datos no válidos.', 'error');
            console.warn("account.js: openEditPlaylistModal - Se intentó abrir sin una playlist válida o ID.");
            return;
        }
        console.log(`account.js: openEditPlaylistModal - Abriendo modal para editar playlist: "${playlist.name}"`);

        // Obtener referencias a los campos del formulario (IDs del modal `editPlaylistModal`).
        const idInput = document.getElementById('editingPlaylistIdInput'); // Campo oculto para el ID.
        const nameInput = document.getElementById('editPlaylistNameInput');
        const descriptionInput = document.getElementById('editPlaylistDescriptionInput');
        const publicInput = document.getElementById('editPlaylistPublicInput'); // Checkbox de visibilidad.

        if (!idInput || !nameInput || !descriptionInput || !publicInput) {
            console.error('account.js: openEditPlaylistModal - Elementos del formulario de edición de playlist no encontrados.');
            showToast('Error al abrir el editor de playlist. Elementos no encontrados.', 'error');
            return;
        }
        
        // Llenar el formulario con los datos actuales de la playlist.
        idInput.value = playlist.id; // Guardar el ID en el campo oculto.
        nameInput.value = playlist.name;
        descriptionInput.value = playlist.description || ''; // Si no hay descripción, campo vacío.
        publicInput.checked = playlist.public || false; // Estado del checkbox de pública/privada.

        // Mostrar el modal de edición de playlist.
        const modalElement = document.getElementById('editPlaylistModal');
        if (modalElement) {
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (!modalInstance) modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();
        } else {
            console.error('account.js: openEditPlaylistModal - Elemento modal "editPlaylistModal" no encontrado.');
        }
    }

    /**
     * Guarda los cambios realizados en los detalles de una playlist desde el modal de edición.
     * Utiliza `PlaylistManager` si está disponible, o actualiza directamente en Firebase como fallback.
     */
    async function savePlaylistChanges() {
        if (!currentUser) { // Verificar autenticación.
            showToast('No estás autenticado. No se pueden guardar los cambios de la playlist.', 'error');
            console.warn("account.js: savePlaylistChanges - Intento de guardar sin usuario autenticado.");
            return;
        }
        console.log("account.js: savePlaylistChanges - Guardando cambios de la playlist...");
        
        // Obtener referencias a los campos del formulario (IDs del modal `editPlaylistModal`).
        const playlistIdInput = document.getElementById('editingPlaylistIdInput');
        const nameInput = document.getElementById('editPlaylistNameInput');
        const descriptionInput = document.getElementById('editPlaylistDescriptionInput');
        const publicInput = document.getElementById('editPlaylistPublicInput');

        if (!playlistIdInput || !nameInput || !descriptionInput || !publicInput) {
            console.error('account.js: savePlaylistChanges - Elementos del formulario no encontrados al guardar cambios de playlist.');
            showToast('Error interno al guardar la playlist. Elementos no encontrados.', 'error');
            return;
        }

        // Obtener los nuevos valores del formulario.
        const playlistId = playlistIdInput.value;
        const newName = nameInput.value.trim();
        const newDescription = descriptionInput.value.trim();
        const newIsPublic = publicInput.checked;

        if (!newName) { // Validar que el nombre no esté vacío.
            showToast('El nombre de la playlist no puede estar vacío.', 'warning');
            return;
        }
        if (!playlistId) { // Validar que haya un ID de playlist.
            showToast('ID de playlist no encontrado. No se pueden guardar los cambios.', 'error');
            console.error("account.js: savePlaylistChanges - No se encontró playlistId en el input oculto.");
            return;
        }

        showLoading(true); // Mostrar indicador de carga.
        try {
            // Objeto con los datos actualizados para la playlist.
            // `updated_at` se actualiza para reflejar el cambio.
            // Campos como `owner`, `created_at`, y `songs` no se modifican aquí directamente.
            const updatedData = {
                name: newName,
                description: newDescription,
                public: newIsPublic,
                updated_at: Date.now() // Timestamp de la actualización.
            };

            if (window.PlaylistManager && typeof window.PlaylistManager.updatePlaylist === 'function') {
                // Usar PlaylistManager para actualizar la playlist.
                // PlaylistManager debería disparar un evento que `updatePlaylistsAfterChange` maneja para actualizar la UI.
                await window.PlaylistManager.updatePlaylist(playlistId, updatedData);
                console.log(`account.js: savePlaylistChanges - Playlist ID ${playlistId} actualizada vía PlaylistManager.`);
            } else {
                // Fallback: Actualización directa en Firebase si PlaylistManager no está disponible.
                console.warn("account.js: savePlaylistChanges - PlaylistManager no funcional, usando fallback a Firebase DB.");
                if(!firebase.auth().currentUser) throw new Error("Usuario no autenticado para fallback de guardar playlist.");
                const uid = firebase.auth().currentUser.uid;
                await firebase.database().ref(`users/${uid}/playlists/${playlistId}`).update(updatedData);
                
                // Actualizar la caché local `userPlaylists` manualmente.
                const playlistIndex = userPlaylists.findIndex(p => p.id === playlistId);
                if (playlistIndex !== -1) {
                    userPlaylists[playlistIndex] = { ...userPlaylists[playlistIndex], ...updatedData };
                }
                updatePlaylistsUI(); // Refrescar la lista de playlists en la UI.
                updateUserStats();   // Refrescar estadísticas si es necesario (ej. si cambia el número de canciones).
            }
            
            // Cerrar el modal de edición de playlist.
            const modalElement = document.getElementById('editPlaylistModal');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
            }
            showToast('Playlist actualizada con éxito.', 'success');

        } catch (error) {
            console.error('account.js: savePlaylistChanges - Error al actualizar la playlist:', error);
            showToast(`Error al actualizar la playlist: ${error.message}`, 'error');
        } finally {
            showLoading(false); // Ocultar indicador de carga.
        }
    }
    
    //===================================================================
    // --- SECCIÓN DE FUNCIONES DE UTILIDAD ---
    // Colección de funciones auxiliares utilizadas a lo largo del script
    // para tareas comunes como formateo de tiempo, generación de hashes,
    // manejo de arrays, y feedback visual al usuario (loading, toasts).
    //===================================================================

    /**
     * Formatea un tiempo dado en segundos al formato "MM:SS" (minutos:segundos).
     * @param {number} seconds - El tiempo total en segundos.
     * @return {string} Una cadena con el tiempo formateado, ej. "3:45".
     *                  Devuelve "0:00" si la entrada no es válida.
     */
    function formatTime(seconds) { 
        // Validar la entrada: asegurarse de que sea un número y no negativo.
        if (seconds == null || isNaN(seconds) || seconds < 0) {
            // console.warn("account.js: formatTime - Se recibió un valor de segundos inválido:", seconds);
            return '0:00'; 
        }
        
        const minutes = Math.floor(seconds / 60); // Calcular minutos completos.
        const remainingSeconds = Math.floor(seconds % 60); // Calcular segundos restantes.
        
        // Formatear los segundos para que siempre tengan dos dígitos (ej. "05" en lugar de "5").
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    /**
     * Calcula y formatea el tiempo transcurrido desde un timestamp dado hasta ahora.
     * Devuelve una cadena legible como "hace 5 minutos", "hace 2 horas", "hace 3 días",
     * o la fecha completa si es más de una semana.
     * @param {number} timestamp - Marca de tiempo en milisegundos (como de `Date.now()` o Firebase Timestamp).
     * @return {string} Una cadena que describe el tiempo relativo transcurrido.
     */
    function getTimeAgo(timestamp) { 
        if (!timestamp) { // Si no se proporciona timestamp.
            return 'fecha desconocida';
        }
        
        const now = Date.now(); // Tiempo actual en milisegundos.
        const diff = now - timestamp; // Diferencia en milisegundos.
        
        // Convertir diferencia a unidades de tiempo.
        const seconds = Math.floor(diff / 1000);
        if (seconds < 5) return 'justo ahora'; // Para cambios muy recientes.
        if (seconds < 60) return `hace ${seconds} segundos`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;

        // Si ha pasado más de una semana, mostrar la fecha completa en formato local.
        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    /**
     * Genera un valor hash numérico simple para una cadena dada.
     * Útil para generar colores consistentes basados en texto (ej. para avatares sin imagen).
     * No es un hash criptográficamente seguro.
     * @param {string} str - La cadena de entrada para la cual generar el hash.
     * @return {number} Un valor numérico entero de 32 bits representando el hash.
     */
    function hashCode(str) { 
        let hash = 0;
        if (!str || str.length === 0) return hash; // Manejar cadena vacía o nula.
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i); // Obtener código ASCII del caracter.
            hash = ((hash << 5) - hash) + char; // Algoritmo de hash simple (djb2 modificado).
            hash |= 0; // Convertir a un entero de 32 bits (operación OR a nivel de bits con 0).
        }
        return hash;
    }
    
    /**
     * Mezcla (baraja) un array aleatoriamente en el lugar usando el algoritmo Fisher-Yates.
     * Modifica el array original.
     * @param {Array} array - El array que se va a mezclar.
     * @return {Array} El mismo array, ahora mezclado. Devuelve array vacío si la entrada es nula.
     */
    function shuffleArray(array) { 
        if (!array) return []; // Manejar array nulo para evitar errores.
        // Recorrer el array desde el final hacia el principio.
        for (let i = array.length - 1; i > 0; i--) {
            // Elegir un índice aleatorio `j` entre 0 e `i` (inclusive).
            const j = Math.floor(Math.random() * (i + 1));
            // Intercambiar el elemento en `i` con el elemento en `j`.
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array; // Devolver el array modificado.
    }
    
    /**
     * Muestra u oculta un overlay de carga en la página.
     * Se asume que existe un elemento con ID `loadingOverlay` en el HTML.
     * @param {boolean} show - `true` para mostrar el overlay, `false` para ocultarlo.
     */
    function showLoading(show) { 
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.style.display = 'flex'; // Asegurar que sea visible si estaba `display: none`.
                // Pequeño delay para permitir que la transición CSS se aplique correctamente al añadir la clase.
                setTimeout(() => loadingOverlay.classList.add('show'), 10); 
            } else {
                loadingOverlay.classList.remove('show');
                // Esperar a que termine la transición de opacidad antes de ocultar con `display:none`,
                // de lo contrario, el fade-out no será visible.
                // El tiempo debe coincidir con la duración de la transición CSS en la clase `loading-overlay`.
                setTimeout(() => {
                    // Doble verificación por si la clase 'show' se añadió de nuevo en este intervalo.
                    if (!loadingOverlay.classList.contains('show')) { 
                         loadingOverlay.style.display = 'none';
                    }
                }, 300); // Asumiendo una transición de 0.3s (300ms). Ajustar si es diferente.
            }
        } else {
            console.warn("account.js: showLoading - Elemento 'loadingOverlay' no encontrado en el DOM.");
        }
    }
    
    /**
     * Muestra un mensaje de notificación (toast) temporal en la pantalla.
     * Los toasts se añaden a un contenedor (`toastContainer`) o se crea uno si no existe.
     * @param {string} message - El mensaje a mostrar en el toast.
     * @param {string} [type='success'] - Tipo de toast ('success', 'error', 'warning', 'info'), afecta el color y el icono.
     */
    function showToast(message, type = 'success') { 
        // Obtener o crear el contenedor principal para los toasts.
        // Esto permite apilar múltiples toasts si se muestran rápidamente.
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        if (!toastContainer) { // Si ni siquiera se pudo crear el contenedor.
            console.error("account.js: showToast - No se pudo obtener o crear toastContainer.");
            return;
        }

        const toast = document.createElement('div');
        // Clases para estilizado general y específico del tipo.
        toast.className = `toastify-toast app-toast ${type}`; 
        
        // Determinar color de fondo e icono según el tipo de toast.
        let backgroundColor;
        let iconClass;
        switch (type) {
            case 'success':
                backgroundColor = 'var(--bs-success, #28a745)'; // Usar variable CSS de Bootstrap si está definida, sino color por defecto.
                iconClass = 'fas fa-check-circle';
                break;
            case 'error':
                backgroundColor = 'var(--bs-danger, #dc3545)';
                iconClass = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                backgroundColor = 'var(--bs-warning, #ffc107)';
                iconClass = 'fas fa-exclamation-triangle';
                break;
            case 'info':
            default: // 'info' o cualquier otro tipo no reconocido.
                backgroundColor = 'var(--bs-info, #17a2b8)';
                iconClass = 'fas fa-info-circle';
                break;
        }
        
        // Estilos en línea para el toast. Es mejor definir la mayoría de estos en CSS usando las clases.
        toast.style.cssText = `
            background: ${backgroundColor};
            color: white;
            padding: 12px 20px;
            border-radius: 0.375rem; /* Radio de borde similar a Bootstrap. */
            box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.15); /* Sombra sutil. */
            display: flex;
            align-items: center;
            gap: 10px; /* Espacio entre icono y texto. */
            margin-bottom: 10px; /* Espacio entre toasts si se apilan. */
            opacity: 0;
            transform: translateX(110%); /* Empezar fuera de la pantalla a la derecha. */
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
            max-width: 350px; 
            word-wrap: break-word; /* Para mensajes largos. */
        `;
        
        toast.innerHTML = `
            <i class="${iconClass}" style="font-size: 1.2em; flex-shrink: 0;"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast); // Añadir el toast al contenedor.
        
        // Animar la entrada del toast.
        // Usar un pequeño `setTimeout` para asegurar que la transición se aplique después de añadir al DOM.
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10); 
        
        // Configurar la eliminación automática del toast después de un tiempo.
        // Los toasts de error duran un poco más.
        const duration = type === 'error' ? 5000 : 3000; // 5s para errores, 3s para otros.
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(110%)'; // Animar salida.
            // Eliminar el elemento del DOM después de que la animación de salida complete.
            setTimeout(() => {
                toast.remove();
                if (toastContainer.children.length === 0 && toastContainer.id === 'toastContainer') {
                }
            }, 300); // Tiempo para la animación de salida (debe coincidir con la transición).
        }, duration);
    }

    /**
     * Crea y añade el contenedor de toasts al DOM si no existe.
     * El contenedor se posiciona en la esquina inferior derecha por defecto.
     * @return {HTMLElement|null} El elemento contenedor de toasts, o null si falla.
     */
    function createToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) { // Si no existe, crearlo.
            container = document.createElement('div');
            container.id = 'toastContainer'; // ID para referenciarlo.
            // Estilos para posicionar el contenedor.
            container.style.cssText = `
                position: fixed;
                bottom: 20px; 
                right: 20px;
                z-index: 10000; /* Asegurar que esté por encima de otros elementos. */
                display: flex;
                flex-direction: column; /* Apilar toasts verticalmente. */
                align-items: flex-end; /* Alinearlos a la derecha dentro del contenedor. */
            `;
            try {
                document.body.appendChild(container);
            } catch (error) {
                console.error("account.js: createToastContainer - Error al añadir toastContainer al body:", error);
                return null; // Devolver null si falla.
            }
        }
        return container;
    }
    
    /**
     * Cierra la sesión del usuario actual.
     * Detiene la reproducción de música, llama a `firebase.auth().signOut()`,
     * limpia los datos locales y redirige a la página de login.
     */
    function logout() {
        console.log("account.js: logout - Cerrando sesión del usuario...");
        stopPlayback(); // Detener cualquier música que esté sonando.
        
        // Capturar el UID antes de que `currentUser` se anule, para limpiar localStorage específico.
        const uid_before_logout = currentUser ? currentUser.uid : null; 
        
        firebase.auth().signOut()
            .then(() => {
                console.log('account.js: logout - Usuario desconectado de Firebase correctamente.');
                // Limpiar todos los datos de estado locales relacionados con el usuario.
                currentUser = null; 
                likedSongs = {}; 
                recentlyPlayed = []; 
                userPlaylists = []; 
                followedArtists = [];
                currentPlayingTrack = null; 
                currentPlaylist = []; 
                currentTrackIndex = -1;
                
                // Limpiar preferencias del reproductor de localStorage.
                if (uid_before_logout) { 
                    localStorage.removeItem(`player_preferences_${uid_before_logout}`);
                    console.log(`account.js: logout - Preferencias del reproductor para UID ${uid_before_logout} eliminadas de localStorage.`);
                } else { 
                    // Fallback si no se pudo obtener el UID (raro si currentUser estaba definido).
                    localStorage.removeItem('player_preferences'); 
                    console.warn("account.js: logout - No se pudo obtener UID para limpiar preferencias específicas, intentando clave genérica.");
                }
                
                // Redirigir a la página de login.
                // Asegurarse de que solo se redirige si estamos en una página que requiere autenticación
                // para evitar redirigir desde login.html a login.html.
                if (window.location.pathname.includes('account.html')) {
                     window.location.href = 'login.html';
                } else {
                    // Si estamos en otra página, podría ser suficiente con actualizar la UI
                    // mediante el listener de onAuthStateChanged en common-auth.js.
                    // Pero por consistencia, redirigir si es una página claramente de usuario.
                    console.log("account.js: logout - Sesión cerrada. La página actual no es account.html, no se redirige automáticamente a login.");
                }
            })
            .catch(error => { 
                console.error('account.js: logout - Error al cerrar sesión en Firebase:', error); 
                showToast('Ocurrió un error al intentar cerrar sesión.', 'error'); 
            });
    }

    //===================================================================
    // --- SECCIÓN DE EFECTOS VISUALES ---
    // Funciones dedicadas a inicializar y gestionar los efectos visuales
    // decorativos de la página de cuenta, como notas musicales flotantes,
    // efectos de hover en elementos interactivos y animación de contadores.
    //===================================================================
    
    /**
     * Inicializa los diferentes efectos visuales y decorativos en la página de cuenta.
     * Llama a funciones específicas para crear notas flotantes y añadir efectos de hover.
     * Se ejecuta una vez al inicio de `startAccountSystem`.
     */
    function initializeEffects() {
        console.log('account.js: initializeEffects - Inicializando efectos visuales...');
        // Crear y animar las notas musicales decorativas que flotan en el fondo.
        createFloatingNotes();
        
        // Añadir efectos de hover (ej. elevación, sombra) a elementos interactivos como las cajas de estadísticas.
        addHoverEffects();
        
        // La animación de contadores (`animateCounters`) se llama generalmente después de que los datos
        // de las estadísticas se cargan y actualizan en la UI (dentro de `updateUserStats`).
        console.log('account.js: initializeEffects - Efectos visuales (notas, hovers) configurados.');
    }
    
    /**
     * Crea y añade al DOM notas musicales decorativas que flotan animadamente en el fondo.
     * Las notas se añaden al elemento con clase `.notes-container`.
     * Se utilizan variables CSS para controlar aspectos de la animación (delay, duración)
     * que deben estar definidas en el archivo CSS correspondiente (ej. `animaciones.css` o `account.css`).
     */
    function createFloatingNotes() {
        // Seleccionar el contenedor donde se añadirán las notas flotantes.
        // Este selector debe coincidir con el de tu `account.html`.
        const notesContainer = document.querySelector('.notes-container'); 
        if (!notesContainer) {
            // Si no se encuentra el contenedor, no se pueden crear las notas.
            console.warn("account.js: createFloatingNotes - Contenedor de notas flotantes (clase '.notes-container') no encontrado en el DOM.");
            return;
        }
        console.log("account.js: createFloatingNotes - Creando notas flotantes...");
        
        // Array de caracteres de notas musicales y símbolos relacionados para variedad visual.
        const notesSymbols = ['♪', '♫', '𝅘𝅥𝅮', '𝅘𝅥', '𝅘𝅥𝅯', '𝅗𝅥', '𝄞', '♩', '𝆕', '𝆖', '𝆗', '𝆘'];
        // Determinar dinámicamente el número de notas a crear, basado en el ancho de la ventana (opcional).
        // Esto ayuda a que el efecto no sea ni muy denso ni muy escaso en diferentes tamaños de pantalla.
        const noteCount = Math.min(20, Math.floor(window.innerWidth / 100)); // Máximo 20 notas, o 1 por cada 100px de ancho.
        
        notesContainer.innerHTML = ''; // Limpiar notas existentes si la función se llama múltiples veces.
        
        // Generar y añadir cada nota al contenedor.
        for (let i = 0; i < noteCount; i++) {
            const noteElement = document.createElement('div');
            noteElement.className = 'floating-note'; // Clase CSS para estilos base y animación 'flotarNota'.
            // Elegir un símbolo de nota aleatorio del array.
            noteElement.innerHTML = notesSymbols[Math.floor(Math.random() * notesSymbols.length)];
            
            // Establecer propiedades aleatorias para cada nota para variar su apariencia y animación.
            // Posición inicial aleatoria dentro del contenedor.
            noteElement.style.left = `${Math.random() * 100}%`;
            noteElement.style.top = `${Math.random() * 100}%`; 
            // Variables CSS para controlar la animación desde el CSS (más flexible).
            // `animation-delay` y `animation-duration` se usarían en la definición de la animación 'flotarNota'.
            noteElement.style.setProperty('--animation-delay', `${Math.random() * 10}s`); 
            noteElement.style.setProperty('--animation-duration', `${15 + Math.random() * 20}s`); 
            // Opacidad y tamaño de fuente aleatorios.
            noteElement.style.opacity = (0.05 + Math.random() * 0.25).toFixed(2); // Opacidad sutil.
            noteElement.style.fontSize = `${0.7 + Math.random() * 1.3}rem`; // Tamaño variado.
            
            // Asegurar que la animación 'flotarNota' esté definida en el archivo CSS.
            // Ejemplo de animación CSS (en `animaciones.css` o `account.css`):
            // @keyframes flotarNota { 
            //    0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); } 
            //    25% { transform: translateY(-25px) translateX(15px) rotate(10deg); } 
            //    50% { transform: translateY(0px) translateX(-20px) rotate(-5deg); }
            //    75% { transform: translateY(20px) translateX(10px) rotate(8deg); }
            // }
            // .floating-note { 
            //    position: absolute; /* Necesario para `left` y `top`. */
            //    pointer-events: none; /* Para que no interfieran con clics. */
            //    color: var(--acento-actual, #1DB954); /* Usar variable CSS para el color. */
            //    animation-name: flotarNota;
            //    animation-timing-function: linear;
            //    animation-iteration-count: infinite;
            //    animation-duration: var(--animation-duration);
            //    animation-delay: var(--animation-delay);
            // }
            
            notesContainer.appendChild(noteElement); // Añadir la nota al DOM.
        }
        console.log(`account.js: createFloatingNotes - ${noteCount} notas flotantes creadas.`);
    }
    
    /**
     * Agrega efectos de hover a elementos interactivos de la página,
     * como las cajas de estadísticas, para mejorar la retroalimentación visual.
     * Es preferible manejar estos efectos con CSS (:hover) si es posible,
     * pero JavaScript puede usarse para efectos más complejos o para asegurar consistencia.
     */
    function addHoverEffects() {
        console.log("account.js: addHoverEffects - Añadiendo efectos de hover...");
        // Efectos para las cajas de estadísticas (elementos con clase 'stat-box').
        const statBoxes = document.querySelectorAll('.stat-box');
        statBoxes.forEach(box => {
            // Añadir transición CSS mediante JavaScript para asegurar suavidad si no está en CSS.
            // Es mejor definir `transition` directamente en la clase CSS `.stat-box`.
            box.style.transition = 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out';
            
            box.addEventListener('mouseenter', () => {
                // Al pasar el mouse: elevar ligeramente la caja y aumentar la sombra.
                box.style.transform = 'translateY(-6px) scale(1.03)';
                box.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)'; // Sombra más pronunciada.
            });
            
            box.addEventListener('mouseleave', () => {
                // Al quitar el mouse: restaurar la posición y sombra originales.
                box.style.transform = 'translateY(0) scale(1)';
                // Usar una variable CSS para la sombra por defecto si está definida, o un valor fallback.
                box.style.boxShadow = 'var(--card-shadow, 0 6px 15px rgba(0,0,0,0.2))'; 
            });
        });
        // Se podrían añadir efectos similares a otros elementos interactivos (botones, items de lista, etc.)
        // si se desea un comportamiento de hover más dinámico que el que ofrece solo CSS.
        console.log("account.js: addHoverEffects - Efectos de hover configurados para cajas de estadísticas.");
    }
    
    /**
     * Anima los contadores de estadísticas desde 0 hasta su valor final.
     * Esta función se llama típicamente después de que los datos se cargan (`updateUserStats`).
     * Busca elementos con la clase `stat-number`.
     */
    function animateCounters() {
        console.log("account.js: animateCounters - Animando contadores de estadísticas...");
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(statNumberElement => {
            const targetValue = parseInt(statNumberElement.textContent, 10); // Obtener valor final del texto.
            
            // Solo animar si el valor es un número válido y mayor que 0.
            if (!isNaN(targetValue) && targetValue >= 0) {
                statNumberElement.textContent = '0'; // Empezar la animación desde 0.
                let currentValue = 0;
                const animationDuration = 1200; // Duración total de la animación en milisegundos.
                const animationSteps = 60;      // Número de "frames" o pasos en la animación.
                // Calcular cuánto debe incrementar el contador en cada paso.
                // Si targetValue es 0, el incremento será 0 y se quedará en 0.
                const increment = targetValue > 0 ? (targetValue / animationSteps) : 0;
                const intervalTime = animationDuration / animationSteps; // Tiempo entre cada paso.
                
                let stepCount = 0;
                const counterInterval = setInterval(() => {
                    currentValue += increment;
                    stepCount++;
                    
                    // Si se alcanza el valor objetivo o el número de pasos, detener la animación.
                    if (currentValue >= targetValue || stepCount >= animationSteps) {
                        clearInterval(counterInterval);
                        statNumberElement.textContent = targetValue; // Asegurar que se muestra el valor final exacto.
                    } else {
                        statNumberElement.textContent = Math.floor(currentValue); // Mostrar valor redondeado durante la animación.
                    }
                }, intervalTime);
            } else if (!isNaN(targetValue) && targetValue < 0) {
                 // Si el valor es negativo, simplemente mostrarlo sin animación.
                statNumberElement.textContent = targetValue;
            }
        });
        console.log("account.js: animateCounters - Animación de contadores iniciada.");
    }

    //===================================================================
} // Cierre de startAccountSystem

// Punto de entrada: Iniciar el proceso cuando el script se carga, 
// esperando a que Firebase esté completamente inicializado.
waitForFirebaseAndInitialize();