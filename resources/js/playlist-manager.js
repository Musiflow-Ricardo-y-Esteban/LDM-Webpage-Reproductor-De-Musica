// resources/js/mostrarCanciones.js
// Sistema completo para mostrar canciones con integración de likes y playlists

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
            duration: "3:45", 
            genre: "Pop",
            source: "resources/audio/DarkHorse.mp3", 
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
    if (seconds == null || isNaN(seconds) || seconds < 0) return '0:00';
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
    
    query = query.toLowerCase().trim();
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
    const musicManager = window.musicManager; 

    if (!resultsContainer) {
        console.error("mostrarCanciones.js: Elemento con ID 'searchResults' no encontrado.");
        return;
    }
    
    if (!tracks || tracks.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No se encontraron canciones</div>';
        return;
    }
    
    resultsContainer.innerHTML = ''; 
    
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
                <img src="${track.image || 'resources/album covers/placeholder.png'}" alt="${track.title || 'Canción'}" class="track-image">
                <div class="track-details">
                    <div class="track-title">${track.title || 'Título Desconocido'}</div>
                    <div class="track-artist">${track.artist || 'Artista Desconocido'}</div>
                </div>
            </div>
            <div class="track-album">${track.album || 'Álbum Desconocido'}</div>
            <div class="track-duration">
                <span>${track.duration || '0:00'}</span>
                <div class="track-actions">
                    <button class="action-button like-button ${isLiked ? 'active' : ''}" title="${isLiked ? 'Quitar Me Gusta' : 'Me Gusta'}" data-track-id="${track.id}">
                        <i class="${heartClass} fa-heart" ${heartColor}></i>
                    </button>
                    <button class="action-button add-to-library-btn" title="Añadir a Biblioteca" data-track-id="${track.id}">
                        <i class="fas fa-plus-circle"></i>
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
        
        tracksContainer.appendChild(trackRow);
    });
        
    resultsContainer.appendChild(tracksContainer);
    
    setupPlayButtons();
    setupLikeButtons();
    setupLibraryButtons(); // Para el nuevo botón de biblioteca
    setupPlaylistButtons();
    setupTrackRowEvents();
    setupMoreButtons();
    
    console.log('mostrarCanciones.js: Interfaz actualizada con', tracks.length, 'canciones locales.');
}

function setupPlayButtons() {
    document.querySelectorAll('#searchResults .track-row .play-button').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.musicManager) {
                const trackId = newButton.dataset.trackId;
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
    });
}

function setupLikeButtons() {
    document.querySelectorAll('#searchResults .like-button').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (!track) { showToastGlobal('Error: Canción no encontrada', 'error'); return; }
            if (!firebase.auth().currentUser) {
                showToastGlobal('Debes iniciar sesión para añadir favoritos', 'warning');
                return;
            }
            try {
                const originalContent = newButton.innerHTML;
                newButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; newButton.disabled = true;
                if (window.LikesManager) {
                    const newLikeStatus = await window.LikesManager.toggleLike(track);
                    updateLikeButtonVisual(newButton, newLikeStatus); // Actualiza el botón
                    showToastGlobal(`Canción ${newLikeStatus ? 'añadida a' : 'eliminada de'} favoritos`, 'success');
                } else {
                    newButton.innerHTML = originalContent;
                    showToastGlobal('Sistema de favoritos no disponible', 'error');
                }
                newButton.disabled = false;
            } catch (error) {
                console.error('Error al cambiar estado de like:', error);
                showToastGlobal(error.message || 'Error al actualizar favoritos', 'error');
                const isCurrentlyLiked = window.LikesManager ? window.LikesManager.isLiked(trackId) : false;
                updateLikeButtonVisual(newButton, isCurrentlyLiked);
                newButton.disabled = false;
            }
        });
    });
}

