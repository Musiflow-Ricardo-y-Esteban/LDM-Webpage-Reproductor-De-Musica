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
        this.spotify = new SpotifyManager(); // Asume que SpotifyManager está globalmente disponible o cargado antes
        this.currentAudio = null;    // HTMLAudioElement para pistas locales
        this.currentTrack = null;    // Objeto: { id, title, artist, image, source, album, duration, sourceOrigin ('local'/'spotify') }
        this.isPlaying = false;
        
        this.localPlaylist = [];     // Lista de reproducción de pistas locales
        this.spotifyPlaylist = [];   // Lista de reproducción de pistas de Spotify
        
        this.currentTrackIndex = -1; // Índice en la lista de reproducción actual
        this.progressInterval = null; // Intervalo para la barra de progreso
        this.isLoopEnabled = false;   // Estado de bucle
        this.isShuffleEnabled = false; // Estado de reproducción aleatoria

        // Caché de Elementos DOM
        this.dom = {
            localModeBtn: document.getElementById('localModeBtn'),
            spotifyModeBtn: document.getElementById('spotifyModeBtn'),
            searchInput: document.getElementById('searchInput'),
            searchBtn: document.getElementById('searchBtn'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            loopBtn: document.getElementById('loopBtn'),
            shuffleBtn: document.getElementById('shuffleBtn'),
            volumeControl: document.getElementById('volumeControl'),
            progressBarContainer: document.querySelector('.progress-bar-container'), // Área principal clicable de la barra
            progressBar: document.getElementById('progressBar'), // El relleno visual del progreso
            currentTimeDisplay: document.getElementById('currentTime'),
            totalTimeDisplay: document.getElementById('totalTime'),
            currentPlayerDisplay: document.getElementById('currentPlayer'), // Toda la barra inferior del reproductor
            currentTrackImage: document.getElementById('currentTrackImage'),
            currentTrackName: document.getElementById('currentTrackName'),
            currentTrackArtist: document.getElementById('currentTrackArtist'),
            resultsSection: document.getElementById('resultsSection'),
            searchResults: document.getElementById('searchResults'),
            spotifyEmbedContainer: null // Se creará si es necesario
        };
        
        this.init();
    }

    //=======================================================
    // INICIALIZACIÓN Y CONFIGURACIÓN
    //=======================================================
    
    async init() {
        console.log("MusicManager: Inicializando...");
        this.bindEventListeners();
        
        // Configurar UI del modo inicial
        this.dom.localModeBtn?.classList.add('active');
        this.dom.spotifyModeBtn?.classList.remove('active');
        if(this.dom.currentPlayerDisplay) this.dom.currentPlayerDisplay.style.display = 'flex'; // Mostrar reproductor local por defecto

        this.loadLocalTracks(); // Cargar y mostrar pistas locales por defecto
        this.addEmbedStyles();  // Añadir estilos para el embed de Spotify tempranamente
        this.updateLoopShuffleButtonsUI(); // Actualizar botones de bucle/aleatorio

        // Intentar inicializar Spotify, pero no bloquear la funcionalidad local
        this.spotify.init().then(connected => {
            if (connected) {
                console.log("MusicManager: Spotify inicializado correctamente después de la configuración principal.");
            } else {
                console.warn("MusicManager: Falló la inicialización de Spotify después de la configuración principal. El modo Spotify podría no funcionar.");
            }
        }).catch(err => {
             console.error("MusicManager: Error durante la inicialización asíncrona de Spotify:", err);
        });
    }

    bindEventListeners() {
        this.dom.localModeBtn?.addEventListener('click', () => this.setMode('local'));
        this.dom.spotifyModeBtn?.addEventListener('click', () => this.setMode('spotify'));
        
        if (this.dom.searchBtn && this.dom.searchInput) {
            this.dom.searchBtn.addEventListener('click', () => this.handleSearch());
            this.dom.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }
        
        this.dom.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
        this.dom.prevBtn?.addEventListener('click', () => this.playPrevious());
        this.dom.nextBtn?.addEventListener('click', () => this.playNext());
        this.dom.loopBtn?.addEventListener('click', () => this.toggleLoop());
        this.dom.shuffleBtn?.addEventListener('click', () => this.toggleShuffle());
        
        this.initVolumeControl();
        
        if (this.dom.progressBarContainer) {
            this.dom.progressBarContainer.addEventListener('click', (e) => this.handleProgressBarClick(e));
        } else {
            console.warn("Contenedor de barra de progreso ('.progress-bar-container') no encontrado para el evento de clic.");
        }
    }

    async setMode(mode) {
        if (mode === this.currentMode) return;
        console.log(`MusicManager: Estableciendo modo a ${mode}`);

        this.stopPlayback(); // Detener reproducción actual antes de cambiar
        
        this.currentMode = mode;
        this.dom.localModeBtn?.classList.toggle('active', mode === 'local');
        this.dom.spotifyModeBtn?.classList.toggle('active', mode === 'spotify');
        
        if (mode === 'spotify') {
            if(this.dom.currentPlayerDisplay) this.dom.currentPlayerDisplay.style.display = 'none'; // Ocultar reproductor local
            this.hideSpotifyEmbed(); // Asegurar que esté oculto inicialmente
            
            const spotifyInitialized = await this.spotify.init(); // Asegurar que Spotify esté listo
            if (spotifyInitialized) {
                if (this.dom.searchResults) this.dom.searchResults.innerHTML = ''; // Limpiar resultados previos
                 // Comprobar si hay una consulta de búsqueda existente para reejecutar, o mostrar bienvenida
                if (this.dom.searchInput && this.dom.searchInput.value.trim()) {
                    this.handleSearch(); // Realizar búsqueda en modo Spotify
                } else {
                    this.showSpotifyWelcome();
                }
            } else {
                this.showError('No se pudo conectar con Spotify. Revisa tus credenciales e inténtalo de nuevo.');
                // Opcionalmente, volver al modo local o deshabilitar el botón de Spotify
                await this.setMode('local'); // Volver a local como fallback
            }
        } else { // modo local
            if(this.dom.currentPlayerDisplay) this.dom.currentPlayerDisplay.style.display = 'flex'; // Mostrar reproductor local
            this.hideSpotifyEmbed();
            this.loadLocalTracks(); // Recargar/remostrar pistas locales
            if (this.currentTrack && this.currentTrack.sourceOrigin === 'local') {
                 this.updatePlayerUI(this.currentTrack); // Restaurar UI si una pista local estaba sonando
            } else {
                // Si ninguna pista local era la actual, limpiar la UI del reproductor o mostrar predeterminada
                 this.updatePlayerUI(null); // Limpia el reproductor
            }
        }
    }

    //=======================================================
    // GESTIÓN DE REPRODUCCIÓN
    //=======================================================
    
    stopPlayback(fullStop = true) { // fullStop para limpiar currentTrack
        console.log("MusicManager: Deteniendo reproducción.");
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = ""; // Liberar recurso de audio
            // Remover listeners específicos de esta instancia de audio
            if (this.boundHandleTrackEnd) this.currentAudio.removeEventListener('ended', this.boundHandleTrackEnd);
            if (this.boundHandleAudioError) this.currentAudio.removeEventListener('error', this.boundHandleAudioError);
            if (this.boundHandleTimeUpdate) this.currentAudio.removeEventListener('timeupdate', this.boundHandleTimeUpdate);
            this.currentAudio = null;
        }
        this.stopProgressUpdate();
        this.hideSpotifyEmbed(); // Siempre ocultar embed de Spotify al detener

        if (fullStop) {
            this.currentTrack = null;
            this.currentTrackIndex = -1;
        }
        this.isPlaying = false;
        this.updatePlayPauseButtonUI();
        if (fullStop) this.updatePlayerUI(null); // Limpiar reproductor si es detención completa
    }

    showSpotifyWelcome() {
        if (this.dom.resultsSection && this.dom.searchResults) {
            this.dom.resultsSection.style.display = 'block';
            this.dom.searchResults.innerHTML = `
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
    
    loadLocalTracks() {
        // musicDatabase debería estar globalmente disponible desde mostrarCanciones.js
        // searchLocalTracks y displayLocalTracks también desde mostrarCanciones.js
        if (typeof musicDatabase !== 'undefined' && typeof displayLocalTracks === 'function') {
            this.localPlaylist = [...musicDatabase.tracks]; // Crear una copia mutable
            displayLocalTracks(this.localPlaylist); // Mostrar todas las pistas locales
            // Si no hay pista actual y hay pistas locales, podrías establecer la primera como predeterminada
            // pero sin reproducirla.
            if (!this.currentTrack && this.localPlaylist.length > 0) {
                // this.updatePlayerUI(this.localPlaylist[0]); // Actualiza la UI del reproductor con la primera canción
            } else if (!this.currentTrack) {
                this.updatePlayerUI(null); // Limpiar UI si no hay pistas
            }
        } else {
            console.error("musicDatabase o displayLocalTracks no encontrados. Asegúrate que mostrarCanciones.js esté cargado.");
            this.showError("Error al cargar canciones locales.");
        }
    }

    async handleSearch() {
        const query = this.dom.searchInput ? this.dom.searchInput.value.trim() : "";
        if (!query) {
             // Si la consulta está vacía: en modo local, mostrar todas las pistas locales. En Spotify, mostrar bienvenida.
            if (this.currentMode === 'local') {
                this.loadLocalTracks();
            } else if (this.currentMode === 'spotify') {
                this.showSpotifyWelcome();
            }
            return;
        }
        
        this.showLoading();
        
        try {
            if (this.currentMode === 'spotify') {
                if (!this.spotify.isConnected) { // Comprobar conexión antes de buscar
                    const connected = await this.spotify.init();
                    if (!connected) {
                        this.showError('Spotify no está conectado. Intenta de nuevo.');
                        this.showSpotifyWelcome(); // Mostrar bienvenida en caso de fallo
                        return;
                    }
                }
                const results = await this.spotify.searchTracks(query);
                this.spotifyPlaylist = results; // Actualizar lista de Spotify con resultados
                this.displaySpotifyResults(results);
            } else { // modo local
                // searchLocalTracks de mostrarCanciones.js
                const results = typeof searchLocalTracks === 'function' ? searchLocalTracks(query) : [];
                this.localPlaylist = results; // Actualizar lista local actual con resultados de búsqueda
                // displayLocalTracks de mostrarCanciones.js
                if(typeof displayLocalTracks === 'function') displayLocalTracks(results);
            }
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            this.showError(`Error al buscar música: ${error.message || 'Inténtalo de nuevo.'}`);
            if (this.currentMode === 'spotify') {
                this.showSpotifyWelcome();
            } else {
                if(this.dom.searchResults) this.dom.searchResults.innerHTML = '<div class="no-results">Error en la búsqueda local.</div>';
            }
        }
    }

    async searchByGenre(genre) {
        this.showLoading();
        try {
            if (this.currentMode === 'spotify') {
                 if (!this.spotify.isConnected) {
                    const connected = await this.spotify.init();
                    if (!connected) {
                        this.showError('Spotify no está conectado. Intenta de nuevo.');
                        this.showSpotifyWelcome();
                        return;
                    }
                }
                const results = await this.spotify.searchByGenre(genre);
                this.spotifyPlaylist = results;
                this.displaySpotifyResults(results);
            } else { // modo local
                const results = musicDatabase.tracks.filter(track => 
                    track.genre && track.genre.toLowerCase().includes(genre.toLowerCase())
                );
                this.localPlaylist = results;
                if (typeof displayLocalTracks === 'function') displayLocalTracks(results);
            }
        } catch (error) {
            console.error('Error en la búsqueda por género:', error);
            this.showError(`Error al buscar por género: ${error.message || 'Inténtalo de nuevo.'}`);
             if (this.currentMode === 'spotify') this.showSpotifyWelcome();
        }
    }

    //=======================================================
    // VISUALIZACIÓN DE RESULTADOS (Específico de Spotify, local lo maneja displayLocalTracks)
    //=======================================================
    
    displaySpotifyResults(tracks) {
        if (!this.dom.searchResults) return;

        if (!tracks || tracks.length === 0) {
            this.dom.searchResults.innerHTML = '<div class="no-results">No se encontraron canciones en Spotify.</div>';
            return;
        }
        
        this.dom.searchResults.innerHTML = ''; // Limpiar
        
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
            trackRow.dataset.trackId = track.id; // ID de pista de Spotify
            
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
                <div class="track-duration"> {/* Corregido: class en vez de class. */}
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

            // Hover simplificado, botón de play siempre visible en la lista de Spotify por ahora
             trackRow.addEventListener('mouseenter', () => {
                const playButton = trackRow.querySelector('.play-button');
                const indexElement = trackRow.querySelector('.track-index');
                if(indexElement) indexElement.style.display = 'none';
                if(playButton) playButton.style.display = 'flex';
                
                const actions = trackRow.querySelector('.track-actions');
                if(actions) actions.style.visibility = 'visible';
            });
            trackRow.addEventListener('mouseleave', () => {
                const playButton = trackRow.querySelector('.play-button');
                const indexElement = trackRow.querySelector('.track-index');

                // Si no es la pista actual O si es la actual pero está pausada, mostrar índice y ocultar botón play
                const isCurrentAndPlaying = this.currentTrack && this.currentTrack.id === track.id && this.isPlaying;
                if (!isCurrentAndPlaying) {
                    if(indexElement) indexElement.style.display = 'block';
                    if(playButton) playButton.style.display = 'none';
                }
                // Si es la actual y está sonando, el botón de pausa ya debería estar visible.
                // Si es la actual y está pausada, el botón de play debería estar visible.

                const actions = trackRow.querySelector('.track-actions');
                if(actions) actions.style.visibility = 'hidden';
            });
        });
        
        this.dom.searchResults.appendChild(tracksContainer);
        
        // Event listeners para resultados de Spotify
        this.dom.searchResults.querySelectorAll('.play-button, .track-row').forEach(element => {
            element.addEventListener('click', (e) => {
                if (e.target.closest('.action-button')) return; // No reproducir si se hizo clic en un botón de acción interno
                e.stopPropagation();
                const trackRowElement = element.closest('.track-row');
                if (!trackRowElement) return;
                const trackId = trackRowElement.dataset.trackId;
                const trackToPlay = this.spotifyPlaylist.find(t => t.id === trackId);
                if (trackToPlay) {
                    this.playTrack(trackToPlay);
                }
            });
        });
         this.dom.searchResults.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); /* ... lógica de "me gusta" ... */
                const icon = button.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fas'); icon.classList.toggle('far');
                    icon.style.color = icon.classList.contains('fas') ? '#1ed760' : '';
                }
            });
        });
    }

    //=======================================================
    // REPRODUCCIÓN DE CANCIONES
    //=======================================================
    
    playTrack(track) {
        if (!track) {
            console.warn("playTrack llamada con pista nula");
            return;
        }
        console.log(`MusicManager: Intentando reproducir pista: ${track.title} (Fuente: ${track.sourceOrigin || track.source})`);
        this.stopPlayback(false); // Detener previa, pero no limpiar currentTrack aún

        // Asegurar que sourceOrigin esté definido. Si track.source es 'spotify', es de Spotify. Sino, local.
        this.currentTrack = { ...track, sourceOrigin: track.source === 'spotify' ? 'spotify' : 'local' };
        
        // Actualizar currentTrackIndex basado en el modo actual y la lista de reproducción
        if (this.currentMode === 'local') {
            this.currentTrackIndex = this.localPlaylist.findIndex(t => t.id === this.currentTrack.id);
        } else if (this.currentMode === 'spotify') {
            this.currentTrackIndex = this.spotifyPlaylist.findIndex(t => t.id === this.currentTrack.id);
        }

        if (this.currentTrack.sourceOrigin === 'spotify') {
            if(this.dom.currentPlayerDisplay) this.dom.currentPlayerDisplay.style.display = 'none'; // Ocultar reproductor local
            this.showSpotifyEmbed(this.currentTrack.id);
            this.isPlaying = true; // Asumir que el embed de Spotify auto-reproduce
            this.updatePlayPauseButtonUI(); // Actualizar botón principal play/pause
            // No es necesario llamar a updatePlayerUI para Spotify ya que el embed lo maneja
        } else { // Pista local
            if(this.dom.currentPlayerDisplay) this.dom.currentPlayerDisplay.style.display = 'flex'; // Asegurar que el reproductor local esté visible
            this.hideSpotifyEmbed();
            this.updatePlayerUI(this.currentTrack);

            this.currentAudio = new Audio(this.currentTrack.source);
            this.currentAudio.volume = this.dom.volumeControl ? parseFloat(this.dom.volumeControl.value) : 0.7;
            this.currentAudio.loop = this.isLoopEnabled;

            // Guardar referencias bindeadas para poder removerlas luego
            this.boundHandleTrackEnd = this.handleTrackEnd.bind(this);
            this.boundHandleAudioError = this.handleAudioError.bind(this);
            this.boundHandleTimeUpdate = this.handleTimeUpdate.bind(this);

            this.currentAudio.addEventListener('ended', this.boundHandleTrackEnd);
            this.currentAudio.addEventListener('error', this.boundHandleAudioError);
            this.currentAudio.addEventListener('timeupdate', this.boundHandleTimeUpdate); // Para progreso manual
            
            this.currentAudio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updatePlayPauseButtonUI();
                    this.startProgressUpdate(); // Para audio local
                    this.updateTrackListVisualState(this.currentTrack.id, true);
                })
                .catch(error => {
                    console.error('Error al reproducir pista local:', error);
                    this.showError(`Error al reproducir: ${error.message}`);
                    this.isPlaying = false;
                    this.updatePlayPauseButtonUI();
                    this.updateTrackListVisualState(this.currentTrack.id, false);
                });
        }
    }
    
    // Manejadores de eventos para HTMLAudioElement, bindeados en playTrack
    handleTrackEnd() {
        console.log("MusicManager: Pista local finalizada.");
        this.isPlaying = false; // Establecer antes de llamar playNext o hacer bucle
        if (this.isLoopEnabled && this.currentMode === 'local' && this.currentAudio) {
            this.currentAudio.currentTime = 0;
            this.currentAudio.play().catch(e => console.error("Error al re-activar bucle", e));
            this.isPlaying = true; // Se establece de nuevo a true si el play es exitoso
        } else {
            this.playNext();
        }
        this.updatePlayPauseButtonUI(); // Actualizar después de la acción
    }

    handleAudioError(e) {
        console.error('Error de reproducción de audio local:', e);
        this.showError('Error al reproducir la pista local.');
        this.isPlaying = false;
        this.updatePlayPauseButtonUI();
        this.stopProgressUpdate();
    }
    
    handleTimeUpdate() { // Para actualización manual del progreso si es necesario, aunque startProgressUpdate usa setInterval
        if(this.currentMode === 'local' && this.isPlaying && this.currentAudio) {
            // this.updateProgress(); // Se puede llamar aquí si no se usa setInterval
        }
    }

    showSpotifyEmbed(trackId) {
        this.stopPlayback(false); // Detener audio local si hay, no limpiar currentTrack
        if(this.dom.currentPlayerDisplay) this.dom.currentPlayerDisplay.style.display = 'none'; // Ocultar reproductor nativo

        if (!this.dom.spotifyEmbedContainer) {
            this.dom.spotifyEmbedContainer = document.createElement('div');
            this.dom.spotifyEmbedContainer.id = 'spotifyEmbed';
            this.dom.spotifyEmbedContainer.className = 'spotify-embed-container';
            this.dom.spotifyEmbedContainer.style.cssText = `
                position: fixed; bottom: 0; left: 0; width: 100%;
                z-index: 1001; background-color: #181818;
                border-top: 1px solid #282828;
                box-shadow: 0 -4px 12px rgba(0,0,0,0.5); display: none; /* Inicia oculto */
            `;
            document.body.appendChild(this.dom.spotifyEmbedContainer);
        }
        
        this.dom.spotifyEmbedContainer.innerHTML = `<div class="spotify-loading" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80px; color:#1DB954;">Cargando Spotify...</div>`;
        this.dom.spotifyEmbedContainer.style.display = 'block';
        document.body.style.paddingBottom = '90px'; // Hacer espacio

        // El embed de Spotify auto-reproduce. El parámetro de shuffle para SDK es diferente.
        // Para embed, shuffle no es un parámetro directo. Respeta el estado del cliente Spotify del usuario o la configuración de la lista.
        const shuffleParam = ""; // this.isShuffleEnabled ? '&shuffle=1' : ''; // Shuffle no es fiable en embed
        
        setTimeout(() => { // Permitir que se muestre el mensaje de carga
            if (this.dom.spotifyEmbedContainer && this.currentTrack && this.currentTrack.id === trackId) { // Comprobar si sigue siendo relevante
                 this.dom.spotifyEmbedContainer.innerHTML = `
                    <iframe 
                        src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&autoplay=1${shuffleParam}" 
                        width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                        loading="lazy">
                    </iframe>
                     <div class="spotify-controls" style="position:absolute; top:10px; right:10px; display:flex; gap:8px; z-index:1002;">
                        <button id="openInSpotifyApp" class="spotify-action-btn" title="Abrir en App de Spotify" style="background:#1DB954; border:none; color:white; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">
                            <i class="fab fa-spotify"></i>
                        </button>
                    </div>
                `;
                const openBtn = this.dom.spotifyEmbedContainer.querySelector('#openInSpotifyApp');
                if (openBtn && this.currentTrack && this.currentTrack.externalUrl) {
                    openBtn.onclick = () => window.open(this.currentTrack.externalUrl, '_blank');
                }
            }
        }, 300);
        this.isPlaying = true; // Asumir auto-reproducción
    }

    hideSpotifyEmbed() {
        if (this.dom.spotifyEmbedContainer) {
            this.dom.spotifyEmbedContainer.style.display = 'none';
            this.dom.spotifyEmbedContainer.innerHTML = ''; // Limpiar contenido para detener reproducción
        }
        document.body.style.paddingBottom = ''; // Restaurar padding
    }

    //=======================================================
    // CONTROLES DEL REPRODUCTOR
    //=======================================================
    togglePlayPause() {
        if (this.currentMode === 'spotify') {
            this.showMessage("Controles de reproducción manuales no disponibles para Spotify embed. Usa los controles del widget de Spotify.");
            return;
        }

        if (!this.currentAudio || !this.currentTrack) {
             // Si no hay pista actual, intentar reproducir la primera de la lista local
            if (this.localPlaylist && this.localPlaylist.length > 0) {
                this.playTrack(this.localPlaylist[0]);
            }
            return;
        }
        
        if (this.isPlaying) {
            this.currentAudio.pause();
            this.isPlaying = false;
            this.stopProgressUpdate();
        } else {
            this.currentAudio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.startProgressUpdate();
                })
                .catch(error => {
                    console.error('Error al reanudar:', error);
                    this.showError('Error al reproducir la pista.');
                    this.isPlaying = false; // Asegurar que isPlaying es false si hay error
                });
        }
        this.updatePlayPauseButtonUI();
        if (this.currentTrack) this.updateTrackListVisualState(this.currentTrack.id, this.isPlaying);
    }

    updatePlayPauseButtonUI() {
        if (this.dom.playPauseBtn) {
            this.dom.playPauseBtn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
    }
    
    updateTrackListVisualState(trackId, isPlaying) {
        // Esta función debería actualizar el ícono de play/pause en la lista de pistas (tanto local como Spotify)
        const listType = this.currentMode === 'local' ? 'local' : 'spotify';
        console.log(`Actualizando estado visual para pista ${trackId} en lista ${listType}. Reproduciendo: ${isPlaying}`);

        document.querySelectorAll(`#searchResults .track-row[data-track-id]`).forEach(row => {
            const playButton = row.querySelector('.play-button');
            const indexElement = row.querySelector('.track-index');
            if (!playButton || !indexElement) return;

            if (row.dataset.trackId === trackId) {
                playButton.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
                // Asegurar que el botón esté visible y el índice oculto si es la pista actual
                playButton.style.display = 'flex';
                indexElement.style.display = 'none';
            } else {
                 // Restablecer otras filas: mostrar índice, ocultar botón de play (a menos que esté en hover)
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                 // El manejo de hover de mostrarCanciones.js/displaySpotifyResults se encargará de mostrar/ocultar
                 // el botón de play en hover. Aquí solo reseteamos el ícono.
                if (!row.classList.contains('hovered')) { // clase hipotética para mejor manejo de hover
                    playButton.style.display = 'none';
                    indexElement.style.display = 'block';
                }
            }
        });
    }

    toggleLoop() {
        this.isLoopEnabled = !this.isLoopEnabled;
        if (this.currentMode === 'local' && this.currentAudio) {
            this.currentAudio.loop = this.isLoopEnabled;
        } else if (this.currentMode === 'spotify') {
            this.showMessage('Función de bucle no aplicable directamente al widget de Spotify.');
            // Si se desactiva, no hay acción para Spotify, ya que no lo obedece.
        }
        this.updateLoopShuffleButtonsUI();
    }

    toggleShuffle() {
        this.isShuffleEnabled = !this.isShuffleEnabled;
        this.updateLoopShuffleButtonsUI();
        
        if (this.currentMode === 'spotify' && this.currentTrack && this.isShuffleEnabled) {
            this.showMessage('Modo aleatorio para Spotify depende de tu cliente Spotify o de la lista de reproducción.');
        }
    }
    
    updateLoopShuffleButtonsUI() {
        this.dom.loopBtn?.classList.toggle('active', this.isLoopEnabled);
        this.dom.shuffleBtn?.classList.toggle('active', this.isShuffleEnabled);
    }

    //=======================================================
    // NAVEGACIÓN DE CANCIONES (Principalmente para Modo Local)
    //=======================================================
    playNext() {
        if (this.currentMode === 'spotify') {
            this.showMessage("El widget de Spotify gestiona 'siguiente'.");
            return;
        }

        const playlist = this.localPlaylist;
        if (!playlist || playlist.length === 0) return;

        let nextIndex;
        if (this.isShuffleEnabled) {
            if (playlist.length <= 1) { // Si solo hay una o ninguna canción
                nextIndex = 0;
            } else { // Elegir una aleatoria diferente a la actual
                do {
                    nextIndex = Math.floor(Math.random() * playlist.length);
                } while (playlist.length > 1 && nextIndex === this.currentTrackIndex);
            }
        } else { // Secuencial
            nextIndex = (this.currentTrackIndex + 1) % playlist.length;
        }
        
        if (playlist[nextIndex]) {
            this.playTrack(playlist[nextIndex]);
        } else if (playlist.length > 0) { // Fallback a la primera si el índice es inválido
            this.playTrack(playlist[0]);
        }
    }

    playPrevious() {
        if (this.currentMode === 'spotify') {
             this.showMessage("El widget de Spotify gestiona 'anterior'.");
            return;
        }
        const playlist = this.localPlaylist;
        if (!playlist || playlist.length === 0) return;

        let prevIndex;
         if (this.isShuffleEnabled) { // Anterior en aleatorio también puede ser otra pista aleatoria diferente
            if (playlist.length <= 1) {
                prevIndex = 0;
            } else {
                do {
                    prevIndex = Math.floor(Math.random() * playlist.length);
                } while (playlist.length > 1 && prevIndex === this.currentTrackIndex);
            }
        } else { // Secuencial
            prevIndex = (this.currentTrackIndex - 1 + playlist.length) % playlist.length;
        }

        if (playlist[prevIndex]) {
            this.playTrack(playlist[prevIndex]);
        } else if (playlist.length > 0) { // Fallback a la última si el índice es inválido (raro con %)
            this.playTrack(playlist[playlist.length - 1]);
        }
    }

    //=======================================================
    // CONTROL DE PROGRESO (Modo Local)
    //=======================================================
    startProgressUpdate() {
        if (this.currentMode !== 'local' || !this.currentAudio) return;
        this.stopProgressUpdate(); // Limpiar existente
        this.progressInterval = setInterval(() => this.updateProgress(), 1000);
        this.updateProgress(); // Actualización inicial
    }

    stopProgressUpdate() {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
    }

    updateProgress() {
        if (this.currentMode !== 'local' || !this.currentAudio || !this.isPlaying || isNaN(this.currentAudio.duration)) {
            // No actualizar si no es local, no hay audio, no está sonando, o la duración no está disponible
            if (this.dom.progressBar && (!this.currentAudio || isNaN(this.currentAudio.duration))) {
                 this.dom.progressBar.style.width = '0%'; // Resetear barra si duración es NaN
            }
            return;
        }
        
        const currentTime = this.currentAudio.currentTime;
        const duration = this.currentAudio.duration;
        
        if (this.dom.currentTimeDisplay) this.dom.currentTimeDisplay.textContent = this.formatTime(currentTime);
        if (this.dom.totalTimeDisplay) this.dom.totalTimeDisplay.textContent = this.formatTime(duration);
        
        const progressPercent = duration ? (currentTime / duration) * 100 : 0;
        if (this.dom.progressBar) this.dom.progressBar.style.width = `${progressPercent}%`;
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    handleProgressBarClick(e) {
        if (this.currentMode !== 'local' || !this.currentAudio || isNaN(this.currentAudio.duration)) return;
        
        const progressBarContainerElement = this.dom.progressBarContainer; // El elemento en el que está el evento
        if (!progressBarContainerElement) return;

        const rect = progressBarContainerElement.getBoundingClientRect();
        const clickPositionX = e.clientX - rect.left; // Posición X del clic relativa al contenedor
        const barWidth = rect.width; // Ancho total del contenedor de la barra
        
        // Asegurar que el ancho no sea 0 para evitar división por cero
        if (barWidth === 0) return;

        const percentage = (clickPositionX / barWidth);
        
        this.currentAudio.currentTime = percentage * this.currentAudio.duration;
        this.updateProgress(); // Actualizar UI inmediatamente
    }

    updatePlayerUI(track) { // Para la barra del reproductor local
        if (track && track.sourceOrigin === 'local') {
            if(this.dom.currentTrackImage) this.dom.currentTrackImage.src = track.image || 'ruta/a/imagen-local-defecto.png';
            if(this.dom.currentTrackName) this.dom.currentTrackName.textContent = track.title || 'Título Desconocido';
            if(this.dom.currentTrackArtist) this.dom.currentTrackArtist.textContent = track.artist || 'Artista Desconocido';
            
            // Actualizar tiempos solo si la información está disponible
            if (this.dom.totalTimeDisplay) {
                 // Si el audio ya está cargado y tiene duración, usarla.
                if (this.currentAudio && this.currentAudio.duration && !isNaN(this.currentAudio.duration)) {
                    this.dom.totalTimeDisplay.textContent = this.formatTime(this.currentAudio.duration);
                } 
                // Si no, y la pista tiene una duración preformateada (de la base de datos local), usarla.
                else if (track.duration && typeof track.duration === 'string') {
                     this.dom.totalTimeDisplay.textContent = track.duration; 
                } 
                // Fallback
                else {
                    this.dom.totalTimeDisplay.textContent = "0:00";
                }
            }
            if(this.dom.currentTimeDisplay) this.dom.currentTimeDisplay.textContent = "0:00"; // Siempre resetear tiempo actual
            if(this.dom.progressBar) this.dom.progressBar.style.width = '0%'; // Resetear barra de progreso

        } else { // Limpiar UI del reproductor si no hay pista o es pista de Spotify (que usa embed)
            if(this.dom.currentTrackImage) this.dom.currentTrackImage.src = 'ruta/a/placeholder-defecto.png'; // Placeholder por defecto
            if(this.dom.currentTrackName) this.dom.currentTrackName.textContent = 'Ninguna Pista Seleccionada';
            if(this.dom.currentTrackArtist) this.dom.currentTrackArtist.textContent = '---';
            if(this.dom.currentTimeDisplay) this.dom.currentTimeDisplay.textContent = "0:00";
            if(this.dom.totalTimeDisplay) this.dom.totalTimeDisplay.textContent = "0:00";
            if(this.dom.progressBar) this.dom.progressBar.style.width = '0%';
        }
        this.updatePlayPauseButtonUI(); // Actualizar siempre el botón principal
        this.updateLoopShuffleButtonsUI(); // Y los de bucle/aleatorio
    }

    initVolumeControl() {
        if (!this.dom.volumeControl) return;
        this.dom.volumeControl.addEventListener('input', (e) => {
            const volumeValue = parseFloat(e.target.value);
            if (this.currentMode === 'local' && this.currentAudio) {
                this.currentAudio.volume = volumeValue;
            } else if (this.currentMode === 'spotify') {
                this.showMessage("Ajusta el volumen desde el widget de Spotify o el sistema.");
                // Opcionalmente revertir el slider si quieres mostrar que no es efectivo para Spotify
                // e.target.value = this.currentAudio ? this.currentAudio.volume : (localStorage.getItem('volumeLevel') || 0.7);
            }
            // Guardar volumen para persistencia (opcional)
            // localStorage.setItem('volumeLevel', volumeValue.toString());
        });
         // Establecer volumen inicial si el audio existe (ej. en cambio de pista) o desde localStorage
        // const savedVolume = localStorage.getItem('volumeLevel');
        // if (savedVolume) this.dom.volumeControl.value = savedVolume;
        if (this.currentAudio) this.currentAudio.volume = parseFloat(this.dom.volumeControl.value);
    }

    //=======================================================
    // FEEDBACK Y NOTIFICACIONES
    //=======================================================
    showLoading() {
        if (this.dom.resultsSection && this.dom.searchResults) {
            this.dom.resultsSection.style.display = 'block';
            this.dom.searchResults.innerHTML = `
                <div class="loading-spinner" style="text-align:center; padding:40px;">
                    <div class="spinner-border text-primary" role="status" style="width:3rem; height:3rem;"></div>
                    <p style="color: var(--texto-secundario); margin-top: 20px;">Buscando música...</p>
                </div>
            `;
        }
    }

    showError(message) {
        console.error("MusicManager Error:", message);
        const toast = document.createElement('div');
        toast.className = 'toast error-toast'; // Usar clases para estilos si es posible
        // Estilos básicos en línea, idealmente deberían estar en CSS
        toast.style.cssText = `position:fixed; bottom:20px; right:20px; background:#dc3545; color:white; padding:15px 25px; border-radius:5px; z-index:9999; opacity:0; transition:all 0.3s ease; transform: translateY(20px);`;
        toast.innerHTML = `<span>${message}</span>`; // Usar textContent si el mensaje no es HTML
        document.body.appendChild(toast);
        // Pequeño delay para asegurar que el elemento está en el DOM antes de la transición
        setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';}, 10);
        // Desaparecer y eliminar
        setTimeout(() => {
            toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300); // Esperar a que termine la transición antes de remover
        }, 3000);
    }
    
    showMessage(message) { // Mensaje de propósito general
        const msgEl = document.createElement('div');
        msgEl.className = 'player-message';
        msgEl.style.cssText = `position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; z-index:1100; opacity:0; transition: opacity 0.3s;`;
        msgEl.textContent = message;
        document.body.appendChild(msgEl);
        setTimeout(() => { msgEl.style.opacity = '1'; }, 10);
        setTimeout(() => {
            msgEl.style.opacity = '0';
            setTimeout(() => msgEl.remove(), 300);
        }, 2500);
    }

    addEmbedStyles() { // Estilos para elementos creados dinámicamente si no están en CSS
        if (document.getElementById('musicmanager-dynamic-styles')) return;
        const style = document.createElement('style');
        style.id = 'musicmanager-dynamic-styles';
        style.textContent = `
            /* Estilos para botones dentro de los controles del embed de Spotify (ej. botón de abrir en Spotify) */
            .spotify-action-btn { 
                background: #1DB954; border: none; color: white; width: 30px; height: 30px;
                border-radius: 50%; cursor: pointer; font-size: 14px;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.2s ease;
            }
            .spotify-action-btn:hover { background: #1ED760; transform: scale(1.1); }
            /* Estilos para botones de bucle y aleatorio activos */
            #loopBtn.active, #shuffleBtn.active { opacity: 1; color: #1ed760; }
        `;
        document.head.appendChild(style);
    }
}

