// spotify-api.js - Integración con la API de Spotify para GitHub Pages

/**
 * Clase SpotifyManager: Gestiona toda la integración con la API de Spotify
 * - Maneja la autenticación
 * - Realiza búsquedas
 * - Obtiene recomendaciones
 * - Formatea los datos para la interfaz
 */
class SpotifyManager {
    /**
     * Constructor: inicializa propiedades y claves de la API
     */
    constructor() {
        this.clientId = '9eb0fbc4e8ad415ea22dcfa6293dd28f'; 
        this.clientSecret = '8a3c19ac8356486586af8762cd043477'; 
        // IMPORTANTE: Para GitHub Pages, callback.html debe existir en esta ruta o ser ajustado.
        // Se usa para el flujo de autorización de usuario, no estrictamente para credenciales de cliente.
        this.redirectUri = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) + '/callback.html';
        this.apiUrl = 'https://api.spotify.com/v1';
        this.tokenUrl = 'https://accounts.spotify.com/api/token';
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isInitialized = false; // Registra si se intentó la configuración inicial del token
        this.isConnected = false; // Registra si actualmente está conectado con un token válido
        
        this.statusElement = document.getElementById('spotifyStatus');
        this.statusTextElement = document.getElementById('statusText');

        // Intenta cargar el token desde localStorage al instanciar
        const storedToken = localStorage.getItem('spotify_access_token');
        const storedExpiry = localStorage.getItem('spotify_token_expiry');