function setupLibraryButtons() {
    document.querySelectorAll('#searchResults .add-to-library-btn').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Actualizar estado visual inicial del botón de biblioteca
        const trackId = newButton.dataset.trackId;
        if (window.LibraryManager) {
            window.LibraryManager.updateLibraryButtonVisual(trackId, window.LibraryManager.isInLibrary(trackId));
        }

        newButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (!track) { showToastGlobal('Error: Canción no encontrada', 'error'); return; }
            if (!firebase.auth().currentUser) {
                showToastGlobal('Debes iniciar sesión para gestionar tu biblioteca', 'warning');
                return;
            }
            try {
                const originalContent = newButton.innerHTML;
                newButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; newButton.disabled = true;
                if (window.LibraryManager) {
                    const isInLib = window.LibraryManager.isInLibrary(trackId);
                    if (isInLib) {
                        await window.LibraryManager.removeSongFromLibrary(trackId);
                    } else {
                        await window.LibraryManager.addSongToLibrary(track);
                    }
                    // El listener de LibraryManager se encargará de actualizar el botón.
                } else {
                    newButton.innerHTML = originalContent;
                    showToastGlobal('Sistema de biblioteca no disponible', 'error');
                }
                newButton.disabled = false;
            } catch (error) {
                console.error('Error al gestionar biblioteca:', error);
                showToastGlobal(error.message || 'Error al actualizar biblioteca', 'error');
                if(window.LibraryManager) window.LibraryManager.updateLibraryButtonVisual(trackId, window.LibraryManager.isInLibrary(trackId));
                newButton.disabled = false;
            }
        });
    });
}


function updateLikeButtonVisual(button, isLiked) {
    const icon = button.querySelector('i');
    if (icon) {
        icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
        icon.style.color = isLiked ? '#1ed760' : '';
    }
    button.classList.toggle('active', isLiked);
    button.title = isLiked ? 'Quitar Me Gusta' : 'Me Gusta';
}

function setupPlaylistButtons() {
    document.querySelectorAll('#searchResults .add-to-playlist-button').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (!track) { showToastGlobal('Error: Canción no encontrada', 'error'); return; }
            if (!firebase.auth().currentUser) {
                showToastGlobal('Debes iniciar sesión para gestionar playlists', 'warning');
                return;
            }
            showAddToPlaylistModalGlobal(track); // Llamar a la función global
        });
    });
}

