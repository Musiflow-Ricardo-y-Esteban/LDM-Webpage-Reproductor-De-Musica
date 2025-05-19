// spotify-api.js - Integración con la API de Spotify para GitHub Pages

class SpotifyManager {
    constructor() {
        this.clientId = '9eb0fbc4e8ad415ea22dcfa6293dd28f'; 
        this.clientSecret = '8a3c19ac8356486586af8762cd043477'; 
        this.redirectUri = 'https://ricmoncar.github.io/LDM-Webpage-Reproductor-De-Musica/callback.html';
        this.apiUrl = 'https://api.spotify.com/v1';
        this.tokenUrl = 'https://accounts.spotify.com/api/token';
        this.accessToken = null;
        this.tokenExpiry = null;
        this.isInitialized = false;
        this.statusElement = document.getElementById('spotifyStatus');
        this.statusTextElement = document.getElementById('statusText');
    }

    async init() {
        try {
            // Mostrar estado de conexión
            this.updateStatus('warning', 'Conectando a Spotify...');
            this.statusElement.style.display = 'inline-block';
            
            // Verificar si ya hay un token almacenado en localStorage
            const storedToken = localStorage.getItem('spotify_access_token');
            if (storedToken) {
                this.accessToken = storedToken;
                this.tokenExpiry = Date.now() + 3600000; // Aproximadamente 1 hora
                this.isInitialized = true;
                this.updateStatus('success', 'Conectado a Spotify ✓');
                
                // Ocultar después de un tiempo
                setTimeout(() => {
                    this.statusElement.style.display = 'none';
                }, 3000);
                
                return true;
            }
            
            // Obtener token de acceso
            await this.getAccessToken();
            
            this.isInitialized = true;
            this.updateStatus('success', 'Conectado a Spotify ✓');
            
            // Ocultar después de un tiempo
            setTimeout(() => {
                this.statusElement.style.display = 'none';
            }, 3000);
            
            return true;
        } catch (error) {
            console.error('Error al inicializar Spotify:', error);
            this.updateStatus('danger', 'Error al conectar con Spotify');
            return false;
        }
    }

    updateStatus(type, message) {
        if (this.statusElement && this.statusTextElement) {
            this.statusTextElement.textContent = message;
            this.statusElement.querySelector('.alert').className = `alert alert-${type} d-inline-block`;
            this.statusElement.style.display = 'inline-block';
        }
    }

