// resources/js/biblioteca.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("biblioteca.js: DOM cargado, iniciando lógica de la página de biblioteca.");

    const librarySongsContainer = document.getElementById('librarySongsContainer');
    let musicManagerInstance = null;
    let playlistManagerInstance = null;
    let libraryManagerInstance = null;
    let likesManagerInstance = null; // Para los iconos de like
    let currentUserForLibrary = null; // Para asegurar que tenemos el usuario

    async function waitForSystemsAndInitialize() {
        console.log("biblioteca.js: Esperando sistemas (Firebase Auth, Managers)...");
        
        currentUserForLibrary = await new Promise(resolve => {
            if (firebase.auth().currentUser) {
                resolve(firebase.auth().currentUser);
            } else {
                const unsubscribe = firebase.auth().onAuthStateChanged(u => {
                    unsubscribe();
                    if (u) {
                        resolve(u);
                    } else {
                        console.log("biblioteca.js: No hay usuario autenticado. Mostrando mensaje para iniciar sesión.");
                        if(librarySongsContainer) librarySongsContainer.innerHTML = '<div class="empty-library-message"><p>Debes <a href="login.html">iniciar sesión</a> para ver tu biblioteca.</p></div>';
                        resolve(null);
                    }
                });
            }
        });

        if (!currentUserForLibrary) {
            console.log("biblioteca.js: No se procederá sin usuario autenticado.");
            showLoading(false); // Asegurarse de que el loading se oculte
            return;
        }
        
        // Esperar a que los managers estén definidos e inicializados
        try {
            await Promise.all([
                waitForManagerAndInit('PlaylistManager'),
                waitForManagerAndInit('LibraryManager'),
                waitForManagerAndInit('LikesManager'),
                waitForManager('musicManager', 'window') // musicManager es una instancia de clase
            ]);
        } catch (error) {
            console.error("biblioteca.js: Error esperando a los managers:", error);
            if(librarySongsContainer) librarySongsContainer.innerHTML = '<div class="empty-library-message text-danger"><p>Error al cargar componentes de la biblioteca. Intenta recargar.</p></div>';
            showLoading(false);
            return;
        }
        

        console.log("biblioteca.js: Todos los sistemas necesarios están listos.");
        
        playlistManagerInstance = window.PlaylistManager;
        libraryManagerInstance = window.LibraryManager;
        likesManagerInstance = window.LikesManager;
        musicManagerInstance = window.musicManager;

        loadUserLibrarySongs();

        if (libraryManagerInstance && typeof libraryManagerInstance.addLibraryChangeListener === 'function') {
            libraryManagerInstance.addLibraryChangeListener((songId, isInLibrary, songData) => {
                console.log(`biblioteca.js: Cambio en la biblioteca detectado para canción ID ${songId}. Recargando...`);
                loadUserLibrarySongs(); 
            });
        }

        if (likesManagerInstance && typeof likesManagerInstance.addLikeChangeListener === 'function') {
            likesManagerInstance.addLikeChangeListener((songId, isLiked) => {
                document.querySelectorAll(`.song-item[data-track-id="${songId}"] .like-button, .track-row[data-track-id="${songId}"] .like-button`).forEach(button => {
                    const icon = button.querySelector('i');
                    button.classList.toggle('active', isLiked);
                    if (icon) icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                    button.title = isLiked ? 'Quitar Me Gusta' : 'Me Gusta';
                });
            });
        }
        showLoading(false);
    }

    function waitForManager(managerName, scope = 'window') {
        return new Promise((resolve, reject) => {
            let attempt = 0;
            const maxAttempts = 50; // ~10 segundos
            const interval = setInterval(() => {
                const manager = scope === 'window' ? window[managerName] : window[managerName];
                let isReady = !!manager;

                if (isReady) {
                    clearInterval(interval);
                    console.log(`biblioteca.js: ${managerName} está disponible.`);
                    resolve(manager);
                } else {
                    attempt++;
                    if (attempt >= maxAttempts) {
                        clearInterval(interval);
                        console.error(`biblioteca.js: Timeout esperando a ${managerName}.`);
                        reject(new Error(`${managerName} no estuvo disponible a tiempo.`));
                    }
                }
            }, 200);
        });
    }

    async function waitForManagerAndInit(managerName) {
        const manager = await waitForManager(managerName);
        if (manager && typeof manager.init === 'function') {
            try {
                await manager.init(); // Asegurar que el init del manager se complete
                console.log(`biblioteca.js: ${managerName}.init() completado.`);
            } catch (initError) {
                console.error(`biblioteca.js: Error durante ${managerName}.init():`, initError);
                throw initError; // Relanzar para que Promise.all falle si un init falla
            }
        } else if (!manager) {
             throw new Error(`${managerName} no está definido.`);
        }
        return manager;
    }

    function loadUserLibrarySongs() {
        if (!librarySongsContainer || !libraryManagerInstance) {
            console.error("biblioteca.js: Contenedor de biblioteca o LibraryManager no disponible.");
            if (librarySongsContainer) librarySongsContainer.innerHTML = '<div class="empty-library-message text-danger"><p>Error al cargar la biblioteca.</p></div>';
            return;
        }
        showLoading(true);
        const songs = libraryManagerInstance.getAllLibrarySongs();
        console.log("biblioteca.js: Canciones obtenidas de LibraryManager:", songs.length);

        if (songs.length === 0) {
            librarySongsContainer.innerHTML = `
                <div class="empty-library-message">
                    <i class="fas fa-book-open fa-3x"></i>
                    <p class="mt-3">Tu biblioteca está vacía.</p>
                    <p class="text-muted">Añade canciones desde la sección "Explorar" para verlas aquí.</p>
                    <a href="explorar.html" class="btn btn-primary mt-2"><i class="fas fa-compass"></i> Ir a Explorar</a>
                </div>`;
        } else {
            renderLibraryTracks(songs);
        }
        showLoading(false);
    }

    function renderLibraryTracks(tracks) {
        if (!librarySongsContainer) return;
        librarySongsContainer.innerHTML = ''; 

        const tracksContainerElement = document.createElement('div');
        tracksContainerElement.className = 'tracks-container'; 

        const headerRow = document.createElement('div');
        headerRow.className = 'track-header'; 
        headerRow.innerHTML = `
            <div class="track-number">#</div>
            <div class="track-info">TÍTULO</div>
            <div class="track-album">ÁLBUM</div>
            <div class="track-duration"><i class="far fa-clock"></i></div>`;
        tracksContainerElement.appendChild(headerRow);

        tracks.forEach((track, index) => {
            const isLiked = likesManagerInstance ? likesManagerInstance.isLiked(track.id) : false;
            const heartClass = isLiked ? 'fas' : 'far';
            
            const trackRow = document.createElement('div');
            trackRow.className = 'track-row'; 
            trackRow.dataset.trackId = track.id; 
            trackRow.dataset.source = track.sourceOrigin || (track.source === 'spotify' ? 'spotify' : 'local');

            trackRow.innerHTML = `
                <div class="track-number">
                    <span class="track-index">${index + 1}</span>
                    <button class="play-button" data-track-id="${track.id}"><i class="fas fa-play"></i></button>
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
                            <i class="${heartClass} fa-heart"></i>
                        </button>
                        <button class="action-button remove-from-library-btn" title="Eliminar de Biblioteca" data-track-id="${track.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <button class="action-button add-to-playlist-button" title="Añadir a playlist" data-track-id="${track.id}">
                            <i class="fas fa-list-ul"></i>
                        </button>
                    </div>
                </div>`;
            tracksContainerElement.appendChild(trackRow);
            setupTrackRowInteractions(trackRow, track, tracks, index);
        });
        librarySongsContainer.appendChild(tracksContainerElement);
        console.log("biblioteca.js: UI de canciones de biblioteca renderizada.");
    }

    function setupTrackRowInteractions(trackRowElement, trackData, currentTracklist, trackIndexInList) {
        const playButton = trackRowElement.querySelector('.play-button');
        const likeButton = trackRowElement.querySelector('.like-button');
        const removeFromLibraryButton = trackRowElement.querySelector('.remove-from-library-btn');
        const addToPlaylistButton = trackRowElement.querySelector('.add-to-playlist-button');

        trackRowElement.addEventListener('mouseenter', () => {
            const indexElement = trackRowElement.querySelector('.track-index');
            const playBtn = trackRowElement.querySelector('.play-button');
            const actions = trackRowElement.querySelector('.track-actions');
            
            if (musicManagerInstance && musicManagerInstance.currentTrack &&
                musicManagerInstance.currentTrack.id === trackData.id && musicManagerInstance.isPlaying) {
                if (indexElement) indexElement.style.display = 'none';
                if (playBtn) { playBtn.style.display = 'flex'; playBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
            } else {
                if (indexElement) indexElement.style.display = 'none';
                if (playBtn) { playBtn.style.display = 'flex'; playBtn.innerHTML = '<i class="fas fa-play"></i>'; }
            }
            if (actions) actions.style.visibility = 'visible';
        });

        trackRowElement.addEventListener('mouseleave', () => {
            const indexElement = trackRowElement.querySelector('.track-index');
            const playBtn = trackRowElement.querySelector('.play-button');
            const actions = trackRowElement.querySelector('.track-actions');
            
            if (musicManagerInstance && musicManagerInstance.currentTrack &&
                musicManagerInstance.currentTrack.id === trackData.id) {
                 if (playBtn) { playBtn.style.display = 'flex'; playBtn.innerHTML = musicManagerInstance.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';}
                 if (indexElement) indexElement.style.display = 'none';
            } else {
                if (indexElement) indexElement.style.display = 'block';
                if (playBtn) playBtn.style.display = 'none';
            }
            if (actions) actions.style.visibility = 'hidden';
        });

        trackRowElement.addEventListener('click', (e) => {
            if (e.target.closest('.action-button') || e.target.closest('.play-button')) return;
            if (musicManagerInstance) {
                musicManagerInstance.localPlaylist = [...currentTracklist]; // Pasar una copia
                musicManagerInstance.currentTrackIndex = trackIndexInList; // Establecer el índice actual
                musicManagerInstance.playTrack(trackData);
            }
        });
        
        if (playButton) {
            playButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (musicManagerInstance) {
                    musicManagerInstance.localPlaylist = [...currentTracklist];
                    musicManagerInstance.currentTrackIndex = trackIndexInList;
                    if (musicManagerInstance.currentTrack && musicManagerInstance.currentTrack.id === trackData.id && musicManagerInstance.isPlaying) {
                        musicManagerInstance.togglePlayPause();
                    } else {
                        musicManagerInstance.playTrack(trackData);
                    }
                }
            });
        }

        if (likeButton) {
            likeButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (likesManagerInstance && firebase.auth().currentUser) {
                    await likesManagerInstance.toggleLike(trackData);
                } else {
                    showToast("Debes iniciar sesión para dar 'Me Gusta'.", 'warning');
                }
            });
        }

        if (removeFromLibraryButton) {
            removeFromLibraryButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (libraryManagerInstance && firebase.auth().currentUser) {
                    if (confirm(`¿Eliminar "${trackData.title}" de tu biblioteca?`)) {
                        await libraryManagerInstance.removeSongFromLibrary(trackData.id);
                    }
                } else {
                    showToast("Debes iniciar sesión para modificar tu biblioteca.", 'warning');
                }
            });
        }

        if (addToPlaylistButton) {
            addToPlaylistButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (playlistManagerInstance && firebase.auth().currentUser) {
                    if (typeof showAddToPlaylistModalGlobal === 'function') { // Asumiendo que la función del modal es global
                        showAddToPlaylistModalGlobal(trackData);
                    } else {
                         console.error("biblioteca.js: showAddToPlaylistModalGlobal no está definida.");
                        showToast("Función para añadir a playlist no disponible.", 'error');
                    }
                } else {
                    showToast("Debes iniciar sesión para añadir a playlists.", 'warning');
                }
            });
        }
    }
    
    // Función showLoading (copiada de account.js para ser autocontenida o movida a utils.js)
    function showLoading(show) {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
            loadingOverlay.classList.toggle('show', show);
        }
    }
    
    // Iniciar el proceso de carga y configuración de la página
    // Asegurarse de que el DOM esté completamente cargado antes de cualquier cosa
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => waitForSystemsAndInitialize().catch(handlePageInitError));
    } else {
        waitForSystemsAndInitialize().catch(handlePageInitError);
    }

    function handlePageInitError(error) {
        console.error("biblioteca.js: Error fatal durante la inicialización de la página.", error);
        if (librarySongsContainer) {
            librarySongsContainer.innerHTML = `<div class="empty-library-message text-danger"><i class="fas fa-exclamation-triangle fa-3x"></i><p class="mt-3">Ocurrió un error al cargar tu biblioteca.</p><p class="text-muted">Por favor, intenta recargar la página.</p></div>`;
        }
        showLoading(false); // Asegurarse de que el loading se oculte
    }

});

// Hacer la función de modal de playlist global si se define en mostrarCanciones.js
// Esto es un apaño; idealmente, se manejaría con módulos o un event bus.
// Si showAddToPlaylistModal está en mostrarCanciones.js y es global:
// window.showAddToPlaylistModalGlobal = window.showAddToPlaylistModal;
// Si no, tendrás que definirla o importarla en biblioteca.js
function showToast(message, type = 'success') { /* ... implementación del toast ... */ }