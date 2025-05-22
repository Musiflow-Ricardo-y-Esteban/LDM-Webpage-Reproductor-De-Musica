// mostrarCanciones.js - Sistema completo para mostrar canciones con integración de likes y playlists

/**
 * Base de datos de canciones de muestra para la aplicación
 * Contiene una colección de pistas con sus metadatos y rutas de audio
 */
const musicDatabase = {
    tracks: [
        {
            id: "local-1", // IDs únicos, con prefijo para mayor claridad
            title: "Dark Horse",
            artist: "Katy Perry",
            album: "PRISM",
            image: "resources/album covers/darkhorse.jpg", 
            duration: "3:45", // Mantener como cadena para mostrar, MusicManager maneja la duración real
            genre: "Pop",
            source: "resources/audio/DarkHorse.mp3", // Esta es la clave para el objeto Audio
            sourceOrigin: "local"
        },
        {
            id: "local-2",
            title: "Locked Out of Heaven",
            artist: "Bruno Mars",
            album: "Unorthodox Jukebox",
            image: "resources/album covers/unorthodoxJukebox.jpg",
            duration: "3:54",
            genre: "Pop",
            source: "resources/audio/LockedOutOfHeaven.mp3",
            sourceOrigin: "local"
        },
        {
            id: "local-3",
            title: "SOS",
            artist: "Rihanna",
            album: "A Girl Like Me",
            image: "resources/album covers/AGirlLikeMe.jpg",
            duration: "4:01",
            genre: "Pop",
            source: "resources/audio/SOS.mp3",
            sourceOrigin: "local"
        },
        {
            id: "local-4",
            title: "End of Beginning",
            artist: "Djo",
            album: "DECIDE",
            image: "resources/album covers/DECIDE.png",
            duration: "2:39",
            genre: "Synth-Pop",
            source: "resources/audio/EndOfBeginning.mp3",
            sourceOrigin: "local"
        },
        {
            id: "local-5",
            title: "Judas",
            artist: "Lady Gaga",
            album: "Born This Way",
            image: "resources/album covers/BornThisWay.jpg",
            duration: "4:09",
            genre: "Pop",
            source: "resources/audio/Judas.mp3",
            sourceOrigin: "local"
        },
        {
            id: "local-6",
            title: "The Line",
            artist: "Twenty One Pilots, Arcane, League of Legends",
            album: "ARCANE",
            image: "resources/album covers/ARCANE.jpg",
            duration: "3:54",
            genre: "ElectroPop",
            source: "resources/audio/the line.mp3",
            sourceOrigin: "local"
        }
    ]
};

/**
 * Formatea el tiempo en segundos a formato minutos:segundos
 * @param {number} seconds - Tiempo en segundos
 * @return {string} Tiempo formateado en "m:ss"
 */
