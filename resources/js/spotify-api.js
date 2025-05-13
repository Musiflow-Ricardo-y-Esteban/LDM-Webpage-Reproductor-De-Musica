// spotify-api.js - Integration with Spotify Web API

class SpotifyAPI {
    constructor() {
        // Spotify Web API credentials (you'll need to register your app at developer.spotify.com)
        this.clientId = '9eb0fbc4e8ad415ea22dcfa6293dd28f'; 
        this.clientSecret = '8a3c19ac8356486586af8762cd043477'; 
        this.apiUrl = 'https://api.spotify.com/v1';
        this.tokenUrl = 'https://accounts.spotify.com/api/token';
        this.accessToken = null;
        this.tokenExpiry = null;
        
        this.init();
    }

    async init() {
        await this.getAccessToken();
    }

    async getAccessToken() {
        // Check if we have a valid token
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
                throw new Error('Failed to get access token');
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000);
            
            return this.accessToken;
        } catch (error) {
            console.error('Error getting Spotify access token:', error);
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
            url.searchParams.append('market', 'ES'); // Spanish market

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            return this.formatTracks(data.tracks.items);
        } catch (error) {
            console.error('Error searching tracks:', error);
            throw error;
        }
    }

    async searchByGenre(genre, limit = 20) {
        // Some popular genre queries for Spotify
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
                throw new Error('Recommendations failed');
            }

            const data = await response.json();
            return this.formatTracks(data.tracks);
        } catch (error) {
            console.error('Error getting recommendations:', error);
            throw error;
        }
    }

    formatTracks(spotifyTracks) {
        return spotifyTracks.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            image: track.album.images[0]?.url || '/api/placeholder/300/300',
            previewUrl: track.preview_url,
            duration: this.formatDuration(track.duration_ms),
            externalUrl: track.external_urls.spotify,
            popularity: track.popularity
        }));
    }

    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Updated MusicExplorer class with Spotify integration
class MusicExplorerWithSpotify extends MusicExplorer {
    constructor() {
        super();
        this.spotifyAPI = new SpotifyAPI();
        this.currentAudio = null;
        this.isInitialized = false;
    }

    async init() {
        super.init();
        try {
            await this.spotifyAPI.init();
            this.isInitialized = true;
            console.log('Spotify API initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Spotify API:', error);
            this.showError('Error al conectar con Spotify. Usando datos de demostración.');
        }
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();
        
        try {
            let results;
            if (this.isInitialized) {
                results = await this.spotifyAPI.searchTracks(query);
                console.log('Spotify search results:', results);
            } else {
                // Fallback to demo data if Spotify API fails
                results = await this.simulateSearch(query);
            }
            
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Error al buscar música.');
            // Try fallback
            const results = await this.simulateSearch(query);
            this.displayResults(results);
        }
    }

    async searchByGenre(genre) {
        this.showLoading();
        
        try {
            let results;
            if (this.isInitialized) {
                results = await this.spotifyAPI.searchByGenre(genre);
                console.log(`Spotify ${genre} results:`, results);
            } else {
                results = await this.simulateGenreSearch(genre);
            }
            
            this.displayResults(results);
        } catch (error) {
            console.error('Genre search error:', error);
            this.showError('Error al buscar por género.');
            // Try fallback
            const results = await this.simulateGenreSearch(genre);
            this.displayResults(results);
        }
    }

    playTrack(track) {
        // Stop current audio if playing
        if (this.currentAudio) {
            this.currentAudio.pause();
        }

        this.currentTrack = track;
        
        // Check if track has preview URL
        if (track.previewUrl) {
            this.currentAudio = new Audio(track.previewUrl);
            this.audio = this.currentAudio; // For compatibility with parent class
            
            // Find track in playlist for navigation
            this.currentTrackIndex = this.currentPlaylist.findIndex(t => t.id === track.id);
            
            this.currentAudio.play().catch(error => {
                console.error('Playback error:', error);
                this.showError('Error al reproducir la pista. Abriendo Spotify...');
                // Open Spotify link as fallback
                if (track.externalUrl) {
                    window.open(track.externalUrl, '_blank');
                }
            });
            
            this.updatePlayerUI();
            this.isPlaying = true;
            
            // Update play button
            const playPauseBtn = document.getElementById('playPauseBtn');
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            
            // Add event listener for track end
            this.currentAudio.addEventListener('ended', () => {
                this.playNext();
            });
        } else {
            // No preview available, open Spotify
            this.showError('Vista previa no disponible. Abriendo en Spotify...');
            if (track.externalUrl) {
                window.open(track.externalUrl, '_blank');
            }
        }
    }

    createTrackElement(track) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        
        const hasPreview = track.previewUrl ? '' : ' style="opacity: 0.7;"';
        const previewText = track.previewUrl ? 'Reproducir vista previa' : 'Abrir en Spotify';
        
        trackDiv.innerHTML = `
            <img src="${track.image}" alt="${track.title}" class="track-image">
            <div class="track-info">
                <div class="track-name">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
                <div class="track-album" style="font-size: 0.8rem; color: var(--texto-secundario); margin-top: 2px;">
                    ${track.album}
                </div>
            </div>
            <div class="track-popularity" style="color: var(--texto-secundario); margin-right: 15px;">
                <i class="fas fa-fire" style="color: ${track.popularity >= 70 ? '#ff6b6b' : track.popularity >= 40 ? '#ffa500' : '#ffffff'};" title="Popularidad: ${track.popularity}%"></i>
            </div>
            <div class="track-duration" style="color: var(--texto-secundario); margin-right: 15px;">
                ${track.duration}
            </div>
            <button class="play-btn-small" onclick="musicExplorer.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})" 
                    title="${previewText}"${hasPreview}>
                <i class="fas fa-${track.previewUrl ? 'play' : 'external-link-alt'}"></i>
            </button>
        `;

        return trackDiv;
    }

    togglePlayPause() {
        if (!this.currentTrack) return;

        if (this.isPlaying) {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
            this.isPlaying = false;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        } else {
            if (this.currentAudio) {
                this.currentAudio.play().catch(error => {
                    console.error('Playback error:', error);
                    this.showError('Error al reproducir la pista.');
                });
                this.isPlaying = true;
                document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
            }
        }
    }

    updatePlayerUI() {
        document.getElementById('currentTrackImage').src = this.currentTrack.image;
        document.getElementById('currentTrackName').textContent = this.currentTrack.title;
        document.getElementById('currentTrackArtist').textContent = this.currentTrack.artist;
        
        // Show Spotify link
        const playerElement = document.getElementById('currentPlayer');
        if (this.currentTrack.externalUrl) {
            playerElement.title = 'Click para abrir en Spotify';
            playerElement.style.cursor = 'pointer';
            playerElement.onclick = () => {
                window.open(this.currentTrack.externalUrl, '_blank');
            };
        }
    }

    showError(message) {
        super.showError(message);
        
        // Add info about Spotify setup if needed
        if (message.includes('Spotify') && !this.isInitialized) {
            setTimeout(() => {
                this.showError('Para usar Spotify, configura tu CLIENT_ID y CLIENT_SECRET en spotify-api.js');
            }, 1000);
        }
    }
}

// Initialize the enhanced music explorer
document.addEventListener('DOMContentLoaded', () => {
    window.musicExplorer = new MusicExplorerWithSpotify();
});