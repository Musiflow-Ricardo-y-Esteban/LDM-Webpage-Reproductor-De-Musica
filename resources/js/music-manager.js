// music-manager.js - Gestión unificada de reproducción musical (local y Spotify)

/**
 * Clase MusicManager: Gestiona todos los modos de reproducción musical
 * - Permite cambiar entre modo local y Spotify
 * - Proporciona una interfaz unificada para búsqueda y reproducción
 * - Maneja controles de reproducción, listas y opciones avanzadas
 */
class MusicManager {
    constructor() {
        this.currentMode = 'local'; // Modo inicial: 'local' o 'spotify'
        this.spotify = new SpotifyManager();
        this.currentAudio = null;
        this.currentTrack = null;
        this.isPlaying = false;
        
        // Listas de reproducción separadas para cada modo
        this.localPlaylist = [];
        this.spotifyPlaylist = [];
        
        this.currentTrackIndex = 0;
        this.progressInterval = null;
        this.isLoopEnabled = false;
        this.isShuffleEnabled = false;
        
        this.init();
    }

    //=======================================================
    // INICIALIZACIÓN Y CONFIGURACIÓN
    //=======================================================
    
    /**
     * Inicializa el gestor de música
     * Configura eventos y carga contenido inicial
     */
    async init() {
        // Inicializar interfaz
        this.bindEventListeners();
        
        // Cargar canciones locales por defecto
        this.loadLocalTracks();
    }

    /**
     * Configura todos los event listeners para la interfaz
     * Conecta botones y controles con sus funciones
     */
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
        
        // Añadir controles de bucle y aleatorio
        const loopBtn = document.getElementById('loopBtn');
        const shuffleBtn = document.getElementById('shuffleBtn');
        