function formatTimeGlobal(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Busca canciones locales que coincidan con una consulta
 * @param {string} query - Texto a buscar
 * @return {Array} Lista de pistas que coinciden con la búsqueda
 */
function searchLocalTracks(query) {
    if (!query) {
        return musicDatabase.tracks;
    }
    
    query = query.toLowerCase();
    return musicDatabase.tracks.filter(track => 
        track.title.toLowerCase().includes(query) || 
        track.artist.toLowerCase().includes(query) || 
        track.album.toLowerCase().includes(query) ||
        (track.genre && track.genre.toLowerCase().includes(query))
    );
}

/**
 * Genera HTML para mostrar las canciones locales en la interfaz con integración de likes y playlists
 * @param {Array} tracks - Lista de pistas a mostrar
 */
function displayLocalTracks(tracks) {
    const resultsContainer = document.getElementById('searchResults');
    const musicManager = window.musicManager; // Acceder a la instancia global de music manager

    if (!resultsContainer) {
        console.error("Elemento con ID 'searchResults' no encontrado.");
        return;
    }
    
    if (!tracks || tracks.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No se encontraron canciones</div>';
        return;
    }
    
    resultsContainer.innerHTML = ''; // Limpiar resultados anteriores
    
    const tracksContainer = document.createElement('div');
    tracksContainer.className = 'tracks-container';
    
    const headerRow = document.createElement('div');
    headerRow.className = 'track-header';
    headerRow.innerHTML = `
        <div class="track-number">#</div>
        <div class="track-info">TÍTULO</div>
        <div class="track-album">ÁLBUM</div>
        <div class="track-duration"><i class="far fa-clock"></i></div>
    `;
    tracksContainer.appendChild(headerRow);
    
    tracks.forEach((track, index) => {
        // Verificar estado de "me gusta" si el sistema está disponible
        const isLiked = window.LikesManager ? window.LikesManager.isLiked(track.id) : false;
        const heartClass = isLiked ? 'fas' : 'far';
        const heartColor = isLiked ? 'style="color: #1ed760;"' : '';
        
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.dataset.trackId = track.id;
        
        trackRow.innerHTML = `
            <div class="track-number">
                <span class="track-index">${index + 1}</span>
                <button class="play-button" data-track-id="${track.id}">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="track-info">
                <img src="${track.image}" alt="${track.title}" class="track-image">
                <div class="track-details">
                    <div class="track-title">${track.title}</div>
                    <div class="track-artist">${track.artist}</div>
                </div>
            </div>
            <div class="track-album">${track.album}</div>
            <div class="track-duration">
                <span>${track.duration}</span>
                <div class="track-actions">
                    <button class="action-button like-button ${isLiked ? 'active' : ''}" title="${isLiked ? 'Eliminar de favoritos' : 'Añadir a favoritos'}" data-track-id="${track.id}">
                        <i class="${heartClass} fa-heart" ${heartColor}></i>
                    </button>
                    <button class="action-button add-to-playlist-button" title="Añadir a playlist" data-track-id="${track.id}">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <button class="action-button more-button" title="Más opciones" data-track-id="${track.id}">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Eventos para hovering en la fila
        trackRow.addEventListener('mouseenter', () => {
            const playButton = trackRow.querySelector('.play-button');
            const indexElement = trackRow.querySelector('.track-index');
            const isCurrentAndPlaying = musicManager && musicManager.currentTrack && 
                                       musicManager.currentTrack.id === track.id && 
                                       musicManager.isPlaying;

            if (isCurrentAndPlaying && musicManager.currentMode === 'local') {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
            trackRow.querySelector('.track-actions').style.visibility = 'visible';
        });
        
        trackRow.addEventListener('mouseleave', () => {
            const playButton = trackRow.querySelector('.play-button');
            const indexElement = trackRow.querySelector('.track-index');
            const isCurrent = musicManager && musicManager.currentTrack && 
                             musicManager.currentTrack.id === track.id;

            if (!isCurrent || musicManager.currentMode !== 'local') {
                indexElement.style.display = 'block';
                playButton.style.display = 'none';
            } else if (isCurrent && musicManager.isPlaying) {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else if (isCurrent && !musicManager.isPlaying) {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
            trackRow.querySelector('.track-actions').style.visibility = 'hidden';
        });
        
        tracksContainer.appendChild(trackRow);
    });
    
    resultsContainer.appendChild(tracksContainer);
    
    // Configurar eventos para botones de reproducción
    setupPlayButtons();
    
    // Configurar eventos para botones de "me gusta"
    setupLikeButtons();
    
    // Configurar eventos para botones de "añadir a playlist"
    setupPlaylistButtons();
    
    // Configurar eventos para filas de canciones
    setupTrackRowEvents();
    
    // Configurar eventos para botones de "más opciones"
    setupMoreButtons();
    
    console.log('displayLocalTracks: Interfaz actualizada con', tracks.length, 'canciones');
}

/**
 * Configura los eventos de los botones de reproducción
 */
function setupPlayButtons() {
    document.querySelectorAll('.track-row .play-button').forEach(button => {
        // Limpiar eventos anteriores
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (window.musicManager) {
                const trackId = newButton.dataset.trackId;
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                
                if (trackToPlay) {
                    // Si es la misma pista y está sonando, pausarla. Sino, reproducirla.
                    if (window.musicManager.currentTrack && 
                        window.musicManager.currentTrack.id === trackId && 
                        window.musicManager.isPlaying) {
                        window.musicManager.togglePlayPause();
                    } else {
                        window.musicManager.playTrack(trackToPlay);
                    }
                }
            } else {
                console.warn('MusicManager no está disponible');
            }
        });
    });
}

/**
 * Configura los eventos de los botones de "me gusta"
 */
function setupLikeButtons() {
    document.querySelectorAll('.like-button').forEach(button => {
        // Limpiar eventos anteriores
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            
            if (!track) {
                console.error('Canción no encontrada:', trackId);
                showToast('Error: Canción no encontrada', 'error');
                return;
            }
            
            // Verificar si el usuario está autenticado
            if (!firebase.auth().currentUser) {
                showToast('Debes iniciar sesión para añadir favoritos', 'warning');
                // Opcional: redirigir al login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            try {
                // Mostrar indicador de carga en el botón
                const originalContent = newButton.innerHTML;
                newButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                newButton.disabled = true;
                
                if (window.LikesManager) {
                    // Usar el sistema integrado de likes
                    const newLikeStatus = await window.LikesManager.toggleLike(track);
                    
                    // Actualizar el botón inmediatamente
                    updateLikeButtonVisual(newButton, newLikeStatus);
                    
                    // Mostrar mensaje de confirmación
                    showToast(`Canción ${newLikeStatus ? 'añadida a' : 'eliminada de'} favoritos`, 'success');
                    
                    console.log('Estado de like cambiado para:', track.title, '→', newLikeStatus);
                } else {
                    console.warn('LikesManager no está disponible');
                    showToast('Sistema de favoritos no disponible', 'error');
                    
                    // Restaurar botón
                    newButton.innerHTML = originalContent;
                }
                
                newButton.disabled = false;
                
            } catch (error) {
                console.error('Error al cambiar estado de like:', error);
                showToast(error.message || 'Error al actualizar favoritos', 'error');
                
                // Restaurar botón en caso de error
                const isCurrentlyLiked = window.LikesManager ? window.LikesManager.isLiked(trackId) : false;
                updateLikeButtonVisual(newButton, isCurrentlyLiked);
                newButton.disabled = false;
            }
        });
    });
}

/**
 * Actualiza la apariencia visual de un botón de like
 * @param {Element} button - Elemento del botón
 * @param {boolean} isLiked - Estado de like
 */
function updateLikeButtonVisual(button, isLiked) {
    const icon = button.querySelector('i');
    if (icon) {
        icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = isLiked ? '#1ed760' : '';
    }
    
    button.classList.toggle('active', isLiked);
    button.title = isLiked ? 'Eliminar de favoritos' : 'Añadir a favoritos';
}

/**
 * Configura los eventos de los botones de "añadir a playlist"
 */
function setupPlaylistButtons() {
    document.querySelectorAll('.add-to-playlist-button').forEach(button => {
        // Limpiar eventos anteriores
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            
            if (!track) {
                console.error('Canción no encontrada:', trackId);
                showToast('Error: Canción no encontrada', 'error');
                return;
            }
            
            // Verificar si el usuario está autenticado
            if (!firebase.auth().currentUser) {
                showToast('Debes iniciar sesión para gestionar playlists', 'warning');
                // Opcional: redirigir al login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            }
            
            // Mostrar modal de selección de playlist
            showAddToPlaylistModal(track);
        });
    });
}

/**
 * Configura los eventos de las filas de canciones
 */
function setupTrackRowEvents() {
    document.querySelectorAll('.track-row').forEach(row => {
        // Limpiar eventos anteriores
        const newRow = row.cloneNode(true);
        row.parentNode.replaceChild(newRow, row);
        
        // Reconfigurar eventos para los elementos hijos del nuevo row
        setupRowChildEvents(newRow);
        
        newRow.addEventListener('click', (e) => {
            // No reproducir si se hizo clic en un botón de acción
            if (e.target.closest('.action-button') || e.target.closest('.play-button')) {
                return;
            }
            
            if (window.musicManager) {
                const trackId = newRow.dataset.trackId;
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                
                if (trackToPlay) {
                    // Si es la misma pista y está sonando, no hacer nada efectivo con el clic en la fila
                    if (!(window.musicManager.currentTrack && 
                          window.musicManager.currentTrack.id === trackId && 
                          window.musicManager.isPlaying)) {
                        window.musicManager.playTrack(trackToPlay);
                    }
                }
            }
        });
    });
}

/**
 * Configura eventos para elementos hijos de una fila
 * @param {Element} row - Elemento de fila
 */
function setupRowChildEvents(row) {
    // Configurar hover events
    row.addEventListener('mouseenter', () => {
        const playButton = row.querySelector('.play-button');
        const indexElement = row.querySelector('.track-index');
        const actionsElement = row.querySelector('.track-actions');
        
        if (playButton && indexElement) {
            const trackId = row.dataset.trackId;
            const musicManager = window.musicManager;
            const isCurrentAndPlaying = musicManager && musicManager.currentTrack && 
                                       musicManager.currentTrack.id === trackId && 
                                       musicManager.isPlaying;

            if (isCurrentAndPlaying && musicManager.currentMode === 'local') {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
        
        if (actionsElement) {
            actionsElement.style.visibility = 'visible';
        }
    });
    
    row.addEventListener('mouseleave', () => {
        const playButton = row.querySelector('.play-button');
        const indexElement = row.querySelector('.track-index');
        const actionsElement = row.querySelector('.track-actions');
        const trackId = row.dataset.trackId;
        const musicManager = window.musicManager;
        
        if (playButton && indexElement) {
            const isCurrent = musicManager && musicManager.currentTrack && 
                             musicManager.currentTrack.id === trackId;

            if (!isCurrent || musicManager.currentMode !== 'local') {
                indexElement.style.display = 'block';
                playButton.style.display = 'none';
            } else if (isCurrent && musicManager.isPlaying) {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else if (isCurrent && !musicManager.isPlaying) {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
        
        if (actionsElement) {
            actionsElement.style.visibility = 'hidden';
        }
    });
    
    // Configurar evento del botón de play
    const playButton = row.querySelector('.play-button');
    if (playButton) {
        playButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            if (window.musicManager) {
                const trackId = playButton.dataset.trackId;
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                
                if (trackToPlay) {
                    if (window.musicManager.currentTrack && 
                        window.musicManager.currentTrack.id === trackId && 
                        window.musicManager.isPlaying) {
                        window.musicManager.togglePlayPause();
                    } else {
                        window.musicManager.playTrack(trackToPlay);
                    }
                }
            }
        });
    }
    
    // Configurar evento del botón de like
    const likeButton = row.querySelector('.like-button');
    if (likeButton) {
        likeButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            const trackId = likeButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            
            if (!track) {
                console.error('Canción no encontrada:', trackId);
                return;
            }
            
            if (!firebase.auth().currentUser) {
                showToast('Debes iniciar sesión para añadir favoritos', 'warning');
                return;
            }
            
            try {
                const originalContent = likeButton.innerHTML;
                likeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                likeButton.disabled = true;
                
                if (window.LikesManager) {
                    const newLikeStatus = await window.LikesManager.toggleLike(track);
                    updateLikeButtonVisual(likeButton, newLikeStatus);
                    showToast(`Canción ${newLikeStatus ? 'añadida a' : 'eliminada de'} favoritos`, 'success');
                } else {
                    likeButton.innerHTML = originalContent;
                    showToast('Sistema de favoritos no disponible', 'error');
                }
                
                likeButton.disabled = false;
                
            } catch (error) {
                console.error('Error al cambiar estado de like:', error);
                showToast('Error al actualizar favoritos', 'error');
                
                const isCurrentlyLiked = window.LikesManager ? window.LikesManager.isLiked(trackId) : false;
                updateLikeButtonVisual(likeButton, isCurrentlyLiked);
                likeButton.disabled = false;
            }
        });
    }
    
    // Configurar evento del botón de playlist
    const playlistButton = row.querySelector('.add-to-playlist-button');
    if (playlistButton) {
        playlistButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const trackId = playlistButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            
            if (!track) {
                console.error('Canción no encontrada:', trackId);
                return;
            }
            
            if (!firebase.auth().currentUser) {
                showToast('Debes iniciar sesión para gestionar playlists', 'warning');
                return;
            }
            
            showAddToPlaylistModal(track);
        });
    }
    
    // Configurar evento del botón de opciones
    const moreButton = row.querySelector('.more-button');
    if (moreButton) {
        moreButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const trackId = moreButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            
            if (track) {
                showMoreOptionsMenu(track, e.target);
            }
        });
    }
}

/**
 * Configura los eventos de los botones de "más opciones"
 */
function setupMoreButtons() {
    document.querySelectorAll('.more-button').forEach(button => {
        // Limpiar eventos anteriores
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            
            if (track) {
                showMoreOptionsMenu(track, e.target);
            }
        });
    });
}

/**
 * Muestra el modal para añadir una canción a una playlist
 * @param {Object} track - Objeto con datos de la canción
 */
function showAddToPlaylistModal(track) {
    // Verificar si el modal existe
    let modal = document.getElementById('addToPlaylistModal');
    
    if (!modal) {
        // Crear modal dinámicamente si no existe
        const modalHTML = `
            <div class="modal fade modal-dark" id="addToPlaylistModal" tabindex="-1" aria-labelledby="addToPlaylistModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="addToPlaylistModalLabel">Añadir a playlist</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="selectedSongInfo"></div>
                            <div id="userPlaylistsForSelection" class="mt-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('addToPlaylistModal');
    }
    
    // Actualizar información de la canción
    const songInfoElement = document.getElementById('selectedSongInfo');
    if (songInfoElement) {
        songInfoElement.innerHTML = `
            <div class="d-flex align-items-center mb-3">
                <img src="${track.image}" alt="${track.title}" 
                    style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 15px;">
                <div>
                    <h5 class="m-0">${track.title}</h5>
                    <p class="text-muted m-0">${track.artist}</p>
                </div>
            </div>
            <p class="mb-2">Selecciona una playlist para añadir esta canción:</p>
        `;
    }
    
    // Cargar playlists del usuario
    loadUserPlaylistsForSelection(track);
    
    // Mostrar modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

/**
 * Carga las playlists del usuario para la selección
 * @param {Object} track - Canción para añadir
 */
function loadUserPlaylistsForSelection(track) {
    const container = document.getElementById('userPlaylistsForSelection');
    
    if (!container) return;
    
    // Mostrar indicador de carga
    container.innerHTML = `
        <div class="text-center py-3">
            <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
            <p>Cargando playlists...</p>
        </div>
    `;
    
    if (window.PlaylistManager) {
        // Esperar un momento para que se vea el indicador de carga
        setTimeout(() => {
            const playlists = window.PlaylistManager.getAllPlaylists();
            
            if (playlists.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <p>No tienes playlists disponibles.</p>
                        <button class="btn btn-sm btn-outline-light" onclick="createPlaylistAndAddSong('${track.id}')">
                            <i class="fas fa-plus me-2"></i> Crear nueva playlist
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = '';
                
                playlists.forEach(playlist => {
                    const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
                    
                    const playlistItem = document.createElement('div');
                    playlistItem.className = 'playlist-item';
                    playlistItem.style.cssText = `
                        cursor: pointer; 
                        padding: 15px; 
                        border-radius: 8px; 
                        margin-bottom: 10px; 
                        background: rgba(255, 255, 255, 0.05);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                    `;
                    
                    playlistItem.innerHTML = `
                        <div class="playlist-cover" style="width: 50px; height: 50px; background: linear-gradient(45deg, var(--arcoiris-2), var(--arcoiris-4)); border-radius: 5px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <i class="fas fa-music" style="color: white;"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="playlist-title m-0">${playlist.name}</h6>
                            <small class="text-muted">${songCount} ${songCount === 1 ? 'canción' : 'canciones'}</small>
                        </div>
                    `;
                    
                    // Efectos hover
                    playlistItem.addEventListener('mouseenter', () => {
                        playlistItem.style.background = 'rgba(255, 255, 255, 0.1)';
                        playlistItem.style.transform = 'translateX(5px)';
                    });
                    
                    playlistItem.addEventListener('mouseleave', () => {
                        playlistItem.style.background = 'rgba(255, 255, 255, 0.05)';
                        playlistItem.style.transform = 'translateX(0)';
                    });
                    
                    playlistItem.addEventListener('click', async () => {
                        try {
                            // Mostrar indicador de carga
                            playlistItem.style.opacity = '0.5';
                            playlistItem.style.pointerEvents = 'none';
                            
                            await window.PlaylistManager.addSongToPlaylist(track, playlist.id);
                            
                            // Cerrar modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            showToast(`Canción añadida a "${playlist.name}"`, 'success');
                        } catch (error) {
                            console.error('Error al añadir canción a playlist:', error);
                            showToast(error.message || 'Error al añadir canción a playlist', 'error');
                            
                            // Restaurar estado del elemento
                            playlistItem.style.opacity = '1';
                            playlistItem.style.pointerEvents = 'auto';
                        }
                    });
                    
                    container.appendChild(playlistItem);
                });
                
                // Opción para crear nueva playlist
                const createNewItem = document.createElement('div');
                createNewItem.className = 'text-center mt-3';
                createNewItem.innerHTML = `
                    <button class="btn btn-sm btn-outline-light" onclick="createPlaylistAndAddSong('${track.id}')">
                        <i class="fas fa-plus me-2"></i> Crear nueva playlist
                    </button>
                `;
                container.appendChild(createNewItem);
            }
        }, 300);
    } else {
        container.innerHTML = `
            <div class="text-center py-3 text-muted">
                <p>Sistema de playlists no disponible.</p>
            </div>
        `;
    }
}

/**
 * Muestra el menú de más opciones para una canción
 * @param {Object} track - Canción seleccionada
 * @param {Element} buttonElement - Elemento botón que activó el menú
 */
function showMoreOptionsMenu(track, buttonElement) {
    // Crear menú contextual simple
    const existingMenu = document.getElementById('moreOptionsMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.id = 'moreOptionsMenu';
    menu.style.cssText = `
        position: fixed;
        background: rgba(18, 18, 18, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px 0;
        min-width: 150px;
        z-index: 1000;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const isLiked = window.LikesManager ? window.LikesManager.isLiked(track.id) : false;
    
    menu.innerHTML = `
        <div class="menu-item" onclick="copyTrackInfo('${track.id}')" style="padding: 8px 16px; cursor: pointer; color: white; font-size: 14px;">
            <i class="fas fa-copy me-2"></i> Copiar información
        </div>
        <div class="menu-item" onclick="shareTrack('${track.id}')" style="padding: 8px 16px; cursor: pointer; color: white; font-size: 14px;">
            <i class="fas fa-share me-2"></i> Compartir
        </div>
        <div class="menu-item" onclick="showTrackDetails('${track.id}')" style="padding: 8px 16px; cursor: pointer; color: white; font-size: 14px;">
            <i class="fas fa-info-circle me-2"></i> Detalles
        </div>
    `;
    
    // Posicionar menú cerca del botón
    const rect = buttonElement.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 5}px`;
    
    // Añadir efectos hover
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
        });
    });
    
    document.body.appendChild(menu);
    
    // Cerrar menú al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 10);
}

