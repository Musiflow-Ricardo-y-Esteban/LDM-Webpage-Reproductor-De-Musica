// account.js - Sistema completo para gestión de cuentas de usuario en MusiFlow

/**
 * FUNCIÓN PRINCIPAL: Este script gestiona todas las funcionalidades de la cuenta de usuario 
 * en MusiFlow, incluyendo la visualización de datos del perfil, historial de reproducción, 
 * canciones favoritas, playlists y preferencias de usuario.
 */

let accountSystemInitialized = false;

function waitForFirebaseAndInitialize() {
    if (typeof firebase !== 'undefined' && 
        typeof firebase.app === 'function' && 
        firebase.apps && firebase.apps.length > 0 && 
        firebase.auth && 
        firebase.database) {
        
        console.log("account.js: Firebase está listo. Procediendo a inicializar el sistema de cuenta.");
        initializeAccountSystem();
    } else {
        let firebaseStatus = "Firebase no definido.";
        if (typeof firebase !== 'undefined') {
            firebaseStatus = `firebase definido. app: ${typeof firebase.app}, apps.length: ${firebase.apps ? firebase.apps.length : 'N/A'}, auth: ${!!firebase.auth}, database: ${!!firebase.database}`;
        }
        console.log(`account.js: Esperando a Firebase... Estado actual: ${firebaseStatus}`);
        setTimeout(waitForFirebaseAndInitialize, 250); 
    }
}

function initializeAccountSystem() {
    if (accountSystemInitialized) {
        console.log("account.js: El sistema de cuenta ya ha sido inicializado. Omitiendo.");
        return;
    }
    accountSystemInitialized = true;
    console.log("account.js: Iniciando el sistema de cuenta (initializeAccountSystem)...");

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startAccountSystem);
    } else {
        startAccountSystem(); 
    }
}