function setupTrackRowEvents() {
    document.querySelectorAll('#searchResults .track-row').forEach(row => {
        const newRow = row.cloneNode(true);
        row.parentNode.replaceChild(newRow, row);
        
        setupRowChildEvents(newRow); // Configura listeners para los hijos del nuevo row
        
        newRow.addEventListener('click', (e) => {
            if (e.target.closest('.action-button') || e.target.closest('.play-button')) return;
            if (window.musicManager) {
                const trackId = newRow.dataset.trackId;
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                if (trackToPlay) {
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

function setupRowChildEvents(row) {
    const musicManager = window.musicManager;
    const trackId = row.dataset.trackId;

    row.addEventListener('mouseenter', () => {
        const playButtonEl = row.querySelector('.play-button');
        const indexElement = row.querySelector('.track-index');
        const actionsElement = row.querySelector('.track-actions');
        
        if (playButtonEl && indexElement) {
            const isCurrentAndPlaying = musicManager && musicManager.currentTrack && 
                                       musicManager.currentTrack.id === trackId && musicManager.isPlaying;
            if (isCurrentAndPlaying && musicManager.currentMode === 'local') {
                indexElement.style.display = 'none';
                playButtonEl.style.display = 'flex';
                playButtonEl.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                indexElement.style.display = 'none';
                playButtonEl.style.display = 'flex';
                playButtonEl.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
        if (actionsElement) actionsElement.style.visibility = 'visible';
    });
    
    row.addEventListener('mouseleave', () => {
        const playButtonEl = row.querySelector('.play-button');
        const indexElement = row.querySelector('.track-index');
        const actionsElement = row.querySelector('.track-actions');
        
        if (playButtonEl && indexElement) {
            const isCurrent = musicManager && musicManager.currentTrack && musicManager.currentTrack.id === trackId;
            if (!isCurrent || musicManager.currentMode !== 'local') {
                indexElement.style.display = 'block';
                playButtonEl.style.display = 'none';
            } else { // Es la pista actual (sonando o pausada)
                indexElement.style.display = 'none';
                playButtonEl.style.display = 'flex';
                playButtonEl.innerHTML = musicManager.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
            }
        }
        if (actionsElement) actionsElement.style.visibility = 'hidden';
    });
    
    const playButton = row.querySelector('.play-button');
    if (playButton) {
        playButton.addEventListener('click', (e) => { /* ... (misma lógica que en setupPlayButtons) ... */ 
            e.stopPropagation();
            if (window.musicManager) {
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                if (trackToPlay) {
                    if (window.musicManager.currentTrack && window.musicManager.currentTrack.id === trackId && window.musicManager.isPlaying) {
                        window.musicManager.togglePlayPause();
                    } else {
                        window.musicManager.playTrack(trackToPlay);
                    }
                }
            }
        });
    }
    
    const likeButton = row.querySelector('.like-button');
    if (likeButton) {
        likeButton.addEventListener('click', async (e) => { /* ... (misma lógica que en setupLikeButtons) ... */ 
            e.stopPropagation();
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (!track) return;
            if (!firebase.auth().currentUser) { showToastGlobal('Debes iniciar sesión', 'warning'); return; }
            // ... resto de la lógica de like
            try {
                const originalContent = likeButton.innerHTML;
                likeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; likeButton.disabled = true;
                if (window.LikesManager) {
                    const newLikeStatus = await window.LikesManager.toggleLike(track);
                    updateLikeButtonVisual(likeButton, newLikeStatus);
                    showToastGlobal(`Canción ${newLikeStatus ? 'añadida a' : 'eliminada de'} favoritos`, 'success');
                } else {
                    likeButton.innerHTML = originalContent;
                    showToastGlobal('Sistema de favoritos no disponible', 'error');
                }
                likeButton.disabled = false;
            } catch (error) {
                const isCurrentlyLiked = window.LikesManager ? window.LikesManager.isLiked(trackId) : false;
                updateLikeButtonVisual(likeButton, isCurrentlyLiked);
                likeButton.disabled = false;
                showToastGlobal(error.message || 'Error al actualizar favoritos', 'error');
            }
        });
    }

    const libraryButton = row.querySelector('.add-to-library-btn');
    if (libraryButton) {
        libraryButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (!track) return;
            if (!firebase.auth().currentUser) { showToastGlobal('Debes iniciar sesión', 'warning'); return; }
            // ... Lógica para añadir/quitar de biblioteca con LibraryManager
            try {
                const originalContent = libraryButton.innerHTML;
                libraryButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; libraryButton.disabled = true;
                if (window.LibraryManager) {
                    const isInLib = window.LibraryManager.isInLibrary(trackId);
                    if (isInLib) {
                        await window.LibraryManager.removeSongFromLibrary(trackId);
                    } else {
                        await window.LibraryManager.addSongToLibrary(track);
                    }
                } else {
                    libraryButton.innerHTML = originalContent;
                    showToastGlobal('Sistema de biblioteca no disponible', 'error');
                }
                libraryButton.disabled = false;
            } catch (error) {
                if(window.LibraryManager) window.LibraryManager.updateLibraryButtonVisual(trackId, window.LibraryManager.isInLibrary(trackId));
                libraryButton.disabled = false;
                showToastGlobal(error.message || 'Error al actualizar biblioteca', 'error');
            }
        });
    }
    
    const playlistButton = row.querySelector('.add-to-playlist-button');
    if (playlistButton) {
        playlistButton.addEventListener('click', (e) => { /* ... (misma lógica que en setupPlaylistButtons) ... */ 
            e.stopPropagation();
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (!track) return;
            if (!firebase.auth().currentUser) { showToastGlobal('Debes iniciar sesión', 'warning'); return; }
            showAddToPlaylistModalGlobal(track);
        });
    }
    
    const moreButton = row.querySelector('.more-button');
    if (moreButton) {
        moreButton.addEventListener('click', (e) => { /* ... (misma lógica que en setupMoreButtons) ... */ 
            e.stopPropagation();
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (track) showMoreOptionsMenu(track, e.target);
        });
    }
}

function setupMoreButtons() {
    document.querySelectorAll('#searchResults .more-button').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const trackId = newButton.dataset.trackId;
            const track = musicDatabase.tracks.find(t => t.id === trackId);
            if (track) showMoreOptionsMenu(track, e.target);
        });
    });
}

window.showAddToPlaylistModalGlobal = function(track) { // Ahora es global
    let modal = document.getElementById('addToPlaylistModal');
    if (!modal) {
        const modalHTML = `
            <div class="modal fade modal-dark" id="addToPlaylistModal" tabindex="-1" aria-labelledby="addToPlaylistModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header"><h5 class="modal-title" id="addToPlaylistModalLabel">Añadir a playlist</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button></div>
                        <div class="modal-body">
                            <div id="selectedSongInfoInModal" class="mb-3"></div>
                            <div id="userPlaylistsForSelectionInModal"></div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('addToPlaylistModal');
    }
    
    const songInfoElement = document.getElementById('selectedSongInfoInModal');
    if (songInfoElement) {
        songInfoElement.innerHTML = `
            <div class="d-flex align-items-center mb-3">
                <img src="${track.image || 'resources/album covers/placeholder.png'}" alt="${track.title || 'Canción'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px;">
                <div><h6 class="m-0">${track.title || 'Título Desconocido'}</h6><small class="text-muted m-0">${track.artist || 'Artista Desconocido'}</small></div>
            </div>
            <p class="mb-2 small">Selecciona una playlist o crea una nueva:</p>`;
    }
    
    loadUserPlaylistsForSelectionModal(track); 
    
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

function loadUserPlaylistsForSelectionModal(track) {
    const container = document.getElementById('userPlaylistsForSelectionInModal');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-2"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>`;
    
    if (window.PlaylistManager) {
        setTimeout(async () => { 
            try {
                if (typeof window.PlaylistManager.init === 'function' && !window.PlaylistManager._isInitialized) { 
                    await window.PlaylistManager.init();
                }
                const playlists = window.PlaylistManager.getAllPlaylists();
                if (playlists.length === 0) {
                    container.innerHTML = `<div class="text-center py-3 text-muted small"><p>No tienes playlists.</p><button class="btn btn-sm btn-outline-light create-playlist-from-modal-direct-btn"><i class="fas fa-plus me-1"></i> Crear Nueva Playlist</button></div>`;
                } else {
                    container.innerHTML = ''; 
                    const listGroup = document.createElement('div');
                    listGroup.className = 'list-group list-group-flush';
                    playlists.forEach(playlist => {
                        const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
                        const playlistItemButton = document.createElement('button');
                        playlistItemButton.type = 'button';
                        playlistItemButton.className = 'list-group-item list-group-item-action bg-transparent text-light d-flex justify-content-between align-items-center py-2 px-0';
                        playlistItemButton.innerHTML = `<span>${playlist.name}</span><small class="text-muted">${songCount} canc.</small>`;
                        playlistItemButton.addEventListener('click', async () => {
                            try {
                                playlistItemButton.disabled = true;
                                playlistItemButton.innerHTML = `<span><i class="fas fa-spinner fa-spin me-1"></i> Añadiendo...</span>`;
                                await window.PlaylistManager.addSongToPlaylist(track, playlist.id);
                                bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide();
                                showToastGlobal(`"${track.title}" añadida a "${playlist.name}"`, 'success');
                            } catch (error) {
                                playlistItemButton.disabled = false;
                                playlistItemButton.innerHTML = `<span>${playlist.name}</span><small class="text-muted">${songCount} canc.</small>`;
                                showToastGlobal(error.message || 'Error al añadir canción', 'error');
                            }
                        });
                        listGroup.appendChild(playlistItemButton);
                    });
                    container.appendChild(listGroup);
                    container.insertAdjacentHTML('beforeend', `<div class="text-center mt-3 border-top border-secondary pt-3"><button class="btn btn-sm btn-outline-light create-playlist-from-modal-direct-btn"><i class="fas fa-plus me-1"></i> Crear Nueva Playlist</button></div>`);
                }
                document.querySelectorAll('#userPlaylistsForSelectionInModal .create-playlist-from-modal-direct-btn').forEach(btn => {
                    btn.onclick = () => { 
                        bootstrap.Modal.getInstance(document.getElementById('addToPlaylistModal'))?.hide();
                        window.selectedSongForPlaylist = track; // Guardar para account.js
                        if (window.authSystem && typeof window.authSystem.showCreatePlaylistModal === 'function'){
                             window.authSystem.showCreatePlaylistModal();
                        } else if (typeof showCreatePlaylistModal === 'function') { // Fallback si está global en account.js
                             showCreatePlaylistModal();
                        } else {
                            console.error("Función para crear playlist no encontrada.");
                        }
                    };
                });
            } catch (error) {
                console.error("Error cargando playlists en modal:", error);
                container.innerHTML = `<p class="text-danger small">Error al cargar playlists.</p>`;
            }
        }, 100);
    } else {
        container.innerHTML = `<p class="text-warning small">Sistema de playlists no disponible.</p>`;
    }
}

function showMoreOptionsMenu(track, buttonElement) {
    const existingMenu = document.getElementById('moreOptionsMenu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'moreOptionsMenu';
    menu.style.cssText = `position: fixed; background: rgba(30,30,30,0.95); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 5px 0; min-width: 180px; z-index: 1056; backdrop-filter: blur(5px); box-shadow: 0 5px 15px rgba(0,0,0,0.3);`;
    
    menu.innerHTML = `
        <div class="menu-item" onclick="window.handleMoreOptionClick('copyInfo', '${track.id}')"><i class="fas fa-copy me-2"></i>Copiar Info</div>
        <div class="menu-item" onclick="window.handleMoreOptionClick('shareTrack', '${track.id}')"><i class="fas fa-share-alt me-2"></i>Compartir</div>
        <div class="menu-item" onclick="window.handleMoreOptionClick('viewDetails', '${track.id}')"><i class="fas fa-info-circle me-2"></i>Ver Detalles</div>
    `;
    
    const rect = buttonElement.getBoundingClientRect();
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 180 - 10)}px`; // Evitar desbordamiento
    menu.style.top = `${rect.bottom + 5}px`;
    
    menu.querySelectorAll('.menu-item').forEach(item => {
        item.style.cssText = `padding: 10px 15px; cursor: pointer; color: #e0e0e0; font-size: 14px; display: flex; align-items: center;`;
        item.onmouseenter = () => item.style.backgroundColor = 'rgba(255,255,255,0.1)';
        item.onmouseleave = () => item.style.backgroundColor = 'transparent';
    });
    
    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', function closeMenuOnClick(e) {
            if (!menu.contains(e.target) && e.target !== buttonElement) {
                menu.remove();
                document.removeEventListener('click', closeMenuOnClick);
            }
        }, { once: true }); // { once: true } para que el listener se auto-elimine
    }, 0); // setTimeout 0 para que el listener se añada después del evento de clic actual
}

