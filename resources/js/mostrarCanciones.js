// mostrarCanciones.js - Sistema para mostrar y reproducir canciones

/**
 * Base de datos de canciones de muestra para la aplicación
 * Contiene una colección de pistas con sus metadatos y rutas de audio
 */
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

// Variables globales para el reproductor de audio
let currentAudio = null;        // Objeto Audio actualmente en uso
let currentTrackId = null;      // ID de la pista en reproducción
let isPlaying = false;          // Estado de reproducción
let progressInterval = null;    // Intervalo para actualizar la barra de progreso

/**
 * Formatea el tiempo en segundos a formato minutos:segundos
 * @param {number} seconds - Tiempo en segundos
 * @return {string} Tiempo formateado en "m:ss"
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * Actualiza la información en el reproductor fijo
 * @param {Object} track - Pista a mostrar en el reproductor
 */
function updateCurrentPlayer(track) {
    document.getElementById('currentTrackImage').src = track.cover;
    document.getElementById('currentTrackName').textContent = track.title;
    document.getElementById('currentTrackArtist').textContent = track.artist;
    
    // Actualizar el tiempo total
    document.getElementById('totalTime').textContent = track.duration;
    
    // Iniciar el intervalo para actualizar la barra de progreso
    startProgressUpdate();
    
    // Asegurarse de que el control de volumen esté inicializado
    initVolumeControl();
}

/**
 * Inicia la actualización periódica de la barra de progreso
 */
function startProgressUpdate() {
    // Limpiar cualquier intervalo existente
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Crear un nuevo intervalo que se ejecute cada 1000ms (1 segundo)
    progressInterval = setInterval(updateProgress, 1000);
    
    // Actualizar inmediatamente para no esperar al primer intervalo
    updateProgress();
}

/**
 * Detiene la actualización periódica de la barra de progreso
 */
function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

/**
 * Actualiza la barra de progreso y el tiempo transcurrido
 * Se ejecuta periódicamente mientras se reproduce audio
 */
function updateProgress() {
    if (!currentAudio || currentAudio.paused) {
        return;
    }
    
    const currentTimeElement = document.getElementById('currentTime');
    const progressBar = document.getElementById('progressBar');
    
    // Obtener tiempo actual y duración
    const currentTime = currentAudio.currentTime;
    const duration = currentAudio.duration || 0;
    
    // Actualizar el texto del tiempo transcurrido
    currentTimeElement.textContent = formatTime(currentTime);
    
    // Calcular el porcentaje de progreso
    const progressPercent = (currentTime / duration) * 100;
    
    // Actualizar la barra de progreso
    progressBar.style.width = `${progressPercent}%`;
}

/**
 * Alterna entre reproducción y pausa de una pista
 * @param {number} trackId - ID de la pista a reproducir o pausar
 */
