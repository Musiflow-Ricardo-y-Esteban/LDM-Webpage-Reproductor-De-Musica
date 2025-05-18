// explorar.js - Sistema de búsqueda y reproducción musical
class MusicExplorer {
    constructor() {
        this.currentTrack = null;
        this.audio = new Audio();
        this.isPlaying = false;
        this.currentPlaylist = [];
        this.currentTrackIndex = 0;
        this.volume = 0.5;
        
        this.init();
    }

    init() {
        // Initialize AOS animations
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });

        // Bind event listeners
        this.bindEventListeners();
        
        // Set initial volume
        this.audio.volume = this.volume;
        
        // Load featured tracks on page load
        this.loadFeaturedTracks();
    }

    bindEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Player controls
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const volumeSlider = document.getElementById('volumeSlider');

        playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        prevBtn.addEventListener('click', () => this.playPrevious());
        nextBtn.addEventListener('click', () => this.playNext());
        volumeSlider.addEventListener('click', (e) => this.setVolume(e));

        // Audio events
        this.audio.addEventListener('ended', () => this.playNext());
        this.audio.addEventListener('loadstart', () => {
            document.getElementById('currentPlayer').style.display = 'flex';
        });
    }

    async handleSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();
        
        try {
            // Since we can't use real APIs in this demo, we'll simulate search results
            const results = await this.simulateSearch(query);
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Error al buscar música. Inténtalo de nuevo.');
        }
    }

    

    async simulateSearch(query) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate mock results based on query
        const mockTracks = [
            {
                id: 1,
                title: `${query} - Mix 1`,
                artist: 'Artista Demo',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '3:45'
            },
            {
                id: 2,
                title: `${query} - Remix`,
                artist: 'DJ Demo',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '4:20'
            },
            {
                id: 3,
                title: `${query} - Acoustic`,
                artist: 'Indie Artist',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '3:12'
            },
            {
                id: 4,
                title: `${query} - Radio Edit`,
                artist: 'Popular Band',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '3:35'
            },
            {
                id: 5,
                title: `${query} - Extended Mix`,
                artist: 'Electronic Artist',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '6:15'
            }
        ];

        return mockTracks;
    }

    getRandomAudioUrl() {
        // For demo purposes, we'll use placeholder audio URLs
        // In a real implementation, you would get these from the music API
        const demoTracks = [
            'https://www.soundjay.com/misc/bell-ringing-05.mp3',
            'https://www.soundjay.com/misc/beep-28.mp3',
            'https://www.soundjay.com/misc/bell-ringing-05.mp3',
            'https://www.soundjay.com/misc/beep-28.mp3',
            'https://www.soundjay.com/misc/bell-ringing-05.mp3'
        ];
        
        return demoTracks[Math.floor(Math.random() * demoTracks.length)];
    }

    async searchByGenre(genre) {
        this.showLoading();
        
        // Simulate genre-specific search
        const genreResults = await this.simulateGenreSearch(genre);
        this.displayResults(genreResults);
    }

    async simulateGenreSearch(genre) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const genreArtists = {
            pop: ['Taylor Swift', 'Ed Sheeran', 'Ariana Grande', 'Dua Lipa'],
            rock: ['Queen', 'Led Zeppelin', 'AC/DC', 'The Beatles'],
            electronic: ['Daft Punk', 'Deadmau5', 'Skrillex', 'Calvin Harris'],
            reggaeton: ['Bad Bunny', 'Daddy Yankee', 'J Balvin', 'Ozuna'],
            jazz: ['Miles Davis', 'John Coltrane', 'Ella Fitzgerald', 'Louis Armstrong'],
            classical: ['Mozart', 'Beethoven', 'Bach', 'Chopin']
        };

        const artists = genreArtists[genre] || ['Artista Demo'];
        
        return artists.map((artist, index) => ({
            id: Date.now() + index,
            title: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Hit ${index + 1}`,
            artist: artist,
            image: '/api/placeholder/300/300',
            url: this.getRandomAudioUrl(),
            duration: `${Math.floor(Math.random() * 3) + 3}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`
        }));
    }

    async loadFeaturedTracks() {
        // Load some featured tracks on page load
        const featuredTracks = [
            {
                id: 'featured-1',
                title: 'Track Destacado 1',
                artist: 'Artista Popular',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '3:45'
            },
            {
                id: 'featured-2',
                title: 'Track Destacado 2',
                artist: 'Otro Artista',
                image: '/api/placeholder/300/300',
                url: this.getRandomAudioUrl(),
                duration: '4:12'
            }
        ];

        // Don't show results immediately, only when user searches
        // this.displayResults(featuredTracks);
    }

    displayResults(tracks) {
        const resultsSection = document.getElementById('resultsSection');
        const searchResults = document.getElementById('searchResults');
        
        resultsSection.style.display = 'block';
        searchResults.innerHTML = '';

        tracks.forEach(track => {
            const trackElement = this.createTrackElement(track);
            searchResults.appendChild(trackElement);
        });

        // Store current playlist
        this.currentPlaylist = tracks;
    }

    createTrackElement(track) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        trackDiv.innerHTML = `
            <img src="${track.image}" alt="${track.title}" class="track-image">
            <div class="track-info">
                <div class="track-name">${track.title}</div>
                <div class="track-artist">${track.artist}</div>
            </div>
            <div class="track-duration" style="color: var(--texto-secundario); margin-right: 15px;">
                ${track.duration}
            </div>
            <button class="play-btn-small" onclick="musicExplorer.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <i class="fas fa-play"></i>
            </button>
        `;

        return trackDiv;
    }

    playTrack(track) {
        this.currentTrack = track;
        this.audio.src = track.url;
        
        // Find track in playlist for navigation
        this.currentTrackIndex = this.currentPlaylist.findIndex(t => t.id === track.id);
        
        this.audio.play().catch(error => {
            console.error('Playback error:', error);
            this.showError('Error al reproducir la pista. Puede que el audio no esté disponible.');
        });
        
        this.updatePlayerUI();
        this.isPlaying = true;
        
        // Update play button
        const playPauseBtn = document.getElementById('playPauseBtn');
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    togglePlayPause() {
        if (!this.currentTrack) return;

        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
        } else {
            this.audio.play().catch(error => {
                console.error('Playback error:', error);
                this.showError('Error al reproducir la pista.');
            });
            this.isPlaying = true;
            document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-pause"></i>';
        }
    }

    playNext() {
        if (this.currentPlaylist.length === 0) return;
        
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentPlaylist.length;
        this.playTrack(this.currentPlaylist[this.currentTrackIndex]);
    }

    playPrevious() {
        if (this.currentPlaylist.length === 0) return;
        
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
        this.playTrack(this.currentPlaylist[this.currentTrackIndex]);
    }

    setVolume(event) {
        const slider = event.currentTarget;
        const rect = slider.getBoundingClientRect();
        const percentage = (event.clientX - rect.left) / rect.width;
        
        this.volume = Math.max(0, Math.min(1, percentage));
        this.audio.volume = this.volume;
        
        const volumeProgress = document.getElementById('volumeProgress');
        volumeProgress.style.width = `${this.volume * 100}%`;
    }

    updatePlayerUI() {
        document.getElementById('currentTrackImage').src = this.currentTrack.image;
        document.getElementById('currentTrackName').textContent = this.currentTrack.title;
        document.getElementById('currentTrackArtist').textContent = this.currentTrack.artist;
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
        // Create and show an error toast
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
        `;

        toast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span style="margin-left: 10px;">${message}</span>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    
}

// Global functions for HTML onclick events
window.searchByGenre = function(genre) {
    window.musicExplorer.searchByGenre(genre);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.musicExplorer = new MusicExplorer();
});