function startAccountSystem() {
    console.log("account.js: DOM cargado, ejecutando startAccountSystem...");
    if (typeof AOS !== 'undefined' && typeof AOS.init === 'function') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true 
        });
    }

    const profileNameElement = document.getElementById('profileName');
    const profileEmailElement = document.getElementById('profileEmail');
    const profileAvatarElement = document.getElementById('profileAvatar');
    const memberSinceElement = document.getElementById('memberSince');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    const likedSongsCountElement = document.getElementById('likedSongsCount');
    const playlistsCountElement = document.getElementById('playlistsCount');
    const followedArtistsCountElement = document.getElementById('followedArtistsCount');
    
    const likedSongsListElement = document.getElementById('likedSongsList');
    const recentlyPlayedListElement = document.getElementById('recentlyPlayedList');
    const userPlaylistsListElement = document.getElementById('userPlaylistsList');
    
    const playAllLikedBtn = document.getElementById('playAllLikedBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const savePlaylistBtn = document.getElementById('savePlaylistBtn');
    
    const currentPlayer = document.getElementById('currentPlayer');
    const currentTrackImage = document.getElementById('currentTrackImage');
    const currentTrackName = document.getElementById('currentTrackName');
    const currentTrackArtist = document.getElementById('currentTrackArtist');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const loopBtn = document.getElementById('loopBtn');
    const progressBar = document.getElementById('progressBar');
    const currentTimeDisplay = document.getElementById('currentTime');
    const totalTimeDisplay = document.getElementById('totalTime');
    const volumeControl = document.getElementById('volumeControl');
    
    let currentUser = null;
    let likedSongs = {};
    let recentlyPlayed = [];
    let userPlaylists = [];
    let followedArtists = [];
    
    let audioPlayer = null;
    let currentPlayingTrack = null;
    let isPlaying = false;
    let currentPlaylist = [];
    let currentTrackIndex = -1;
    let isShuffleMode = false;
    let isLoopMode = false;
    let progressInterval = null;
    let currentPlaylistId = null;
    let selectedSongForPlaylist = null;
    
    initializeEffects();
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log("account.js: Usuario autenticado detectado por onAuthStateChanged. UID:", user.uid);
            await initializeUserData(user);

            // Configurar listeners de managers DESPUÉS de que initializeUserData (y por ende initializeManagementSystems) se complete.
            if (window.PlaylistManager && typeof window.PlaylistManager.addPlaylistChangeListener === 'function') {
                console.log("account.js: Configurando listener para PlaylistManager.addPlaylistChangeListener.");
                window.PlaylistManager.addPlaylistChangeListener(updatePlaylistsAfterChange);
            } else {
                console.warn("account.js: PlaylistManager o addPlaylistChangeListener no está disponible después de initializeUserData. Reintentando...");
                setTimeout(() => {
                    if (window.PlaylistManager && typeof window.PlaylistManager.addPlaylistChangeListener === 'function') {
                        console.log("account.js: Configurando listener para PlaylistManager (reintento con retraso).");
                        window.PlaylistManager.addPlaylistChangeListener(updatePlaylistsAfterChange);
                    } else {
                         console.error("account.js: PlaylistManager sigue sin estar disponible después del retraso.");
                    }
                }, 1500); // Aumentar un poco el tiempo de espera
            }

            if (window.LikesManager && typeof window.LikesManager.addLikeChangeListener === 'function') {
                 console.log("account.js: Configurando listener para LikesManager.addLikeChangeListener.");
                 window.LikesManager.addLikeChangeListener((songId, isLiked) => {
                    updateLikeStatusInUI(songId, isLiked);
                });
            } else {
                console.warn("account.js: LikesManager o addLikeChangeListener no disponible. Reintentando...");
                 setTimeout(() => {
                    if (window.LikesManager && typeof window.LikesManager.addLikeChangeListener === 'function') {
                        console.log("account.js: Configurando listener para LikesManager (reintento con retraso).");
                         window.LikesManager.addLikeChangeListener((songId, isLiked) => {
                            updateLikeStatusInUI(songId, isLiked);
                        });
                    } else {
                         console.error("account.js: LikesManager sigue sin estar disponible después del retraso.");
                    }
                }, 1500);
            }

        } else {
            console.log('account.js: Usuario no autenticado. Redirigiendo a login.html.');
            if (window.location.pathname.includes('account.html')) {
                 window.location.href = 'login.html';
            }
        }
    });
    
    async function initializeUserData(user) {
        try {
            showLoading(true);
            console.log("account.js: initializeUserData - Iniciando carga de datos para UID:", user.uid);
            if (!user || !user.uid) {
                console.error("account.js: Objeto usuario inválido o sin UID en initializeUserData.", user);
                throw new Error("Objeto de usuario inválido.");
            }
            
            currentUser = { ...user }; 
            
            try {
                const profileInfoSnapshot = await firebase.database().ref(`users/${user.uid}/profileInfo`).once('value');
                currentUser.profileInfo = profileInfoSnapshot.val() || {}; 
                console.log("account.js: initializeUserData - Información adicional del perfil (profileInfo) cargada:", currentUser.profileInfo);
            } catch (profileError) {
                console.warn('account.js: initializeUserData - No se pudo cargar profileInfo desde Firebase DB:', profileError.message);
                currentUser.profileInfo = {}; 
            }
            
            updateUserProfile(currentUser);
            await initializeManagementSystems();
            await loadUserData();
            setupEventListeners();
            setupMusicPlayer();
            
        } catch (error) {
            console.error('account.js: initializeUserData - Error crítico durante la inicialización:', error.message, "Usuario en el momento del error:", currentUser);
            showToast('Error grave al cargar los datos de tu cuenta. Por favor, recarga la página.', 'error');
        } finally {
            showLoading(false); 
            console.log("account.js: initializeUserData - Proceso de inicialización de datos de usuario completado (con o sin errores).");
        }
    }
    
    async function initializeManagementSystems() {
        console.log("account.js: initializeManagementSystems - Intentando inicializar managers externos...");
        try {
            if (window.LikesManager && typeof window.LikesManager.init === 'function') {
                await window.LikesManager.init(); 
                console.log('account.js: initializeManagementSystems - LikesManager inicializado.');
                // El listener de LikesManager se moverá para ser configurado DESPUÉS de initializeUserData
            } else { 
                console.warn("account.js: initializeManagementSystems - LikesManager no disponible o su función 'init' no existe.");
            }
            
            if (window.PlaylistManager && typeof window.PlaylistManager.init === 'function') {
                await window.PlaylistManager.init(); 
                console.log('account.js: initializeManagementSystems - PlaylistManager inicializado.');
                // El listener de PlaylistManager se moverá para ser configurado DESPUÉS de initializeUserData
            } else { 
                console.warn("account.js: initializeManagementSystems - PlaylistManager no disponible o su función 'init' no existe.");
            }
        } catch (error) {
            console.error('account.js: initializeManagementSystems - Error durante la inicialización de managers externos:', error);
        }
    }
    
    async function loadUserData() {
        console.log("account.js: loadUserData - Iniciando la carga de todos los datos del usuario (likes, historial, playlists, etc.).");
        try {
            showLoading(true);
            if (!firebase.auth().currentUser) { 
                throw new Error('Usuario no autenticado al intentar cargar datos específicos (loadUserData).');
            }
            
            await Promise.all([
                loadLikedSongsFromSystem(),
                loadRecentlyPlayed(),
                loadUserPlaylistsFromSystem(),
                loadFollowedArtists()
            ]);
            
            updateUserStats();
            updateLikedSongsUI();
            updateRecentlyPlayedUI();
            updatePlaylistsUI();
            console.log("account.js: loadUserData - Todos los datos del usuario cargados y la UI ha sido actualizada.");
        } catch (error) {
            console.error('account.js: loadUserData - Error durante la carga de datos:', error);
            showToast('Hubo un error al cargar los datos de tu cuenta. Por favor, intenta recargar la página.', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    async function loadLikedSongsFromSystem() {
        console.log("account.js: loadLikedSongsFromSystem - Intentando cargar canciones favoritas...");
        try {
            if (window.LikesManager && typeof window.LikesManager.getAllLikedSongs === 'function') {
                likedSongs = window.LikesManager.getAllLikedSongs();
                console.log('account.js: loadLikedSongsFromSystem - Canciones favoritas cargadas a través de LikesManager:', Object.keys(likedSongs).length, 'canciones.');
            } else {
                console.warn("account.js: loadLikedSongsFromSystem - LikesManager no funcional, usando fallback a Firebase DB.");
                if(!firebase.auth().currentUser) throw new Error("Usuario no autenticado para fallback de carga de likes.");
                const uid = firebase.auth().currentUser.uid;
                const snapshot = await firebase.database().ref(`users/${uid}/liked_songs`).once('value');
                likedSongs = snapshot.val() || {}; 
                console.log('account.js: loadLikedSongsFromSystem - Canciones favoritas cargadas directamente desde Firebase (fallback):', Object.keys(likedSongs).length, 'canciones.');
            }
            return likedSongs;
        } catch (error) {
            console.error('account.js: loadLikedSongsFromSystem - Error crítico al cargar canciones favoritas:', error); 
            likedSongs = {}; 
            return {};
        }
    }
    
    async function loadUserPlaylistsFromSystem() {
        console.log("account.js: loadUserPlaylistsFromSystem - Intentando cargar playlists del usuario...");
        try {
            if (window.PlaylistManager && typeof window.PlaylistManager.getAllPlaylists === 'function') {
                userPlaylists = window.PlaylistManager.getAllPlaylists();
                console.log('account.js: loadUserPlaylistsFromSystem - Playlists cargadas a través de PlaylistManager:', userPlaylists.length, 'playlists.');
            } else {
                console.warn("account.js: loadUserPlaylistsFromSystem - PlaylistManager no funcional, usando fallback a Firebase DB.");
                 if(!firebase.auth().currentUser) throw new Error("Usuario no autenticado para fallback de carga de playlists.");
                const uid = firebase.auth().currentUser.uid;
                const snapshot = await firebase.database().ref(`users/${uid}/playlists`).once('value');
                userPlaylists = Object.values(snapshot.val() || {}); 
                console.log('account.js: loadUserPlaylistsFromSystem - Playlists cargadas directamente desde Firebase (fallback):', userPlaylists.length, 'playlists.');
            }
            return userPlaylists;
        } catch (error) {
            console.error('account.js: loadUserPlaylistsFromSystem - Error crítico al cargar playlists:', error); 
            userPlaylists = []; 
            return [];
        }
    }
    
    function updateUserProfile(userProfileData) {
        if (!userProfileData) {
            console.error("account.js: updateUserProfile - userProfileData es nulo o indefinido.");
            if(profileNameElement) profileNameElement.textContent = "Error de datos";
            if(profileEmailElement) profileEmailElement.textContent = "No disponible";
            if(memberSinceElement) memberSinceElement.textContent = "Miembro desde: N/A";
            return;
        }
        console.log("account.js: updateUserProfile - Actualizando UI del perfil con los datos:", userProfileData);

        if (profileNameElement) {
            profileNameElement.textContent = userProfileData.displayName || 
                                             (userProfileData.email ? userProfileData.email.split('@')[0] : 'Usuario de MusiFlow');
        }
        
        if (profileEmailElement) {
            profileEmailElement.textContent = userProfileData.email || 'Email no proporcionado';
        }
        
        if (memberSinceElement && userProfileData.metadata && userProfileData.metadata.creationTime) {
            const memberSinceDate = new Date(userProfileData.metadata.creationTime);
            const formattedDate = new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(memberSinceDate);
            memberSinceElement.textContent = `Miembro desde: ${formattedDate}`;
        } else if (memberSinceElement) {
             memberSinceElement.textContent = `Miembro desde: fecha desconocida`;
        }
        
        if (profileAvatarElement) {
            if (userProfileData.photoURL) {
                profileAvatarElement.innerHTML = `<img src="${userProfileData.photoURL}" alt="Avatar del usuario" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                let firstLetter = 'M'; 
                if (userProfileData.displayName && userProfileData.displayName.trim() !== "") {
                    firstLetter = userProfileData.displayName.trim().charAt(0).toUpperCase();
                } else if (userProfileData.email && userProfileData.email.includes('@')) {
                    firstLetter = userProfileData.email.split('@')[0].charAt(0).toUpperCase();
                }
                profileAvatarElement.innerHTML = firstLetter;
                const identifierForColor = userProfileData.displayName || userProfileData.email || userProfileData.uid || 'defaultUserColorSeed';
                const hue = Math.abs(hashCode(identifierForColor)) % 360; 
                profileAvatarElement.style.background = `hsl(${hue}, 70%, 50%)`; 
                profileAvatarElement.style.color = 'white'; 
            }
        }
    }
    
    async function loadRecentlyPlayed() {
        console.log("account.js: loadRecentlyPlayed - Intentando cargar historial de reproducción...");
        try {
            if (!firebase.auth().currentUser) {
                console.warn("account.js: loadRecentlyPlayed - Usuario no autenticado. No se puede cargar el historial.");
                return []; 
            }
            const uid = firebase.auth().currentUser.uid;
            const snapshot = await firebase.database().ref(`users/${uid}/recently_played`).orderByChild('timestamp').limitToLast(20).once('value');
            const data = snapshot.val() || {};
            recentlyPlayed = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            console.log('account.js: loadRecentlyPlayed - Historial de reproducción cargado:', recentlyPlayed.length, 'canciones.');
            return recentlyPlayed;
        } catch (error) { 
            console.error('account.js: loadRecentlyPlayed - Error al cargar historial de reproducción:', error); 
            recentlyPlayed = []; 
            return []; 
        }
    }
    
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
            followedArtists = []; 
            return []; 
        }
    }
    
    function updateUserStats() { 
        if (likedSongsCountElement) likedSongsCountElement.textContent = Object.keys(likedSongs).length;
        if (playlistsCountElement) playlistsCountElement.textContent = userPlaylists.length;
        if (followedArtistsCountElement) followedArtistsCountElement.textContent = followedArtists.length;
        animateCounters(); 
    }

    function updateLikedSongsUI() { 
        if (!likedSongsListElement) {
            console.warn("account.js: updateLikedSongsUI - Elemento likedSongsListElement no encontrado en el DOM.");
            return;
        }
        const songsArray = Object.values(likedSongs); 
        
        if (playAllLikedBtn) playAllLikedBtn.disabled = songsArray.length === 0;
        
        if (songsArray.length === 0) {
            likedSongsListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="far fa-heart fa-2x mb-3"></i><p>Aún no has marcado canciones como favoritas.</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light"><i class="fas fa-compass me-2"></i> Explorar música</a>
                </div>`;
            return;
        }
        
        likedSongsListElement.innerHTML = ''; 
        songsArray.forEach(song => {
            const sourceLabel = song.sourceOrigin === 'spotify' ? '<span class="song-source spotify">Spotify</span>' : '<span class="song-source local">Local</span>';
            const songItem = document.createElement('div');
            songItem.className = 'song-item fade-in'; 
            songItem.dataset.id = song.id; 
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
            songItem.addEventListener('click', (e) => { 
                if (e.target.closest('.song-action-btn') || e.target.closest('.song-like')) return; 
                playSong(song); 
            });
            songItem.querySelector('.remove-from-liked-btn')?.addEventListener('click', (e) => { e.stopPropagation(); removeSongFromLiked(song.id); });
            songItem.querySelector('.add-to-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); showAddToPlaylistModal(song); });
            songItem.querySelector('.song-like')?.addEventListener('click', (e) => { e.stopPropagation(); removeSongFromLiked(song.id); }); 
            likedSongsListElement.appendChild(songItem); 
        });
        
        if (playAllLikedBtn && songsArray.length > 0) {
            playAllLikedBtn.onclick = null; 
            playAllLikedBtn.addEventListener('click', () => playPlaylist(songsArray, 0, "liked_songs"));
        }
    }
    
    function updateRecentlyPlayedUI() { 
        if (!recentlyPlayedListElement) {
             console.warn("account.js: updateRecentlyPlayedUI - Elemento recentlyPlayedListElement no encontrado.");
            return;
        }
         if (clearHistoryBtn) clearHistoryBtn.disabled = recentlyPlayed.length === 0;
        
        if (recentlyPlayed.length === 0) {
            recentlyPlayedListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-2x mb-3"></i><p>Aún no has escuchado ninguna canción.</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light"><i class="fas fa-compass me-2"></i> Descubrir música</a>
                </div>`;
            return;
        }
        
        recentlyPlayedListElement.innerHTML = ''; 
        recentlyPlayed.forEach(song => {
            const timeAgo = getTimeAgo(song.timestamp); 
            const sourceLabel = song.sourceOrigin === 'spotify' ? '<span class="song-source spotify">Spotify</span>' : '<span class="song-source local">Local</span>';
            const isLiked = likedSongs[song.id] ? 'active' : ''; 
            const heartIcon = isLiked ? 'fas' : 'far'; 
            const songItem = document.createElement('div');
            songItem.className = 'song-item slide-in'; songItem.dataset.id = song.id; songItem.dataset.source = song.sourceOrigin || 'local';
            songItem.innerHTML = `
                <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title || 'Canción'}" class="song-cover">
                <div class="song-details"><h5 class="song-title">${song.title || 'Desconocido'} ${sourceLabel}</h5><p class="song-artist">${song.artist || 'Desconocido'}</p></div>
                <div class="song-time">${timeAgo}</div>
                <div class="song-like ${isLiked}" title="${isLiked ? 'Quitar de favoritos' : 'Añadir a favoritos'}"><i class="${heartIcon} fa-heart"></i></div>
                <div class="song-actions"><button class="song-action-btn add-to-playlist-btn" title="Añadir a playlist"><i class="fas fa-list-ul"></i></button></div>`;
            songItem.addEventListener('click', (e) => { if (e.target.closest('.song-action-btn') || e.target.closest('.song-like')) return; playSong(song); });
            songItem.querySelector('.song-like')?.addEventListener('click', (e) => { e.stopPropagation(); toggleLikeSong(song); });
            songItem.querySelector('.add-to-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); showAddToPlaylistModal(song); });
            recentlyPlayedListElement.appendChild(songItem);
        });
        
        if (clearHistoryBtn && recentlyPlayed.length > 0) {
            clearHistoryBtn.onclick = null; 
            clearHistoryBtn.addEventListener('click', () => { if (confirm('¿Estás seguro de que quieres limpiar tu historial de reproducción?')) clearPlayHistory(); });
        }
    }
    
    function updatePlaylistsUI() { 
        if (!userPlaylistsListElement) {
            console.warn("account.js: updatePlaylistsUI - Elemento userPlaylistsListElement no encontrado.");
            return;
        }
        const activeFilter = document.querySelector('.view-filter.active')?.dataset.filter || 'all';
        let playlistsToDisplay = userPlaylists;

        if (activeFilter === 'created' && currentUser) {
            playlistsToDisplay = userPlaylists.filter(p => p.owner === currentUser.uid);
        } else if (activeFilter === 'followed') {
            playlistsToDisplay = userPlaylists.filter(p => p.owner !== currentUser?.uid); // Ajuste para que no de error si currentUser es null
        }
        
        playlistsToDisplay.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));

        if (playlistsToDisplay.length === 0) {
            userPlaylistsListElement.innerHTML = `
                <div class="no-content-state"> 
                    <i class="fas fa-list-ul fa-2x mb-3"></i>
                    <p>No tienes playlists ${activeFilter !== 'all' ? 'que coincidan con este filtro' : ''}.</p>
                    ${activeFilter === 'all' || activeFilter === 'created' ? 
                    `<button class="btn btn-sm btn-outline-light" id="createFirstPlaylistBtnUI">
                        <i class="fas fa-plus me-2"></i> Crear mi primera playlist
                    </button>` : ''}
                </div>
            `;
            const createFirstBtnUI = document.getElementById('createFirstPlaylistBtnUI');
            if (createFirstBtnUI) createFirstBtnUI.addEventListener('click', showCreatePlaylistModal);
            return;
        }
        
        userPlaylistsListElement.innerHTML = ''; 
        playlistsToDisplay.forEach(playlist => {
            const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
            const playlistItem = document.createElement('div');
            playlistItem.className = 'playlist-item fade-in'; playlistItem.dataset.id = playlist.id;
            playlistItem.innerHTML = `
                <div class="playlist-cover">
                    ${playlist.coverImage ? `<img src="${playlist.coverImage}" alt="${playlist.name}" style="width:100%; height:100%; object-fit:cover;">` : '<i class="fas fa-music"></i>'}
                </div>
                <div class="flex-grow-1">
                    <h5 class="playlist-title ellipsis-text">${playlist.name}</h5>
                    <p class="playlist-info text-muted">${songCount} ${songCount === 1 ? 'canción' : 'canciones'}</p>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn play-playlist-btn" title="Reproducir playlist"><i class="fas fa-play"></i></button>
                    <button class="song-action-btn view-playlist-btn" title="Ver detalles"><i class="fas fa-ellipsis-v"></i></button> 
                </div>
            `;
            playlistItem.addEventListener('click', (e) => { if (e.target.closest('.song-action-btn')) return; showPlaylistDetails(playlist.id); });
            playlistItem.querySelector('.play-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); playPlaylistById(playlist.id); });
            playlistItem.querySelector('.view-playlist-btn')?.addEventListener('click', (e) => { e.stopPropagation(); showPlaylistDetails(playlist.id); });
            userPlaylistsListElement.appendChild(playlistItem);
        });
        console.log(`account.js: updatePlaylistsUI - UI de playlists actualizada con ${playlistsToDisplay.length} playlists.`);
    }

    async function toggleLikeSong(song) { 
        if (!song || !song.id) { 
            showToast('No se pudo procesar la acción para esta canción.', 'error');
            return; 
        }
        console.log(`account.js: toggleLikeSong - Cambiando estado de like para la canción ID: ${song.id}`);
        try {
            if (window.LikesManager && typeof window.LikesManager.toggleLike === 'function') {
                await window.LikesManager.toggleLike(song);
                const isNowLiked = window.LikesManager.isLiked(song.id);
                showToast(`Canción ${isNowLiked ? 'añadida a' : 'eliminada de'} favoritos.`, 'success');
            } else { 
                if (likedSongs[song.id]) { 
                    await removeSongFromLiked(song.id); 
                } else {
                    await addSongToLiked(song); 
                }
            }
        } catch (error) { 
            console.error('account.js: toggleLikeSong - Error al cambiar estado de like:', error); 
            showToast('Error al actualizar favoritos. Inténtalo de nuevo.', 'error'); 
        }
    }

    async function addSongToLiked(song) { 
        if (!song || !song.id || !currentUser || !firebase.auth().currentUser) { 
            showToast('No se pudo añadir a favoritos. Intenta iniciar sesión.', 'warning');
            return; 
        }
        console.log(`account.js: addSongToLiked - Añadiendo a favoritos la canción ID: ${song.id}`);
        try {
            if (window.LikesManager && typeof window.LikesManager.addSongToLiked === 'function') { 
                await window.LikesManager.addSongToLiked(song); 
            } else { 
                const songDataForFirebase = { ...song, added_at: Date.now() }; 
                await firebase.database().ref(`users/${currentUser.uid}/liked_songs/${song.id}`).set(songDataForFirebase);
                likedSongs[song.id] = songDataForFirebase; 
            }
            showToast('Canción añadida a favoritos.', 'success');
            updateUserStats(); 
            updateLikedSongsUI(); 
            updateRecentlyPlayedUI(); 
        } catch (error) { 
            console.error('account.js: addSongToLiked - Error:', error); 
            showToast('Error al añadir la canción a favoritos.', 'error'); 
        }
    }

    async function removeSongFromLiked(songId) { 
        if (!songId || !currentUser || !firebase.auth().currentUser) {
             showToast('No se pudo quitar de favoritos. Intenta iniciar sesión.', 'warning');
             return; 
        }
        console.log(`account.js: removeSongFromLiked - Quitando de favoritos la canción ID: ${songId}`);
        try {
            if (window.LikesManager && typeof window.LikesManager.removeSongFromLiked === 'function') { 
                await window.LikesManager.removeSongFromLiked(songId); 
            } else { 
                await firebase.database().ref(`users/${currentUser.uid}/liked_songs/${songId}`).remove();
                delete likedSongs[songId]; 
            }
            showToast('Canción eliminada de favoritos.', 'success');
            updateUserStats(); 
            updateLikedSongsUI(); 
            updateRecentlyPlayedUI();
        } catch (error) { 
            console.error('account.js: removeSongFromLiked - Error:', error); 
            showToast('Error al eliminar la canción de favoritos.', 'error');
        }
    }

    function updateLikeStatusInUI(songId, isLiked) { 
        console.log(`account.js: updateLikeStatusInUI - Actualizando UI para canción ${songId}, nuevo estado de like: ${isLiked}`);
        let songDataForCache;
        if (isLiked) {
            songDataForCache = recentlyPlayed.find(s => s.id === songId) || 
                               (currentPlaylist && currentPlaylist.find(s => s.id === songId)) ||
                               (window.LikesManager && typeof window.LikesManager.getLikedSong === 'function' && window.LikesManager.getLikedSong(songId)) ||
                               { id: songId, title: 'Canción (Datos no disponibles)', artist: 'Artista Desconocido' }; 
            likedSongs[songId] = { ...songDataForCache, id: songId, added_at: Date.now() }; 
        } else {
            delete likedSongs[songId]; 
        }
        document.querySelectorAll(`.song-item[data-id="${songId}"]`).forEach(item => {
            const likeBtn = item.querySelector('.song-like'); 
            if (likeBtn) {
                likeBtn.classList.toggle('active', isLiked); 
                const icon = likeBtn.querySelector('i');
                if(icon) icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart'; 
            }
        });
        updateUserStats(); 
        updateLikedSongsUI(); 
    }

    async function addToPlayHistory(song) { 
        if (!song || !song.id || !currentUser) {
            return; 
        }
        console.log(`account.js: addToPlayHistory - Añadiendo al historial la canción: ${song.title}`);
        try {
            const uid = currentUser.uid; 
            const timestamp = Date.now(); 
            const songDataForHistory = {...song, timestamp, sourceOrigin: song.sourceOrigin || 'local'};
            await firebase.database().ref(`users/${uid}/recently_played/${song.id}`).set(songDataForHistory);
            
            const existingIndex = recentlyPlayed.findIndex(s => s.id === song.id);
            if (existingIndex !== -1) recentlyPlayed.splice(existingIndex, 1);
            recentlyPlayed.unshift(songDataForHistory); 
            if (recentlyPlayed.length > 20) recentlyPlayed = recentlyPlayed.slice(0, 20); 
            
            updateRecentlyPlayedUI(); 
        } catch (error) { 
            console.error('account.js: addToPlayHistory - Error al añadir al historial:', error); 
        }
    }

    async function clearPlayHistory() { 
        if (!currentUser) {
             return;
        }
        console.log("account.js: clearPlayHistory - Limpiando historial de reproducción.");
        try {
            await firebase.database().ref(`users/${currentUser.uid}/recently_played`).remove();
            recentlyPlayed = []; 
            updateRecentlyPlayedUI(); 
            showToast('Historial de reproducción eliminado correctamente.', 'success');
        } catch (error) { 
            console.error('account.js: clearPlayHistory - Error al limpiar historial:', error); 
            showToast('Error al limpiar el historial. Inténtalo de nuevo.', 'error');
        }
    }
    
    function showAddToPlaylistModal(song) { 
        if (!song) { 
            return; 
        }
        selectedSongForPlaylist = song; 
        console.log(`account.js: showAddToPlaylistModal - Abriendo modal para añadir canción "${song.title}" a playlist.`);
        
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
        
        const playlistsContainerElement = document.getElementById('userPlaylistsForSelection'); 
        if (playlistsContainerElement) { 
            if (userPlaylists.length === 0) {
                playlistsContainerElement.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <p>No tienes playlists disponibles.</p>
                        <button class="btn btn-sm btn-outline-light" id="createPlaylistFromAddToModalBtnInternal">
                            <i class="fas fa-plus me-2"></i> Crear nueva playlist
                        </button>
                    </div>`;
                document.getElementById('createPlaylistFromAddToModalBtnInternal')?.addEventListener('click', () => {
                    bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide(); 
                    showCreatePlaylistModal(); 
                });
            } else {
                playlistsContainerElement.innerHTML = ''; 
                userPlaylists.forEach(playlist => {
                    const playlistItem = document.createElement('div');
                    playlistItem.className = 'playlist-item-selection list-group-item list-group-item-action bg-dark text-light mb-2 rounded';
                    playlistItem.style.cursor = 'pointer';
                    playlistItem.innerHTML = `
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1 playlist-title">${playlist.name}</h5>
                            <small>${playlist.songs ? Object.keys(playlist.songs).length : 0} canciones</small>
                        </div>
                        <p class="mb-1 playlist-info text-muted small">${playlist.description || 'Sin descripción'}</p>`;
                    playlistItem.addEventListener('click', async () => {
                        try {
                            if (window.PlaylistManager && typeof window.PlaylistManager.addSongToPlaylist === 'function') {
                                await window.PlaylistManager.addSongToPlaylist(selectedSongForPlaylist, playlist.id);
                            } else { 
                                await addSongToPlaylistDirect(selectedSongForPlaylist, playlist.id);
                            }
                            showToast('Canción añadida a la playlist correctamente.', 'success');
                            bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide(); 
                        } catch (error) { 
                            console.error('account.js: showAddToPlaylistModal - Error al añadir canción a playlist:', error); 
                            showToast(error.message || 'Error al añadir la canción a la playlist.', 'error'); 
                        }
                    });
                    playlistsContainerElement.appendChild(playlistItem);
                });
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
        const modalElement = document.getElementById('addToPlaylistModal');
        if (modalElement) {
            new bootstrap.Modal(modalElement).show();
        }
    }

    function showCreatePlaylistModal() { 
        console.log("account.js: showCreatePlaylistModal - Abriendo modal para crear nueva playlist.");
        const createPlaylistForm = document.getElementById('createPlaylistForm');
        if(createPlaylistForm) createPlaylistForm.reset(); 
        
        const modalElement = document.getElementById('createPlaylistModal'); 
        if (modalElement) {
            new bootstrap.Modal(modalElement).show();
        }
    }

    async function createNewPlaylist() { 
        if (!currentUser) { 
            showToast('Debes iniciar sesión para crear playlists.', 'warning');
            return; 
        }
        console.log("account.js: createNewPlaylist - Intentando crear nueva playlist...");
        
        const nameInput = document.getElementById('playlistName'); 
        const descriptionInput = document.getElementById('playlistDescription');
        const publicInput = document.getElementById('playlistPublic');

        if (!nameInput || !descriptionInput || !publicInput) {
            showToast('Error interno al intentar crear la playlist.', 'error'); 
            return;
        }

        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const isPublic = publicInput.checked;
        
        if (!name) { 
            showToast('Por favor, ingresa un nombre para la playlist.', 'error'); 
            return; 
        }
        
        try {
            showLoading(true);
            const playlistData = { name, description, public: isPublic }; 
            
            let newPlaylist;
            if (window.PlaylistManager && typeof window.PlaylistManager.createPlaylist === 'function') {
                newPlaylist = await window.PlaylistManager.createPlaylist(playlistData);
            } else { 
                const uid = currentUser.uid; 
                const timestamp = Date.now();
                const playlistId = `playlist_${uid}_${timestamp}`; 
                newPlaylist = { id: playlistId, name, description, public: isPublic, owner: uid, ownerName: currentUser.displayName || currentUser.email.split('@')[0] , created_at: timestamp, updated_at: timestamp, songs: {} };
                await firebase.database().ref(`users/${uid}/playlists/${playlistId}`).set(newPlaylist);
                userPlaylists.push(newPlaylist); 
            }
            
            bootstrap.Modal.getInstance(document.getElementById('createPlaylistModal'))?.hide(); 
            showToast('Playlist creada con éxito.', 'success');
            
            if (selectedSongForPlaylist && newPlaylist && newPlaylist.id) {
                console.log(`account.js: createNewPlaylist - Añadiendo canción seleccionada "${selectedSongForPlaylist.title}" a la nueva playlist "${newPlaylist.name}".`);
                try {
                    if (window.PlaylistManager) await window.PlaylistManager.addSongToPlaylist(selectedSongForPlaylist, newPlaylist.id);
                    else await addSongToPlaylistDirect(selectedSongForPlaylist, newPlaylist.id); 
                    showToast('Canción añadida a la nueva playlist.', 'success');
                } catch (error) { 
                    showToast(error.message || 'Error al añadir la canción a la nueva playlist.', 'error'); 
                }
                selectedSongForPlaylist = null; 
            }
            
            updateUserStats(); 
            updatePlaylistsUI(); 
            showLoading(false);
        } catch (error) { 
            console.error('account.js: createNewPlaylist - Error al crear playlist:', error); 
            showToast('Error al crear la playlist. Inténtalo de nuevo.', 'error'); 
            showLoading(false); 
        }
    }
    
    async function addSongToPlaylistDirect(song, playlistId) {
        if(!currentUser) { 
            throw new Error("Usuario no autenticado para añadir canción a playlist."); 
        }
        console.log(`account.js: addSongToPlaylistDirect - Añadiendo (fallback) canción "${song.title}" a playlist ID ${playlistId}`);
        const uid = currentUser.uid;
        const playlistRef = firebase.database().ref(`users/${uid}/playlists/${playlistId}`);
        
        const songSnapshot = await playlistRef.child(`songs/${song.id}`).once('value');
        if (songSnapshot.exists()) { 
            throw new Error('Esta canción ya está en la playlist.'); 
        }
        
        const songDataForPlaylist = { ...song, added_at: Date.now() }; 
        await playlistRef.child(`songs/${song.id}`).set(songDataForPlaylist);
        await playlistRef.child('updated_at').set(Date.now());
        
        const playlistIndex = userPlaylists.findIndex(p => p.id === playlistId);
        if (playlistIndex !== -1) {
            if (!userPlaylists[playlistIndex].songs) userPlaylists[playlistIndex].songs = {};
            userPlaylists[playlistIndex].songs[song.id] = songDataForPlaylist;
            userPlaylists[playlistIndex].updated_at = Date.now();
        }
    }
    
    function updatePlaylistsAfterChange(action, playlist, song) {
        console.log(`account.js: updatePlaylistsAfterChange - Recibida acción '${action}' para playlist '${playlist ? playlist.name : "N/A"}'`);
        let playlistChangedInCache = false; 

        switch (action) {
            case 'create': 
                if (playlist && playlist.id && !userPlaylists.find(p => p.id === playlist.id)) {
                    userPlaylists.push(playlist); 
                    playlistChangedInCache = true;
                }
                break;
            case 'update': 
                 if (playlist && playlist.id) {
                    const updateIndex = userPlaylists.findIndex(p => p.id === playlist.id);
                    if (updateIndex !== -1) {
                        userPlaylists[updateIndex] = { ...userPlaylists[updateIndex], ...playlist }; 
                        playlistChangedInCache = true;
                    }
                }
                break;
            case 'delete': 
                if (playlist && playlist.id) {
                    const initialLength = userPlaylists.length;
                    userPlaylists = userPlaylists.filter(p => p.id !== playlist.id); 
                    if (userPlaylists.length !== initialLength) playlistChangedInCache = true;
                }
                break;
            case 'addSong': 
            case 'removeSong': 
                 if (playlist && playlist.id) {
                    const songChangeIndex = userPlaylists.findIndex(p => p.id === playlist.id);
                    if (songChangeIndex !== -1) {
                        userPlaylists[songChangeIndex] = { ...playlist }; 
                        playlistChangedInCache = true;
                    }
                }
                break;
            default:
                console.warn(`account.js: updatePlaylistsAfterChange - Acción desconocida: ${action}`);
        }
        
        if (playlistChangedInCache) {
            console.log("account.js: updatePlaylistsAfterChange - Cache de playlists actualizada, refrescando UI.");
            updateUserStats();
            updatePlaylistsUI();
        }
    }

    function setupEventListeners() {
        console.log("account.js: setupEventListeners - Configurando listeners de eventos...");

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    stopPlayback(); 
                    logout();       
                }
            });
        }
        
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', openEditProfileModal); 
        }
        
        document.querySelectorAll('.view-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                document.querySelectorAll('.view-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                const filterType = filter.dataset.filter;
                console.log(`account.js: setupEventListeners - Filtro de playlist seleccionado: ${filterType}`);
                filterPlaylists(filterType); 
            });
        });
        
        if (createPlaylistBtn) {
            createPlaylistBtn.addEventListener('click', showCreatePlaylistModal); 
        }
        
        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', createNewPlaylist); 
        }

        const saveProfileChangesBtn = document.getElementById('saveProfileChangesBtn');
        if (saveProfileChangesBtn) {
            saveProfileChangesBtn.addEventListener('click', saveProfileChanges); 
        }

        const savePlaylistChangesBtn = document.getElementById('savePlaylistChangesBtn');
        if (savePlaylistChangesBtn) {
            savePlaylistChangesBtn.addEventListener('click', savePlaylistChanges); 
        }
        
        const likedSongsStatBox = document.getElementById('likedSongsStatBox');
        if (likedSongsStatBox) {
            likedSongsStatBox.addEventListener('click', () => {
                const likedSongsSection = document.querySelector('.liked-songs.liked-songs-section') || document.querySelector('.liked-songs');
                if (likedSongsSection) {
                    likedSongsSection.scrollIntoView({ behavior: 'smooth' }); 
                }
            });
        }
        
        const playlistsStatBox = document.getElementById('playlistsStatBox');
        if (playlistsStatBox) {
            playlistsStatBox.addEventListener('click', () => {
                const playlistsSection = document.querySelector('.user-playlists.user-playlists-section') || document.querySelector('.user-playlists');
                if (playlistsSection) {
                    playlistsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        console.log("account.js: setupEventListeners - Configuración de listeners de eventos completada.");
    }

    function setupMusicPlayer() { 
        console.log("account.js: setupMusicPlayer - Configurando el reproductor de música...");
        if (currentPlayer && !currentPlayingTrack) {
            currentPlayer.style.display = 'none';
        }
        
        audioPlayer = new Audio(); 
        
        if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
        if (prevBtn) prevBtn.addEventListener('click', playPrevious);
        if (nextBtn) nextBtn.addEventListener('click', playNext);
        if (loopBtn) loopBtn.addEventListener('click', toggleLoop);
        if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
        
        const progressBarContainer = document.querySelector('.progress-bar-container');
        if (progressBarContainer) {
            progressBarContainer.addEventListener('click', (e) => {
                if (!audioPlayer || !currentPlayingTrack || isNaN(audioPlayer.duration)) return; 
                const rect = progressBarContainer.getBoundingClientRect(); 
                const clickX = e.clientX - rect.left; 
                const containerWidth = rect.width; 
                if (containerWidth === 0) return; 
                const clickPercent = clickX / containerWidth; 
                audioPlayer.currentTime = clickPercent * audioPlayer.duration; 
                updateProgress(); 
            });
        }
        
        if (volumeControl) {
            volumeControl.addEventListener('input', () => {
                if (audioPlayer) { 
                    audioPlayer.volume = parseFloat(volumeControl.value);
                }
            });
            if (audioPlayer && volumeControl.value) {
                audioPlayer.volume = parseFloat(volumeControl.value);
            }
        }
        
        audioPlayer.addEventListener('ended', () => {
            console.log("account.js: Evento 'ended' del audioPlayer disparado.");
            if (isLoopMode && audioPlayer.loop) { 
                audioPlayer.currentTime = 0;
                audioPlayer.play().catch(e => console.error("account.js: Error al reiniciar canción en modo bucle:", e.message));
            } else {
                playNext();
            }
        });
        audioPlayer.addEventListener('loadedmetadata', () => {
            console.log("account.js: Evento 'loadedmetadata' del audioPlayer disparado.");
            if (totalTimeDisplay && !isNaN(audioPlayer.duration)) {
                totalTimeDisplay.textContent = formatTime(audioPlayer.duration); 
            }
        });
        audioPlayer.addEventListener('error', (e) => {
            console.error("account.js: Error en el elemento audioPlayer:", audioPlayer.error, e);
            showToast('Error al cargar o reproducir la canción seleccionada.', 'error');
            isPlaying = false; 
            updatePlayPauseButton(); 
            stopProgressUpdate();
            currentPlayingTrack = null; 
            updatePlayerUI(); 
        });
        
        loadPlayerPreferences();
        console.log("account.js: setupMusicPlayer - Configuración del reproductor completada.");
    }
    
    function playSong(song) { 
        if (!song) { 
            console.warn("account.js: playSong - No se proporcionó una canción para reproducir."); 
            return; 
        }
        console.log(`account.js: playSong - Intentando reproducir canción: "${song.title || 'Desconocido'}" (ID: ${song.id})`);
        
        stopPlayback(); 
        currentPlayingTrack = song; 
        updatePlayerUI(); 
        
        if (song.sourceOrigin === 'spotify' || song.source === 'spotify') {
            if (song.externalUrl) {
                window.open(song.externalUrl, '_blank'); 
                showToast('Abriendo la canción en Spotify...', 'info');
            } else {
                showToast('No se pudo reproducir esta canción de Spotify (URL externa no disponible).', 'error');
                console.warn("account.js: playSong - Canción de Spotify sin URL externa:", song);
            }
        } else { 
            if (!song.source) { 
                showToast('La fuente de esta canción no está disponible.', 'error');
                console.error('account.js: playSong - La canción local no tiene una URL de fuente válida:', song);
                currentPlayingTrack = null; 
                updatePlayerUI(); 
                return;
            }
            audioPlayer.src = song.source; 
            audioPlayer.loop = isLoopMode; 
            audioPlayer.volume = volumeControl ? parseFloat(volumeControl.value) : 0.7; 
            
            audioPlayer.play()
                .then(() => {
                    isPlaying = true; 
                    updatePlayPauseButton(); 
                    startProgressUpdate(); 
                    addToPlayHistory(song); 
                    console.log(`account.js: playSong - Reproduciendo localmente: "${song.title}"`);
                })
                .catch(error => { 
                    console.error('account.js: playSong - Error al intentar reproducir la canción local:', error.message); 
                    showToast(`Error al reproducir la canción: ${error.message}. Intenta interactuar con la página primero.`, 'error');
                    isPlaying = false; 
                    updatePlayPauseButton();
                    currentPlayingTrack = null; 
                    updatePlayerUI(); 
                });
        }
        if (song && song.id) {
            updateLikeStatus(song.id);
        }
    }
    
    function playPlaylist(songs, startIndex = 0, playlistId = null) {
        if (!songs || songs.length === 0) { 
            showToast('No hay canciones en esta playlist para reproducir.', 'warning'); 
            return; 
        }
        console.log(`account.js: playPlaylist - Iniciando reproducción de playlist (ID: ${playlistId || 'Desconocido'}), ${songs.length} canciones, empezando por índice ${startIndex}.`);
        
        currentPlaylist = [...songs]; 
        currentTrackIndex = Math.max(0, Math.min(startIndex, currentPlaylist.length - 1)); 
        currentPlaylistId = playlistId; 
        
        if (isShuffleMode && currentPlaylist.length > 1) {
            console.log("account.js: playPlaylist - Modo aleatorio activado, mezclando playlist.");
            const songToStartWith = currentPlaylist[currentTrackIndex]; 
            let restOfSongs = currentPlaylist.filter((_,idx) => idx !== currentTrackIndex);
            shuffleArray(restOfSongs);
            currentPlaylist = [songToStartWith, ...restOfSongs];
            currentTrackIndex = 0; 
        }
        
        if (currentPlaylist[currentTrackIndex]) {
            playSong(currentPlaylist[currentTrackIndex]);
        } else {
            console.error("account.js: playPlaylist - No se pudo encontrar la canción en el índice especificado para iniciar la playlist.");
            showToast('Error al iniciar la reproducción de la playlist.', 'error');
        }
    }
    
    function playPlaylistById(playlistId) {
        console.log(`account.js: playPlaylistById - Intentando reproducir playlist con ID: ${playlistId}`);
        const playlist = userPlaylists.find(p => p.id === playlistId);
        if (!playlist) { 
            showToast('La playlist seleccionada no fue encontrada.', 'error'); 
            console.warn("account.js: playPlaylistById - Playlist no encontrada en caché local.");
            return; 
        }
        
        const songs = playlist.songs ? Object.values(playlist.songs) : []; 
        if (songs.length === 0) { 
            showToast('Esta playlist está vacía y no se puede reproducir.', 'warning'); 
            return; 
        }
        
        playPlaylist(songs, 0, playlistId); 
    }
    
    function stopPlayback() {
        if (audioPlayer) {
            audioPlayer.pause(); 
            audioPlayer.src = ''; 
            console.log("account.js: stopPlayback - Reproducción local detenida.");
        }
        isPlaying = false; 
        updatePlayPauseButton(); 
        stopProgressUpdate(); 
    }
    
    function togglePlayPause() {
        if (!audioPlayer || !currentPlayingTrack) {
            if (currentPlaylist.length > 0 && currentTrackIndex !== -1 && currentPlaylist[currentTrackIndex]) {
                playSong(currentPlaylist[currentTrackIndex]);
            } else { 
                showToast('No hay ninguna canción seleccionada para reproducir.', 'info'); 
            }
            return;
        }
        
        if (isPlaying) { 
            audioPlayer.pause(); 
            isPlaying = false; 
            stopProgressUpdate(); 
            console.log("account.js: togglePlayPause - Audio pausado.");
        } else { 
            if (!audioPlayer.src || audioPlayer.src === window.location.href) {
                 console.log("account.js: togglePlayPause - No hay fuente válida en audioPlayer, recargando canción actual.");
                 playSong(currentPlayingTrack); 
            } else {
                audioPlayer.play()
                    .then(() => { 
                        isPlaying = true; 
                        startProgressUpdate(); 
                        console.log("account.js: togglePlayPause - Audio reanudado/iniciado.");
                    })
                    .catch(error => { 
                        console.error('account.js: togglePlayPause - Error al reanudar/iniciar audio:', error.message); 
                        showToast('Error al reanudar la reproducción.', 'error'); 
                        isPlaying = false; 
                    });
            }
        }
        updatePlayPauseButton(); 
    }
    
    function playPrevious() {
        if (!currentPlaylist || currentPlaylist.length === 0) { 
            showToast('No hay una playlist activa para ir a la canción anterior.', 'info'); 
            return; 
        }
        
        if (currentTrackIndex === -1 && currentPlaylist.length > 0) { 
            currentTrackIndex = currentPlaylist.length -1;
        } else {
            if (isShuffleMode && currentPlaylist.length > 1) {
                let prevIndex;
                do { 
                    prevIndex = Math.floor(Math.random() * currentPlaylist.length);
                } while (prevIndex === currentTrackIndex);
                currentTrackIndex = prevIndex;
            } else { 
                currentTrackIndex--;
                if (currentTrackIndex < 0) { 
                    currentTrackIndex = currentPlaylist.length - 1; 
                }
            }
        }
        
        if (currentPlaylist[currentTrackIndex]) {
            playSong(currentPlaylist[currentTrackIndex]);
        } else {
            console.warn("account.js: playPrevious - No se encontró canción en el índice calculado.");
        }
    }
    
    function playNext() {
        if (!currentPlaylist || currentPlaylist.length === 0) { 
            showToast('No hay una playlist activa para ir a la siguiente canción.', 'info'); 
            return; 
        }

        if (currentTrackIndex === -1 && currentPlaylist.length > 0) { 
             currentTrackIndex = 0; 
        } else {
             if (isShuffleMode && currentPlaylist.length > 1) {
                let nextIndex;
                do { 
                    nextIndex = Math.floor(Math.random() * currentPlaylist.length);
                } while (nextIndex === currentTrackIndex);
                currentTrackIndex = nextIndex;
            } else { 
                currentTrackIndex++;
                if (currentTrackIndex >= currentPlaylist.length) { 
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
    
    function toggleLoop() {
        isLoopMode = !isLoopMode; 
        if (loopBtn) loopBtn.classList.toggle('active', isLoopMode); 
        if (audioPlayer) audioPlayer.loop = isLoopMode; 
        
        savePlayerPreferences(); 
        showToast(`Modo bucle ${isLoopMode ? 'activado' : 'desactivado'}.`, 'info');
    }
    
    function toggleShuffle() {
        isShuffleMode = !isShuffleMode; 
        if (shuffleBtn) shuffleBtn.classList.toggle('active', isShuffleMode); 
        
        if (isShuffleMode && currentPlaylist && currentPlaylist.length > 1 && currentTrackIndex !== -1) {
            console.log("account.js: toggleShuffle - Modo aleatorio activado. Reorganizando playlist actual.");
            const currentSong = currentPlaylist[currentTrackIndex]; 
            const remainingSongs = currentPlaylist.filter(song => song.id !== currentSong.id); 
            shuffleArray(remainingSongs); 
            currentPlaylist = [currentSong, ...remainingSongs];
            currentTrackIndex = 0; 
        }
        
        savePlayerPreferences(); 
        showToast(`Modo aleatorio ${isShuffleMode ? 'activado' : 'desactivado'}.`, 'info');
    }
    
    function updatePlayPauseButton() {
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' :  
                '<i class="fas fa-play"></i>';   
        }
    }
    
    function updatePlayerUI() {
        if (!currentPlayingTrack) {
            if (currentPlayer) currentPlayer.style.display = 'none'; 
            if(currentTrackImage) currentTrackImage.src = 'resources/album covers/placeholder.png';
            if(currentTrackName) currentTrackName.textContent = 'Selecciona una canción';
            if(currentTrackArtist) currentTrackArtist.textContent = 'Para comenzar';
            if(progressBar) progressBar.style.width = '0%';
            if(currentTimeDisplay) currentTimeDisplay.textContent = "0:00";
            if(totalTimeDisplay) totalTimeDisplay.textContent = "0:00";
            return;
        }
        
        if (currentTrackImage) { 
            currentTrackImage.src = currentPlayingTrack.image || 'resources/album covers/placeholder.png'; 
            currentTrackImage.alt = currentPlayingTrack.title || 'Portada de la canción'; 
        }
        if (currentTrackName) currentTrackName.textContent = currentPlayingTrack.title || 'Título Desconocido';
        if (currentTrackArtist) currentTrackArtist.textContent = currentPlayingTrack.artist || 'Artista Desconocido';
        
        if (progressBar) progressBar.style.width = '0%';
        if (currentTimeDisplay) currentTimeDisplay.textContent = '0:00';
        if (totalTimeDisplay) {
             totalTimeDisplay.textContent = (audioPlayer && !isNaN(audioPlayer.duration)) 
                                            ? formatTime(audioPlayer.duration) 
                                            : (currentPlayingTrack.duration || '0:00');
        }
        if (currentPlayer) currentPlayer.style.display = 'flex'; 
    }
    
    function startProgressUpdate() {
        stopProgressUpdate(); 
        progressInterval = setInterval(updateProgress, 500); 
        updateProgress(); 
    }
    
    function stopProgressUpdate() {
        if (progressInterval) { 
            clearInterval(progressInterval); 
            progressInterval = null; 
        }
    }
    
    function updateProgress() {
        if (!audioPlayer || !isPlaying || isNaN(audioPlayer.duration)) {
            if (progressBar && (!audioPlayer || isNaN(audioPlayer.duration))) {
                 progressBar.style.width = '0%';
            }
            return;
        }
        
        const duration = audioPlayer.duration;
        const currentTime = audioPlayer.currentTime;
        
        if (progressBar && duration > 0) { 
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
        }
        
        if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(currentTime);
        if (totalTimeDisplay && (totalTimeDisplay.textContent === "0:00" || isNaN(parseFloat(totalTimeDisplay.textContent.replace(':','.'))))) {
             if (!isNaN(duration)) totalTimeDisplay.textContent = formatTime(duration);
        }
    }
    
    function savePlayerPreferences() {
        if (!currentUser || !currentUser.uid || !firebase.auth().currentUser) {
            console.warn("account.js: savePlayerPreferences - No hay usuario actual o UID, no se guardan preferencias.");
            return;
        } 
        
        const preferences = {
            loop: isLoopMode,
            shuffle: isShuffleMode,
            volume: audioPlayer ? audioPlayer.volume : (volumeControl ? parseFloat(volumeControl.value) : 0.7) 
        };
        console.log("account.js: savePlayerPreferences - Guardando preferencias:", preferences);
        
        try { 
            localStorage.setItem(`player_preferences_${currentUser.uid}`, JSON.stringify(preferences)); 
        }
        catch (e) { console.warn("account.js: savePlayerPreferences - No se pudo guardar preferencias en localStorage:", e.message); }
        
        firebase.database().ref(`users/${currentUser.uid}/player_preferences`).set(preferences)
            .catch(error => console.error('account.js: savePlayerPreferences - Error al guardar preferencias en Firebase DB:', error.message));
    }
    
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
        
        if (savedPreferences) { 
            console.log("account.js: loadPlayerPreferences - Preferencias encontradas en localStorage.");
            try { 
                applyPlayerPreferences(JSON.parse(savedPreferences)); 
            }
            catch (error) { 
                console.error('account.js: loadPlayerPreferences - Error al parsear preferencias de localStorage. Intentando Firebase.', error.message); 
                loadPlayerPreferencesFromFirebase(); 
            }
        } else { 
            console.log("account.js: loadPlayerPreferences - No hay preferencias en localStorage. Intentando Firebase.");
            loadPlayerPreferencesFromFirebase(); 
        }
    }

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
                applyPlayerPreferences(preferences); 
                try { 
                    localStorage.setItem(`player_preferences_${uid}`, JSON.stringify(preferences)); 
                }
                catch (e) { console.warn("account.js: loadPlayerPreferencesFromFirebase - No se pudo guardar preferencias de Firebase en localStorage:", e.message); }
            } else {
                console.log("account.js: loadPlayerPreferencesFromFirebase - No hay preferencias guardadas en Firebase.");
                applyPlayerPreferences({ loop: false, shuffle: false, volume: 0.7 }); 
            }
        } catch (error) { 
            console.error('account.js: loadPlayerPreferencesFromFirebase - Error al cargar preferencias desde Firebase DB:', error.message); 
        }
    }

    function applyPlayerPreferences(preferences) {
        console.log("account.js: applyPlayerPreferences - Aplicando preferencias:", preferences);
        isLoopMode = preferences.loop || false; 
        isShuffleMode = preferences.shuffle || false;
        
        if (loopBtn) loopBtn.classList.toggle('active', isLoopMode);
        if (audioPlayer) audioPlayer.loop = isLoopMode; 
        if (shuffleBtn) shuffleBtn.classList.toggle('active', isShuffleMode);
        
        const volumeValue = (preferences.volume !== undefined && preferences.volume !== null) ? parseFloat(preferences.volume) : 0.7;
        if (audioPlayer) audioPlayer.volume = volumeValue;
        if (volumeControl) volumeControl.value = volumeValue; 
    }
    
    function updateLikeStatus(songId) {
        console.log(`account.js: updateLikeStatus - Actualizando estado de like en UI para canción ID: ${songId}`);
        document.querySelectorAll(`.song-item[data-id="${songId}"]`).forEach(item => {
            const likeBtn = item.querySelector('.song-like');
            if (likeBtn) {
                const isLiked = !!likedSongs[songId]; 
                likeBtn.classList.toggle('active', isLiked);
                const iconElement = likeBtn.querySelector('i');
                if (iconElement) iconElement.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            }
        });
    }
    
    function filterPlaylists(filterType) {
        console.log('account.js: filterPlaylists - Filtrando playlists por tipo:', filterType);
        updatePlaylistsUI(); 
    }

    async function showPlaylistDetails(playlistId) { 
        if (!playlistId) { 
            console.error("account.js: showPlaylistDetails - No se proporcionó ID de playlist."); 
            showToast('Error al cargar detalles: ID de playlist no especificado.', 'error');
            return; 
        }

        let playlist;
        if (window.PlaylistManager && typeof window.PlaylistManager.getPlaylistById === 'function') {
            playlist = window.PlaylistManager.getPlaylistById(playlistId);
        } else {
            playlist = userPlaylists.find(p => p.id === playlistId); 
        }

        if (!playlist) {
            console.error(`account.js: showPlaylistDetails - Playlist con ID ${playlistId} no encontrada.`);
            showToast('La playlist no se encontró o ya no existe.', 'error');
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'));
            if (modalInstance) modalInstance.hide();
            updatePlaylistsUI(); 
            return;
        }
        console.log(`account.js: showPlaylistDetails - Mostrando detalles para playlist: "${playlist.name}" (ID: ${playlist.id})`);
        
        const modalElement = document.getElementById('playlistDetailModal');
        const modalTitle = document.getElementById('playlistDetailModalLabel');
        const playlistNameEl = document.getElementById('playlistDetailName');
        const playlistDescriptionEl = document.getElementById('playlistDetailDescription');
        const playlistCreatorEl = document.getElementById('playlistDetailCreator');
        const playlistSongCountEl = document.getElementById('playlistDetailSongCount');
        const playlistCreatedAtEl = document.getElementById('playlistDetailCreatedAt');
        const playlistSongsListEl = document.getElementById('playlistSongsList'); 
        const playlistCoverLargeEl = modalElement.querySelector('.playlist-cover-large');

        if (modalTitle) modalTitle.textContent = playlist.name || "Detalles de Playlist";
        if (playlistNameEl) playlistNameEl.textContent = playlist.name || "Nombre Desconocido";
        if (playlistDescriptionEl) playlistDescriptionEl.textContent = playlist.description || "Esta playlist no tiene descripción.";
        
        if (playlistCoverLargeEl) {
            if (playlist.coverImage) {
                playlistCoverLargeEl.innerHTML = `<img src="${playlist.coverImage}" alt="${playlist.name}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
            } else { 
                playlistCoverLargeEl.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 3rem; color: white;"><i class="fas fa-music"></i></div>`;
            }
        }

        const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
        if (playlistCreatorEl && currentUser) {
            playlistCreatorEl.textContent = playlist.owner === currentUser.uid ? (currentUser.displayName || "Tú") : (playlist.ownerName || 'Otro usuario');
        }
        if (playlistSongCountEl) playlistSongCountEl.textContent = `${songCount}`;
        if (playlistCreatedAtEl && playlist.created_at) {
            playlistCreatedAtEl.textContent = new Date(playlist.created_at).toLocaleDateString('es-ES');
        }

        if (playlistSongsListEl) {
            if (songCount === 0) {
                playlistSongsListEl.innerHTML = `<li class="list-group-item text-center text-muted py-4"><i class="fas fa-compact-disc fa-2x mb-3"></i><p>Esta playlist está vacía.</p></li>`;
            } else {
                const songsArray = Object.values(playlist.songs).sort((a,b) => (a.added_at || 0) - (b.added_at || 0)); 
                playlistSongsListEl.innerHTML = ''; 
                songsArray.forEach((song, index) => {
                    const songItem = document.createElement('li');
                    songItem.className = 'list-group-item bg-transparent text-light p-0 song-item-in-playlist-detail d-flex align-items-center py-2 border-bottom border-secondary';
                    songItem.dataset.songId = song.id; 
                    songItem.innerHTML = `
                        <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title || 'Canción'}" class="me-3" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                        <div class="song-details flex-grow-1">
                            <h6 class="song-title mb-0 ellipsis-text" style="max-width: 300px;">${song.title || 'Título Desconocido'}</h6>
                            <small class="song-artist text-muted ellipsis-text" style="max-width: 300px;">${song.artist || 'Artista Desconocido'}</small>
                        </div>
                        <div class="ms-auto">
                            <button class="btn btn-sm btn-outline-light play-song-from-playlist-btn me-1" title="Reproducir canción"><i class="fas fa-play"></i></button>
                            ${playlist.owner === currentUser?.uid ? 
                            `<button class="btn btn-sm btn-outline-danger remove-from-playlist-detail-btn" title="Eliminar canción de la playlist"><i class="fas fa-trash-alt"></i></button>` : ''}
                        </div>`;
                    
                    songItem.querySelector('.play-song-from-playlist-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        const currentPlaylistSongs = Object.values(playlist.songs).sort((a,b) => (a.added_at || 0) - (b.added_at || 0));
                        const songIndex = currentPlaylistSongs.findIndex(s => s.id === song.id);
                        playPlaylist(currentPlaylistSongs, songIndex, playlist.id); 
                    });

                    if (playlist.owner === currentUser?.uid) {
                        songItem.querySelector('.remove-from-playlist-detail-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (!confirm(`¿Eliminar "${song.title}" de la playlist "${playlist.name}"?`)) return;
                            try {
                                showLoading(true);
                                if (window.PlaylistManager) {
                                    await window.PlaylistManager.removeSongFromPlaylist(song.id, playlist.id);
                                    const updatedPlaylist = window.PlaylistManager.getPlaylistById(playlist.id);
                                    if (updatedPlaylist) showPlaylistDetails(playlist.id); 
                                    else bootstrap.Modal.getInstance(modalElement)?.hide(); 
                                }
                                showToast('Canción eliminada.', 'success');
                            } catch (error) { showToast('Error al eliminar canción.', 'error'); }
                            finally { showLoading(false); }
                        });
                    }
                    playlistSongsListEl.appendChild(songItem);
                });
            }
        }

        const playAllBtn = document.getElementById('playAllPlaylistBtn');
        const editBtn = document.getElementById('editPlaylistBtnModal');
        const deleteBtn = document.getElementById('deletePlaylistBtnModal');

        if (playAllBtn) {
            const newPlayAllBtn = playAllBtn.cloneNode(true);
            playAllBtn.parentNode.replaceChild(newPlayAllBtn, playAllBtn);
            newPlayAllBtn.disabled = (songCount === 0);
            newPlayAllBtn.addEventListener('click', () => {
                playPlaylistById(playlist.id);
                bootstrap.Modal.getInstance(modalElement)?.hide();
            });
        }

        if (editBtn) {
            const newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.style.display = playlist.owner === currentUser?.uid ? 'inline-block' : 'none'; 
            newEditBtn.addEventListener('click', () => {
                bootstrap.Modal.getInstance(modalElement)?.hide();
                openEditPlaylistModal(playlist); 
            });
        }
        
        if (deleteBtn) {
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
            newDeleteBtn.style.display = playlist.owner === currentUser?.uid ? 'inline-block' : 'none'; 
            newDeleteBtn.addEventListener('click', async () => {
                if (confirm(`¿Eliminar la playlist "${playlist.name}"? Esta acción es irreversible.`)) {
                    try {
                        showLoading(true);
                        if (window.PlaylistManager) await window.PlaylistManager.deletePlaylist(playlist.id);
                        showToast('Playlist eliminada.', 'success');
                        bootstrap.Modal.getInstance(modalElement)?.hide(); 
                    } catch(error) { showToast('Error al eliminar playlist.', 'error'); }
                    finally { showLoading(false); }
                }
            });
        }
        
        if (modalElement) {
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (!modalInstance) modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();
        }
    }
   
    function openEditProfileModal() {
        if (!currentUser) { 
            showToast('No hay información de usuario cargada para editar el perfil.', 'error');
            return;
        }
        console.log("account.js: openEditProfileModal - Abriendo modal para editar perfil.");

        const nameInput = document.getElementById('editProfileNameInput');
        const photoURLInput = document.getElementById('editProfilePhotoURLInput');
        const bioInput = document.getElementById('editProfileBioInput');

        if (!nameInput || !photoURLInput || !bioInput) {
            console.error('account.js: openEditProfileModal - Elementos del formulario de edición de perfil no encontrados.');
            showToast('Error al intentar abrir el editor de perfil.', 'error');
            return;
        }

        nameInput.value = currentUser.displayName || '';
        photoURLInput.value = currentUser.photoURL || '';
        bioInput.value = currentUser.profileInfo && currentUser.profileInfo.bio ? currentUser.profileInfo.bio : '';
        
        const modalElement = document.getElementById('editProfileModal');
        if (modalElement) {
            let modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (!modalInstance) modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();
        }
    }

    async function saveProfileChanges() {
        if (!currentUser || !firebase.auth().currentUser) { 
            showToast('No estás autenticado.', 'error');
            return;
        }
        console.log("account.js: saveProfileChanges - Guardando cambios del perfil...");

        const nameInput = document.getElementById('editProfileNameInput');
        const photoURLInput = document.getElementById('editProfilePhotoURLInput');
        const bioInput = document.getElementById('editProfileBioInput');

        if (!nameInput || !photoURLInput || !bioInput) {
            showToast('Error interno al guardar el perfil.', 'error');
            return;
        }

        const newDisplayName = nameInput.value.trim();
        const newPhotoURL = photoURLInput.value.trim(); 
        const newBio = bioInput.value.trim();

        if (!newDisplayName) { 
            showToast('El nombre de usuario no puede estar vacío.', 'warning');
            return;
        }

        showLoading(true); 
        try {
            const userAuth = firebase.auth().currentUser; 
            
            if (newDisplayName !== (userAuth.displayName || '') || newPhotoURL !== (userAuth.photoURL || '')) {
                await userAuth.updateProfile({
                    displayName: newDisplayName,
                    photoURL: newPhotoURL || null 
                });
                currentUser.displayName = newDisplayName;
                currentUser.photoURL = newPhotoURL || null;
            }

            const currentBioInCache = currentUser.profileInfo && currentUser.profileInfo.bio ? currentUser.profileInfo.bio : '';
            if (newBio !== currentBioInCache) { 
                 await firebase.database().ref(`users/${userAuth.uid}/profileInfo/bio`).set(newBio || null); 
                 if (!currentUser.profileInfo) currentUser.profileInfo = {}; 
                 currentUser.profileInfo.bio = newBio || null;
            }
            
            updateUserProfile(currentUser); 

            const modalElement = document.getElementById('editProfileModal');
            if (modalElement) bootstrap.Modal.getInstance(modalElement)?.hide();
            showToast('Perfil actualizado con éxito.', 'success');

        } catch (error) {
            console.error('account.js: saveProfileChanges - Error:', error);
            showToast(`Error al actualizar el perfil: ${error.message}`, 'error');
        } finally {
            showLoading(false); 
        }
    }

    function openEditPlaylistModal(playlist) {
        if (!playlist || !playlist.id) { 
            showToast('Error: No se especificó la playlist a editar.', 'error');
            return;
        }
        console.log(`account.js: openEditPlaylistModal - Abriendo modal para editar playlist ID: ${playlist.id}`);

        const modalElement = document.getElementById('editPlaylistModal');
        const idInput = document.getElementById('editingPlaylistIdInput');
        const nameInput = document.getElementById('editPlaylistNameInput');
        const descriptionInput = document.getElementById('editPlaylistDescriptionInput');
        const publicInput = document.getElementById('editPlaylistPublicInput');

        if (!modalElement || !idInput || !nameInput || !descriptionInput || !publicInput) {
            showToast('Error al abrir el editor de playlist.', 'error');
            return;
        }
        
        idInput.value = playlist.id; 
        nameInput.value = playlist.name;
        descriptionInput.value = playlist.description || ''; 
        publicInput.checked = playlist.public || false; 

        let modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (!modalInstance) modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
    }

    async function savePlaylistChanges() {
        if (!currentUser) { 
            showToast('Debes iniciar sesión para editar playlists.', 'warning');
            return;
        }
        console.log("account.js: savePlaylistChanges - Guardando cambios de playlist...");

        const playlistIdInput = document.getElementById('editingPlaylistIdInput');
        const nameInput = document.getElementById('editPlaylistNameInput');
        const descriptionInput = document.getElementById('editPlaylistDescriptionInput');
        const publicInput = document.getElementById('editPlaylistPublicInput');

        if (!playlistIdInput || !nameInput || !descriptionInput || !publicInput) {
            showToast('Error interno al guardar cambios.', 'error');
            return;
        }

        const playlistId = playlistIdInput.value;
        const newName = nameInput.value.trim();
        const newDescription = descriptionInput.value.trim();
        const newIsPublic = publicInput.checked;

        if (!newName) {
            showToast('El nombre de la playlist no puede estar vacío.', 'error');
            return;
        }
        if (!playlistId) {
            showToast('Error: ID de playlist no encontrado.', 'error');
            return;
        }

        showLoading(true);
        try {
            const updatedData = {
                name: newName,
                description: newDescription,
                public: newIsPublic
            };

            if (window.PlaylistManager) {
                await window.PlaylistManager.updatePlaylist(playlistId, updatedData);
            } else {
                showToast('Error: Sistema de playlists no funcional.', 'error');
            }
            
            bootstrap.Modal.getInstance(document.getElementById('editPlaylistModal'))?.hide();
            showToast('Playlist actualizada con éxito.', 'success');
            
            // Después de actualizar, si el modal de detalles estaba abierto para esta playlist,
            // es buena idea refrescarlo también.
            const detailModalInstance = bootstrap.Modal.getInstance(document.getElementById('playlistDetailModal'));
            const detailModalLabel = document.getElementById('playlistDetailModalLabel');
            if (detailModalInstance && detailModalLabel && detailModalLabel.textContent.includes(newName)) { // Heurística simple
                showPlaylistDetails(playlistId);
            }


        } catch (error) {
            console.error('account.js: savePlaylistChanges - Error:', error);
            showToast(`Error al actualizar playlist: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }
    
    function formatTime(seconds) { 
        if (seconds == null || isNaN(seconds) || seconds < 0) {
            return '0:00'; 
        }
        const minutes = Math.floor(seconds / 60); 
        const remainingSeconds = Math.floor(seconds % 60); 
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    function getTimeAgo(timestamp) { 
        if (!timestamp) { 
            return 'fecha desconocida';
        }
        const now = Date.now(); 
        const diff = now - timestamp; 
        
        const seconds = Math.floor(diff / 1000);
        if (seconds < 5) return 'justo ahora'; 
        if (seconds < 60) return `hace ${seconds} segundos`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return `hace ${days} ${days === 1 ? 'día' : 'días'}`;

        const date = new Date(timestamp);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    function hashCode(str) { 
        let hash = 0;
        if (!str || str.length === 0) return hash; 
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i); 
            hash = ((hash << 5) - hash) + char; 
            hash |= 0; 
        }
        return hash;
    }
    
    function shuffleArray(array) { 
        if (!array) return []; 
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array; 
    }
    
    function showLoading(show) { 
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.style.display = 'flex'; 
                setTimeout(() => loadingOverlay.classList.add('show'), 10); 
            } else {
                loadingOverlay.classList.remove('show');
                setTimeout(() => {
                    if (!loadingOverlay.classList.contains('show')) { 
                         loadingOverlay.style.display = 'none';
                    }
                }, 300); 
            }
        }
    }
    
    function showToast(message, type = 'success') { 
        const toastContainer = document.getElementById('toastContainer') || createToastContainer();
        if (!toastContainer) { 
            console.error("account.js: showToast - No se pudo obtener o crear toastContainer.");
            alert(message); // Fallback a alert si no se puede mostrar toast
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toastify-toast app-toast ${type}`; 
        
        let backgroundColor;
        let iconClass;
        switch (type) {
            case 'success':
                backgroundColor = 'var(--bs-success, #28a745)'; 
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
            default: 
                backgroundColor = 'var(--bs-info, #17a2b8)';
                iconClass = 'fas fa-info-circle';
                break;
        }
        
        toast.style.cssText = `
            background: ${backgroundColor}; color: white; padding: 12px 20px;
            border-radius: 0.375rem; box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.15); 
            display: flex; align-items: center; gap: 10px; 
            margin-bottom: 10px; opacity: 0;
            transform: translateX(110%); 
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
            max-width: 350px; word-wrap: break-word; 
        `;
        
        toast.innerHTML = `
            <i class="${iconClass}" style="font-size: 1.2em; flex-shrink: 0;"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast); 
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10); 
        
        const duration = type === 'error' ? 5000 : 3000; 
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(110%)'; 
            setTimeout(() => {
                toast.remove();
            }, 300); 
        }, duration);
    }

    function createToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) { 
            container = document.createElement('div');
            container.id = 'toastContainer'; 
            container.style.cssText = `
                position: fixed; bottom: 20px; right: 20px;
                z-index: 10000; display: flex;
                flex-direction: column; align-items: flex-end; 
            `;
            try {
                document.body.appendChild(container);
            } catch (error) {
                console.error("account.js: createToastContainer - Error al añadir toastContainer al body:", error);
                return null; 
            }
        }
        return container;
    }
    
    function logout() {
        console.log("account.js: logout - Cerrando sesión del usuario...");
        stopPlayback(); 
        
        const uid_before_logout = currentUser ? currentUser.uid : null; 
        
        firebase.auth().signOut()
            .then(() => {
                console.log('account.js: logout - Usuario desconectado de Firebase correctamente.');
                currentUser = null; likedSongs = {}; recentlyPlayed = []; userPlaylists = []; followedArtists = [];
                currentPlayingTrack = null; currentPlaylist = []; currentTrackIndex = -1;
                
                if (uid_before_logout) { 
                    localStorage.removeItem(`player_preferences_${uid_before_logout}`);
                } else { 
                    localStorage.removeItem('player_preferences'); 
                }
                
                if (window.location.pathname.includes('account.html')) {
                     window.location.href = 'login.html';
                }
            })
            .catch(error => { 
                console.error('account.js: logout - Error al cerrar sesión en Firebase:', error); 
                showToast('Ocurrió un error al intentar cerrar sesión.', 'error'); 
            });
    }
    
    function initializeEffects() {
        console.log('account.js: initializeEffects - Inicializando efectos visuales...');
        createFloatingNotes();
        addHoverEffects();
        console.log('account.js: initializeEffects - Efectos visuales (notas, hovers) configurados.');
    }
    
    function createFloatingNotes() {
        const notesContainer = document.querySelector('.notes-container'); 
        if (!notesContainer) {
            console.warn("account.js: createFloatingNotes - Contenedor '.notes-container' no encontrado.");
            return;
        }
        console.log("account.js: createFloatingNotes - Creando notas flotantes...");
        
        const notesSymbols = ['♪', '♫', '𝅘𝅥𝅮', '𝅘𝅥', '𝅘𝅥𝅯', '𝅗𝅥', '𝄞', '♩', '𝆕', '𝆖', '𝆗', '𝆘'];
        const noteCount = Math.min(20, Math.floor(window.innerWidth / 100)); 
        
        notesContainer.innerHTML = ''; 
        
        for (let i = 0; i < noteCount; i++) {
            const noteElement = document.createElement('div');
            noteElement.className = 'floating-note'; 
            noteElement.innerHTML = notesSymbols[Math.floor(Math.random() * notesSymbols.length)];
            
            noteElement.style.left = `${Math.random() * 100}%`;
            noteElement.style.top = `${Math.random() * 100}%`; 
            noteElement.style.setProperty('--animation-delay', `${Math.random() * 10}s`); 
            noteElement.style.setProperty('--animation-duration', `${15 + Math.random() * 20}s`); 
            noteElement.style.opacity = (0.05 + Math.random() * 0.25).toFixed(2); 
            noteElement.style.fontSize = `${0.7 + Math.random() * 1.3}rem`; 
            
            notesContainer.appendChild(noteElement); 
        }
        console.log(`account.js: createFloatingNotes - ${noteCount} notas flotantes creadas.`);
    }
    
    function addHoverEffects() {
        console.log("account.js: addHoverEffects - Añadiendo efectos de hover...");
        const statBoxes = document.querySelectorAll('.stat-box');
        statBoxes.forEach(box => {
            box.style.transition = 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out';
            
            box.addEventListener('mouseenter', () => {
                box.style.transform = 'translateY(-6px) scale(1.03)';
                box.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)'; 
            });
            
            box.addEventListener('mouseleave', () => {
                box.style.transform = 'translateY(0) scale(1)';
                box.style.boxShadow = 'var(--card-shadow, 0 6px 15px rgba(0,0,0,0.2))'; 
            });
        });
        console.log("account.js: addHoverEffects - Efectos de hover configurados para cajas de estadísticas.");
    }
    
    function animateCounters() {
        console.log("account.js: animateCounters - Animando contadores de estadísticas...");
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(statNumberElement => {
            const targetValue = parseInt(statNumberElement.textContent, 10); 
            
            if (!isNaN(targetValue) && targetValue >= 0) {
                statNumberElement.textContent = '0'; 
                let currentValue = 0;
                const animationDuration = 1200; 
                const animationSteps = 60;      
                const increment = targetValue > 0 ? (targetValue / animationSteps) : 0;
                const intervalTime = animationDuration / animationSteps; 
                
                let stepCount = 0;
                const counterInterval = setInterval(() => {
                    currentValue += increment;
                    stepCount++;
                    
                    if (currentValue >= targetValue || stepCount >= animationSteps) {
                        clearInterval(counterInterval);
                        statNumberElement.textContent = targetValue; 
                    } else {
                        statNumberElement.textContent = Math.floor(currentValue); 
                    }
                }, intervalTime);
            } else if (!isNaN(targetValue) && targetValue < 0) {
                statNumberElement.textContent = targetValue;
            }
        });
        console.log("account.js: animateCounters - Animación de contadores iniciada.");
    }
    
} 

document.addEventListener('firebaseReady', () => {
    console.log("account.js: Evento 'firebaseReady' recibido.");
    initializeAccountSystem(); 
});

setTimeout(() => {
    if (!accountSystemInitialized) {
        console.warn("account.js: Fallback de inicialización después de timeout.");
        waitForFirebaseAndInitialize(); 
    }
}, 1000); 

console.log("account.js: Script cargado.");