function togglePlayTrack(trackId) {
    const track = musicDatabase.tracks.find(t => t.id === trackId);
    if (!track) return;
    
    // Registro de depuración
    console.log(`togglePlayTrack: trackId=${trackId}, currentTrackId=${currentTrackId}, isPlaying=${isPlaying}`);
    
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
            // Pausar reproducción
            currentAudio.pause();
            isPlaying = false;
            
            // Detener la actualización de la barra de progreso
            stopProgressUpdate();
            
            // Cambiar iconos a reproducir
            const playButton = document.querySelector(`.play-button[data-track-id="${trackId}"]`);
            if (playButton) {
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
            
            console.log("Pausando reproducción");
        } else {
            // Reanudar reproducción
            currentAudio.play()
                .then(() => {
                    console.log("Reproducción reanudada con éxito");
                    // Reanudar la actualización de la barra de progreso
                    startProgressUpdate();
                })
                .catch(error => {
                    console.error("Error al reanudar la reproducción:", error);
                });
            
            isPlaying = true;
            
            // Cambiar iconos a pausar
            const playButton = document.querySelector(`.play-button[data-track-id="${trackId}"]`);
            if (playButton) {
                playButton.innerHTML = '<i class="fas fa-pause"></i>';
            }
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
            
            console.log("Reanudando reproducción");
        }
    } 
    // Si es una pista nueva, reproducirla
    else {
        if (currentAudio) {
            currentAudio.pause();
            stopProgressUpdate();
            currentAudio = null;
        }
        
        console.log(`Reproduciendo nueva pista: ${track.title}`);
        
        // Crear nuevo objeto de audio
        currentAudio = new Audio(track.source);
        currentTrackId = trackId;
        
        // Configurar eventos del audio
        currentAudio.addEventListener('timeupdate', updateProgress);
        
        currentAudio.addEventListener('ended', () => {
            isPlaying = false;
            stopProgressUpdate();
            const playButton = document.querySelector(`.play-button[data-track-id="${trackId}"]`);
            if (playButton) {
                playButton.innerHTML = '<i class="fas fa-play"></i>';
            }
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
            document.getElementById('progressBar').style.width = '0%';
            document.getElementById('currentTime').textContent = '0:00';
        });
        
        // Establecer el volumen según el control deslizante
        const volumeSlider = document.getElementById('volumeControl');
        if (volumeSlider) {
            currentAudio.volume = parseFloat(volumeSlider.value);
        }
        
        // Iniciar reproducción
        currentAudio.play()
            .then(() => {
                console.log("Reproducción iniciada con éxito");
            })
            .catch(error => {
                console.error("Error al iniciar la reproducción:", error);
            });
        
        isPlaying = true;
        
        // Actualizar el icono del botón de reproducción
        const playButton = document.querySelector(`.play-button[data-track-id="${trackId}"]`);
        if (playButton) {
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
        }
        document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        
        // Actualizar información en el reproductor fijo
        updateCurrentPlayer(track);
    }
}

/**
 * Salta a una posición específica en la reproducción
 * @param {number} percent - Porcentaje de progreso (0-100)
 */
function seekTo(percent) {
    if (!currentAudio) return;
    
    console.log(`Saltando a: ${percent}%`);
    
    // Asegurarse de que el porcentaje esté entre 0 y 100
    percent = Math.max(0, Math.min(100, percent));
    
    const newTime = (percent / 100) * currentAudio.duration;
    currentAudio.currentTime = newTime;
    
    // Actualizar la barra de progreso inmediatamente
    updateProgress();
    
    // Asegurarse de que se esté reproduciendo
    if (isPlaying) {
        currentAudio.play()
            .catch(error => {
                console.error("Error al reanudar reproducción después de buscar:", error);
            });
    }
}

/**
 * Inicializa el control de volumen en la interfaz
 */
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

/**
 * Actualiza el icono de volumen según el nivel
 * @param {number} volume - Nivel de volumen (0-1)
 */
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

/**
 * Alterna entre silenciar y restaurar el volumen
 */
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

/**
 * Reproduce la pista anterior en la lista
 */
function playPreviousTrack() {
    if (!currentTrackId) return;
    
    const currentIndex = musicDatabase.tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex > 0) {
        const prevTrack = musicDatabase.tracks[currentIndex - 1];
        togglePlayTrack(prevTrack.id);
    }
}

/**
 * Reproduce la siguiente pista en la lista
 */
function playNextTrack() {
    if (!currentTrackId) return;
    
    const currentIndex = musicDatabase.tracks.findIndex(t => t.id === currentTrackId);
    if (currentIndex < musicDatabase.tracks.length - 1) {
        const nextTrack = musicDatabase.tracks[currentIndex + 1];
        togglePlayTrack(nextTrack.id);
    }
}

/**
 * Busca canciones que coincidan con una consulta
 * @param {string} query - Texto a buscar
 * @return {Array} Lista de pistas que coinciden con la búsqueda
 */
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

/**
 * Genera HTML para mostrar las canciones en la interfaz
 * @param {Array} tracks - Lista de pistas a mostrar
 */
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
    
    // Funcionalidad de botones "Me gusta"
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
    
    // Funcionalidad de botones "Más opciones"
    document.querySelectorAll('.more-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            // Aquí podrías implementar un menú desplegable
            alert('Opciones adicionales');
        });
    });
}

