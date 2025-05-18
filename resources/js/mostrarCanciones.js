// Objeto para almacenar las canciones de muestra
const musicDatabase = {
    tracks: [
        {
            id: 1,
            title: "Dark Horse",
            artist: "Katy Perry",
            album: "PRISM",
            cover: "resources/album covers/darkhorse.jpg",
            duration: "3:45",
            genre: "Pop",
            source: "resources/audio/DarkHorse.mp3"
        },
        {
            id: 2,
            title: "Locked Out of Heaven",
            artist: "Bruno Mars",
            album: "Unorthodox Jukebox",
            cover: "resources/album covers/unorthodoxJukebox.jpg",
            duration: "3:54",
            genre: "Pop",
            source: "resources/audio/LockedOutOfHeaven.mp3"
        },
        {
            id: 3,
            title: "SOS",
            artist: "Rihanna",
            album: "A Girl Like Me",
            cover: "resources/album covers/AGirlLikeMe.jpg",
            duration: "4:01",
            genre: "Pop",
            source: "resources/audio/SOS.mp3"
        },
        {
            id: 4,
            title: "End of Beginning",
            artist: "Djo",
            album: "DECIDE",
            cover: "resources/album covers/DECIDE.png",
            duration: "2:39",
            genre: "Synth-Pop",
            source: "resources/audio/EndOfBeginning.mp3"
        },
        {
            id: 5,
            title: "Judas",
            artist: "Lady Gaga",
            album: "Born This Way",
            cover: "resources/album covers/BornThisWay.jpg",
            duration: "4:09",
            genre: "Pop",
            source: "resources/audio/Judas.mp3"
        },
        {
            id: 6,
            title: "The Line",
            artist: "Twenty One Pilots, Arcane, League of Legends",
            album: "ARCANE",
            cover: "resources/album covers/ARCANE.jpg",
            duration: "3:54",
            genre: "ElectroPop",
            source: "resources/audio/the line.mp3"
        }
    ]
};

// Reproductor de audio global
let currentAudio = null;
let currentTrackId = null;
let isPlaying = false;

// Función para generar HTML de las canciones
function displayTracks(tracks) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!tracks || tracks.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No se encontraron canciones</div>';
        return;
    }
    
    // Limpiar resultados anteriores
    resultsContainer.innerHTML = '';
    
    // Crear contenedor de pistas
    const tracksContainer = document.createElement('div');
    tracksContainer.className = 'tracks-container';
    
    // Agregar encabezados al estilo de Spotify
    const headerRow = document.createElement('div');
    headerRow.className = 'track-header';
    headerRow.innerHTML = `
        <div class="track-number">#</div>
        <div class="track-info">TÍTULO</div>
        <div class="track-album">ÁLBUM</div>
        <div class="track-duration"><i class="far fa-clock"></i></div>
    `;
    tracksContainer.appendChild(headerRow);
    
    // Generar filas de canciones
    tracks.forEach((track, index) => {
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
                <img src="${track.cover}" alt="${track.title}" class="track-image">
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
        
        // Eventos para hovering en la fila
        trackRow.addEventListener('mouseenter', () => {
            const playButton = trackRow.querySelector('.play-button');
            const indexElement = trackRow.querySelector('.track-index');
            
            if (currentTrackId === track.id && isPlaying) {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
            }
            
            trackRow.querySelector('.track-actions').style.visibility = 'visible';
        });
        
        trackRow.addEventListener('mouseleave', () => {
            const playButton = trackRow.querySelector('.play-button');
            const indexElement = trackRow.querySelector('.track-index');
            
            if (currentTrackId !== track.id) {
                indexElement.style.display = 'block';
                playButton.style.display = 'none';
            } else if (currentTrackId === track.id && isPlaying) {
                indexElement.style.display = 'none';
                playButton.style.display = 'flex';
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            }
            
            trackRow.querySelector('.track-actions').style.visibility = 'hidden';
        });
        
        tracksContainer.appendChild(trackRow);
    });
    
    resultsContainer.appendChild(tracksContainer);
    
    // Añadir evento de clic a los botones de reproducción
    document.querySelectorAll('.play-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const trackId = parseInt(button.dataset.trackId);
            togglePlayTrack(trackId);
        });
    });
    
    // Añadir evento de clic a las filas completas
    document.querySelectorAll('.track-row').forEach(row => {
        row.addEventListener('click', () => {
            const trackId = parseInt(row.dataset.trackId);
            togglePlayTrack(trackId);
        });
    });
    
    // Like button functionality
    document.querySelectorAll('.like-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const icon = button.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.replace('far', 'fas');
                icon.style.color = '#1ed760'; // Color verde de Spotify
            } else {
                icon.classList.replace('fas', 'far');
                icon.style.color = ''; // Color por defecto
            }
        });
    });
    
    // More options functionality (menú desplegable)
    document.querySelectorAll('.more-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            // Aquí podrías implementar un menú desplegable
            alert('Opciones adicionales');
        });
    });
}

