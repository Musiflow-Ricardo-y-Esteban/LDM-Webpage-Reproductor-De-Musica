// free-music-api.js - Integration with free music APIs

class FreeMusicAPI {
    constructor() {
        // Using Jamendo API (free music, no authentication required)
        this.jamendoApiUrl = 'https://api.jamendo.com/v3.0';
        this.jamendoClientId = 'your_jamendo_client_id'; // Not required for basic searches
        
        // Alternative: iTunes Search API (no auth needed)
        this.itunesApiUrl = 'https://itunes.apple.com/search';
        
        this.currentProvider = 'jamendo'; // or 'itunes'
        this.init();
    }

    async init() {
        console.log('Free Music API initialized');
    }

    async searchTracks(query, limit = 20) {
        if (this.currentProvider === 'jamendo') {
            return await this.searchJamendo(query, limit);
        } else {
            return await this.searchItunes(query, limit);
        }
    }

    async searchJamendo(query, limit = 20) {
        try {
            const url = new URL(`${this.jamendoApiUrl}/tracks/`);
            url.searchParams.append('client_id', this.jamendoClientId || 'demo_client');
            url.searchParams.append('search', query);
            url.searchParams.append('limit', limit);
            url.searchParams.append('format', 'json');
            url.searchParams.append('include', 'musicinfo');
            url.searchParams.append('audioformat', 'mp32');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Jamendo search failed');
            }

            const data = await response.json();
            return this.formatJamendoTracks(data.results);
        } catch (error) {
            console.error('Error searching Jamendo:', error);
            // Fallback to iTunes
            return await this.searchItunes(query, limit);
        }
    }

    async searchItunes(query, limit = 20) {
        try {
            const url = new URL(this.itunesApiUrl);
            url.searchParams.append('term', query);
            url.searchParams.append('media', 'music');
            url.searchParams.append('limit', limit);
            url.searchParams.append('entity', 'song');

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('iTunes search failed');
            }

            const data = await response.json();
            return this.formatItunesTracks(data.results);
        } catch (error) {
            console.error('Error searching iTunes:', error);
            throw error;
        }
    }

    async searchByGenre(genre, limit = 20) {
        if (this.currentProvider === 'jamendo') {
            try {
                const url = new URL(`${this.jamendoApiUrl}/tracks/`);
                url.searchParams.append('client_id', this.jamendoClientId || 'demo_client');
                url.searchParams.append('tags', genre);
                url.searchParams.append('limit', limit);
                url.searchParams.append('format', 'json');
                url.searchParams.append('include', 'musicinfo');
                url.searchParams.append('audioformat', 'mp32');

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Jamendo genre search failed');
                }

                const data = await response.json();
                return this.formatJamendoTracks(data.results);
            } catch (error) {
                console.error('Error searching by genre:', error);
                // Fallback to regular search
                return await this.searchTracks(genre, limit);
            }
        } else {
            // iTunes doesn't have direct genre search, so use regular search
            return await this.searchTracks(genre, limit);
        }
    }

    formatJamendoTracks(jamendoTracks) {
        return jamendoTracks.map(track => ({
            id: `jamendo_${track.id}`,
            title: track.name,
            artist: track.artist_name,
            album: track.album_name || 'Single',
            image: track.album_image || '/api/placeholder/300/300',
            previewUrl: track.audio,
            duration: this.formatDuration(track.duration * 1000), // Jamendo provides seconds
            externalUrl: track.shareurl,
            provider: 'Jamendo',
            license: 'Creative Commons'
        }));
    }

    formatItunesTracks(itunesTracks) {
        return itunesTracks.map(track => ({
            id: `itunes_${track.trackId}`,
            title: track.trackName,
            artist: track.artistName,
            album: track.collectionName || 'Single',
            image: track.artworkUrl100?.replace('100x100', '300x300') || '/api/placeholder/300/300',
            previewUrl: track.previewUrl,
            duration: this.formatDuration(track.trackTimeMillis),
            externalUrl: track.trackViewUrl,
            provider: 'iTunes',
            price: track.trackPrice + ' ' + track.currency
        }));
    }

    formatDuration(milliseconds) {
        if (!milliseconds) return '0:00';
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Updated MusicExplorer class with Free API integration
class MusicExplorerWithFreeAPI extends MusicExplorer {
    constructor() {
        super();
        this.freeAPI = new FreeMusicAPI();
        this.currentAudio = null;
        this.isInitialized = true; // Always initialized since no auth required
    }

    async init() {
        super.init();
        await this.freeAPI.init();
        console.log('Free Music API integration ready');
        
        // Update status
        this.updateStatus('success', 'Conectado a APIs de música gratuita ✓');
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();
        
        try {
            const results = await this.freeAPI.searchTracks(query);
            console.log('Search results:', results);
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Error al buscar música. Inténtalo de nuevo.');
            // Fallback to demo data
            const results = await this.simulateSearch(query);
            this.displayResults(results);
        }
    }

    async searchByGenre(genre) {
        this.showLoading();
        
        try {
            const results = await this.freeAPI.searchByGenre(genre);
            console.log(`${genre} results:`, results);
            this.displayResults(results);
        } catch (error) {
            console.error('Genre search error:', error);
            this.showError('Error al buscar por género.');
            // Fallback to demo data
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
                this.showError('Error al reproducir la pista.');
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
            
            // Add progress tracking
            this.currentAudio.addEventListener('timeupdate', () => {
                this.updateProgress();
            });
        } else {
            // No preview available
            this.showError('Vista previa no disponible.');
            if (track.externalUrl) {
                window.open(track.externalUrl, '_blank');
            }
        }
    }

    createTrackElement(track) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        
        const hasPreview = track.previewUrl ? '' : ' style="opacity: 0.7;"';
        const previewText = track.previewUrl ? 'Reproducir' : 'Ver más';
        
        // Create provider badge
        const providerBadge = track.provider ? `
            <span class="badge bg-secondary ms-2" style="font-size: 0.7rem;">
                ${track.provider}
            </span>
        ` : '';
        
        // Create license info for Jamendo tracks
        const licenseInfo = track.provider === 'Jamendo' ? `
            <div class="track-license" style="font-size: 0.7rem; color: var(--texto-secundario); margin-top: 2px;">
                <i class="fab fa-creative-commons"></i> Creative Commons
            </div>
        ` : '';
        
        trackDiv.innerHTML = `
            <img src="${track.image}" alt="${track.title}" class="track-image">
            <div class="track-info">
                <div class="track-name">${track.title}${providerBadge}</div>
                <div class="track-artist">${track.artist}</div>
                <div class="track-album" style="font-size: 0.8rem; color: var(--texto-secundario); margin-top: 2px;">
                    ${track.album}
                </div>
                ${licenseInfo}
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

    updateStatus(type, message) {
        const statusElement = document.getElementById('statusText');
        const statusAlert = document.querySelector('#spotifyStatus .alert');
        
        if (statusElement && statusAlert) {
            statusElement.textContent = message;
            statusAlert.className = `alert alert-${type} d-inline-block`;
            
            // Hide after delay
            setTimeout(() => {
                document.getElementById('spotifyStatus').style.display = 'none';
            }, type === 'success' ? 3000 : 5000);
        }
    }

    updatePlayerUI() {
        super.updatePlayerUI();
        
        // Show external link button if available
        const openExternalBtn = document.getElementById('openExternalBtn');
        if (openExternalBtn && this.currentTrack.externalUrl) {
            openExternalBtn.style.display = 'block';
            openExternalBtn.onclick = () => {
                window.open(this.currentTrack.externalUrl, '_blank');
            };
        }
    }

    updateProgress() {
        if (!this.currentAudio) return;
        
        const progress = (this.currentAudio.currentTime / this.currentAudio.duration) * 100;
        
        // Create progress bar if it doesn't exist
        let progressContainer = document.getElementById('progressContainer');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'progressContainer';
            progressContainer.className = 'progress-container';
            progressContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: rgba(255, 255, 255, 0.1);
            `;
            
            const progressBar = document.createElement('div');
            progressBar.id = 'progressBar';
            progressBar.style.cssText = `
                height: 100%;
                background: var(--acento-actual);
                width: 0%;
                transition: width 0.1s ease;
            `;
            
            progressContainer.appendChild(progressBar);
            document.getElementById('currentPlayer').appendChild(progressContainer);
        }
        
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    showLoading() {
        super.showLoading();
        
        // Add provider info to loading message
        const searchResults = document.getElementById('searchResults');
        const loadingSpinner = searchResults.querySelector('.loading-spinner');
        if (loadingSpinner) {
            const providerText = document.createElement('p');
            providerText.style.cssText = 'color: var(--texto-secundario); margin-top: 10px; font-size: 0.9rem;';
            providerText.innerHTML = 'Buscando en Jamendo e iTunes...';
            loadingSpinner.appendChild(providerText);
        }
    }
}

// Initialize the enhanced music explorer
document.addEventListener('DOMContentLoaded', () => {
    window.musicExplorer = new MusicExplorerWithFreeAPI();
});