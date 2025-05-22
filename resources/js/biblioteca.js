// biblioteca.js - Sistema completo de biblioteca con playlists, canciones y reproducción

document.addEventListener('DOMContentLoaded', () => {
    console.log("biblioteca.js: DOM cargado, iniciando sistema de biblioteca completo.");

    // Referencias a elementos del DOM
    const libraryNavButtons = document.querySelectorAll('.library-nav-btn');
    const songsSection = document.getElementById('songsSection');
    const playlistsSection = document.getElementById('playlistsSection');
    const likesSection = document.getElementById('likesSection');
    
    const librarySongsContainer = document.getElementById('librarySongsContainer');
    const playlistsContainer = document.getElementById('playlistsContainer');
    const likesContainer = document.getElementById('likesContainer');
    
    const songsCount = document.getElementById('songsCount');
    const playlistsCount = document.getElementById('playlistsCount');
    const likesCount = document.getElementById('likesCount');
    
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const savePlaylistBtn = document.getElementById('savePlaylistBtn');
    const playAllSongsBtn = document.getElementById('playAllSongsBtn');
    const shuffleAllSongsBtn = document.getElementById('shuffleAllSongsBtn');
    const playAllLikesBtn = document.getElementById('playAllLikesBtn');
    const shuffleLikesBtn = document.getElementById('shuffleLikesBtn');

    // Variables de estado
    let currentUser = null;
    let librarySongs = [];
    let userPlaylists = [];
    let likedSongs = {};
    let currentSection = 'songs';
    let selectedSongForPlaylist = null;

    // Managers
    let musicManagerInstance = null;
    let playlistManagerInstance = null;
    let libraryManagerInstance = null;
    let likesManagerInstance = null;

    // Inicialización
    async function init() {
        console.log("biblioteca.js: Iniciando sistema...");
        
        // Verificar usuario autenticado
        currentUser = await new Promise(resolve => {
            if (firebase.auth().currentUser) {
                resolve(firebase.auth().currentUser);
            } else {
                const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                    unsubscribe();
                    resolve(user);
                });
            }
        });

        if (!currentUser) {
            showEmptyState('library', 'Debes <a href="login.html" class="text-primary">iniciar sesión</a> para ver tu biblioteca.');
            return;
        }

        // Esperar managers
        await waitForManagers();
        
        // Configurar navegación
        setupNavigation();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar datos iniciales
        await loadAllData();
        
        // Mostrar sección inicial
        showSection('songs');
    }

    async function waitForManagers() {
        const managers = ['musicManager', 'PlaylistManager', 'LibraryManager', 'LikesManager'];
        
        for (const managerName of managers) {
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 50;
                
                const checkManager = () => {
                    const manager = window[managerName];
                    if (manager) {
                        if (typeof manager.init === 'function' && !manager._isInitialized) {
                            manager.init().then(() => {
                                console.log(`biblioteca.js: ${managerName} inicializado.`);
                                resolve(manager);
                            }).catch(reject);
                        } else {
                            console.log(`biblioteca.js: ${managerName} disponible.`);
                            resolve(manager);
                        }
                    } else {
                        attempts++;
                        if (attempts >= maxAttempts) {
                            console.warn(`biblioteca.js: ${managerName} no disponible después de ${maxAttempts} intentos.`);
                            resolve(null);
                        } else {
                            setTimeout(checkManager, 200);
                        }
                    }
                };
                
                checkManager();
            });
        }

        // Asignar instancias
        musicManagerInstance = window.musicManager;
        playlistManagerInstance = window.PlaylistManager;
        libraryManagerInstance = window.LibraryManager;
        likesManagerInstance = window.LikesManager;

        // Configurar listeners de cambios
        if (libraryManagerInstance?.addLibraryChangeListener) {
            libraryManagerInstance.addLibraryChangeListener(() => {
                loadLibrarySongs();
                updateStats();
            });
        }

        if (likesManagerInstance?.addLikeChangeListener) {
            likesManagerInstance.addLikeChangeListener((songId, isLiked) => {
                updateLikeButtonsUI(songId, isLiked);
                loadLikedSongs();
                updateStats();
            });
        }

        if (playlistManagerInstance?.addPlaylistChangeListener) {
            playlistManagerInstance.addPlaylistChangeListener(() => {
                loadUserPlaylists();
                updateStats();
            });
        }
    }

    function setupNavigation() {
        libraryNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                showSection(section);
            });
        });
    }

    function showSection(section) {
        currentSection = section;
        
        // Actualizar botones de navegación
        libraryNavButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Mostrar/ocultar secciones
        const sections = { songs: songsSection, playlists: playlistsSection, likes: likesSection };
        Object.entries(sections).forEach(([key, element]) => {
            if (element) {
                element.style.display = key === section ? 'block' : 'none';
            }
        });

        // Cargar datos específicos de la sección si es necesario
        switch(section) {
            case 'songs':
                if (librarySongs.length === 0) loadLibrarySongs();
                break;
            case 'playlists':
                if (userPlaylists.length === 0) loadUserPlaylists();
                break;
            case 'likes':
                if (Object.keys(likedSongs).length === 0) loadLikedSongs();
                break;
        }
    }

    function setupEventListeners() {
        // Botones de reproducir todo
        playAllSongsBtn?.addEventListener('click', () => playAll(librarySongs, false));
        shuffleAllSongsBtn?.addEventListener('click', () => playAll(librarySongs, true));
        playAllLikesBtn?.addEventListener('click', () => playAll(Object.values(likedSongs), false));
        shuffleLikesBtn?.addEventListener('click', () => playAll(Object.values(likedSongs), true));

        // Botones de playlist
        createPlaylistBtn?.addEventListener('click', showCreatePlaylistModal);
        savePlaylistBtn?.addEventListener('click', createPlaylist);

        // Modal events
        setupModalEvents();
    }

    function setupModalEvents() {
        // Modal de crear playlist
        const createModal = document.getElementById('playlistModal');
        if (createModal) {
            createModal.addEventListener('hidden.bs.modal', () => {
                document.getElementById('playlistForm')?.reset();
            });
        }

        // Modal de detalles de playlist
        const detailModal = document.getElementById('playlistDetailModal');
        if (detailModal) {
            detailModal.addEventListener('hidden.bs.modal', () => {
                // Limpiar contenido del modal
                const songsList = document.getElementById('playlistSongs');
                if (songsList) songsList.innerHTML = '';
            });
        }
    }

    async function loadAllData() {
        showLoading(true);
        
        try {
            await Promise.all([
                loadLibrarySongs(),
                loadUserPlaylists(),
                loadLikedSongs()
            ]);
            
            updateStats();
        } catch (error) {
            console.error('biblioteca.js: Error cargando datos:', error);
            showToast('Error al cargar los datos de tu biblioteca', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function loadLibrarySongs() {
        try {
            if (libraryManagerInstance) {
                librarySongs = libraryManagerInstance.getAllLibrarySongs() || [];
            } else {
                librarySongs = [];
            }
            
            updateLibrarySongsUI();
            console.log(`biblioteca.js: ${librarySongs.length} canciones cargadas en biblioteca.`);
        } catch (error) {
            console.error('biblioteca.js: Error cargando canciones de biblioteca:', error);
            librarySongs = [];
            updateLibrarySongsUI();
        }
    }

    async function loadUserPlaylists() {
        try {
            if (playlistManagerInstance) {
                userPlaylists = playlistManagerInstance.getAllPlaylists() || [];
            } else {
                userPlaylists = [];
            }
            
            updatePlaylistsUI();
            console.log(`biblioteca.js: ${userPlaylists.length} playlists cargadas.`);
        } catch (error) {
            console.error('biblioteca.js: Error cargando playlists:', error);
            userPlaylists = [];
            updatePlaylistsUI();
        }
    }

    async function loadLikedSongs() {
        try {
            if (likesManagerInstance) {
                likedSongs = likesManagerInstance.getAllLikedSongs() || {};
            } else {
                likedSongs = {};
            }
            
            updateLikedSongsUI();
            console.log(`biblioteca.js: ${Object.keys(likedSongs).length} canciones favoritas cargadas.`);
        } catch (error) {
            console.error('biblioteca.js: Error cargando canciones favoritas:', error);
            likedSongs = {};
            updateLikedSongsUI();
        }
    }

    function updateStats() {
        if (songsCount) songsCount.textContent = librarySongs.length;
        if (playlistsCount) playlistsCount.textContent = userPlaylists.length;
        if (likesCount) likesCount.textContent = Object.keys(likedSongs).length;
        
        // Animar números
        animateCounters();
    }

    function animateCounters() {
        [songsCount, playlistsCount, likesCount].forEach(element => {
            if (element) {
                element.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }

    function updateLibrarySongsUI() {
        if (!librarySongsContainer) return;

        // Actualizar botones
        if (playAllSongsBtn) playAllSongsBtn.disabled = librarySongs.length === 0;
        if (shuffleAllSongsBtn) shuffleAllSongsBtn.disabled = librarySongs.length === 0;

        if (librarySongs.length === 0) {
            showEmptyState('songs', 'Tu biblioteca de canciones está vacía.<br><a href="explorar.html" class="btn btn-primary mt-3"><i class="fas fa-compass me-2"></i>Explorar música</a>');
            return;
        }

        librarySongsContainer.innerHTML = '';
        const tracksContainer = createTracksContainer(librarySongs, 'library');
        librarySongsContainer.appendChild(tracksContainer);
    }

    function updatePlaylistsUI() {
        if (!playlistsContainer) return;

        if (userPlaylists.length === 0) {
            showEmptyState('playlists', 'No tienes playlists creadas.<br><button class="btn btn-primary mt-3" onclick="showCreatePlaylistModal()"><i class="fas fa-plus me-2"></i>Crear mi primera playlist</button>');
            return;
        }

        playlistsContainer.innerHTML = '';
        
        const playlistGrid = document.createElement('div');
        playlistGrid.className = 'playlist-grid';
        
        userPlaylists.forEach(playlist => {
            const playlistCard = createPlaylistCard(playlist);
            playlistGrid.appendChild(playlistCard);
        });
        
        playlistsContainer.appendChild(playlistGrid);
    }

    function updateLikedSongsUI() {
        if (!likesContainer) return;
        
        const likedArray = Object.values(likedSongs);
        
        // Actualizar botones
        if (playAllLikesBtn) playAllLikesBtn.disabled = likedArray.length === 0;
        if (shuffleLikesBtn) shuffleLikesBtn.disabled = likedArray.length === 0;

        if (likedArray.length === 0) {
            showEmptyState('likes', 'No tienes canciones marcadas como favoritas.<br><a href="explorar.html" class="btn btn-primary mt-3"><i class="fas fa-heart me-2"></i>Descubrir música</a>');
            return;
        }

        likesContainer.innerHTML = '';
        const tracksContainer = createTracksContainer(likedArray, 'likes');
        likesContainer.appendChild(tracksContainer);
    }

    function createTracksContainer(tracks, context) {
        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'tracks-container';
        
        // Header
        const headerRow = document.createElement('div');
        headerRow.className = 'track-header';
        headerRow.innerHTML = `
            <div class="track-number">#</div>
            <div class="track-info">TÍTULO</div>
            <div class="track-album">ÁLBUM</div>
            <div class="track-duration"><i class="far fa-clock"></i></div>
        `;
        tracksContainer.appendChild(headerRow);

        // Tracks
        tracks.forEach((track, index) => {
            const trackRow = createTrackRow(track, index, context, tracks);
            tracksContainer.appendChild(trackRow);
        });

        return tracksContainer;
    }

    function createTrackRow(track, index, context, fullPlaylist) {
        const isLiked = likesManagerInstance ? likesManagerInstance.isLiked(track.id) : false;
        const isInLibrary = libraryManagerInstance ? libraryManagerInstance.isInLibrary(track.id) : false;
        
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.dataset.trackId = track.id;
        trackRow.dataset.source = track.sourceOrigin || 'local';

        trackRow.innerHTML = `
            <div class="track-number">
                <span class="track-index">${index + 1}</span>
                <button class="play-button" title="Reproducir">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="track-info">
                <img src="${track.image || 'resources/album covers/placeholder.png'}" 
                     alt="${track.title || 'Canción'}" class="track-image">
                <div class="track-details">
                    <div class="track-title">${track.title || 'Título Desconocido'}</div>
                    <div class="track-artist">${track.artist || 'Artista Desconocido'}</div>
                    ${track.sourceOrigin === 'spotify' ? '<span class="source-badge spotify">Spotify</span>' : '<span class="source-badge local">Local</span>'}
                </div>
            </div>
            <div class="track-album">${track.album || 'Álbum Desconocido'}</div>
            <div class="track-duration">
                <span class="duration-text">${track.duration || '0:00'}</span>
                <div class="track-actions">
                    <button class="action-button like-button ${isLiked ? 'active' : ''}" 
                            title="${isLiked ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    ${context !== 'library' ? `
                        <button class="action-button library-button ${isInLibrary ? 'active' : ''}" 
                                title="${isInLibrary ? 'Quitar de biblioteca' : 'Añadir a biblioteca'}">
                            <i class="fas fa-${isInLibrary ? 'minus' : 'plus'}-circle"></i>
                        </button>
                    ` : `
                        <button class="action-button remove-library-button" title="Quitar de biblioteca">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `}
                    <button class="action-button playlist-button" title="Añadir a playlist">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    ${context === 'likes' ? `
                        <button class="action-button remove-like-button" title="Quitar de favoritos">
                            <i class="fas fa-heart-broken"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        setupTrackRowEvents(trackRow, track, fullPlaylist, index);
        return trackRow;
    }

    function setupTrackRowEvents(trackRow, track, playlist, index) {
        const playButton = trackRow.querySelector('.play-button');
        const likeButton = trackRow.querySelector('.like-button');
        const libraryButton = trackRow.querySelector('.library-button');
        const removeLibraryButton = trackRow.querySelector('.remove-library-button');
        const playlistButton = trackRow.querySelector('.playlist-button');
        const removeLikeButton = trackRow.querySelector('.remove-like-button');

        // Hover effects
        trackRow.addEventListener('mouseenter', () => {
            const indexElement = trackRow.querySelector('.track-index');
            const actions = trackRow.querySelector('.track-actions');
            
            if (indexElement) indexElement.style.display = 'none';
            if (playButton) playButton.style.display = 'flex';
            if (actions) actions.style.visibility = 'visible';
            
            updatePlayButtonIcon(playButton, track);
        });

        trackRow.addEventListener('mouseleave', () => {
            const indexElement = trackRow.querySelector('.track-index');
            const actions = trackRow.querySelector('.track-actions');
            
            const isCurrentTrack = musicManagerInstance?.currentTrack?.id === track.id;
            
            if (!isCurrentTrack) {
                if (indexElement) indexElement.style.display = 'block';
                if (playButton) playButton.style.display = 'none';
            } else {
                updatePlayButtonIcon(playButton, track);
            }
            
            if (actions) actions.style.visibility = 'hidden';
        });

        // Click en la fila
        trackRow.addEventListener('click', (e) => {
            if (e.target.closest('.action-button')) return;
            playTrack(track, playlist, index);
        });

        // Botón de play
        playButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (musicManagerInstance?.currentTrack?.id === track.id && musicManagerInstance.isPlaying) {
                musicManagerInstance.togglePlayPause();
            } else {
                playTrack(track, playlist, index);
            }
        });

        // Botón de like
        likeButton?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleLike(track, likeButton);
        });

        // Botón de biblioteca
        libraryButton?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await toggleLibrary(track, libraryButton);
        });

        // Botón de remover de biblioteca
        removeLibraryButton?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`¿Quitar "${track.title}" de tu biblioteca?`)) {
                await removeFromLibrary(track);
            }
        });

        // Botón de playlist
        playlistButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            showAddToPlaylistModal(track);
        });

        // Botón de remover like
        removeLikeButton?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`¿Quitar "${track.title}" de tus favoritos?`)) {
                await removeLike(track);
            }
        });
    }

    function updatePlayButtonIcon(playButton, track) {
        if (!playButton || !musicManagerInstance) return;
        
        const isCurrentTrack = musicManagerInstance.currentTrack?.id === track.id;
        const isPlaying = musicManagerInstance.isPlaying;
        
        if (isCurrentTrack && isPlaying) {
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    function createPlaylistCard(playlist) {
        const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
        
        const card = document.createElement('div');
        card.className = 'playlist-card';
        card.dataset.playlistId = playlist.id;
        
        card.innerHTML = `
            <div class="playlist-cover">
                ${playlist.coverImage ? 
                    `<img src="${playlist.coverImage}" alt="${playlist.name}">` : 
                    '<i class="fas fa-music"></i>'
                }
            </div>
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-meta">
                    ${songCount} ${songCount === 1 ? 'canción' : 'canciones'}
                    ${playlist.description ? `<br><small class="text-muted">${playlist.description}</small>` : ''}
                </div>
                <div class="playlist-actions">
                    <button class="playlist-action-btn play-playlist-btn" title="Reproducir playlist">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="playlist-action-btn edit-playlist-btn" title="Editar playlist">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="playlist-action-btn delete-playlist-btn" title="Eliminar playlist">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="play-all-btn" title="Reproducir playlist">
                <i class="fas fa-play"></i>
            </div>
        `;

        // Event listeners
        const playPlaylistBtn = card.querySelector('.play-playlist-btn');
        const playAllBtn = card.querySelector('.play-all-btn');
        const editBtn = card.querySelector('.edit-playlist-btn');
        const deleteBtn = card.querySelector('.delete-playlist-btn');

        // Reproducir playlist
        [playPlaylistBtn, playAllBtn].forEach(btn => {
            btn?.addEventListener('click', (e) => {
                e.stopPropagation();
                playPlaylist(playlist);
            });
        });

        // Editar playlist
        editBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            editPlaylist(playlist);
        });

        // Eliminar playlist
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePlaylist(playlist);
        });

        // Click en la tarjeta para ver detalles
        card.addEventListener('click', () => {
            showPlaylistDetails(playlist);
        });

        return card;
    }

    // Funciones de reproducción
    function playTrack(track, playlist = null, index = 0) {
        if (!musicManagerInstance) {
            showToast('Sistema de reproducción no disponible', 'error');
            return;
        }

        if (track.sourceOrigin === 'spotify' || track.source === 'spotify') {
            // Redirigir a Spotify
            if (track.externalUrl) {
                window.open(track.externalUrl, '_blank');
                showToast('Abriendo en Spotify...', 'info');
            } else {
                showToast('URL de Spotify no disponible', 'error');
            }
        } else {
            // Reproducir localmente
            if (playlist) {
                musicManagerInstance.localPlaylist = [...playlist];
                musicManagerInstance.currentTrackIndex = index;
            }
            musicManagerInstance.playTrack(track);
        }
    }

    function playAll(tracks, shuffle = false) {
        if (!tracks || tracks.length === 0) {
            showToast('No hay canciones para reproducir', 'info');
            return;
        }

        const localTracks = tracks.filter(track => 
            track.sourceOrigin !== 'spotify' && track.source !== 'spotify'
        );

        if (localTracks.length === 0) {
            showToast('Solo hay canciones de Spotify. Se abrirá la primera en Spotify.', 'info');
            const firstSpotifyTrack = tracks.find(track => 
                track.sourceOrigin === 'spotify' || track.source === 'spotify'
            );
            if (firstSpotifyTrack?.externalUrl) {
                window.open(firstSpotifyTrack.externalUrl, '_blank');
            }
            return;
        }

        if (musicManagerInstance) {
            const playlistToPlay = shuffle ? shuffleArray([...localTracks]) : localTracks;
            musicManagerInstance.localPlaylist = playlistToPlay;
            musicManagerInstance.currentTrackIndex = 0;
            musicManagerInstance.playTrack(playlistToPlay[0]);
            
            showToast(`Reproduciendo ${localTracks.length} canciones${shuffle ? ' en modo aleatorio' : ''}`, 'success');
        }
    }

    function playPlaylist(playlist) {
        if (!playlist.songs || Object.keys(playlist.songs).length === 0) {
            showToast('Esta playlist está vacía', 'info');
            return;
        }

        const songs = Object.values(playlist.songs);
        playAll(songs, false);
    }

    // Funciones de gestión de playlists
    function showCreatePlaylistModal() {
        const modal = document.getElementById('playlistModal');
        const form = document.getElementById('playlistForm');
        const title = document.getElementById('playlistModalLabel');
        
        if (form) form.reset();
        if (title) title.textContent = 'Nueva Playlist';
        
        if (modal) {
            new bootstrap.Modal(modal).show();
        }
    }

    async function createPlaylist() {
        const nameInput = document.getElementById('playlistName');
        const descriptionInput = document.getElementById('playlistDescription');
        const publicInput = document.getElementById('playlistPublic');
        
        if (!nameInput?.value.trim()) {
            showToast('Por favor, ingresa un nombre para la playlist', 'error');
            return;
        }

        try {
            showLoading(true);
            
            const playlistData = {
                name: nameInput.value.trim(),
                description: descriptionInput?.value.trim() || '',
                public: publicInput?.checked || false
            };

            if (playlistManagerInstance) {
                await playlistManagerInstance.createPlaylist(playlistData);
                
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('playlistModal'));
                modal?.hide();
                
                showToast('Playlist creada con éxito', 'success');
                
                // Añadir canción seleccionada si existe
                if (selectedSongForPlaylist) {
                    setTimeout(async () => {
                        try {
                            const playlists = playlistManagerInstance.getAllPlaylists();
                            const newPlaylist = playlists[playlists.length - 1]; // La más reciente
                            await playlistManagerInstance.addSongToPlaylist(selectedSongForPlaylist, newPlaylist.id);
                            showToast(`Canción añadida a "${newPlaylist.name}"`, 'success');
                        } catch (error) {
                            console.error('Error añadiendo canción a nueva playlist:', error);
                        }
                        selectedSongForPlaylist = null;
                    }, 500);
                }
            } else {
                showToast('Sistema de playlists no disponible', 'error');
            }
        } catch (error) {
            console.error('Error creando playlist:', error);
            showToast('Error al crear la playlist', 'error');
        } finally {
            showLoading(false);
        }
    }

    function editPlaylist(playlist) {
        // Implementar edición de playlist
        showToast('Función de editar playlist próximamente', 'info');
    }

    async function deletePlaylist(playlist) {
        if (!confirm(`¿Eliminar la playlist "${playlist.name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            showLoading(true);
            
            if (playlistManagerInstance) {
                await playlistManagerInstance.deletePlaylist(playlist.id);
                showToast('Playlist eliminada', 'success');
            } else {
                showToast('Sistema de playlists no disponible', 'error');
            }
        } catch (error) {
            console.error('Error eliminando playlist:', error);
            showToast('Error al eliminar la playlist', 'error');
        } finally {
            showLoading(false);
        }
    }

    function showPlaylistDetails(playlist) {
        const modal = document.getElementById('playlistDetailModal');
        const nameEl = document.getElementById('playlistDetailName');
        const descriptionEl = document.getElementById('playlistDetailDescription');
        const songsEl = document.getElementById('playlistSongs');
        
        if (nameEl) nameEl.textContent = playlist.name;
        if (descriptionEl) descriptionEl.textContent = playlist.description || 'Sin descripción';
        
        if (songsEl) {
            songsEl.innerHTML = '';
            
            if (!playlist.songs || Object.keys(playlist.songs).length === 0) {
                songsEl.innerHTML = '<div class="empty-playlist"><i class="fas fa-music fa-2x mb-3"></i><p>Esta playlist está vacía</p></div>';
            } else {
                const songs = Object.values(playlist.songs);
                songs.forEach((song, index) => {
                    const songEl = document.createElement('div');
                    songEl.className = 'playlist-song-item';
                    songEl.innerHTML = `
                        <div class="song-info">
                            <img src="${song.image || 'resources/album covers/placeholder.png'}" alt="${song.title}" class="song-image">
                            <div>
                                <div class="song-title">${song.title}</div>
                                <div class="song-artist">${song.artist}</div>
                            </div>
                        </div>
                        <div class="song-actions">
                            <button class="btn btn-sm btn-outline-light play-song-btn" title="Reproducir">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    `;
                    
                    const playBtn = songEl.querySelector('.play-song-btn');
                    playBtn?.addEventListener('click', () => {
                        playTrack(song, Object.values(playlist.songs), index);
                    });
                    
                    songsEl.appendChild(songEl);
                });
            }
        }
        
        if (modal) {
            new bootstrap.Modal(modal).show();
        }
    }

    function showAddToPlaylistModal(track) {
        selectedSongForPlaylist = track;
        
        // Usar la función global si está disponible
        if (window.showAddToPlaylistModalGlobal) {
            window.showAddToPlaylistModalGlobal(track);
        } else {
            showToast('Sistema de playlists no disponible', 'error');
        }
    }

    // Funciones de gestión de likes y biblioteca
    async function toggleLike(track, button) {
        if (!firebase.auth().currentUser) {
            showToast('Debes iniciar sesión para gestionar favoritos', 'warning');
            return;
        }

        try {
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;

            if (likesManagerInstance) {
                await likesManagerInstance.toggleLike(track);
            } else {
                showToast('Sistema de favoritos no disponible', 'error');
            }
        } catch (error) {
            console.error('Error en toggle like:', error);
            showToast('Error al actualizar favoritos', 'error');
        } finally {
            button.disabled = false;
        }
    }

    async function toggleLibrary(track, button) {
        if (!firebase.auth().currentUser) {
            showToast('Debes iniciar sesión para gestionar biblioteca', 'warning');
            return;
        }

        try {
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;

            if (libraryManagerInstance) {
                const isInLibrary = libraryManagerInstance.isInLibrary(track.id);
                
                if (isInLibrary) {
                    await libraryManagerInstance.removeSongFromLibrary(track.id);
                } else {
                    await libraryManagerInstance.addSongToLibrary(track);
                }
            } else {
                showToast('Sistema de biblioteca no disponible', 'error');
            }
        } catch (error) {
            console.error('Error en toggle library:', error);
            showToast('Error al actualizar biblioteca', 'error');
        } finally {
            button.disabled = false;
        }
    }

    async function removeFromLibrary(track) {
        try {
            if (libraryManagerInstance) {
                await libraryManagerInstance.removeSongFromLibrary(track.id);
                showToast('Canción eliminada de la biblioteca', 'success');
            }
        } catch (error) {
            console.error('Error removiendo de biblioteca:', error);
            showToast('Error al eliminar de biblioteca', 'error');
        }
    }

    async function removeLike(track) {
        try {
            if (likesManagerInstance) {
                await likesManagerInstance.removeSongFromLiked(track.id);
                showToast('Canción eliminada de favoritos', 'success');
            }
        } catch (error) {
            console.error('Error removiendo like:', error);
            showToast('Error al eliminar de favoritos', 'error');
        }
    }

    function updateLikeButtonsUI(songId, isLiked) {
        document.querySelectorAll(`[data-track-id="${songId}"] .like-button`).forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
            }
            button.classList.toggle('active', isLiked);
            button.title = isLiked ? 'Quitar de favoritos' : 'Añadir a favoritos';
        });
    }

    // Funciones de utilidad
    function showEmptyState(context, message) {
        const containers = {
            library: librarySongsContainer,
            songs: librarySongsContainer,
            playlists: playlistsContainer,
            likes: likesContainer
        };
        
        const container = containers[context];
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-${getEmptyStateIcon(context)} fa-3x mb-3"></i>
                    <h3>¡Ups! No hay nada aquí</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    function getEmptyStateIcon(context) {
        const icons = {
            library: 'music',
            songs: 'music',
            playlists: 'list-ul',
            likes: 'heart'
        };
        return icons[context] || 'music';
    }

    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('show', show);
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `biblioteca-toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 9999;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 350px;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Hacer funciones globales para los modales
    window.showCreatePlaylistModal = showCreatePlaylistModal;
    
    // Inicializar cuando todo esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
});

console.log("biblioteca.js: Sistema completo de biblioteca cargado.");