        if (loopBtn) {
            loopBtn.addEventListener('click', () => this.toggleLoop());
        }
        
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => this.toggleShuffle());
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

    /**
     * Cambia entre los modos de reproducción (local/Spotify)
     * Actualiza la interfaz y carga contenido apropiado
     */
    async setMode(mode) {
        if (mode === this.currentMode) return;
        
        // Actualizar estado visual de los botones
        document.getElementById('localModeBtn').classList.toggle('active', mode === 'local');
        document.getElementById('spotifyModeBtn').classList.toggle('active', mode === 'spotify');
        
        // Detener cualquier reproducción actual
        this.stopPlayback();
        
        // Establecer el nuevo modo
        this.currentMode = mode;
        
        if (mode === 'spotify') {
            // Ocultar completamente el reproductor local en modo Spotify
            document.getElementById('currentPlayer').style.display = 'none';
            
            // Inicializar Spotify si es necesario
            const spotifyStatus = document.getElementById('spotifyStatus');
            spotifyStatus.style.display = 'inline-block';
            
            const isInitialized = await this.spotify.init();
            if (isInitialized) {
                // Buscar o mostrar contenido de Spotify
                const searchInput = document.getElementById('searchInput');
                if (searchInput.value.trim()) {
                    this.handleSearch();
                } else {
                    // Mostrar mensaje de bienvenida
                    this.showSpotifyWelcome();
                }
            } else {
                // Volver al modo local si falla
                this.setMode('local');
                this.showError('No se pudo conectar con Spotify. Revisa tus credenciales.');
            }
        } else {
            // Mostrar el reproductor local en modo local
            document.getElementById('currentPlayer').style.display = 'flex';
            
            // Ocultar el embed de Spotify si está presente
            this.hideSpotifyEmbed();
            
            // Cargar canciones locales
            this.loadLocalTracks();
        }
    }

    //=======================================================
    // GESTIÓN DE REPRODUCCIÓN
    //=======================================================
    
    /**
     * Detiene cualquier reproducción actual
     * Pausa audio y reestablece estado
     */
    stopPlayback() {
        // Detener audio local si está reproduciendo
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.stopProgressUpdate();
        }
        
        // Ocultar embed de Spotify si está presente
        this.hideSpotifyEmbed();
        
        // Reiniciar estado
        this.currentTrack = null;
        this.isPlaying = false;
        
        // Actualizar botón de reproducción
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    /**
     * Muestra pantalla de bienvenida para modo Spotify
     * Incluye información y sugerencias para el usuario
     */
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

    //=======================================================
    // CARGA Y BÚSQUEDA DE CANCIONES
    //=======================================================
    
    /**
     * Carga las pistas locales desde la base de datos
     * Utiliza la función existente para mostrarlas
     */
    loadLocalTracks() {
        // Usamos la función existente de mostrarCanciones.js
        displayTracks(musicDatabase.tracks);
    }

    /**
     * Gestiona la búsqueda de música en el modo actual
     * Realiza búsquedas en local o Spotify según modo
     */
    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;
        
        this.showLoading();
        
        try {
            let results;
            
            if (this.currentMode === 'spotify') {
                // Buscar en Spotify
                results = await this.spotify.searchTracks(query);
                
                // Almacenar en la lista de Spotify
                this.spotifyPlaylist = results;
                
                // Mostrar resultados
                this.displaySpotifyResults(results);
            } else {
                // Buscar en la base de datos local
                results = searchTracks(query);
                
                // Almacenar en la lista local
                this.localPlaylist = results;
                
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

    /**
     * Busca música por género en el modo actual
     * @param {string} genre - Género musical a buscar
     */
    async searchByGenre(genre) {
        this.showLoading();
        
        try {
            let results;
            
            if (this.currentMode === 'spotify') {
                // Buscar en Spotify por género
                results = await this.spotify.searchByGenre(genre);
                
                // Almacenar en la lista de Spotify
                this.spotifyPlaylist = results;
                
                // Mostrar resultados
                this.displaySpotifyResults(results);
            } else {
                // Filtrar por género en la base de datos local
                results = musicDatabase.tracks.filter(track => 
                    track.genre && track.genre.toLowerCase().includes(genre.toLowerCase())
                );
                
                // Almacenar en la lista local
                this.localPlaylist = results;
                
                // Mostrar resultados
                displayTracks(results);
            }
        } catch (error) {
            console.error('Error en la búsqueda por género:', error);
            this.showError('Error al buscar música por género.');
        }
    }

    //=======================================================
    // VISUALIZACIÓN DE RESULTADOS
    //=======================================================
    
    /**
     * Muestra resultados de Spotify en la interfaz
     * @param {Array} tracks - Pistas a mostrar
     */
    displaySpotifyResults(tracks) {
        if (!tracks || tracks.length === 0) {
            const searchResults = document.getElementById('searchResults');
            searchResults.innerHTML = '<div class="no-results">No se encontraron canciones</div>';
            return;
        }
        
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
                const track = this.spotifyPlaylist.find(t => t.id === trackId);
                if (track) {
                    this.playTrack(track);
                }
            });
        });
        
        // Añadir evento de clic a las filas completas
        document.querySelectorAll('.track-row').forEach(row => {
            row.addEventListener('click', () => {
                const trackId = row.dataset.trackId;
                const track = this.spotifyPlaylist.find(t => t.id === trackId);
                if (track) {
                    this.playTrack(track);
                }
            });
        });
        
        // Funcionalidad de botón "Me gusta"
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

    //=======================================================
    // REPRODUCCIÓN DE CANCIONES
    //=======================================================
    
    /**
     * Reproduce una pista musical
     * @param {Object} track - Pista a reproducir
     */
    playTrack(track) {
        // Detener cualquier reproducción actual
        this.stopPlayback();
        
        // Actualizar interfaz
        this.currentTrack = track;
        
        // Para canciones de Spotify, usar solo el reproductor embed
        if (track.source === 'spotify') {
            // Mostrar el embed de Spotify
            this.showSpotifyEmbed(track.id);
            return;
        }
        
        // Para canciones locales, usar el reproductor nativo
        this.updatePlayerUI(track);
        this.currentAudio = new Audio(track.source);
        
        // Configurar eventos
        this.currentAudio.addEventListener('ended', () => {
            if (this.isLoopEnabled) {
                this.currentAudio.currentTime = 0;
                this.currentAudio.play().catch(error => {
                    console.error('Error al reiniciar la reproducción en bucle:', error);
                });
            } else {
                this.playNext();
            }
        });
        
        this.currentAudio.addEventListener('error', (e) => {
            console.error('Error de reproducción:', e);
            this.showError('Error al reproducir la pista.');
        });
        
        // Configurar bucle si está activado
        this.currentAudio.loop = this.isLoopEnabled;
        
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
                
                // Iniciar actualizaciones de la barra de progreso
                this.startProgressUpdate();
                
                // Actualizar la interfaz de la lista
                this.updateTrackListUI();
            })
            .catch(error => {
                console.error('Error al reproducir:', error);
                this.showError('Error al reproducir la pista.');
            });
    }

    /**
     * Muestra el reproductor embed de Spotify para una pista
     * @param {string} trackId - ID de la pista de Spotify
     */
    showSpotifyEmbed(trackId) {
        // Asegurarse de que cualquier reproducción local se detenga
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.stopProgressUpdate();
            this.currentAudio = null;
        }
        
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
        
        // Añadir padding para evitar que el contenido quede oculto detrás del embed
        document.body.style.paddingBottom = '90px';
        
        // Crear el iframe de Spotify después de mostrar el indicador de carga
        setTimeout(() => {
            // Obtener parámetros para aleatorio
            const shuffleParam = this.isShuffleEnabled ? '&shuffle=1' : '';
            
            embedContainer.innerHTML = `
                <iframe 
                    src="https://open.spotify.com/embed/track/${trackId}?autoplay=1${shuffleParam}&utm_source=generator" 
                    width="100%" 
                    height="80" 
                    frameborder="0" 
                    allowtransparency="true" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy">
                </iframe>
                <div class="spotify-controls">
                    <button id="openInSpotify" class="spotify-action-btn" title="Abrir en Spotify">
                        <i class="fab fa-spotify"></i>
                    </button>
                </div>
            `;
            
            // Añadir evento para abrir en Spotify
            if (this.currentTrack && this.currentTrack.externalUrl) {
                document.getElementById('openInSpotify').addEventListener('click', () => {
                    window.open(this.currentTrack.externalUrl, '_blank');
                });
            }
        }, 300);
        
        // Asegurarse de que los estilos existan
        this.addEmbedStyles();
        
        // Actualizar estado
        this.isPlaying = true;
    }

    /**
     * Oculta el reproductor embed de Spotify
     */
    hideSpotifyEmbed() {
        const embedContainer = document.getElementById('spotifyEmbed');
        if (embedContainer) {
            embedContainer.style.display = 'none';
            
            // Restaurar el padding
            document.body.style.paddingBottom = '';
            
            // Limpiar la pista actual si estamos en modo Spotify
            if (this.currentMode === 'spotify') {
                this.currentTrack = null;
                this.isPlaying = false;
            }
        }
    }

    //=======================================================
    // CONTROLES DEL REPRODUCTOR
    //=======================================================
    
    /**
     * Activa/desactiva el modo de reproducción en bucle
     */
    toggleLoop() {
        if (this.currentMode === 'local') {
            // Para canciones locales
            this.isLoopEnabled = !this.isLoopEnabled;
            
            if (this.currentAudio) {
                this.currentAudio.loop = this.isLoopEnabled;
            }
            
            // Actualizar UI
            const loopBtn = document.getElementById('loopBtn');
            if (loopBtn) {
                loopBtn.classList.toggle('active', this.isLoopEnabled);
            }
        } else {
            // Para modo Spotify
            this.showMessage('La función de bucle no está disponible para canciones de Spotify');
        }
    }

    /**
     * Activa/desactiva el modo de reproducción aleatoria
     */
    toggleShuffle() {
        this.isShuffleEnabled = !this.isShuffleEnabled;
        
        // Actualizar UI
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', this.isShuffleEnabled);
        }
        
        // Si la pista actual es de Spotify, recargar el embed con el parámetro de aleatorio
        if (this.currentTrack && this.currentTrack.source === 'spotify') {
            this.showSpotifyEmbed(this.currentTrack.id);
        }
    }

    /**
     * Muestra un mensaje temporal en la interfaz
     * @param {string} message - Mensaje a mostrar
     */
    showMessage(message) {
        const messageEl = document.createElement('div');
        messageEl.className = 'player-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 1100;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        document.body.appendChild(messageEl);
        
        // Aparecer
        setTimeout(() => { messageEl.style.opacity = '1'; }, 10);
        
        // Desaparecer y eliminar
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => messageEl.remove(), 300);
        }, 2000);
    }

    //=======================================================
    // ESTILOS Y ELEMENTOS VISUALES
    //=======================================================
    
    /**
     * Añade estilos CSS para los elementos del embed
     */
    addEmbedStyles() {
        // Si el estilo ya existe, no hacer nada
        if (document.getElementById('embed-styles')) return;
        
        // Crear estilos para el embed y el indicador de carga
        const style = document.createElement('style');
        style.id = 'embed-styles';
        style.textContent = `
            .spotify-action-btn {
                background: #1DB954;
                border: none;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 1002;
            }
            
            .spotify-action-btn:hover {
                background: #1ED760;
                transform: scale(1.1);
            }
            
            .spotify-controls {
                position: absolute;
                top: 10px;
                right: 10px;
                display: flex;
                gap: 8px;
                z-index: 1002;
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
            
            /* Estilos para los botones de bucle y aleatorio */
            #loopBtn, #shuffleBtn {
                opacity: 0.6;
                transition: all 0.3s ease;
            }
            
            #loopBtn.active, #shuffleBtn.active {
                opacity: 1;
                color: #1ed760;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Actualiza los elementos visuales de la lista de pistas
     * Destaca la pista actual y actualiza estados de botones
     */
    updateTrackListUI() {
        // Solo ejecutar esto en modo local
        if (this.currentMode !== 'local') return;
        
        // Actualizar botones de reproducción en la lista de pistas
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
        
        // Actualizar estado de botones de bucle y aleatorio
        const loopBtn = document.getElementById('loopBtn');
        const shuffleBtn = document.getElementById('shuffleBtn');
        
        if (loopBtn) {
            loopBtn.classList.toggle('active', this.isLoopEnabled);
        }
        
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', this.isShuffleEnabled);
        }
    }

    /**
     * Alterna entre reproducción y pausa
     * Solo funciona en modo local
     */
    togglePlayPause() {
        // Solo para modo local
        if (this.currentMode !== 'local' || !this.currentTrack) return;
        
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
        
        // Actualizar interfaz de la lista
        this.updateTrackListUI();
    }

    //=======================================================
    // NAVEGACIÓN DE CANCIONES
    //=======================================================
    
    /**
     * Reproduce la siguiente pista en la lista
     * Incluye soporte para modo aleatorio
     */
    playNext() {
        // Solo para modo local
        if (this.currentMode !== 'local' || !this.currentTrack) return;
        
        if (this.localPlaylist.length === 0) return;
        
        // Encontrar la posición actual
        const currentIndex = this.localPlaylist.findIndex(t => t.id === this.currentTrack.id);
        
        // Calcular siguiente índice
        let nextIndex;
        
        if (this.isShuffleEnabled) {
            // Pista aleatoria (excluyendo la actual)
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * this.localPlaylist.length);
            } while (randomIndex === currentIndex && this.localPlaylist.length > 1);
            
            nextIndex = randomIndex;
        } else {
            // Secuencial
            nextIndex = (currentIndex + 1) % this.localPlaylist.length;
        }
        
        // Reproducir siguiente pista
        this.playTrack(this.localPlaylist[nextIndex]);
    }

    /**
     * Reproduce la pista anterior en la lista
     */
    playPrevious() {
        // Solo para modo local
        if (this.currentMode !== 'local' || !this.currentTrack) return;
        
        if (this.localPlaylist.length === 0) return;
        
        // Encontrar la posición actual
        const currentIndex = this.localPlaylist.findIndex(t => t.id === this.currentTrack.id);
        
        // Calcular índice anterior
        const prevIndex = (currentIndex - 1 + this.localPlaylist.length) % this.localPlaylist.length;
        
        // Reproducir pista anterior
        this.playTrack(this.localPlaylist[prevIndex]);
    }

    //=======================================================
    // CONTROL DE PROGRESO
    //=======================================================
    
    /**
     * Inicia la actualización periódica de la barra de progreso
     */
    startProgressUpdate() {
        // Limpiar cualquier intervalo existente
        this.stopProgressUpdate();
        
        // Crear nuevo intervalo
        this.progressInterval = setInterval(() => this.updateProgress(), 1000);
        
        // Actualizar inmediatamente
        this.updateProgress();
    }

    /**
     * Detiene la actualización periódica de la barra de progreso
     */
    stopProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Actualiza la barra de progreso y el tiempo transcurrido
     */
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
        
        // Actualizar texto de tiempo transcurrido
        currentTimeElement.textContent = this.formatTime(currentTime);
        totalTimeElement.textContent = this.formatTime(duration);
        
        // Calcular porcentaje de progreso
        const progressPercent = (currentTime / duration) * 100;
        
        // Actualizar barra de progreso
        progressBar.style.width = `${progressPercent}%`;
    }

    /**
     * Formatea segundos a formato "minutos:segundos"
     * @param {number} seconds - Tiempo en segundos
     * @return {string} Tiempo formateado
     */
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    /**
     * Maneja clics en la barra de progreso para saltar a una posición
     * @param {Event} e - Evento de clic
     */
    handleProgressBarClick(e) {
        if (!this.currentAudio || this.currentMode !== 'local') return;
        
        const progressBarContainer = e.currentTarget;
        const rect = progressBarContainer.getBoundingClientRect();
        const clickPosition = e.clientX - rect.left;
        const percentage = (clickPosition / rect.width);
        
        // Establecer nueva posición
        this.currentAudio.currentTime = percentage * this.currentAudio.duration;
        
        // Actualizar interfaz
        this.updateProgress();
    }

    /**
     * Actualiza la interfaz del reproductor con información de la pista
     * @param {Object} track - Pista a mostrar
     */
    updatePlayerUI(track) {
        document.getElementById('currentTrackImage').src = track.image;
        document.getElementById('currentTrackName').textContent = track.title;
        document.getElementById('currentTrackArtist').textContent = track.artist;
        
        // Mostrar reproductor nativo
        document.getElementById('currentPlayer').style.display = 'flex';
        
        // Actualizar estado de bucle/aleatorio
        this.updateTrackListUI();
    }

    /**
     * Inicializa el control de volumen
     */
    initVolumeControl() {
        const volumeControl = document.getElementById('volumeControl');
        if (!volumeControl) return;
        
        volumeControl.addEventListener('input', () => {
            if (this.currentAudio) {
                this.currentAudio.volume = volumeControl.value;
            }
        });
    }

    //=======================================================
    // FEEDBACK Y NOTIFICACIONES
    //=======================================================
    
    /**
     * Muestra indicador de carga durante búsquedas
     */
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

    /**
     * Muestra notificación de error
     * @param {string} message - Mensaje de error
     */
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

        // Animación de entrada
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
    
    // Exponer función global para búsqueda por género
    window.searchByGenre = function(genre) {
        window.musicManager.searchByGenre(genre);
    };
});