/**
 * Funciones globales para el menú de opciones
 */
window.copyTrackInfo = function(trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId);
    if (track) {
        navigator.clipboard.writeText(`${track.title} - ${track.artist}`);
        showToast('Información copiada al portapapeles', 'success');
    }
    document.getElementById('moreOptionsMenu')?.remove();
};

window.shareTrack = function(trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId);
    if (track) {
        if (navigator.share) {
            navigator.share({
                title: track.title,
                text: `Escucha "${track.title}" de ${track.artist} en MusiFlow`,
                url: window.location.href
            });
        } else {
            copyTrackInfo(trackId);
            showToast('Información copiada para compartir', 'info');
        }
    }
    document.getElementById('moreOptionsMenu')?.remove();
};

window.showTrackDetails = function(trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId);
    if (track) {
        showToast(`${track.title} - ${track.artist} (${track.album})`, 'info');
    }
    document.getElementById('moreOptionsMenu')?.remove();
};

window.createPlaylistAndAddSong = function(trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId);
    if (!track) return;
    
    // Cerrar modal actual
    const addToPlaylistModal = bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'));
    if (addToPlaylistModal) {
        addToPlaylistModal.hide();
    }
    
    // Mostrar prompt para nombre de playlist
    const playlistName = prompt('Nombre de la nueva playlist:');
    if (!playlistName || !playlistName.trim()) return;
    
    // Crear playlist y añadir canción
    if (window.PlaylistManager) {
        window.PlaylistManager.createPlaylist({
            name: playlistName.trim(),
            description: `Playlist creada para "${track.title}"`
        })
        .then(playlist => {
            return window.PlaylistManager.addSongToPlaylist(track, playlist.id);
        })
        .then(() => {
            showToast(`Playlist "${playlistName}" creada y canción añadida`, 'success');
        })
        .catch(error => {
            console.error('Error al crear playlist:', error);
            showToast('Error al crear playlist', 'error');
        });
    }
};

/**
 * Función auxiliar para mostrar notificaciones
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
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
        max-width: 400px;
    `;
    
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

// Listener para cambios en el sistema de likes
document.addEventListener('DOMContentLoaded', () => {
    // Configurar listener para actualizaciones de likes
    if (window.LikesManager) {
        window.LikesManager.addLikeChangeListener((songId, isLiked) => {
            console.log('Actualizando UI por cambio de like:', songId, isLiked);
            
            // Actualizar todos los botones de like para esta canción
            document.querySelectorAll(`[data-track-id="${songId}"] .like-button, .like-button[data-track-id="${songId}"]`).forEach(button => {
                updateLikeButtonVisual(button, isLiked);
            });
        });
    }
    
    console.log('mostrarCanciones.js: Sistema de visualización con integración cargado correctamente');
});

console.log("mostrarCanciones.js cargado y mejorado con integración completa de likes y playlists.");