// mostrarCanciones.js - Sistema para mostrar canciones (datos y renderizado local)

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
            source: "resources/audio/DarkHorse.mp3" // Esta es la clave para el objeto Audio
        },
        {
            id: "local-2",
            title: "Locked Out of Heaven",
            artist: "Bruno Mars",
            album: "Unorthodox Jukebox",
            image: "resources/album covers/unorthodoxJukebox.jpg",
            duration: "3:54",
            genre: "Pop",
            source: "resources/audio/LockedOutOfHeaven.mp3"
        },
        {
            id: "local-3",
            title: "SOS",
            artist: "Rihanna",
            album: "A Girl Like Me",
            image: "resources/album covers/AGirlLikeMe.jpg",
            duration: "4:01",
            genre: "Pop",
            source: "resources/audio/SOS.mp3"
        },
        {
            id: "local-4",
            title: "End of Beginning",
            artist: "Djo",
            album: "DECIDE",
            image: "resources/album covers/DECIDE.png",
            duration: "2:39",
            genre: "Synth-Pop",
            source: "resources/audio/EndOfBeginning.mp3"
        },
        {
            id: "local-5",
            title: "Judas",
            artist: "Lady Gaga",
            album: "Born This Way",
            image: "resources/album covers/BornThisWay.jpg",
            duration: "4:09",
            genre: "Pop",
            source: "resources/audio/Judas.mp3"
        },
        {
            id: "local-6",
            title: "The Line",
            artist: "Twenty One Pilots, Arcane, League of Legends",
            album: "ARCANE",
            image: "resources/album covers/ARCANE.jpg",
            duration: "3:54",
            genre: "ElectroPop",
            source: "resources/audio/the line.mp3"
        }
    ]
};

/**
 * Formatea el tiempo en segundos a formato minutos:segundos
 * (Puede ser usado por MusicManager o si displayLocalTracks lo necesita directamente)
 * @param {number} seconds - Tiempo en segundos
 * @return {string} Tiempo formateado en "m:ss"
 */
function formatTimeGlobal(seconds) { // Renombrado para evitar conflicto si MusicManager tiene el suyo
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Busca canciones locales que coincidan con una consulta
 * @param {string} query - Texto a buscar
 * @return {Array} Lista de pistas que coinciden con la búsqueda
 */
function searchLocalTracks(query) { // Renombrado para mayor claridad
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
 * Genera HTML para mostrar las canciones locales en la interfaz
 * Esta función es llamada por MusicManager
 * @param {Array} tracks - Lista de pistas a mostrar
 */
function displayLocalTracks(tracks) { // Renombrado para mayor claridad
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
        const trackRow = document.createElement('div');
        trackRow.className = 'track-row';
        trackRow.dataset.trackId = track.id; // Usar el ID único de la pista
        
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
                    <button class="action-button like-button" title="Me gusta">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-button more-button" title="Más opciones">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Eventos para hovering en la fila (manejados por MusicManager para consistencia si es necesario, o mantenidos simples aquí)
        trackRow.addEventListener('mouseenter', () => {
            const playButton = trackRow.querySelector('.play-button');
            const indexElement = trackRow.querySelector('.track-index');
            const isCurrentAndPlaying = musicManager && musicManager.currentTrack && musicManager.currentTrack.id === track.id && musicManager.isPlaying;

            if (isCurrentAndPlaying && musicManager.currentMode === 'local') {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-play"></i>'; // Por defecto, mostrar play
            }
            trackRow.querySelector('.track-actions').style.visibility = 'visible';
        });
        
        trackRow.addEventListener('mouseleave', () => {
            const playButton = trackRow.querySelector('.play-button');
            const indexElement = trackRow.querySelector('.track-index');
            const isCurrent = musicManager && musicManager.currentTrack && musicManager.currentTrack.id === track.id;

            if (!isCurrent || musicManager.currentMode !== 'local') {
                indexElement.style.display = 'block';
                playButton.style.display = 'none';
            } else if (isCurrent && musicManager.isPlaying) { // Si es la actual y está sonando
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else if (isCurrent && !musicManager.isPlaying) { // Si es la actual y está pausada
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
             trackRow.querySelector('.track-actions').style.visibility = 'hidden';
        });
        
        tracksContainer.appendChild(trackRow);
    });
    
    resultsContainer.appendChild(tracksContainer);
    
    // Los event listeners ahora son manejados primariamente por MusicManager para evitar conflictos.
    // MusicManager delegará las llamadas de reproducción.
    document.querySelectorAll('.track-row .play-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (musicManager) {
                const trackId = button.dataset.trackId;
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                if (trackToPlay) {
                    // Si es la misma pista y está sonando, pausarla. Sino, reproducirla.
                    if (musicManager.currentTrack && musicManager.currentTrack.id === trackId && musicManager.isPlaying) {
                        musicManager.togglePlayPause();
                    } else {
                        musicManager.playTrack(trackToPlay);
                    }
                }
            }
        });
    });

    document.querySelectorAll('.track-row').forEach(row => {
        row.addEventListener('click', () => {
            if (musicManager) {
                const trackId = row.dataset.trackId;
                const trackToPlay = musicDatabase.tracks.find(t => t.id === trackId);
                if (trackToPlay) {
                     // Si es la misma pista y está sonando, no hacer nada efectivo con el clic en la fila (el botón de play maneja la pausa).
                     // Si es diferente, o la misma y pausada, reproducirla.
                    if (!(musicManager.currentTrack && musicManager.currentTrack.id === trackId && musicManager.isPlaying)) {
                         musicManager.playTrack(trackToPlay);
                    }
                }
            }
        });
    });
    
    document.querySelectorAll('.like-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = button.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.replace('far', 'fas');
                icon.style.color = '#1ed760';
            } else {
                icon.classList.replace('fas', 'far');
                icon.style.color = '';
            }
            // Futuro: musicManager.likeTrack(trackId);
        });
    });
    
    document.querySelectorAll('.more-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            alert('Opciones adicionales (a implementar)');
            // Futuro: musicManager.showMoreOptions(trackId);
        });
    });
}

console.log("mostrarCanciones.js cargado y simplificado.");