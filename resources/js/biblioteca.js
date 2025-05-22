// resources/js/biblioteca.js
document.addEventListener('DOMContentLoaded', () => {
    const librarySongsContainer = document.getElementById('librarySongsContainer');
    let musicManagerInstance = null;

    // Esperar a que Firebase y LibraryManager estén listos
    const checkReadyInterval = setInterval(async () => {
        if (firebase.auth().currentUser && window.LibraryManager && window.musicManager && typeof displayLocalTracks === 'function') {
            clearInterval(checkReadyInterval);
            musicManagerInstance = window.musicManager; // Usar la instancia global
            await LibraryManager.init(); // Asegurar que la biblioteca esté inicializada
            loadLibrarySongs();

            // Escuchar cambios en la biblioteca para actualizar la UI dinámicamente
            LibraryManager.addLibraryChangeListener((songId, isInLibrary, songData) => {
                console.log('Biblioteca: detectado cambio, recargando canciones...');
                loadLibrarySongs(); 
            });
        }
    }, 200);

    function loadLibrarySongs() {
        if (!librarySongsContainer) {
            console.error("Contenedor de biblioteca no encontrado.");
            return;
        }

        const songs = LibraryManager.getAllLibrarySongs();
        console.log("Canciones en biblioteca:", songs);

        if (songs.length === 0) {
            librarySongsContainer.innerHTML = `
                <div class="empty-library-message">
                    <i class="fas fa-compact-disc"></i>
                    <p>Tu biblioteca está vacía.</p>
                    <a href="explorar.html" class="btn btn-primary">Explorar música</a>
                </div>
            `;
            return;
        }

        // Reutilizar displayLocalTracks para mostrar las canciones
        // displayLocalTracks espera un array de tracks y un ID de contenedor.
        // Aquí, el contenedor es librarySongsContainer, no 'searchResults'.
        // Necesitamos una función adaptada o modificar displayLocalTracks.
        // Por ahora, vamos a crear una función de renderizado específica para la biblioteca.
        renderLibraryTracks(songs);
    }

    function renderLibraryTracks(tracks) {
        librarySongsContainer.innerHTML = ''; // Limpiar

        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'tracks-container'; // Reutilizar estilos

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
            trackRow.className = 'track-row'; // Reutilizar estilos
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
                        <button class="action-button like-button ${isLiked ? 'active' : ''}" title="${isLiked ? 'Quitar Me Gusta' : 'Me Gusta'}" data-track-id="${track.id}">
                            <i class="${heartClass} fa-heart" ${heartColor}></i>
                        </button>
                        <button class="action-button remove-from-library-btn" title="Eliminar de Biblioteca">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            tracksContainer.appendChild(trackRow);

            // Eventos para hover (similar a mostrarCanciones.js)
            trackRow.addEventListener('mouseenter', () => {
                const playButton = trackRow.querySelector('.play-button');
                const indexElement = trackRow.querySelector('.track-index');
                const isCurrentAndPlaying = musicManagerInstance && musicManagerInstance.currentTrack &&
                                           musicManagerInstance.currentTrack.id === track.id && musicManagerInstance.isPlaying;

                if (isCurrentAndPlaying) {
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
                const isCurrent = musicManagerInstance && musicManagerInstance.currentTrack &&
                                 musicManagerInstance.currentTrack.id === track.id;

                if (!isCurrent) {
                    indexElement.style.display = 'block';
                    playButton.style.display = 'none';
                } else if (isCurrent && musicManagerInstance.isPlaying) {
                     playButton.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                     playButton.innerHTML = '<i class="fas fa-play"></i>';
                }
                trackRow.querySelector('.track-actions').style.visibility = 'hidden';
            });

            // Evento para botón de play
            const playButton = trackRow.querySelector('.play-button');
            playButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (musicManagerInstance) {
                     // Pasar la lista actual de la biblioteca al reproductor
                    musicManagerInstance.localPlaylist = songs; // Ojo: esto podría ser problemático si MusicManager espera una lista específica.
                                                               // Mejor sería pasar la canción y que MusicManager la maneje individualmente o con su propia lista.
                    if (musicManagerInstance.currentTrack && musicManagerInstance.currentTrack.id === track.id && musicManagerInstance.isPlaying) {
                        musicManagerInstance.togglePlayPause();
                    } else {
                        musicManagerInstance.playTrack(track);
                    }
                }
            });

            // Evento para el botón de "Me Gusta"
            const likeBtn = trackRow.querySelector('.like-button');
            likeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (window.LikesManager) {
                    await window.LikesManager.toggleLike(track);
                    // El listener de LikesManager debería actualizar la UI
                }
            });

            // Evento para eliminar de la biblioteca
            const removeBtn = trackRow.querySelector('.remove-from-library-btn');
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`¿Seguro que quieres eliminar "${track.title}" de tu biblioteca?`)) {
                    await LibraryManager.removeSongFromLibrary(track.id);
                    // La UI se actualizará a través del listener de cambios de biblioteca
                }
            });
        });

        librarySongsContainer.appendChild(tracksContainer);
    }

});