window.handleMoreOptionClick = function(action, trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId) || 
                  (window.musicManager && window.musicManager.spotifyPlaylist && window.musicManager.spotifyPlaylist.find(t => t.id === trackId));

    if (!track) { showToastGlobal('Canción no encontrada.', 'error'); return; }

    switch(action) {
        case 'copyInfo':
            navigator.clipboard.writeText(`${track.title} - ${track.artist}`)
                .then(() => showToastGlobal('Información copiada.', 'success'))
                .catch(() => showToastGlobal('Error al copiar.', 'error'));
            break;
        case 'shareTrack':
            if (navigator.share) {
                navigator.share({ title: track.title, text: `Escucha "${track.title}" por ${track.artist} en MusiFlow!`, url: window.location.href })
                    .catch(err => console.log("Error al compartir:", err));
            } else {
                showToastGlobal('Función de compartir no soportada. Copia la info manualmente.', 'info');
            }
            break;
        case 'viewDetails':
            showToastGlobal(`Detalles: ${track.title} - ${track.artist} (${track.album || 'N/A'})`, 'info');
            break;
    }
    document.getElementById('moreOptionsMenu')?.remove();
};

function showToastGlobal(message, type = 'success') {
    const toastId = 'musiflow-global-toast';
    let toast = document.getElementById(toastId);
    if (!toast) {
        toast = document.createElement('div');
        toast.id = toastId;
        toast.style.cssText = `position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 25px; color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10000; opacity: 0; transition: opacity 0.3s, bottom 0.3s; font-size: 14px; max-width: 90%; text-align: center;`;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    let bgColor;
    switch(type) {
        case 'success': bgColor = '#28a745'; break;
        case 'error': bgColor = '#dc3545'; break;
        case 'warning': bgColor = '#ffc107'; break;
        default: bgColor = '#17a2b8'; // info
    }
    toast.style.backgroundColor = bgColor;
    toast.style.opacity = '1';
    toast.style.bottom = '30px';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.bottom = '20px';
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    function trySetupGlobalListeners() {
        if (window.LikesManager && typeof window.LikesManager.addLikeChangeListener === 'function') {
            window.LikesManager.addLikeChangeListener((songId, isLiked) => {
                document.querySelectorAll(`.like-button[data-track-id="${songId}"]`).forEach(button => {
                    updateLikeButtonVisual(button, isLiked);
                });
            });
            console.log('mostrarCanciones.js: Listener global de LikesManager configurado.');
        } else {
            console.warn('mostrarCanciones.js: LikesManager no listo para listener global, reintentando...');
            setTimeout(trySetupGlobalListeners, 500);
        }

        if (window.LibraryManager && typeof window.LibraryManager.addLibraryChangeListener === 'function') {
             window.LibraryManager.addLibraryChangeListener((songId, isInLibrary) => {
                document.querySelectorAll(`.add-to-library-btn[data-track-id="${songId}"]`).forEach(button => {
                    window.LibraryManager.updateLibraryButtonVisual(songId, isInLibrary); // Usar la función del manager
                });
            });
            console.log('mostrarCanciones.js: Listener global de LibraryManager configurado.');
        } else {
             console.warn('mostrarCanciones.js: LibraryManager no listo para listener global, reintentando...');
            setTimeout(trySetupGlobalListeners, 500); // Reintentar para ambos si uno no está
        }
    }
    trySetupGlobalListeners();
    
    console.log('mostrarCanciones.js: Sistema de visualización con integración cargado correctamente.');
});

console.log("mostrarCanciones.js cargado y mejorado con integración completa de likes, biblioteca y playlists.");