    async getAccessToken() {
        // Verificar si ya tenemos un token válido
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(this.clientId + ':' + this.clientSecret)
                },
                body: 'grant_type=client_credentials'
            });

            if (!response.ok) {
                throw new Error('Error al obtener token de acceso');
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            // Guardar en localStorage para futuras sesiones
            localStorage.setItem('spotify_access_token', this.accessToken);
            
            return this.accessToken;
        } catch (error) {
            console.error('Error al obtener token de Spotify:', error);
            throw error;
        }
    }

    async searchTracks(query, limit = 20) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/search`);
            url.searchParams.append('q', query);
            url.searchParams.append('type', 'track');
            url.searchParams.append('limit', limit);
            url.searchParams.append('market', 'ES'); // Mercado español

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error en la búsqueda');
            }

            const data = await response.json();
            return this.formatTracks(data.tracks.items);
        } catch (error) {
            console.error('Error al buscar canciones:', error);
            throw error;
        }
    }

    async searchByGenre(genre, limit = 20) {
        // Géneros populares para Spotify
        const genreQueries = {
            pop: 'genre:pop',
            rock: 'genre:rock',
            electronic: 'genre:electronic genre:edm',
            reggaeton: 'genre:reggaeton',
            jazz: 'genre:jazz',
            classical: 'genre:classical'
        };

        const query = genreQueries[genre] || `genre:${genre}`;
        return await this.searchTracks(query, limit);
    }

    async getRecommendations(seedGenres, limit = 20) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/recommendations`);
            url.searchParams.append('seed_genres', seedGenres.join(','));
            url.searchParams.append('limit', limit);
            url.searchParams.append('market', 'ES');

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener recomendaciones');
            }

            const data = await response.json();
            return this.formatTracks(data.tracks);
        } catch (error) {
            console.error('Error al obtener recomendaciones:', error);
            throw error;
        }
    }

    async getNewReleases(limit = 20) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/browse/new-releases`);
            url.searchParams.append('limit', limit);
            url.searchParams.append('country', 'ES');

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener nuevos lanzamientos');
            }

            const data = await response.json();
            return this.formatTracks(data.albums.items.map(item => item));
        } catch (error) {
            console.error('Error al obtener nuevos lanzamientos:', error);
            throw error;
        }
    }

    async getFeaturedPlaylists(limit = 10) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/browse/featured-playlists`);
            url.searchParams.append('limit', limit);
            url.searchParams.append('country', 'ES');
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener playlists destacadas');
            }

            const data = await response.json();
            return data.playlists.items.map(playlist => ({
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                image: playlist.images[0]?.url || '/api/placeholder/300/300',
                tracksTotal: playlist.tracks.total,
                externalUrl: playlist.external_urls.spotify,
                owner: playlist.owner.display_name
            }));
        } catch (error) {
            console.error('Error al obtener playlists destacadas:', error);
            throw error;
        }
    }

    async getPlaylistTracks(playlistId, limit = 50) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/playlists/${playlistId}/tracks`);
            url.searchParams.append('limit', limit);
            url.searchParams.append('market', 'ES');

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener canciones de la playlist');
            }

            const data = await response.json();
            return this.formatTracks(data.items.map(item => item.track).filter(track => track != null));
        } catch (error) {
            console.error('Error al obtener canciones de playlist:', error);
            throw error;
        }
    }

    async getArtist(artistId) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/artists/${artistId}`);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener información del artista');
            }

            const artist = await response.json();
            return {
                id: artist.id,
                name: artist.name,
                image: artist.images[0]?.url || '/api/placeholder/300/300',
                genres: artist.genres,
                popularity: artist.popularity,
                followers: artist.followers.total,
                externalUrl: artist.external_urls.spotify
            };
        } catch (error) {
            console.error('Error al obtener artista:', error);
            throw error;
        }
    }

    async getArtistTopTracks(artistId) {
        try {
            await this.getAccessToken();
            
            const url = new URL(`${this.apiUrl}/artists/${artistId}/top-tracks`);
            url.searchParams.append('market', 'ES');
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener canciones populares del artista');
            }

            const data = await response.json();
            return this.formatTracks(data.tracks);
        } catch (error) {
            console.error('Error al obtener canciones populares:', error);
            throw error;
        }
    }

    formatTracks(spotifyTracks) {
        return spotifyTracks.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists ? track.artists.map(artist => artist.name).join(', ') : 'Artista desconocido',
            album: track.album ? track.album.name : 'Álbum desconocido',
            image: track.album && track.album.images && track.album.images.length > 0 
                ? track.album.images[0].url 
                : (track.images && track.images.length > 0 ? track.images[0].url : '/api/placeholder/300/300'),
            previewUrl: track.preview_url,
            duration: this.formatDuration(track.duration_ms),
            externalUrl: track.external_urls.spotify,
            popularity: track.popularity || 0,
            source: 'spotify',
            explicit: track.explicit || false,
            artistId: track.artists && track.artists.length > 0 ? track.artists[0].id : null
        }));
    }

    formatDuration(milliseconds) {
        if (!milliseconds) return '0:00';
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Método para ofrecer login con Spotify (implementación futura)
    initiateUserLogin() {
        const scopes = 'user-read-private user-read-email user-library-read user-top-read';
        const authUrl = new URL('https://accounts.spotify.com/authorize');
        
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('response_type', 'token');
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('show_dialog', 'true');
        
        // Abrir ventana de autorización
        window.open(authUrl.toString(), 'spotify-login', 'width=600,height=800');
        
        // Función para recibir el token
        window.spotifyTokenReceived = (token) => {
            this.accessToken = token;
            this.tokenExpiry = Date.now() + 3600000; // 1 hora
            this.isInitialized = true;
            this.updateStatus('success', 'Conectado como usuario de Spotify ✓');
        };
    }

    // Limpiar la sesión
    logout() {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('spotify_access_token');
        this.updateStatus('warning', 'Desconectado de Spotify');
    }
}