// Función para alternar reproducción de una pista
function togglePlayTrack(trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId);
    if (!track) return;
    
    // Si ya hay una canción reproduciéndose, detenerla
    if (currentAudio) {
        currentAudio.pause();
        
        // Actualizar el icono de la pista anterior si es diferente
        if (currentTrackId !== trackId) {
            const previousTrackRow = document.querySelector(`.track-row[data-track-id="${currentTrackId}"]`);
            if (previousTrackRow) {
                const prevButton = previousTrackRow.querySelector('.play-button');
                prevButton.innerHTML = '<i class="fas fa-play"></i>';
            }
        }
    }
    
    // Si es la misma pista, alternar reproducción/pausa
    if (currentTrackId === trackId && currentAudio) {
        if (isPlaying) {
            isPlaying = false;
            document.querySelector(`.play-button[data-track-id="${trackId}"]`).innerHTML = '<i class="fas fa-play"></i>';
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        } else {
            currentAudio.play();
            isPlaying = true;
            document.querySelector(`.play-button[data-track-id="${trackId}"]`).innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        }
    } 
    // Si es una pista nueva, reproducirla
    else {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        
        currentAudio = new Audio(track.source);
        currentTrackId = trackId;
        
        // Establecer el volumen según el control deslizante
        const volumeSlider = document.getElementById('volumeControl');
        if (volumeSlider) {
            currentAudio.volume = parseFloat(volumeSlider.value);
        }
        
        currentAudio.addEventListener('ended', () => {
            isPlaying = false;
            document.querySelector(`.play-button[data-track-id="${trackId}"]`).innerHTML = '<i class="fas fa-play"></i>';
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        });
        
        currentAudio.play();
        isPlaying = true;
        
        // Actualizar el icono del botón de reproducción
        document.querySelector(`.play-button[data-track-id="${trackId}"]`).innerHTML = '<i class="fas fa-pause"></i>';
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        
        // Actualizar información en el reproductor fijo
        updateCurrentPlayer(track);
    }
}

// Actualizar información en el reproductor fijo
function updateCurrentPlayer(track) {
    document.getElementById('currentTrackImage').src = track.cover;
    document.getElementById('currentTrackName').textContent = track.title;
    document.getElementById('currentTrackArtist').textContent = track.artist;
    
    // Botones del reproductor
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        togglePlayTrack(currentTrackId);
    });
    
    document.getElementById('prevBtn').addEventListener('click', () => {
        playPreviousTrack();
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        playNextTrack();
    });
    
    // Asegurarse de que el control de volumen esté inicializado
    initVolumeControl();
}

