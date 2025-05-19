// music-manager.js - Gestión de los diferentes modos de música (local y Spotify)

class MusicManager {
    constructor() {
        this.currentMode = 'local'; // 'local' o 'spotify'
        this.spotify = new SpotifyManager();
        this.currentAudio = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        this.progressInterval = null;
        
        this.init();
    }

    async init() {
        // Inicializar interfaz
        this.bindEventListeners();
        
        // Cargar canciones locales por defecto
        this.loadLocalTracks();
    }

    bindEventListeners() {
        // Botones para cambiar entre modos
        const localModeBtn = document.getElementById('localModeBtn');
        const spotifyModeBtn = document.getElementById('spotifyModeBtn');
        
        if (localModeBtn) {
            localModeBtn.addEventListener('click', () => this.setMode('local'));
        }
        
        if (spotifyModeBtn) {
            spotifyModeBtn.addEventListener('click', () => this.setMode('spotify'));
        }
        
        // Evento para el formulario de búsqueda
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.handleSearch());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }
        
        // Controles del reproductor
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.playPrevious());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.playNext());
        }
        
        // Inicializar control de volumen
        this.initVolumeControl();
        
        // Configurar barra de progreso
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            const progressContainer = document.querySelector('.progress-bar-container');
            progressContainer.addEventListener('click', (e) => this.handleProgressBarClick(e));
        }
    }

    async setMode(mode) {
        if (mode === this.currentMode) return;
        
        // Actualizar estado visual de los botones
        document.getElementById('localModeBtn').classList.toggle('active', mode === 'local');
        document.getElementById('spotifyModeBtn').classList.toggle('active', mode === 'spotify');
        
        // Detener reproducción actual
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.isPlaying = false;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        }
        
        // Cerrar el embed de Spotify si está abierto
        this.hideSpotifyEmbed();
        
        this.currentMode = mode;
        
        if (mode === 'spotify') {
            // Inicializar Spotify si no se ha hecho
            const spotifyStatus = document.getElementById('spotifyStatus');
            spotifyStatus.style.display = 'inline-block';
            
            const isInitialized = await this.spotify.init();
            if (isInitialized) {
                // Buscar o mostrar contenido de Spotify
                const searchInput = document.getElementById('searchInput');
                if (searchInput.value.trim()) {
                    this.handleSearch();
                } else {
                    // Mostrar un mensaje para buscar
                    this.showSpotifyWelcome();
                }
            } else {
                // Volver al modo local si falla
                this.setMode('local');
                this.showError('No se pudo conectar con Spotify. Revisa tus credenciales.');
            }
        } else {
            // Cargar canciones locales
            this.loadLocalTracks();
        }
    }

    showSpotifyWelcome() {
        const resultsSection = document.getElementById('resultsSection');
        const searchResults = document.getElementById('searchResults');
        
        if (resultsSection && searchResults) {
            resultsSection.style.display = 'block';
            searchResults.innerHTML = `
                <div class="spotify-welcome" style="text-align: center; padding: 40px; color: #b3b3b3;">
                    <i class="fab fa-spotify" style="font-size: 4rem; color: #1DB954; margin-bottom: 20px;"></i>
                    <h3>Modo Spotify Activado</h3>
                    <p>Busca canciones, artistas o álbumes para descubrir música en Spotify.</p>
                    <p class="small">Las canciones se reproducirán mediante el reproductor integrado de Spotify.</p>
                </div>
            `;
        }
    }

    loadLocalTracks() {
        // Usamos la función existente de mostrarCanciones.js
        displayTracks(musicDatabase.tracks);
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;
        
        this.showLoading();
        
        try {
            let results;
            
            if (this.currentMode === 'spotify') {
                // Buscar en Spotify
                results = await this.spotify.searchTracks(query);
                
                // Mostrar resultados
                this.displaySpotifyResults(results);
            } else {
                // Buscar en la base de datos local
                results = searchTracks(query);
                
                // Mostrar resultados usando la función de mostrarCanciones.js
                displayTracks(results);
            }
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            this.showError('Error al buscar música. Inténtalo de nuevo.');
            
            // Si estamos en modo Spotify y falla, mostrar el mensaje de bienvenida
            if (this.currentMode === 'spotify') {
                this.showSpotifyWelcome();
            }
        }
    }

    async searchByGenre(genre) {
        this.showLoading();
        
        try {
            let results;
            
            if (this.currentMode === 'spotify') {
                // Buscar en Spotify por género
                results = await this.spotify.searchByGenre(genre);
                
                // Mostrar resultados
                this.displaySpotifyResults(results);
            } else {
                // Filtrar por género en la base de datos local
                results = musicDatabase.tracks.filter(track => 
                    track.genre.toLowerCase().includes(genre.toLowerCase())
                );
                
                // Mostrar resultados
                displayTracks(results);
            }
        } catch (error) {
            console.error('Error en la búsqueda por género:', error);
            this.showError('Error al buscar música por género.');
        }
    }

    displaySpotifyResults(tracks) {
        if (!tracks || tracks.length === 0) {
            const searchResults = document.getElementById('searchResults');
            searchResults.innerHTML = '<div class="no-results">No se encontraron canciones</div>';
            return;
        }
        
        // Guardar la lista actual
        this.currentPlaylist = tracks;
        
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';
        
        // Crear contenedor de pistas
        const tracksContainer = document.createElement('div');
        tracksContainer.className = 'tracks-container';
        
        // Agregar encabezados
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
                        <button class="action-button" title="Abrir en Spotify" onclick="window.open('${track.externalUrl}', '_blank')">
                            <i class="fab fa-spotify"></i>
                        </button>
                        <button class="action-button like-button" title="Me gusta">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            `;
            
            tracksContainer.appendChild(trackRow);
            
            // Eventos para hovering en la fila
            trackRow.addEventListener('mouseenter', () => {
                const playButton = trackRow.querySelector('.play-button');
                const indexElement = trackRow.querySelector('.track-index');
                
                if (this.currentTrack && this.currentTrack.id === track.id && this.isPlaying) {
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
                
                if (!(this.currentTrack && this.currentTrack.id === track.id)) {
                    indexElement.style.display = 'block';
                    playButton.style.display = 'none';
                } else if (this.currentTrack && this.currentTrack.id === track.id && this.isPlaying) {
                    indexElement.style.display = 'none';
                    playButton.style.display = 'flex';
                    playButton.innerHTML = '<i class="fas fa-pause"></i>';
                }
                
                trackRow.querySelector('.track-actions').style.visibility = 'hidden';
            });
        });
        
        resultsContainer.appendChild(tracksContainer);
        
        // Añadir eventos de clic a los botones de reproducción
        document.querySelectorAll('.play-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = button.dataset.trackId;
                const track = this.currentPlaylist.find(t => t.id === trackId);
                if (track) {
                    this.playTrack(track);
                }
            });
        });
        
        // Añadir evento de clic a las filas completas
        document.querySelectorAll('.track-row').forEach(row => {
            row.addEventListener('click', () => {
                const trackId = row.dataset.trackId;
                const track = this.currentPlaylist.find(t => t.id === trackId);
                if (track) {
                    this.playTrack(track);
                }
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
    }

    playTrack(track) {
        // Detener la reproducción actual
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.stopProgressUpdate();
        }
        
        // Actualizar la interfaz
        this.currentTrack = track;
        this.updatePlayerUI(track);
        
        // Si es una canción de Spotify, usar el embed
        if (track.source === 'spotify') {
            // Mostrar el embed de Spotify
            this.showSpotifyEmbed(track.id);
            
            // Restaurar el espacio en el fondo para que el contenido no quede detrás del reproductor
            document.body.style.paddingBottom = '80px';
            
            // Actualizar la interfaz de la lista
            this.updateTrackListUI(track);
            
            return;
        }
        
        // Para canciones locales, usar el reproductor normal
        this.currentAudio = new Audio(track.source);
        
        // Configurar eventos
        this.currentAudio.addEventListener('ended', () => {
            this.playNext();
        });
        
        this.currentAudio.addEventListener('error', (e) => {
            console.error('Error de reproducción:', e);
            this.showError('Error al reproducir la pista.');
        });
        
        // Establecer volumen
        const volumeControl = document.getElementById('volumeControl');
        if (volumeControl) {
            this.currentAudio.volume = parseFloat(volumeControl.value);
        }
        
        // Reproducir
        this.currentAudio.play()
            .then(() => {
                this.isPlaying = true;
                document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
                
                // Iniciar la actualización de la barra de progreso
                this.startProgressUpdate();
                
                // Actualizar la interfaz de la lista
                this.updateTrackListUI();
            })
            .catch(error => {
                console.error('Error al reproducir:', error);
                this.showError('Error al reproducir la pista.');
            });
    }

showSpotifyEmbed(trackId) {
    // Crear contenedor para el embed si no existe
    let embedContainer = document.getElementById('spotifyEmbed');
    if (!embedContainer) {
        embedContainer = document.createElement('div');
        embedContainer.id = 'spotifyEmbed';
        embedContainer.className = 'spotify-embed-container';
        
        // Estilos mejorados para el contenedor - posición fija
        embedContainer.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            z-index: 1001;
            background-color: #181818;
            border-top: 1px solid #282828;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.5);
        `;
        
        document.body.appendChild(embedContainer);
    }
    
    // Mostrar un indicador de carga
    embedContainer.innerHTML = `
        <div class="spotify-loading">
            <div class="spotify-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            <p>Cargando canción...</p>
        </div>
    `;
    
    // Mostrar el embed
    embedContainer.style.display = 'block';
    
    // Crear el iframe de Spotify después de mostrar el indicador de carga
    setTimeout(() => {
        embedContainer.innerHTML = `
            <iframe 
                src="https://open.spotify.com/embed/track/${trackId}?autoplay=1&utm_source=generator" 
                width="100%" 
                height="80" 
                frameborder="0" 
                allowtransparency="true" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy">
            </iframe>
            <button id="closeEmbed" class="close-embed-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Agregar evento para cerrar el embed
        document.getElementById('closeEmbed').addEventListener('click', () => {
            this.hideSpotifyEmbed();
        });
    }, 300); // Pequeño retraso para mostrar el spinner
    
    // Ocultar el reproductor normal para canciones de Spotify
    document.getElementById('currentPlayer').style.display = 'none';
    
    // Asegurarse de que los estilos existan
    this.addEmbedStyles();
    
    // Actualizar estado
    this.isPlaying = true;
}

    hideSpotifyEmbed() {
        const embedContainer = document.getElementById('spotifyEmbed');
        if (embedContainer) {
            embedContainer.style.display = 'none';
            
            // Restaurar el espacio al fondo
            document.body.style.paddingBottom = '';
            
            // Si hay una pista local actual, mostrar el reproductor normal
            if (this.currentTrack && this.currentTrack.source !== 'spotify') {
                document.getElementById('currentPlayer').style.display = 'flex';
            } else {
                // Mostrar el reproductor normal sin ninguna canción activa
                document.getElementById('currentPlayer').style.display = 'flex';
            }
        }
    }

    addEmbedStyles() {
        // Si ya existe el estilo, no hacer nada
        if (document.getElementById('embed-styles')) return;
        
        // Crear estilos para el embed y el indicador de carga
        const style = document.createElement('style');
        style.id = 'embed-styles';
        style.textContent = `
            .close-embed-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.6);
                border: none;
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1002;
            }
            
            .close-embed-btn:hover {
                background: rgba(255,255,255,0.2);
            }
            
            .spotify-embed-container iframe {
                display: block;
            }
            
            .spotify-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 80px;
                color: #1DB954;
            }
            
            .spotify-spinner {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .spotify-loading p {
                margin: 0;
                font-size: 14px;
                color: #b3b3b3;
            }
        `;
        document.head.appendChild(style);
    }

    updateTrackListUI() {
        // Actualizar el estado de los botones de reproducción en la lista
        document.querySelectorAll('.play-button').forEach(button => {
            const trackId = button.dataset.trackId;
            if (this.currentTrack && this.currentTrack.id === trackId) {
                if (this.isPlaying) {
                    button.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    button.innerHTML = '<i class="fas fa-play"></i>';
                }
            } else {
                button.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    }

    togglePlayPause() {
        if (!this.currentTrack) return;
        
        if (this.currentTrack.source === 'spotify') {
            // Para canciones de Spotify, solo mostramos el embed
            this.showSpotifyEmbed(this.currentTrack.id);
            return;
        }
        
        if (!this.currentAudio) return;
        
        if (this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
            this.stopProgressUpdate();
        } else {
            this.currentAudio.play()
                .then(() => {
                    this.isPlaying = true;
                    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
                    this.startProgressUpdate();
                })
                .catch(error => {
                    console.error('Error al reanudar:', error);
                    this.showError('Error al reproducir la pista.');
                });
        }
        
        // Actualizar la interfaz de la lista
        this.updateTrackListUI();
    }

    playNext() {
        if (!this.currentTrack || this.currentPlaylist.length === 0) return;
        
        // Encontrar la posición actual
        const currentIndex = this.currentPlaylist.findIndex(t => t.id === this.currentTrack.id);
        
        // Calcular el siguiente índice
        const nextIndex = (currentIndex + 1) % this.currentPlaylist.length;
        
        // Reproducir la siguiente pista
        this.playTrack(this.currentPlaylist[nextIndex]);
    }

    playPrevious() {
        if (!this.currentTrack || this.currentPlaylist.length === 0) return;
        
        // Encontrar la posición actual
        const currentIndex = this.currentPlaylist.findIndex(t => t.id === this.currentTrack.id);
        
        // Calcular el índice anterior
        const prevIndex = (currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
        
        // Reproducir la pista anterior
        this.playTrack(this.currentPlaylist[prevIndex]);
    }

    startProgressUpdate() {
        // Limpiar cualquier intervalo existente
        this.stopProgressUpdate();
        
        // Crear nuevo intervalo
        this.progressInterval = setInterval(() => this.updateProgress(), 1000);
        
        // Actualizar inmediatamente
        this.updateProgress();
    }

    stopProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    updateProgress() {
        if (!this.currentAudio || this.currentAudio.paused) {
            return;
        }
        
        const currentTimeElement = document.getElementById('currentTime');
        const progressBar = document.getElementById('progressBar');
        const totalTimeElement = document.getElementById('totalTime');
        
        // Obtener tiempo actual y duración
        const currentTime = this.currentAudio.currentTime;
        const duration = this.currentAudio.duration || 0;
        
        // Actualizar el texto del tiempo transcurrido
        currentTimeElement.textContent = this.formatTime(currentTime);
        totalTimeElement.textContent = this.formatTime(duration);
        
        // Calcular el porcentaje de progreso
        const progressPercent = (currentTime / duration) * 100;
        
        // Actualizar la barra de progreso
        progressBar.style.width = `${progressPercent}%`;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    handleProgressBarClick(e) {
        if (!this.currentAudio) return;
        
        const progressBarContainer = e.currentTarget;
        const rect = progressBarContainer.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const percentage = (clickPosition / rect.width);
        
        // Establecer la nueva posición
        this.currentAudio.currentTime = percentage * this.currentAudio.duration;
        
        // Actualizar la interfaz
        this.updateProgress();
    }

    updatePlayerUI(track) {
        document.getElementById('currentTrackImage').src = track.image;
        document.getElementById('currentTrackName').textContent = track.title;
        document.getElementById('currentTrackArtist').textContent = track.artist;
        
        // Agregar botón para abrir en Spotify (si es una canción de Spotify)
        const playerActions = document.querySelector('.player-actions');
        
        // Remover botón de Spotify si existe
        const existingSpotifyBtn = document.getElementById('openSpotifyBtn');
        if (existingSpotifyBtn) {
            existingSpotifyBtn.remove();
        }
        
        // Añadir botón de Spotify si es una canción de Spotify
        if (track.source === 'spotify' && track.externalUrl) {
            const spotifyBtn = document.createElement('button');
            spotifyBtn.id = 'openSpotifyBtn';
            spotifyBtn.className = 'spotify-btn';
            spotifyBtn.innerHTML = '<i class="fab fa-spotify"></i>';
            spotifyBtn.title = 'Abrir en Spotify';
            spotifyBtn.addEventListener('click', () => {
                window.open(track.externalUrl, '_blank');
            });
            
            // Agregar estilos para el botón
            spotifyBtn.style.cssText = `
                background: #1DB954;
                color: white;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 10px;
            `;
            
            // Insertar antes del control de volumen
            const volumeContainer = document.getElementById('volumeContainer');
            if (volumeContainer) {
                playerActions.insertBefore(spotifyBtn, volumeContainer);
            } else {
                playerActions.appendChild(spotifyBtn);
            }
        }
        
        // Mostrar el reproductor para canciones locales
        // (Para Spotify se mostrará el embed)
        if (track.source !== 'spotify') {
            document.getElementById('currentPlayer').style.display = 'flex';
        }
    }

    initVolumeControl() {
        const volumeControl = document.getElementById('volumeControl');
        if (!volumeControl) return;
        
        volumeControl.addEventListener('input', () => {
            if (this.currentAudio) {
                this.currentAudio.volume = volumeControl.value;
            }
        });
    }

    showLoading() {
        const searchResults = document.getElementById('searchResults');
        const resultsSection = document.getElementById('resultsSection');
        
        resultsSection.style.display = 'block';
        searchResults.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p style="color: var(--texto-secundario); margin-top: 20px;">Buscando música...</p>
            </div>
        `;
    }

    showError(message) {
        // Crear y mostrar un toast de error
        const toast = document.createElement('div');
        toast.className = 'toast error-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #dc3545;
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

        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
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
}

// Inicializar cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    window.musicManager = new MusicManager();
    
    // Exponer función global para buscar por género
    window.searchByGenre = function(genre) {
        window.musicManager.searchByGenre(genre);
    };
});