        if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
            this.accessToken = storedToken;
            this.tokenExpiry = parseInt(storedExpiry, 10);
            this.isConnected = true;
            console.log("SpotifyManager: Token cargado desde localStorage.");
        }
    }

    /**
     * Inicializa la conexión con Spotify
     * - Verifica token existente o solicita uno nuevo
     * - Actualiza la interfaz con el estado de conexión
     * @return {Promise<boolean>} Éxito de la inicialización
     */
    async init() {
        if (this.isInitialized && this.isConnected) {
            this.updateStatus('success', 'Conectado a Spotify ✓');
            setTimeout(() => {
                if (this.statusElement) this.statusElement.style.display = 'none';
            }, 3000);
            return true;
        }
        
        this.isInitialized = true; // Marcar que se ha intentado la inicialización

        try {
            this.updateStatus('warning', 'Conectando a Spotify...');
            if (this.statusElement) this.statusElement.style.display = 'inline-block';
            
            await this.getAccessToken(); // Intentará usar token almacenado o buscar uno nuevo
            
            this.isConnected = true;
            this.updateStatus('success', 'Conectado a Spotify ✓');
            
            setTimeout(() => {
                if (this.statusElement) this.statusElement.style.display = 'none';
            }, 3000);
            
            return true;
        } catch (error) {
            console.error('Error al inicializar Spotify:', error);
            this.updateStatus('danger', 'Error al conectar con Spotify');
            this.isConnected = false;
            // Mantener el elemento de estado visible si hay error
            return false;
        }
    }

    /**
     * Actualiza el indicador de estado de Spotify en la interfaz
     * @param {string} type - Tipo de alerta ('warning', 'success', 'danger')
     * @param {string} message - Mensaje a mostrar
     */
    updateStatus(type, message) {
        if (this.statusElement && this.statusTextElement) {
            this.statusTextElement.textContent = message;
            const alertBox = this.statusElement.querySelector('.alert');
            if (alertBox) {
                alertBox.className = `alert alert-${type} d-inline-block`;
            }
            this.statusElement.style.display = 'inline-block';
        } else {
            console.warn("Elementos de estado de Spotify no encontrados en el DOM para el mensaje:", message);
        }
    }

    /**
     * Obtiene o renueva el token de acceso para la API de Spotify
     * @return {Promise<string>} Token de acceso
     */
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            console.log("SpotifyManager: Usando token existente válido.");
            return this.accessToken;
        }
        console.log("SpotifyManager: Obteniendo nuevo token de acceso...");
        try {
            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
                },
                body: 'grant_type=client_credentials'
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Respuesta de error desde el endpoint de token de Spotify:', data);
                throw new Error(`Error al obtener token de acceso: ${response.status} ${response.statusText} - ${data.error_description || data.error || ''}`);
            }

            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            localStorage.setItem('spotify_access_token', this.accessToken);
            localStorage.setItem('spotify_token_expiry', this.tokenExpiry.toString());
            console.log("SpotifyManager: Nuevo token de acceso obtenido y almacenado.");
            this.isConnected = true;
            return this.accessToken;
        } catch (error) {
            console.error('Error al obtener token de Spotify:', error);
            this.accessToken = null;
            this.tokenExpiry = null;
            this.isConnected = false;
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_expiry');
            throw error; // Relanzar para ser capturado por la función llamante (ej. init o search)
        }
    }

    async _fetchSpotifyAPI(endpoint, options = {}) {
        await this.getAccessToken(); // Asegurar que el token es válido

        const url = `${this.apiUrl}${endpoint}`;
        const defaultHeaders = {
            'Authorization': `Bearer ${this.accessToken}`
        };

        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = await response.text(); // Si no es JSON, obtener como texto
            }
            console.error(`Error de API Spotify (${response.status}) en ${url}:`, errorData);
            const errorMessage = errorData?.error?.message || response.statusText || 'Falló la petición a la API de Spotify';
            throw new Error(errorMessage);
        }
        // Si la respuesta es 204 No Content, puede no tener cuerpo JSON
        if (response.status === 204) {
            return null; 
        }
        return response.json();
    }

    /**
     * Busca pistas en Spotify según una consulta
     * @param {string} query - Texto a buscar
     * @param {number} limit - Límite de resultados
     * @return {Promise<Array>} Lista de pistas formateadas
     */
    async searchTracks(query, limit = 20) {
        try {
            const params = new URLSearchParams({
                q: query,
                type: 'track',
                limit: limit,
                market: 'ES' // Mercado español
            });
            const data = await this._fetchSpotifyAPI(`/search?${params.toString()}`);
            return this.formatTracks(data.tracks.items);
        } catch (error) {
            console.error('Error al buscar canciones en Spotify:', error.message);
            throw error; // Relanzar para que MusicManager lo maneje
        }
    }

    /**
     * Busca pistas por género musical
     * @param {string} genre - Género musical a buscar
     * @param {number} limit - Límite de resultados
     * @return {Promise<Array>} Lista de pistas formateadas
     */
    async searchByGenre(genre, limit = 20) {
        // Géneros populares para Spotify
        const genreQueries = {
            pop: 'genre:pop',
            rock: 'genre:rock',
            electronic: 'genre:electronic genre:edm', // Ejemplo combinado
            reggaeton: 'genre:reggaeton',
            jazz: 'genre:jazz',
            classical: 'genre:classical'
            // Añadir más mapeos si es necesario
        };
        const query = genreQueries[genre.toLowerCase()] || `genre:${genre}`; // Usar mapeo o query directa
        return await this.searchTracks(query, limit);
    }

    /**
     * Obtiene recomendaciones basadas en géneros
     * @param {Array<string>} seedGenres - Géneros semilla para recomendaciones
     * @param {number} limit - Límite de resultados
     * @return {Promise<Array>} Lista de pistas recomendadas
     */
    async getRecommendations(seedGenres, limit = 20) {
        try {
            const params = new URLSearchParams({
                seed_genres: seedGenres.join(','),
                limit: limit,
                market: 'ES'
            });
            const data = await this._fetchSpotifyAPI(`/recommendations?${params.toString()}`);
            return this.formatTracks(data.tracks);
        } catch (error) {
            console.error('Error al obtener recomendaciones de Spotify:', error.message);
            throw error;
        }
    }
    
    // ... (getNewReleases, getFeaturedPlaylists, getPlaylistTracks, getArtist, getArtistTopTracks pueden usar _fetchSpotifyAPI de forma similar)
    // Se omiten por brevedad, pero la estructura sería la misma:
    // async getNewReleases(limit = 20) {
    //    try {
    //        const params = new URLSearchParams({ limit, country: 'ES' });
    //        const data = await this._fetchSpotifyAPI(`/browse/new-releases?${params.toString()}`);
    //        // Spotify devuelve álbumes aquí, necesitarías mapearlos a pistas si es necesario o ajustar formatTracks
    //        // Por ahora, asumiendo que se quiere una lista de pistas de esos álbumes (más complejo)
    //        // o una lista de álbumes formateados. Para simplificar, voy a asumir que formatTracks puede manejar
    //        // también objetos de álbum si es necesario, o que se espera que se extraigan las pistas.
    //        // El código original hacía: return this.formatTracks(data.albums.items.map(item => item));
    //        // lo que implica que formatTracks debe ser robusto.
    //        let tracks = [];
    //        if (data.albums && data.albums.items) {
    //             // Esto es conceptual, formatTracks espera pistas. Se necesitaría obtener pistas de cada álbum.
    //             // O cambiar el formato de retorno de esta función.
    //             // Por ahora, devolviendo un formato de álbum simplificado, no pistas.
    //             return data.albums.items.map(album => ({
    //                 id: album.id,
    //                 title: album.name,
    //                 artist: album.artists.map(a => a.name).join(', '),
    //                 image: album.images[0]?.url,
    //                 type: 'album', // Indicar que es un álbum
    //                 externalUrl: album.external_urls.spotify
    //             }));
    //        }
    //        return []; // Devolver vacío si no hay nada
    //    } catch (error) {
    //        console.error('Error al obtener nuevos lanzamientos de Spotify:', error.message);
    //        throw error;
    //    }
    //}


    /**
     * Formatea pistas de Spotify al formato estándar de la aplicación
     * @param {Array} spotifyTracks - Pistas en formato de la API de Spotify
     * @return {Array} Pistas en formato estandarizado para la aplicación
     */
    formatTracks(spotifyTracks) {
        if (!Array.isArray(spotifyTracks)) {
            console.warn("formatTracks recibió una entrada que no es array:", spotifyTracks);
            return [];
        }
        return spotifyTracks.map(track => {
            if (!track) return null; // Manejar pistas nulas en los resultados
            return {
                id: track.id,
                title: track.name,
                artist: track.artists ? track.artists.map(artist => artist.name).join(', ') : 'Artista desconocido',
                album: track.album ? track.album.name : 'Álbum desconocido',
                image: track.album?.images?.[0]?.url || '/api/placeholder/300/300', // Usar encadenamiento opcional
                previewUrl: track.preview_url, // Útil para vistas previas si no se usa el embed completo
                duration: this.formatDuration(track.duration_ms),
                externalUrl: track.external_urls?.spotify,
                popularity: track.popularity || 0,
                source: 'spotify', // Crucial: indica que esta pista es de Spotify
                explicit: track.explicit || false,
                artistId: track.artists?.[0]?.id || null // ID del primer artista
            };
        }).filter(track => track !== null); // Eliminar cualquier pista nula
    }

    /**
     * Formatea duración en milisegundos a formato "minutos:segundos"
     * @param {number} milliseconds - Duración en milisegundos
     * @return {string} Duración formateada (e.g. "3:45")
     */
    formatDuration(milliseconds) {
        if (typeof milliseconds !== 'number' || isNaN(milliseconds)) return '0:00';
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Inicia el proceso de login de usuario con Spotify (implementación futura)
     * Abre ventana de autorización para permisos extendidos
     */
    initiateUserLogin() {
        const scopes = 'user-read-private user-read-email user-library-read user-top-read';
        const authUrl = new URL('https://accounts.spotify.com/authorize');
        
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('response_type', 'token'); // Flujo de concesión implícita (Implicit Grant)
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('show_dialog', 'true'); // Forzar diálogo de login
        
        console.log("Redirigiendo a Spotify para login de usuario:", authUrl.toString());
        // Abrir ventana de autorización
        // Para una SPA real, podrías redirigir la ventana principal: window.location.href = authUrl.toString();
        // Para un popup:
        const loginWindow = window.open(authUrl.toString(), 'spotify-login', 'width=600,height=800,menubar=no,location=no,resizable=yes,scrollbars=yes,status=no');

        // Manejar callback (típicamente en callback.html o escuchando mensajes del popup)
        // Este es un ejemplo simplificado; una solución robusta es más compleja.
        window.spotifyTokenReceived = (token) => {
            console.log("Token de usuario recibido vía window.spotifyTokenReceived:", token);
            this.accessToken = token;
            this.tokenExpiry = Date.now() + 3600000; // Asumir 1 hora para token de usuario
            localStorage.setItem('spotify_access_token', this.accessToken); // Guardar token de usuario
            localStorage.setItem('spotify_token_expiry', this.tokenExpiry.toString());
            this.isInitialized = true; // Ya que tenemos un token
            this.isConnected = true;
            this.updateStatus('success', 'Conectado como usuario de Spotify ✓');
            if (loginWindow) loginWindow.close(); // Cerrar popup si está abierto
        };
    }

    /**
     * Cierra la sesión y elimina el token de acceso
     */
    logout() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isConnected = false;
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_token_expiry');
        this.updateStatus('warning', 'Desconectado de Spotify');
        console.log("SpotifyManager: Usuario desconectado.");
    }
}

console.log("spotify-api.js cargado.");