// Inicializar el control de volumen
function initVolumeControl() {
    // Verificar si el control ya existe
    if (!document.getElementById('volumeControl')) {
        // Crear el contenedor del volumen si no existe
        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'volume-container';
        
        // Añadir icono de volumen
        const volumeIcon = document.createElement('button');
        volumeIcon.className = 'volume-icon';
        volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
        
        // Crear el control deslizante
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = '0';
        volumeSlider.max = '1';
        volumeSlider.step = '0.01';
        volumeSlider.value = '0.7'; // Volumen predeterminado al 70%
        volumeSlider.className = 'volume-slider';
        volumeSlider.id = 'volumeControl';
        
        // Añadir elementos al contenedor
        volumeContainer.appendChild(volumeIcon);
        volumeContainer.appendChild(volumeSlider);
        
        // Añadir el contenedor a las acciones del reproductor
        const playerActions = document.querySelector('.player-actions');
        if (playerActions) {
            playerActions.innerHTML = ''; // Limpiar contenido anterior
            playerActions.appendChild(volumeContainer);
        }
        
        // Añadir evento para cambiar el volumen
        volumeSlider.addEventListener('input', () => {
            if (currentAudio) {
                currentAudio.volume = volumeSlider.value;
                updateVolumeIcon(volumeSlider.value);
            }
        });
        
        // Añadir evento para silenciar/activar sonido con el icono
        volumeIcon.addEventListener('click', toggleMute);
    }
}

// Actualizar el icono de volumen según el nivel
function updateVolumeIcon(volume) {
    const volumeIcon = document.querySelector('.volume-icon i');
    if (!volumeIcon) return;
    
    // Remover clases existentes
    volumeIcon.className = '';
    
    // Añadir la clase apropiada según el nivel de volumen
    if (volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-down';
    } else {
        volumeIcon.className = 'fas fa-volume-up';
    }
}

// Función para silenciar/activar el sonido
function toggleMute() {
    if (!currentAudio) return;
    
    const volumeSlider = document.getElementById('volumeControl');
    if (!volumeSlider) return;
    
    if (currentAudio.volume > 0) {
        // Guardar el valor actual antes de silenciar
        volumeSlider.dataset.prevVolume = volumeSlider.value;
        volumeSlider.value = 0;
        currentAudio.volume = 0;
        updateVolumeIcon(0);
    } else {
        // Restaurar el volumen previo o establecer un valor predeterminado
        const prevVolume = volumeSlider.dataset.prevVolume || 0.7;
        volumeSlider.value = prevVolume;
        currentAudio.volume = prevVolume;
        updateVolumeIcon(prevVolume);
    }
}

// Reproducir pista anterior
function playPreviousTrack() {
    if (!currentTrackId) return;
    
    const currentIndex = musicDatabase.tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex > 0) {
        const prevTrack = musicDatabase.tracks[currentIndex - 1];
        togglePlayTrack(prevTrack.id);
    }
}

// Reproducir siguiente pista
function playNextTrack() {
    if (!currentTrackId) return;
    
    const currentIndex = musicDatabase.tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex < musicDatabase.tracks.length - 1) {
        const nextTrack = musicDatabase.tracks[currentIndex + 1];
        togglePlayTrack(nextTrack.id);
    }
}

// Búsqueda de canciones
function searchTracks(query) {
    if (!query) {
        return musicDatabase.tracks;
    }
    
    query = query.toLowerCase();
    return musicDatabase.tracks.filter(track => 
        track.title.toLowerCase().includes(query) || 
        track.artist.toLowerCase().includes(query) || 
        track.album.toLowerCase().includes(query) ||
        track.genre.toLowerCase().includes(query)
    );
}



// Inicializar la página cuando se cargue
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar todas las canciones inicialmente
    displayTracks(musicDatabase.tracks);
    
    // Funcionalidad de búsqueda
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    function performSearch() {
        const query = searchInput.value.trim();
        const results = searchTracks(query);
        displayTracks(results);
    }
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Inicializar reproductor
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        if (currentTrackId) {
            togglePlayTrack(currentTrackId);
        }
    });
    
    document.getElementById('prevBtn').addEventListener('click', playPreviousTrack);
    document.getElementById('nextBtn').addEventListener('click', playNextTrack);
    
    // Inicializar control de volumen por defecto
    initVolumeControl();
});