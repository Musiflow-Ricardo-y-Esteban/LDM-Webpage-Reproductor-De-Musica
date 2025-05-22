// account.js - Sistema mejorado para gestión de cuentas de usuario

/**
 * FUNCIÓN PRINCIPAL: Este script gestiona todas las funcionalidades de la cuenta de usuario 
 * en MusiFlow, incluyendo la visualización de datos del perfil, historial de reproducción, 
 * canciones favoritas, playlists y preferencias de usuario.
 */

// Se ejecuta cuando la página está completamente cargada
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa las animaciones (si AOS está disponible)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }

    // Obtiene referencias a elementos importantes de la interfaz
    const profileNameElement = document.getElementById('profileName');
    const profileEmailElement = document.getElementById('profileEmail');
    const profileAvatarElement = document.getElementById('profileAvatar');
    const memberSinceElement = document.getElementById('memberSince');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    // Contadores en la UI
    const likedSongsCountElement = document.getElementById('likedSongsCount');
    const playlistsCountElement = document.getElementById('playlistsCount');
    const followedArtistsCountElement = document.getElementById('followedArtistsCount');
    
    // Contenedores de listas
    const likedSongsListElement = document.getElementById('likedSongsList');
    const recentlyPlayedListElement = document.getElementById('recentlyPlayedList');
    const userPlaylistsListElement = document.getElementById('userPlaylistsList');
    
    // Botones y elementos de acción
    const playAllLikedBtn = document.getElementById('playAllLikedBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const createFirstPlaylistBtn = document.getElementById('createFirstPlaylistBtn');
    const savePlaylistBtn = document.getElementById('savePlaylistBtn');
    const createPlaylistFromModalBtn = document.getElementById('createPlaylistFromModalBtn');
    
    // Elementos del reproductor
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
    
    // Almacenamiento local de datos del usuario
    let currentUser = null;         // Información básica del usuario
    let likedSongs = {};            // Canciones que le gustan al usuario
    let recentlyPlayed = [];        // Historial de reproducción
    let userPlaylists = [];         // Listas de reproducción del usuario
    let followedArtists = [];       // Artistas seguidos
    
    // Variables para reproducción de música
    let audioPlayer = null;         // Elemento de audio HTML
    let currentPlayingTrack = null; // Pista actual reproduciéndose
    let isPlaying = false;          // Estado de reproducción
    let currentPlaylist = [];       // Lista actual de reproducción
    let currentTrackIndex = -1;     // Índice en la lista actual
    let isShuffleMode = false;      // Modo aleatorio
    let isLoopMode = false;         // Modo bucle
    let progressInterval = null;    // Intervalo para actualizar la barra de progreso
    let currentPlaylistId = null;   // ID de la playlist actual si se está reproduciendo una
    let selectedSongForPlaylist = null; // Canción seleccionada para añadir a playlist
    
    // Inicia los efectos visuales
    initializeEffects();
    
    // Espera a que Firebase Authentication esté listo antes de continuar
    document.addEventListener('authStateChanged', async (event) => {
        const user = event.detail.user;
        
        if (user) {
            // Si el usuario está autenticado, carga sus datos
            await initializeUserData(user);
        } 
        // Si no está autenticado, common-auth.js redirigirá automáticamente
    });
    
    /**
     * FUNCIÓN IMPORTANTE: Inicializa todos los datos del usuario
     * Carga la información del perfil, canciones, listas y artistas
     */
    async function initializeUserData(user) {
        try {
            // Oculta la pantalla de carga
            showLoading(false);
            
            // Guarda los datos del usuario
            currentUser = user;
            
            // Actualiza la interfaz del perfil con los datos del usuario
            updateUserProfile(user);
            
            // Inicializar sistemas de gestión
            await initializeManagementSystems();
            
            // Carga todos los datos del usuario desde Firebase
            await loadUserData();
            
            // Configura los controladores de eventos
            setupEventListeners();
            
            // Inicializa la funcionalidad del reproductor
            setupMusicPlayer();
        } catch (error) {
            console.error('Error al inicializar datos de usuario:', error);
            showToast('Error al cargar datos de usuario', 'error');
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Inicializa los sistemas de gestión (likes, playlists)
     * Conecta los diferentes módulos entre sí
     */
    async function initializeManagementSystems() {
        try {
            // Inicializar sistema de likes si está disponible
            if (window.LikesManager) {
                await window.LikesManager.init();
                console.log('Sistema de likes inicializado correctamente');
                
                // Añadir listener para cambios de likes
                window.LikesManager.addLikeChangeListener((songId, isLiked) => {
                    console.log(`Cambio de like detectado: ${songId} - ${isLiked ? 'agregado' : 'eliminado'}`);
                    // Actualizar UI cuando cambian los likes
                    updateLikeStatusInUI(songId, isLiked);
                });
            }
            
            // Inicializar sistema de playlists si está disponible
            if (window.PlaylistManager) {
                await window.PlaylistManager.init();
                console.log('Sistema de playlists inicializado correctamente');
                
                // Añadir listener para cambios de playlists
                window.PlaylistManager.addPlaylistChangeListener((action, playlist, song) => {
                    console.log(`Cambio de playlist detectado: ${action}`, playlist, song);
                    // Actualizar UI cuando cambian las playlists
                    updatePlaylistsAfterChange(action, playlist, song);
                });
            }
        } catch (error) {
            console.error('Error al inicializar sistemas de gestión:', error);
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Carga todos los datos del usuario desde Firebase
     * Utilizando llamadas en paralelo para mejorar el rendimiento
     */
    async function loadUserData() {
        try {
            showLoading(true);
            
            // Verifica que el usuario siga autenticado
            if (!firebase.auth().currentUser) {
                throw new Error('Usuario no autenticado');
            }
            
            // Carga todos los datos del usuario en paralelo para mayor eficiencia
            const [likedResult, recentResult, playlistResult, artistResult] = await Promise.all([
                loadLikedSongsFromSystem(),      // Usar sistema de likes integrado
                loadRecentlyPlayed(),            // Carga historial de reproducción
                loadUserPlaylistsFromSystem(),   // Usar sistema de playlists integrado
                loadFollowedArtists()            // Carga artistas seguidos
            ]);
            
            // Actualiza la interfaz con los datos cargados
            updateUserStats();
            updateLikedSongsUI();
            updateRecentlyPlayedUI();
            updatePlaylistsUI();
            
            showLoading(false);
        } catch (error) {
            console.error('Error al cargar datos de usuario:', error);
            showToast('Error al cargar datos de usuario', 'error');
            showLoading(false);
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Carga las canciones favoritas usando el sistema integrado
     */
    async function loadLikedSongsFromSystem() {
        try {
            if (window.LikesManager) {
                likedSongs = window.LikesManager.getAllLikedSongs();
                console.log('Canciones favoritas cargadas desde LikesManager:', Object.keys(likedSongs).length);
            } else {
                // Fallback al método directo si LikesManager no está disponible
                const uid = firebase.auth().currentUser.uid;
                const snapshot = await firebase.database().ref(`users/${uid}/liked_songs`).once('value');
                likedSongs = snapshot.val() || {};
                console.log('Canciones favoritas cargadas directamente:', Object.keys(likedSongs).length);
            }
            return likedSongs;
        } catch (error) {
            console.error('Error al cargar canciones favoritas:', error);
            return {};
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Carga las playlists usando el sistema integrado
     */
    async function loadUserPlaylistsFromSystem() {
        try {
            if (window.PlaylistManager) {
                userPlaylists = window.PlaylistManager.getAllPlaylists();
                console.log('Playlists cargadas desde PlaylistManager:', userPlaylists.length);
            } else {
                // Fallback al método directo si PlaylistManager no está disponible
                const uid = firebase.auth().currentUser.uid;
                const snapshot = await firebase.database().ref(`users/${uid}/playlists`).once('value');
                const data = snapshot.val() || {};
                userPlaylists = Object.values(data);
                console.log('Playlists cargadas directamente:', userPlaylists.length);
            }
            return userPlaylists;
        } catch (error) {
            console.error('Error al cargar playlists:', error);
            return [];
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Actualiza la información del perfil en la interfaz
     * Muestra nombre, email, avatar y fecha de registro
     */
    function updateUserProfile(user) {
        // Establece el nombre y correo del perfil
        if (profileNameElement) {
            profileNameElement.textContent = user.displayName || user.username || user.email.split('@')[0];
        }
        
        if (profileEmailElement) {
            profileEmailElement.textContent = user.email;
        }
        
        // Establece la fecha de registro
        if (memberSinceElement) {
            const memberSinceDate = user.created_at 
                ? new Date(user.created_at)
                : new Date();
            
            const formattedDate = new Intl.DateTimeFormat('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(memberSinceDate);
            
            memberSinceElement.textContent = `Miembro desde: ${formattedDate}`;
        }
        
        // Establece el avatar
        if (profileAvatarElement) {
            if (user.photoURL || user.profile_picture) {
                // Si el usuario tiene foto de perfil
                const photoUrl = user.photoURL || user.profile_picture;
                profileAvatarElement.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                // Genera un avatar con la primera letra del nombre/email
                const firstLetter = (user.displayName || user.username || user.email).charAt(0).toUpperCase();
                profileAvatarElement.innerHTML = firstLetter;
                
                // Color aleatorio basado en el nombre de usuario
                const hue = Math.abs(hashCode(user.email) % 360);
                profileAvatarElement.style.background = `hsl(${hue}, 70%, 60%)`;
            }
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Carga el historial de reproducción del usuario
     * Obtiene los datos desde Firebase y los almacena localmente
     */
    async function loadRecentlyPlayed() {
        try {
            if (!firebase.auth().currentUser) return [];
            
            const uid = firebase.auth().currentUser.uid;
            const snapshot = await firebase.database().ref(`users/${uid}/recently_played`).orderByChild('timestamp').limitToLast(20).once('value');
            
            const data = snapshot.val() || {};
            recentlyPlayed = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
            
            console.log('Historial de reproducción cargado:', recentlyPlayed.length);
            return recentlyPlayed;
        } catch (error) {
            console.error('Error al cargar historial de reproducción:', error);
            return [];
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Carga los artistas seguidos por el usuario
     * Obtiene los datos desde Firebase y los almacena localmente
     */
    async function loadFollowedArtists() {
        try {
            if (!firebase.auth().currentUser) return [];
            
            const uid = firebase.auth().currentUser.uid;
            const snapshot = await firebase.database().ref(`users/${uid}/followed_artists`).once('value');
            
            const data = snapshot.val() || {};
            followedArtists = Object.values(data);
            
            console.log('Artistas seguidos cargados:', followedArtists.length);
            return followedArtists;
        } catch (error) {
            console.error('Error al cargar artistas seguidos:', error);
            return [];
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Actualiza las estadísticas en la interfaz
     * Muestra el número de playlists, canciones favoritas y artistas seguidos
     */
    function updateUserStats() {
        if (likedSongsCountElement) {
            likedSongsCountElement.textContent = Object.keys(likedSongs).length;
        }
        
        if (playlistsCountElement) {
            playlistsCountElement.textContent = userPlaylists.length;
        }
        
        if (followedArtistsCountElement) {
            followedArtistsCountElement.textContent = followedArtists.length;
        }
        
        // Animación para los contadores
        animateCounters();
    }
    
    /**
     * FUNCIÓN MEJORADA: Actualiza la sección de canciones favoritas en la UI
     * Muestra las canciones con formato adecuado y opciones de reproducción
     */
    function updateLikedSongsUI() {
        if (!likedSongsListElement) return;
        
        // Convierte el objeto de canciones favoritas en un array para facilitar su manejo
        const songsArray = Object.values(likedSongs);
        
        if (songsArray.length === 0) {
            // Mensaje si no hay canciones favoritas
            likedSongsListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="far fa-heart fa-2x mb-3"></i>
                    <p>Aún no has marcado canciones como favoritas.</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light">
                        <i class="fas fa-compass me-2"></i> Explorar música
                    </a>
                </div>
            `;
            return;
        }
        
        // Limpiar el contenedor
        likedSongsListElement.innerHTML = '';
        
        // Crear y agregar cada elemento de canción
        songsArray.forEach(song => {
            const sourceLabel = song.sourceOrigin === 'spotify' ? 
                '<span class="song-source spotify">Spotify</span>' : 
                '<span class="song-source local">Local</span>';
            
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.id = song.id;
            songItem.dataset.source = song.sourceOrigin || 'local';
            songItem.innerHTML = `
                <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title}" class="song-cover">
                <div class="song-details">
                    <h5 class="song-title">${song.title} ${sourceLabel}</h5>
                    <p class="song-artist">${song.artist}</p>
                </div>
                <div class="song-like active">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn add-to-playlist-btn" title="Añadir a playlist">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <button class="song-action-btn remove-from-liked-btn" title="Eliminar de favoritos">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Evento para reproducir la canción al hacer clic
            songItem.addEventListener('click', (e) => {
                // No reproducir si se hizo clic en un botón de acción
                if (e.target.closest('.song-action-btn') || e.target.closest('.song-like')) {
                    return;
                }
                playSong(song);
            });
            
            // Evento para el botón de eliminar de favoritos
            const removeBtn = songItem.querySelector('.remove-from-liked-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', async () => {
                    await removeSongFromLiked(song.id);
                });
            }
            
            // Evento para el botón de añadir a playlist
            const addToPlaylistBtn = songItem.querySelector('.add-to-playlist-btn');
            if (addToPlaylistBtn) {
                addToPlaylistBtn.addEventListener('click', () => {
                    showAddToPlaylistModal(song);
                });
            }
            
            // Evento para el botón de me gusta (ya está activo, así que al hacer clic lo quita)
            const likeBtn = songItem.querySelector('.song-like');
            if (likeBtn) {
                likeBtn.addEventListener('click', async () => {
                    await removeSongFromLiked(song.id);
                });
            }
            
            likedSongsListElement.appendChild(songItem);
        });
        
        // Habilitar el botón "Reproducir todo" si hay canciones
        if (playAllLikedBtn) {
            playAllLikedBtn.disabled = songsArray.length === 0;
            
            // Limpiar eventos anteriores y añadir nuevo
            const newPlayAllBtn = playAllLikedBtn.cloneNode(true);
            playAllLikedBtn.parentNode.replaceChild(newPlayAllBtn, playAllLikedBtn);
            
            // Evento para reproducir todas las canciones favoritas
            newPlayAllBtn.addEventListener('click', () => {
                if (songsArray.length > 0) {
                    playPlaylist(songsArray, 0, "liked_songs");
                }
            });
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Actualiza el historial de reproducción en la interfaz
     * Muestra las canciones reproducidas recientemente con formato de tiempo relativo
     */
    function updateRecentlyPlayedUI() {
        if (!recentlyPlayedListElement) return;
        
        if (recentlyPlayed.length === 0) {
            // Muestra mensaje si no hay canciones recientes
            recentlyPlayedListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-2x mb-3"></i>
                    <p>Aún no has escuchado ninguna canción.</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light">
                        <i class="fas fa-compass me-2"></i> Descubrir música
                    </a>
                </div>
            `;
            return;
        }
        
        // Limpia la lista actual
        recentlyPlayedListElement.innerHTML = '';
        
        // Añade cada canción reproducida recientemente
        recentlyPlayed.forEach(song => {
            const timeAgo = getTimeAgo(song.timestamp);
            const sourceLabel = song.sourceOrigin === 'spotify' ? 
                '<span class="song-source spotify">Spotify</span>' : 
                '<span class="song-source local">Local</span>';
            
            const isLiked = likedSongs[song.id] ? 'active' : '';
            const heartIcon = isLiked ? 'fas' : 'far';
            
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.id = song.id;
            songItem.dataset.source = song.sourceOrigin || 'local';
            songItem.innerHTML = `
                <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title}" class="song-cover">
                <div class="song-details">
                    <h5 class="song-title">${song.title} ${sourceLabel}</h5>
                    <p class="song-artist">${song.artist}</p>
                </div>
                <div class="song-time">${timeAgo}</div>
                <div class="song-like ${isLiked}">
                    <i class="${heartIcon} fa-heart"></i>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn add-to-playlist-btn" title="Añadir a playlist">
                        <i class="fas fa-list-ul"></i>
                    </button>
                </div>
            `;
            
            // Evento para reproducir la canción al hacer clic
            songItem.addEventListener('click', (e) => {
                // No reproducir si se hizo clic en un botón de acción
                if (e.target.closest('.song-action-btn') || e.target.closest('.song-like')) {
                    return;
                }
                playSong(song);
            });
            
            // Evento para el botón de me gusta
            const likeBtn = songItem.querySelector('.song-like');
            if (likeBtn) {
                likeBtn.addEventListener('click', async () => {
                    await toggleLikeSong(song);
                });
            }
            
            // Evento para el botón de añadir a playlist
            const addToPlaylistBtn = songItem.querySelector('.add-to-playlist-btn');
            if (addToPlaylistBtn) {
                addToPlaylistBtn.addEventListener('click', () => {
                    showAddToPlaylistModal(song);
                });
            }
            
            recentlyPlayedListElement.appendChild(songItem);
        });
        
        // Configurar botón de limpiar historial
        if (clearHistoryBtn) {
            // Limpiar eventos anteriores
            const newClearBtn = clearHistoryBtn.cloneNode(true);
            clearHistoryBtn.parentNode.replaceChild(newClearBtn, clearHistoryBtn);
            
            newClearBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres limpiar tu historial de reproducción?')) {
                    clearPlayHistory();
                }
            });
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Actualiza la sección de playlists en la interfaz
     * Muestra las playlists del usuario con opciones para gestión
     */
    function updatePlaylistsUI() {
        if (!userPlaylistsListElement) return;
        
        if (userPlaylists.length === 0) {
            // Mensaje si no hay playlists
            userPlaylistsListElement.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-music fa-2x mb-3"></i>
                    <p>Aún no tienes playlists.</p>
                    <button class="btn btn-sm btn-outline-light" id="createFirstPlaylistBtn">
                        <i class="fas fa-plus me-2"></i> Crear mi primera playlist
                    </button>
                </div>
            `;
            
            // Configurar el botón de crear primera playlist
            const createFirstBtn = document.getElementById('createFirstPlaylistBtn');
            if (createFirstBtn) {
                createFirstBtn.addEventListener('click', showCreatePlaylistModal);
            }
            
            return;
        }
        
        // Limpiar el contenedor
        userPlaylistsListElement.innerHTML = '';
        
        // Crear y agregar cada elemento de playlist
        userPlaylists.forEach(playlist => {
            const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
            
            const playlistItem = document.createElement('div');
            playlistItem.className = 'playlist-item';
            playlistItem.dataset.id = playlist.id;
            playlistItem.innerHTML = `
                <div class="playlist-cover">
                    <i class="fas fa-music"></i>
                </div>
                <div class="flex-grow-1">
                    <h5 class="playlist-title">${playlist.name}</h5>
                    <p class="playlist-info">${songCount} ${songCount === 1 ? 'canción' : 'canciones'}</p>
                </div>
                <div class="song-actions">
                    <button class="song-action-btn play-playlist-btn" title="Reproducir">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="song-action-btn view-playlist-btn" title="Ver detalles">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </div>
            `;
            
            // Evento para ver detalles de la playlist
            playlistItem.addEventListener('click', (e) => {
                // No mostrar detalles si se hizo clic en un botón de acción
                if (e.target.closest('.song-action-btn')) {
                    return;
                }
                showPlaylistDetails(playlist);
            });
            
            // Evento para reproducir la playlist
            const playBtn = playlistItem.querySelector('.play-playlist-btn');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    playPlaylistById(playlist.id);
                });
            }
            
            // Evento para ver detalles de la playlist
            const viewBtn = playlistItem.querySelector('.view-playlist-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    showPlaylistDetails(playlist);
                });
            }
            
            userPlaylistsListElement.appendChild(playlistItem);
        });
    }
    
    //===================================================================
    // FUNCIONES MEJORADAS DE GESTIÓN DE LIKES, HISTORIAL Y PLAYLISTS
    //===================================================================
    
    /**
     * FUNCIÓN MEJORADA: Alterna el estado "me gusta" de una canción usando el sistema integrado
     * @param {Object} song - Objeto con datos de la canción
     */
    async function toggleLikeSong(song) {
        if (!song || !song.id) return;
        
        try {
            if (window.LikesManager) {
                // Usar el sistema integrado de likes
                await window.LikesManager.toggleLike(song);
                showToast(`Canción ${window.LikesManager.isLiked(song.id) ? 'añadida a' : 'eliminada de'} favoritos`, 'success');
            } else {
                // Fallback al método directo
                if (likedSongs[song.id]) {
                    await removeSongFromLiked(song.id);
                } else {
                    await addSongToLiked(song);
                }
            }
        } catch (error) {
            console.error('Error al cambiar estado de like:', error);
            showToast('Error al actualizar favoritos', 'error');
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Añade una canción a favoritos
     * @param {Object} song - Objeto con datos de la canción
     */
    async function addSongToLiked(song) {
        if (!song || !song.id || !firebase.auth().currentUser) return;
        
        try {
            if (window.LikesManager) {
                await window.LikesManager.addSongToLiked(song);
            } else {
                // Fallback al método directo
                const uid = firebase.auth().currentUser.uid;
                await firebase.database().ref(`users/${uid}/liked_songs/${song.id}`).set({
                    ...song,
                    added_at: Date.now()
                });
                
                // Actualizar local
                likedSongs[song.id] = {
                    ...song,
                    added_at: Date.now()
                };
            }
            
            showToast('Canción añadida a favoritos', 'success');
            
            // Actualizar UI
            updateUserStats();
            updateLikedSongsUI();
            updateRecentlyPlayedUI();
            
        } catch (error) {
            console.error('Error al añadir canción a favoritos:', error);
            showToast('Error al añadir canción a favoritos', 'error');
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Elimina una canción de favoritos
     * @param {string} songId - ID de la canción a eliminar
     */
    async function removeSongFromLiked(songId) {
        if (!songId || !firebase.auth().currentUser) return;
        
        try {
            if (window.LikesManager) {
                await window.LikesManager.removeSongFromLiked(songId);
            } else {
                // Fallback al método directo
                const uid = firebase.auth().currentUser.uid;
                await firebase.database().ref(`users/${uid}/liked_songs/${songId}`).remove();
                
                // Eliminar local
                delete likedSongs[songId];
            }
            
            showToast('Canción eliminada de favoritos', 'success');
            
            // Actualizar UI
            updateUserStats();
            updateLikedSongsUI();
            updateRecentlyPlayedUI();
            
        } catch (error) {
            console.error('Error al eliminar canción de favoritos:', error);
            showToast('Error al eliminar canción de favoritos', 'error');
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Actualiza el estado visual de "me gusta" en la UI
     * @param {string} songId - ID de la canción a actualizar
     * @param {boolean} isLiked - Nuevo estado de like
     */
    function updateLikeStatusInUI(songId, isLiked) {
        // Actualizar estado local
        if (isLiked) {
            // Si se necesita más información de la canción, buscarla en el historial reciente
            const recentSong = recentlyPlayed.find(s => s.id === songId);
            if (recentSong) {
                likedSongs[songId] = recentSong;
            }
        } else {
            delete likedSongs[songId];
        }
        
        // Buscar todos los elementos de canción con este ID
        document.querySelectorAll(`.song-item[data-id="${songId}"]`).forEach(item => {
            const likeBtn = item.querySelector('.song-like');
            
            if (likeBtn) {
                // Actualizar clases e ícono
                likeBtn.classList.toggle('active', isLiked);
                likeBtn.querySelector('i').className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            }
        });
        
        // Actualizar estadísticas
        updateUserStats();
        
        // Si estamos en la sección de favoritos, actualizar toda la UI
        if (window.location.hash === '#liked' || likedSongsListElement.querySelector('.song-item')) {
            updateLikedSongsUI();
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Añade una canción al historial de reproducción
     * @param {Object} song - Objeto con datos de la canción
     */
    async function addToPlayHistory(song) {
        if (!song || !song.id || !firebase.auth().currentUser) return;
        
        try {
            const uid = firebase.auth().currentUser.uid;
            const timestamp = Date.now();
            
            // Añadir a Firebase
            await firebase.database().ref(`users/${uid}/recently_played/${song.id}`).set({
                ...song,
                timestamp,
                sourceOrigin: song.sourceOrigin || 'local'
            });
            
            // Actualizar local (asegurar que no hay duplicados)
            const existingIndex = recentlyPlayed.findIndex(s => s.id === song.id);
            
            if (existingIndex !== -1) {
                // Si ya existe, quitar el antiguo
                recentlyPlayed.splice(existingIndex, 1);
            }
            
            // Añadir al principio
            recentlyPlayed.unshift({
                ...song,
                timestamp,
                sourceOrigin: song.sourceOrigin || 'local'
            });
            
            // Limitar a 20 elementos
            if (recentlyPlayed.length > 20) {
                recentlyPlayed = recentlyPlayed.slice(0, 20);
            }
            
            console.log('Canción añadida al historial:', song.title);
            
        } catch (error) {
            console.error('Error al añadir canción al historial:', error);
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Limpia el historial de reproducción
     */
    async function clearPlayHistory() {
        if (!firebase.auth().currentUser) return;
        
        try {
            const uid = firebase.auth().currentUser.uid;
            
            // Limpiar en Firebase
            await firebase.database().ref(`users/${uid}/recently_played`).remove();
            
            // Limpiar local
            recentlyPlayed = [];
            
            // Actualizar UI
            updateRecentlyPlayedUI();
            
            showToast('Historial de reproducción eliminado', 'success');
        } catch (error) {
            console.error('Error al limpiar historial de reproducción:', error);
            showToast('Error al limpiar historial', 'error');
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Muestra el modal para añadir una canción a una playlist
     * @param {Object} song - Objeto con datos de la canción
     */
    function showAddToPlaylistModal(song) {
        if (!song) return;
        
        // Guardar la canción seleccionada
        selectedSongForPlaylist = song;
        
        // Actualizar info de la canción en el modal
        const songInfoElement = document.getElementById('selectedSongInfo');
        if (songInfoElement) {
            songInfoElement.innerHTML = `
                <div class="d-flex align-items-center mb-3">
                    <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title}" 
                        style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;">
                    <div>
                        <h5 class="m-0">${song.title}</h5>
                        <p class="text-muted m-0">${song.artist}</p>
                    </div>
                </div>
                <p class="mb-2">Selecciona una playlist para añadir esta canción:</p>
            `;
        }
        
        // Actualizar lista de playlists en el modal
        const playlistsContainerElement = document.getElementById('userPlaylistsForSelection');
        if (playlistsContainerElement) {
            if (userPlaylists.length === 0) {
                playlistsContainerElement.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <p>No tienes playlists disponibles.</p>
                        <button class="btn btn-sm btn-outline-light" id="createPlaylistFromModalBtn">
                            <i class="fas fa-plus me-2"></i> Crear nueva playlist
                        </button>
                    </div>
                `;
                
                // Configurar botón de crear playlist
                const createBtn = document.getElementById('createPlaylistFromModalBtn');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        // Cerrar modal actual
                        const addToPlaylistModal = bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'));
                        if (addToPlaylistModal) {
                            addToPlaylistModal.hide();
                        }
                        
                        // Mostrar modal de crear playlist
                        showCreatePlaylistModal();
                    });
                }
            } else {
                playlistsContainerElement.innerHTML = '';
                
                // Añadir cada playlist como opción
                userPlaylists.forEach(playlist => {
                    const playlistItem = document.createElement('div');
                    playlistItem.className = 'playlist-item';
                    playlistItem.style.cursor = 'pointer';
                    playlistItem.innerHTML = `
                        <div class="playlist-cover">
                            <i class="fas fa-music"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h5 class="playlist-title">${playlist.name}</h5>
                            <p class="playlist-info">${playlist.description || 'Sin descripción'}</p>
                        </div>
                    `;
                    
                    playlistItem.addEventListener('click', async () => {
                        try {
                            if (window.PlaylistManager) {
                                await window.PlaylistManager.addSongToPlaylist(song, playlist.id);
                                showToast('Canción añadida a la playlist', 'success');
                            } else {
                                // Fallback
                                await addSongToPlaylistDirect(song, playlist.id);
                            }
                            
                            // Cerrar modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'));
                            if (modal) {
                                modal.hide();
                            }
                        } catch (error) {
                            console.error('Error al añadir canción a playlist:', error);
                            showToast('Error al añadir canción a playlist', 'error');
                        }
                    });
                    
                    playlistsContainerElement.appendChild(playlistItem);
                });
                
                // Añadir opción para crear nueva playlist
                const createNewItem = document.createElement('div');
                createNewItem.className = 'text-center mt-3';
                createNewItem.innerHTML = `
                    <button class="btn btn-sm btn-outline-light" id="createPlaylistFromSelectionBtn">
                        <i class="fas fa-plus me-2"></i> Crear nueva playlist
                    </button>
                `;
                
                const createBtn = createNewItem.querySelector('#createPlaylistFromSelectionBtn');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        // Cerrar modal actual
                        const addToPlaylistModal = bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'));
                        if (addToPlaylistModal) {
                            addToPlaylistModal.hide();
                        }
                        
                        // Mostrar modal de crear playlist
                        showCreatePlaylistModal();
                    });
                }
                
                playlistsContainerElement.appendChild(createNewItem);
            }
        }
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('addToPlaylistModal'));
        modal.show();
    }
    
    /**
     * FUNCIÓN MEJORADA: Muestra el modal para crear una nueva playlist
     */
    function showCreatePlaylistModal() {
        // Reiniciar formulario
        const form = document.getElementById('createPlaylistForm');
        if (form) {
            form.reset();
        }
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('createPlaylistModal'));
        modal.show();
    }
    
    /**
     * FUNCIÓN MEJORADA: Crea una nueva playlist con los datos del formulario
     */
    async function createNewPlaylist() {
        if (!firebase.auth().currentUser) return;
        
        // Obtener datos del formulario
        const name = document.getElementById('playlistName').value.trim();
        const description = document.getElementById('playlistDescription').value.trim();
        const isPublic = document.getElementById('playlistPublic').checked;
        
        if (!name) {
            showToast('Por favor, ingresa un nombre para la playlist', 'error');
            return;
        }
        
        try {
            showLoading(true);
            
            const playlistData = {
                name,
                description,
                public: isPublic
            };
            
            let newPlaylist;
            if (window.PlaylistManager) {
                newPlaylist = await window.PlaylistManager.createPlaylist(playlistData);
            } else {
                // Fallback al método directo
                const uid = firebase.auth().currentUser.uid;
                const timestamp = Date.now();
                const playlistId = `playlist_${uid}_${timestamp}`;
                
                newPlaylist = {
                    id: playlistId,
                    name,
                    description,
                    public: isPublic,
                    owner: uid,
                    created_at: timestamp,
                    updated_at: timestamp,
                    songs: {}
                };
                
                await firebase.database().ref(`users/${uid}/playlists/${playlistId}`).set(newPlaylist);
                userPlaylists.push(newPlaylist);
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createPlaylistModal'));
            if (modal) {
                modal.hide();
            }
            
            showToast('Playlist creada con éxito', 'success');
            
            // Si hay una canción seleccionada para añadir a esta playlist, añadirla
            if (selectedSongForPlaylist && newPlaylist) {
                try {
                    if (window.PlaylistManager) {
                        await window.PlaylistManager.addSongToPlaylist(selectedSongForPlaylist, newPlaylist.id);
                    } else {
                        await addSongToPlaylistDirect(selectedSongForPlaylist, newPlaylist.id);
                    }
                    showToast('Canción añadida a la nueva playlist', 'success');
                } catch (error) {
                    console.error('Error al añadir canción a nueva playlist:', error);
                }
                selectedSongForPlaylist = null; // Limpiar selección
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Error al crear playlist:', error);
            showToast('Error al crear playlist', 'error');
            showLoading(false);
        }
    }
    
    /**
     * FUNCIÓN AUXILIAR: Añade canción a playlist usando método directo (fallback)
     */
    async function addSongToPlaylistDirect(song, playlistId) {
        const uid = firebase.auth().currentUser.uid;
        
        // Verificar si la canción ya está en la playlist
        const playlistSnapshot = await firebase.database().ref(`users/${uid}/playlists/${playlistId}/songs/${song.id}`).once('value');
        
        if (playlistSnapshot.exists()) {
            throw new Error('Esta canción ya está en la playlist');
        }
        
        // Añadir canción a la playlist
        await firebase.database().ref(`users/${uid}/playlists/${playlistId}/songs/${song.id}`).set({
            ...song,
            added_at: Date.now()
        });
        
        // Actualizar timestamp de la playlist
        await firebase.database().ref(`users/${uid}/playlists/${playlistId}/updated_at`).set(Date.now());
        
        // Actualizar datos locales
        const playlistIndex = userPlaylists.findIndex(p => p.id === playlistId);
        if (playlistIndex !== -1) {
            if (!userPlaylists[playlistIndex].songs) {
                userPlaylists[playlistIndex].songs = {};
            }
            userPlaylists[playlistIndex].songs[song.id] = {
                ...song,
                added_at: Date.now()
            };
            userPlaylists[playlistIndex].updated_at = Date.now();
        }
    }
    
    /**
     * FUNCIÓN MEJORADA: Maneja cambios en playlists desde el sistema integrado
     */
    function updatePlaylistsAfterChange(action, playlist, song) {
        console.log(`Actualizando UI después de cambio en playlist: ${action}`);
        
        switch (action) {
            case 'create':
                // Añadir nueva playlist a la lista local si no existe
                if (!userPlaylists.find(p => p.id === playlist.id)) {
                    userPlaylists.push(playlist);
                }
                break;
            case 'update':
                // Actualizar playlist existente
                const updateIndex = userPlaylists.findIndex(p => p.id === playlist.id);
                if (updateIndex !== -1) {
                    userPlaylists[updateIndex] = playlist;
                }
                break;
            case 'delete':
                // Eliminar playlist de la lista local
                userPlaylists = userPlaylists.filter(p => p.id !== playlist.id);
                break;
            case 'addSong':
            case 'removeSong':
                // Actualizar playlist específica
                const songChangeIndex = userPlaylists.findIndex(p => p.id === playlist.id);
                if (songChangeIndex !== -1) {
                    userPlaylists[songChangeIndex] = playlist;
                }
                break;
        }
        
        // Actualizar UI
        updateUserStats();
        updatePlaylistsUI();
    }
    
    //===================================================================
    // CONFIGURACIÓN DE EVENTOS Y REPRODUCTOR
    //===================================================================
    
    /**
     * FUNCIÓN IMPORTANTE: Configura los eventos de los botones y elementos interactivos
     * Añade manejadores para las acciones del usuario
     */
    function setupEventListeners() {
        // Botón de cerrar sesión
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                    stopPlayback();
                    logout();
                }
            });
        }
        
        // Botón de editar perfil
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', openEditProfileModal);
        }
        
        // Filtros de vista para playlists
        document.querySelectorAll('.view-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                // Quitar clase activa de todos los filtros
                document.querySelectorAll('.view-filter').forEach(f => {
                    f.classList.remove('active');
                });
                
                // Añadir clase activa al filtro seleccionado
                filter.classList.add('active');
                
                // Filtrar playlists según el tipo
                const filterType = filter.dataset.filter;
                filterPlaylists(filterType);
            });
        });
        
        // Botón para crear playlist
        if (createPlaylistBtn) {
            createPlaylistBtn.addEventListener('click', showCreatePlaylistModal);
        }
        
        // Botón para guardar playlist (en el modal)
        if (savePlaylistBtn) {
            savePlaylistBtn.addEventListener('click', createNewPlaylist);
        }
        
        // Botón para crear playlist desde el modal de añadir a playlist
        if (createPlaylistFromModalBtn) {
            createPlaylistFromModalBtn.addEventListener('click', () => {
                // Cerrar modal actual
                const addToPlaylistModal = bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'));
                if (addToPlaylistModal) {
                    addToPlaylistModal.hide();
                }
                
                // Mostrar modal de crear playlist
                showCreatePlaylistModal();
            });
        }
        
        // Cajas de estadísticas (para acceso directo)
        const likedSongsStatBox = document.getElementById('likedSongsStatBox');
        if (likedSongsStatBox) {
            likedSongsStatBox.addEventListener('click', () => {
                // Scroll hasta la sección de canciones favoritas
                const likedSongsSection = document.querySelector('.liked-songs');
                if (likedSongsSection) {
                    likedSongsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        const playlistsStatBox = document.getElementById('playlistsStatBox');
        if (playlistsStatBox) {
            playlistsStatBox.addEventListener('click', () => {
                // Scroll hasta la sección de playlists
                const playlistsSection = document.querySelector('.user-playlists');
                if (playlistsSection) {
                    playlistsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }
    
    //===================================================================
    // FUNCIONES DE REPRODUCTOR
    //===================================================================
    
    /**
     * FUNCIÓN IMPORTANTE: Configura el reproductor de música
     * Inicializa los controles y eventos para reproducción
     */
    function setupMusicPlayer() {
        // Ocultar el reproductor inicialmente si no hay pista seleccionada
        if (currentPlayer && !currentPlayingTrack) {
            currentPlayer.classList.remove('playing');
        }
        
        audioPlayer = new Audio();
        
        // Event listener para el botón play/pause
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', togglePlayPause);
        }
        
        // Event listeners para los botones anterior/siguiente
        if (prevBtn) {
            prevBtn.addEventListener('click', playPrevious);
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', playNext);
        }
        
        // Event listeners para los botones de bucle/aleatorio
        if (loopBtn) {
            loopBtn.addEventListener('click', toggleLoop);
        }
        
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', toggleShuffle);
        }
        
        // Event listener para la barra de progreso
        const progressBarContainer = document.querySelector('.progress-bar-container');
        if (progressBarContainer) {
            progressBarContainer.addEventListener('click', (e) => {
                if (!audioPlayer || !currentPlayingTrack) return;
                
                const rect = progressBarContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const containerWidth = rect.width;
                const clickPercent = clickX / containerWidth;
                
                audioPlayer.currentTime = clickPercent * audioPlayer.duration;
                updateProgress();
            });
        }
        
        // Event listener para el control de volumen
        if (volumeControl) {
            volumeControl.addEventListener('input', () => {
                if (audioPlayer) {
                    audioPlayer.volume = volumeControl.value;
                }
            });
        }
        
        // Event listeners para el elemento de audio
        audioPlayer.addEventListener('ended', () => {
            // Cuando termina una canción
            if (isLoopMode) {
                // Si está en modo bucle, reinicia la misma canción
                audioPlayer.currentTime = 0;
                audioPlayer.play();
            } else {
                // Sino, pasa a la siguiente
                playNext();
            }
        });
        
        audioPlayer.addEventListener('loadedmetadata', () => {
            // Cuando se cargan los metadatos del audio
            if (totalTimeDisplay) {
                totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
            }
        });
        
        // Cargar preferencias guardadas
        loadPlayerPreferences();
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Reproduce una canción
     * Maneja tanto canciones locales como de Spotify
     * @param {Object} song - Objeto con datos de la canción
     */
    function playSong(song) {
        if (!song) return;
        
        // Detener reproducción actual si existe
        stopPlayback();
        
        // Guardar la canción actual
        currentPlayingTrack = song;
        
        // Actualizar interfaz
        updatePlayerUI();
        
        // Determinar el tipo de fuente (local o Spotify)
        if (song.sourceOrigin === 'spotify') {
            // Para Spotify, abrir en una nueva ventana
            if (song.externalUrl) {
                window.open(song.externalUrl, '_blank');
                showToast('Abriendo en Spotify...', 'info');
            } else {
                showToast('No se pudo reproducir esta canción de Spotify', 'error');
            }
        } else {
            // Para canciones locales, reproducir con el reproductor HTML
            audioPlayer.src = song.source;
            audioPlayer.volume = volumeControl ? parseFloat(volumeControl.value) : 0.7;
            
            // Intentar reproducir
            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    updatePlayPauseButton();
                    startProgressUpdate();
                    
                    // Añadir a historial de reproducción
                    addToPlayHistory(song);
                })
                .catch(error => {
                    console.error('Error al reproducir:', error);
                    showToast('Error al reproducir la canción', 'error');
                    isPlaying = false;
                    updatePlayPauseButton();
                });
        }
        
        // Actualizar el estado de "me gusta"
        updateLikeStatus(song.id);
    }
    
    // Resto de funciones del reproductor (playPlaylist, stopPlayback, togglePlayPause, etc.)
    // Se mantienen igual que en el código original...
    
    //===================================================================
    // FUNCIONES DE UTILIDAD
    //===================================================================
    
    /**
     * Formatea el tiempo en segundos a formato "minutos:segundos"
     * @param {number} seconds - Tiempo en segundos
     * @return {string} Tiempo formateado (MM:SS)
     */
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
    
    /**
     * Calcula y formatea el tiempo transcurrido desde una marca de tiempo
     * @param {number} timestamp - Marca de tiempo en milisegundos
     * @return {string} Tiempo relativo formateado (ej: "hace 2 horas")
     */
    function getTimeAgo(timestamp) {
        if (!timestamp) return 'fecha desconocida';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        // Calcular unidades de tiempo
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // Formatear según la unidad más apropiada
        if (days > 0) {
            return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
        } else if (hours > 0) {
            return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        } else if (minutes > 0) {
            return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        } else {
            return 'hace unos segundos';
        }
    }
    
    /**
     * Genera un valor hash para una cadena
     * Utilizado para generar colores consistentes basados en texto
     * @param {string} str - Cadena a hashear
     * @return {number} Valor numérico hash
     */
    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convertir a entero de 32 bits
        }
        return hash;
    }
    
    /**
     * Mezcla un array aleatoriamente (algoritmo Fisher-Yates)
     * @param {Array} array - Array a mezclar
     * @return {Array} Array mezclado (modifica el original)
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    /**
     * Muestra el overlay de carga
     * @param {boolean} show - Indica si mostrar (true) u ocultar (false)
     */
    function showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.add('show');
            } else {
                loadingOverlay.classList.remove('show');
            }
        }
    }
    
    /**
     * Muestra un mensaje de notificación
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje ('success', 'error', 'warning', 'info')
     */
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        // Definir los estilos en línea
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // Añadir ícono según el tipo
        let icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'info') icon = 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Resto de funciones de utilidad (logout, openEditProfileModal, etc.)
    // Se mantienen igual que en el código original...
    
    /**
     * Inicializa efectos visuales y decorativos en la página de cuenta
     * Agrega animaciones, partículas y efectos interactivos
     */
    function initializeEffects() {
        // Crear notas musicales flotantes en el fondo
        createFloatingNotes();
        
        // Agregar efectos de hover a los elementos interactivos
        addHoverEffects();
        
        // Inicializar animaciones para las estadísticas
        initStatisticAnimations();
        
        console.log('Efectos visuales inicializados en la página de cuenta');
    }
    
    /**
     * Crea notas musicales decorativas flotantes en el fondo
     */
    function createFloatingNotes() {
        const notesContainer = document.querySelector('.notes-container');
        if (!notesContainer) return;
        
        const notes = ['♪', '♫', '𝅘𝅥𝅮', '𝅘𝅥', '𝅘𝅥𝅯', '𝅗𝅥', '𝄞'];
        const noteCount = 15;
        
        // Limpiar notas existentes
        notesContainer.innerHTML = '';
        
        // Generar nuevas notas
        for (let i = 0; i < noteCount; i++) {
            const note = document.createElement('div');
            note.className = 'floating-note';
            note.innerHTML = notes[Math.floor(Math.random() * notes.length)];
            note.style.left = `${Math.random() * 100}%`;
            note.style.top = `${Math.random() * 100}%`;
            note.style.animationDelay = `${Math.random() * 5}s`;
            note.style.animationDuration = `${10 + Math.random() * 15}s`;
            note.style.opacity = 0.2 + Math.random() * 0.3;
            note.style.fontSize = `${1 + Math.random() * 1.5}rem`;
            
            notesContainer.appendChild(note);
        }
    }
    
    /**
     * Agrega efectos de hover a elementos interactivos
     */
    function addHoverEffects() {
        // Efectos para las cajas de estadísticas
        const statBoxes = document.querySelectorAll('.stat-box');
        statBoxes.forEach(box => {
            box.addEventListener('mouseenter', () => {
                box.style.transform = 'translateY(-5px)';
                box.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
            });
            
            box.addEventListener('mouseleave', () => {
                box.style.transform = '';
                box.style.boxShadow = '';
            });
        });
    }
    
    /**
     * Inicializa animaciones para las estadísticas
     */
    function animateCounters() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(statNumber => {
            const originalValue = parseInt(statNumber.textContent);
            
            // Solo animar si hay un valor numérico
            if (!isNaN(originalValue)) {
                // Resetear a cero para animación
                statNumber.textContent = '0';
                
                // Crear animación de conteo
                let currentValue = 0;
                const duration = 1500; // milisegundos
                const interval = 50; // milisegundos
                const increment = originalValue / (duration / interval);
                
                const counter = setInterval(() => {
                    currentValue += increment;
                    
                    if (currentValue >= originalValue) {
                        clearInterval(counter);
                        statNumber.textContent = originalValue;
                    } else {
                        statNumber.textContent = Math.floor(currentValue);
                    }
                }, interval);
            }
        });
    }
    
    /**
     * Inicializa animaciones para las estadísticas
     */
    function initStatisticAnimations() {
        const statBoxes = document.querySelectorAll('.stat-box');
        
        statBoxes.forEach(box => {
            const statNumber = box.querySelector('.stat-number');
            if (!statNumber) return;
            
            const originalValue = parseInt(statNumber.textContent);
            
            // Solo animar si hay un valor numérico
            if (!isNaN(originalValue)) {
                // Resetear a cero para animación
                statNumber.textContent = '0';
                
                // Crear animación de conteo
                let currentValue = 0;
                const duration = 1500; // milisegundos
                const interval = 50; // milisegundos
                const increment = originalValue / (duration / interval);
                
                const counter = setInterval(() => {
                    currentValue += increment;
                    
                    if (currentValue >= originalValue) {
                        clearInterval(counter);
                        statNumber.textContent = originalValue;
                    } else {
                        statNumber.textContent = Math.floor(currentValue);
                    }
                }, interval);
            }
        });
    }
    
    // Funciones restantes del reproductor y utilidades se mantienen igual...
    // (playPlaylist, stopPlayback, togglePlayPause, playNext, playPrevious, etc.)
    
    /**
     * Reproduce una playlist completa
     * @param {Array} songs - Lista de canciones a reproducir
     * @param {number} startIndex - Índice inicial (0 por defecto)
     * @param {string} playlistId - ID de la playlist (opcional)
     */
    function playPlaylist(songs, startIndex = 0, playlistId = null) {
        if (!songs || songs.length === 0) {
            showToast('No hay canciones para reproducir', 'warning');
            return;
        }
        
        // Guardar la playlist actual
        currentPlaylist = [...songs];
        currentTrackIndex = startIndex;
        currentPlaylistId = playlistId;
        
        // Aplicar modo aleatorio si está activado
        if (isShuffleMode) {
            // Conservar la primera canción seleccionada
            const firstSong = currentPlaylist[startIndex];
            
            // Mezclar el resto de la playlist
            const remainingSongs = [...currentPlaylist];
            remainingSongs.splice(startIndex, 1);
            shuffleArray(remainingSongs);
            
            // Reconstruir la playlist con la primera canción al inicio
            currentPlaylist = [firstSong, ...remainingSongs];
            currentTrackIndex = 0; // Ahora el índice es siempre 0
        }
        
        // Reproducir la primera canción
        playSong(currentPlaylist[currentTrackIndex]);
    }
    
    /**
     * Reproduce una playlist por su ID
     * @param {string} playlistId - ID de la playlist a reproducir
     */
    function playPlaylistById(playlistId) {
        const playlist = userPlaylists.find(p => p.id === playlistId);
        
        if (!playlist) {
            showToast('Playlist no encontrada', 'error');
            return;
        }
        
        // Convertir el objeto de canciones en array
        const songs = playlist.songs ? Object.values(playlist.songs) : [];
        
        if (songs.length === 0) {
            showToast('Esta playlist está vacía', 'warning');
            return;
        }
        
        // Reproducir playlist
        playPlaylist(songs, 0, playlistId);
    }
    
    /**
     * Detiene la reproducción actual
     */
    function stopPlayback() {
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.src = '';
        }
        
        isPlaying = false;
        updatePlayPauseButton();
        stopProgressUpdate();
    }
    
    /**
     * Alterna entre reproducir y pausar
     */
    function togglePlayPause() {
        if (!audioPlayer || !currentPlayingTrack) return;
        
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            stopProgressUpdate();
        } else {
            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    startProgressUpdate();
                })
                .catch(error => {
                    console.error('Error al reanudar:', error);
                    isPlaying = false;
                });
        }
        
        updatePlayPauseButton();
    }
    
    /**
     * Pasa a la canción anterior en la playlist
     */
    function playPrevious() {
        if (!currentPlaylist || currentPlaylist.length === 0 || currentTrackIndex === -1) return;
        
        // Decrementar el índice, con wraparound
        currentTrackIndex--;
        if (currentTrackIndex < 0) {
            currentTrackIndex = currentPlaylist.length - 1;
        }
        
        // Reproducir la canción anterior
        playSong(currentPlaylist[currentTrackIndex]);
    }
    
    /**
     * Pasa a la siguiente canción en la playlist
     */
    function playNext() {
        if (!currentPlaylist || currentPlaylist.length === 0 || currentTrackIndex === -1) return;
        
        // Incrementar el índice, con wraparound
        currentTrackIndex++;
        if (currentTrackIndex >= currentPlaylist.length) {
            currentTrackIndex = 0;
        }
        
        // Reproducir la siguiente canción
        playSong(currentPlaylist[currentTrackIndex]);
    }
    
    /**
     * Alterna el modo bucle
     */
    function toggleLoop() {
        isLoopMode = !isLoopMode;
        
        // Actualizar el estilo del botón
        if (loopBtn) {
            loopBtn.classList.toggle('active', isLoopMode);
        }
        
        // Si hay un reproductor activo, aplicar el cambio
        if (audioPlayer) {
            audioPlayer.loop = isLoopMode;
        }
        
        // Guardar preferencia
        savePlayerPreferences();
        
        showToast(`Modo bucle ${isLoopMode ? 'activado' : 'desactivado'}`, 'info');
    }
    
    /**
     * Alterna el modo aleatorio
     * Mezcla la playlist actual si está activado
     */
    function toggleShuffle() {
        isShuffleMode = !isShuffleMode;
        
        // Actualizar el estilo del botón
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', isShuffleMode);
        }
        
        // Si hay una playlist en reproducción, reorganizarla
        if (isShuffleMode && currentPlaylist && currentPlaylist.length > 0 && currentTrackIndex !== -1) {
            // Guardar la canción actual
            const currentSong = currentPlaylist[currentTrackIndex];
            
            // Crear una nueva lista mezclada excluyendo la canción actual
            const remainingSongs = [...currentPlaylist];
            remainingSongs.splice(currentTrackIndex, 1);
            shuffleArray(remainingSongs);
            
            // Reconstruir la playlist con la canción actual al inicio
            currentPlaylist = [currentSong, ...remainingSongs];
            currentTrackIndex = 0;
        }
        
        // Guardar preferencia
        savePlayerPreferences();
        
        showToast(`Modo aleatorio ${isShuffleMode ? 'activado' : 'desactivado'}`, 'info');
    }
    
    /**
     * Actualiza el botón de reproducción/pausa
     * Cambia el ícono según el estado actual
     */
    function updatePlayPauseButton() {
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPlaying ? 
                '<i class="fas fa-pause"></i>' : 
                '<i class="fas fa-play"></i>';
        }
    }
    
    /**
     * Actualiza la interfaz del reproductor
     * Muestra información de la canción actual
     */
    function updatePlayerUI() {
        if (!currentPlayingTrack) return;
        
        // Actualizar imagen y datos de la canción
        if (currentTrackImage) {
            currentTrackImage.src = currentPlayingTrack.image || 'resources/album covers/placeholder.png';
            currentTrackImage.alt = currentPlayingTrack.title;
        }
        
        if (currentTrackName) {
            currentTrackName.textContent = currentPlayingTrack.title;
        }
        
        if (currentTrackArtist) {
            currentTrackArtist.textContent = currentPlayingTrack.artist;
        }
        
        // Resetear barra de progreso
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = '0:00';
        }
        
        // Mostrar el reproductor
        if (currentPlayer) {
            currentPlayer.style.display = 'flex';
        }
    }
    
    /**
     * Inicia la actualización periódica de la barra de progreso
     */
    function startProgressUpdate() {
        // Limpiar intervalo existente si lo hay
        stopProgressUpdate();
        
        // Crear nuevo intervalo
        progressInterval = setInterval(updateProgress, 1000);
        
        // Actualización inicial
        updateProgress();
    }
    
    /**
     * Detiene la actualización de la barra de progreso
     */
    function stopProgressUpdate() {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
    }
    
    /**
     * Actualiza la barra de progreso y el tiempo mostrado
     */
    function updateProgress() {
        if (!audioPlayer || !isPlaying) return;
        
        const duration = audioPlayer.duration || 0;
        const currentTime = audioPlayer.currentTime || 0;
        
        // Actualizar barra de progreso
        if (progressBar && duration > 0) {
            const progress = (currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
        }
        
        // Actualizar tiempos mostrados
        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = formatTime(currentTime);
        }
        
        if (totalTimeDisplay && !isNaN(duration)) {
            totalTimeDisplay.textContent = formatTime(duration);
        }
    }
    
    /**
     * Guarda las preferencias del reproductor
     * Almacena configuración de bucle y aleatorio
     */
    function savePlayerPreferences() {
        if (!currentUser) return;
        
        const preferences = {
            loop: isLoopMode,
            shuffle: isShuffleMode,
            volume: audioPlayer ? audioPlayer.volume : 0.7
        };
        
        // Guardar en localStorage para acceso rápido
        localStorage.setItem('player_preferences', JSON.stringify(preferences));
        
        // Opcionalmente, guardar en Firebase para persistencia entre dispositivos
        if (firebase.auth().currentUser) {
            const uid = firebase.auth().currentUser.uid;
            firebase.database().ref(`users/${uid}/player_preferences`).set(preferences)
                .catch(error => {
                    console.error('Error al guardar preferencias del reproductor:', error);
                });
        }
    }
    
    /**
     * Carga las preferencias del reproductor
     * Recupera configuración guardada de bucle y aleatorio
     */
    function loadPlayerPreferences() {
        // Intentar cargar desde localStorage primero (más rápido)
        const savedPreferences = localStorage.getItem('player_preferences');
        
        if (savedPreferences) {
            try {
                const preferences = JSON.parse(savedPreferences);
                
                // Aplicar preferencias
                isLoopMode = preferences.loop || false;
                isShuffleMode = preferences.shuffle || false;
                
                // Actualizar UI
                if (loopBtn) {
                    loopBtn.classList.toggle('active', isLoopMode);
                }
                
                if (shuffleBtn) {
                    shuffleBtn.classList.toggle('active', isShuffleMode);
                }
                
                // Configurar volumen
                if (audioPlayer && preferences.volume !== undefined) {
                    audioPlayer.volume = preferences.volume;
                    
                    if (volumeControl) {
                        volumeControl.value = preferences.volume;
                    }
                }
            } catch (error) {
                console.error('Error al analizar preferencias guardadas:', error);
            }
        }
    }
    
    /**
     * Actualiza el estado de "me gusta" en la interfaz
     * @param {string} songId - ID de la canción a actualizar
     */
    function updateLikeStatus(songId) {
        // Buscar todos los elementos de canción con este ID
        document.querySelectorAll(`.song-item[data-id="${songId}"]`).forEach(item => {
            const likeBtn = item.querySelector('.song-like');
            
            if (likeBtn) {
                const isLiked = likedSongs[songId] ? true : false;
                
                // Actualizar clases e ícono
                likeBtn.classList.toggle('active', isLiked);
                likeBtn.querySelector('i').className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            }
        });
    }
    
    /**
     * Filtra las playlists según el tipo seleccionado
     * @param {string} filterType - Tipo de filtro ('all', 'created', 'followed')
     */
    function filterPlaylists(filterType) {
        // Por ahora todas las playlists son creadas por el usuario
        // En el futuro, se podría implementar playlists seguidas de otros usuarios
        updatePlaylistsUI();
    }
    
    /**
     * Muestra los detalles de una playlist
     * @param {Object} playlist - Objeto con datos de la playlist
     */
    function showPlaylistDetails(playlist) {
        if (!playlist) return;
        
        console.log('Mostrando detalles de playlist:', playlist.name);
        showToast('Función en desarrollo', 'info');
    }
    
    /**
     * Cierra la sesión del usuario actual
     * Llama a Firebase y actualiza la interfaz
     */
    function logout() {
        if (window.firebaseAuth) {
            window.firebaseAuth.logoutUser()
                .then(result => {
                    if (result.success) {
                        // Redireccionar a la página de inicio
                        window.location.href = 'index.html';
                    } else {
                        showToast('Error al cerrar sesión', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error durante logout:', error);
                    showToast('Error al cerrar sesión', 'error');
                });
        } else {
            // Fallback si firebaseAuth no está disponible
            if (firebase.auth) {
                firebase.auth().signOut()
                    .then(() => {
                        window.location.href = 'index.html';
                    })
                    .catch(error => {
                        console.error('Error durante logout:', error);
                        showToast('Error al cerrar sesión', 'error');
                    });
            } else {
                showToast('Error: Sistema de autenticación no disponible', 'error');
            }
        }
    }
    
    /**
     * Abre el modal para editar el perfil
     * Permite al usuario cambiar su nombre, biografía y avatar
     */
    function openEditProfileModal() {
        console.log('Función de editar perfil en desarrollo');
        showToast('Función en desarrollo', 'info');
    }
    
});