// Inicializar la página cuando se cargue
document.addEventListener('DOMContentLoaded', () => {
    // Mostrar todas las canciones inicialmente
    displayTracks(musicDatabase.tracks);
    
    // Configurar evento click para la barra de progreso
    const progressBarContainer = document.querySelector('.progress-bar-container');
    const progressBarElement = document.querySelector('.progress-bar');

    // Evento para hacer clic en la barra de progreso
    if (progressBarContainer) {
        progressBarContainer.addEventListener('click', (e) => {
            if (!currentAudio) return;
            
            console.log("Click en la barra de progreso");
            
            // Calcular la posición del clic respecto a la barra
            const rect = progressBarElement.getBoundingClientRect();
            const clickPos = e.clientX - rect.left;
            const barWidth = rect.width;
            const percentage = (clickPos / barWidth) * 100;
            
            console.log(`Buscando posición: ${percentage}%`);
            
            // Saltar a la posición correspondiente
            seekTo(percentage);
        });
    } else {
        console.error("No se encontró el elemento de la barra de progreso (.progress-bar-container)");
    }

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
    
    // Configurar los event listeners para el reproductor
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    // Evento para el botón de pausa/reproducción
    playPauseBtn.addEventListener('click', () => {
        console.log("Click en botón play/pause global");
        if (currentTrackId) {
            console.log(`Llamando a togglePlayTrack con trackId=${currentTrackId}`);
            togglePlayTrack(currentTrackId);
        } else {
            console.log("No hay pista actual seleccionada");
        }
    });
    
    // Evento para el botón anterior
    prevBtn.addEventListener('click', () => {
        console.log("Click en botón 'anterior'");
        playPreviousTrack();
    });
    
    // Evento para el botón siguiente
    nextBtn.addEventListener('click', () => {
        console.log("Click en botón 'siguiente'");
        playNextTrack();
    });
    
    // Configurar evento click para la barra de progreso
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.querySelector('.progress-bar');
    
    // Evento para hacer clic en la barra de progreso
    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            if (!currentAudio) return;
            
            console.log("Click en la barra de progreso");
            
            // Calcular la posición del clic respecto a la barra
            const rect = progressContainer.getBoundingClientRect();
            const clickPos = e.clientX - rect.left;
            const barWidth = rect.width;
            const percentage = (clickPos / barWidth) * 100;
            
            console.log(`Buscando posición: ${percentage}%`);
            
            // Saltar a la posición correspondiente
            seekTo(percentage);
        });
    } else {
        console.error("No se encontró el elemento de la barra de progreso (.progress-container)");
    }
    
    // Inicializar control de volumen por defecto
    initVolumeControl();

    // Log para depuración
    console.log("Página inicializada correctamente con el reproductor actualizado");
});