// INICIALIZACIÓN GLOBAL
document.addEventListener('DOMContentLoaded', () => {
    // Asegurar que scripts dependientes como mostrarCanciones.js (para datos) estén cargados
    // y la clase SpotifyManager esté definida.
    if (typeof SpotifyManager === 'undefined') {
        console.error("La clase SpotifyManager no está definida. Asegúrate que spotify-api.js se cargue ANTES que music-manager.js");
        document.body.innerHTML = "<p style='color:red; font-size:18px; text-align:center; margin-top:50px;'>Error Crítico: SpotifyManager no definido. La aplicación no puede iniciar.</p>";
        return;
    }
    if (typeof musicDatabase === 'undefined' || typeof displayLocalTracks === 'undefined' || typeof searchLocalTracks === 'undefined') {
        console.error("Datos/funciones de música local no definidos. Asegúrate que mostrarCanciones.js se cargue ANTES que music-manager.js y provea musicDatabase, displayLocalTracks, searchLocalTracks.");
        document.body.innerHTML = "<p style='color:red; font-size:18px; text-align:center; margin-top:50px;'>Error Crítico: Datos locales no definidos. La aplicación no puede iniciar.</p>";
        return;
    }

    window.musicManager = new MusicManager();
    
    // Exponer searchByGenre globalmente SI ES NECESARIO por otras partes de tu sitio (ej. botones de género)
    window.searchByGenreGlobal = function(genre) {
        if (window.musicManager) {
            window.musicManager.searchByGenre(genre);
        } else {
            console.warn("searchByGenreGlobal: musicManager no está listo todavía.");
        }
    };
    console.log("Instancia de MusicManager creada y adjuntada a window.");
});

console.log("music-manager.js cargado.");