function fixProgressBarError() {
    console.log('Corrigiendo referencias a la barra de progreso...');
    
    // Verificar si los elementos ya existen
    let progressContainer = document.querySelector('.progress-container');
    let progressBar = document.querySelector('.progress-bar');
    
    // Si no existe el contenedor pero sí existe la barra (nuevo diseño)
    if (!progressContainer && progressBar) {
        // La barra existe pero con una estructura diferente, adaptar referencia
        console.log('Ajustando referencia a contenedor de progreso para nuevo diseño');
        
        // Buscar contenedor padre adecuado
        const progressBarContainer = document.querySelector('.progress-bar-container');
        
        if (progressBarContainer) {
            // Usar el contenedor existente para los eventos
            progressBarContainer.addEventListener('click', (e) => {
                if (!window.currentAudio) return;
                
                console.log("Click en la barra de progreso");
                
                // Calcular la posición del clic respecto a la barra
                const rect = progressBarContainer.getBoundingClientRect();
                const clickPos = e.clientX - rect.left;
                const barWidth = rect.width;
                const percentage = (clickPos / barWidth) * 100;
                
                console.log(`Buscando posición: ${percentage}%`);
                
                // Usar la función seekTo
                if (typeof seekTo === 'function') {
                    seekTo(percentage);
                } else if (window.musicManager && typeof window.musicManager.handleProgressBarClick === 'function') {
                    // Alternativa: usar el musicManager si está disponible
                    window.musicManager.handleProgressBarClick(e);
                }
            });
            
            console.log('Contenedor de progreso encontrado y configurado correctamente');
        } else {
            console.error('No se encontró ningún contenedor de progreso válido');
            
            // Crear un nuevo contenedor si no existe (solución alternativa)
            createProgressElements();
        }
    } else if (!progressContainer && !progressBar) {
        console.error('No se encontraron elementos de progreso, creando nuevos elementos');
        
        // Crear los elementos necesarios
        createProgressElements();
    } else {
        console.log('Los elementos de la barra de progreso ya existen');
    }
    
    /**
     * Crea los elementos necesarios para la barra de progreso
     * si no existen en el DOM
     */
    function createProgressElements() {
        // Buscar el reproductor actual
        const currentPlayer = document.getElementById('currentPlayer');
        if (!currentPlayer) return;
        
        // Buscar la sección central donde debería estar la barra
        let playerCenterSection = currentPlayer.querySelector('.player-center-section');
        
        // Si no existe, crearla
        if (!playerCenterSection) {
            playerCenterSection = document.createElement('div');
            playerCenterSection.className = 'player-center-section';
            
            // Buscar una posición adecuada para insertarla
            const trackInfo = currentPlayer.querySelector('.current-track-info');
            if (trackInfo) {
                currentPlayer.insertBefore(playerCenterSection, trackInfo.nextSibling);
            } else {
                currentPlayer.appendChild(playerCenterSection);
            }
        }
        
        // Crear los controles si no existen
        if (!playerCenterSection.querySelector('.player-controls-current')) {
            const controlsHtml = `
                <div class="player-controls-current">
                    <button class="control-btn-current" id="shuffleBtn" title="Shuffle">
                        <i class="fas fa-random"></i>
                    </button>
                    <button class="control-btn-current" id="prevBtn">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button class="control-btn-current play-btn-current" id="playPauseBtn">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="control-btn-current" id="nextBtn">
                        <i class="fas fa-step-forward"></i>
                    </button>
                    <button class="control-btn-current" id="loopBtn" title="Loop">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            `;
            playerCenterSection.innerHTML = controlsHtml;
        }
        
        // Crear el contenedor de la barra de progreso si no existe
        if (!playerCenterSection.querySelector('.progress-bar-container')) {
            const progressContainerHtml = `
                <div class="progress-bar-container">
                    <span id="currentTime">0:00</span>
                    <div class="progress-bar">
                        <div class="progress" id="progressBar"></div>
                    </div>
                    <span id="totalTime">0:00</span>
                </div>
            `;
            playerCenterSection.insertAdjacentHTML('beforeend', progressContainerHtml);
            
            // Configurar evento de clic para la nueva barra
            const newProgressBarContainer = playerCenterSection.querySelector('.progress-bar-container');
            if (newProgressBarContainer) {
                newProgressBarContainer.addEventListener('click', (e) => {
                    if (!window.currentAudio) return;
                    
                    console.log("Click en la barra de progreso");
                    
                    // Calcular la posición del clic respecto a la barra
                    const rect = newProgressBarContainer.getBoundingClientRect();
                    const clickPos = e.clientX - rect.left;
                    const barWidth = rect.width;
                    const percentage = (clickPos / barWidth) * 100;
                    
                    console.log(`Buscando posición: ${percentage}%`);
                    
                    // Usar la función seekTo
                    if (typeof seekTo === 'function') {
                        seekTo(percentage);
                    }
                });
            }
        }
        
        console.log('Elementos de progreso creados correctamente');
    }
}

// Ejecutar la función cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', fixProgressBarError);