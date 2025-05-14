// music-api.js - Sistema avanzado de integración musical
// ============================================================
// BLOQUE: CLASE ModernMusicAPI
// ============================================================
class ModernMusicAPI {
    constructor() {
        // Configuración de APIs gratuitas
        // Usaremos corsproxy.io como proxy CORS. Si este falla, puedes probar otros.

        const CORS_PROXY = 'https://corsproxy.io/?'; // Esperamos que devuelva JSON directamente

        this.endpoints = {
            jamendo: {
                base: 'https://api.jamendo.com/v3.0',
                clientId: 'd1ae0267',
                corsProxy: CORS_PROXY
            },
            soundcloud: {
                base: 'https://api.soundcloud.com',
                clientId: '2t9loNQH90kzJcsFCODdigxfp325aq4z', 
                corsProxy: CORS_PROXY
            },
            deezer: {
                base: 'https://api.deezer.com',
                corsProxy: CORS_PROXY
            },
            lastfm: {
                base: 'https://ws.audioscrobbler.com/2.0',
                apiKey: '8cd61175af22ab0d234d717d314d099c'
            },
            musicbrainz: {
                base: 'https://musicbrainz.org/ws/2',
                userAgent: 'MusiFlow/1.0'
            }
        };

        this.cache = new Map();
        this.isInitialized = false;
        this.isInitializing = false; // Para evitar llamadas concurrentes a init
        this.availableAPIs = [];
    }

    // ------------------------------------------------------------
    // BLOQUE: Inicialización y Verificación de APIs
    // ------------------------------------------------------------
    async init() {
        if (this.isInitialized || this.isInitializing) {
            console.log('Modern Music API ya está inicializada o en proceso.');
            return;
        }
        this.isInitializing = true;
        console.log('Inicializando Modern Music API...');

        // Limpiar APIs disponibles antes de cada verificación
        this.availableAPIs = [];

        await this.checkAPIAvailability();
        this.setupCache();

        this.isInitialized = true;
        this.isInitializing = false;
        console.log('APIs disponibles:', this.availableAPIs);
        this.notifyMusicExplorer();
    }

    async checkAPIAvailability() {
        console.log('Verificando disponibilidad de APIs...');
        const tests = [
            { name: 'soundcloud', test: () => this.testSoundCloud() },
            { name: 'jamendo', test: () => this.testJamendo() },
            { name: 'deezer', test: () => this.testDeezer() },
            { name: 'lastfm', test: () => this.testLastFM() },
            { name: 'musicbrainz', test: () => this.testMusicBrainz() }
        ];

        for (const { name, test } of tests) {
            try {
                await test();
                this.availableAPIs.push(name);
                console.log(`✓ ${name} API disponible`);
            } catch (error) {
                console.warn(`✗ ${name} API no disponible:`, error.message);
            }
        }
        // Eliminar duplicados por si acaso (aunque limpiar `availableAPIs` al inicio debería prevenirlo)
        this.availableAPIs = [...new Set(this.availableAPIs)];
    }

    // ------------------------------------------------------------
    // BLOQUE: Funciones de Testeo de APIs (con proxy)
    // ------------------------------------------------------------
    async testSoundCloud() {
        if (!this.endpoints.soundcloud.corsProxy) throw new Error('Proxy CORS no configurado para SoundCloud');
        const apiUrl = `${this.endpoints.soundcloud.base}/tracks?client_id=${this.endpoints.soundcloud.clientId}&limit=1`;
        const proxiedUrl = `${this.endpoints.soundcloud.corsProxy}${encodeURIComponent(apiUrl)}`;
        const response = await fetch(proxiedUrl);
        if (!response.ok) throw new Error(`SoundCloud API failed via proxy. Status: ${response.status}`);
        return response.json(); // Asumimos que el proxy devuelve JSON directamente
    }

    async testJamendo() {
        if (!this.endpoints.jamendo.corsProxy) throw new Error('Proxy CORS no configurado para Jamendo');
        const apiUrl = `${this.endpoints.jamendo.base}/tracks/?client_id=${this.endpoints.jamendo.clientId}&format=json&limit=1`;
        const proxiedUrl = `${this.endpoints.jamendo.corsProxy}${encodeURIComponent(apiUrl)}`;
        const response = await fetch(proxiedUrl);
        if (!response.ok) throw new Error(`Jamendo API failed via proxy. Status: ${response.status}`);
        return response.json(); // Asumimos que el proxy devuelve JSON directamente
    }

    async testDeezer() {
        if (!this.endpoints.deezer.corsProxy) throw new Error('Proxy CORS no configurado para Deezer');
        const apiUrl = `${this.endpoints.deezer.base}/search?q=test&limit=1`;
        const proxiedUrl = `${this.endpoints.deezer.corsProxy}${encodeURIComponent(apiUrl)}`;
        const response = await fetch(proxiedUrl);
        if (!response.ok) throw new Error(`Deezer API failed via proxy. Status: ${response.status}`);
        return response.json(); // Asumimos que el proxy devuelve JSON directamente
    }

    async testLastFM() {
        if (this.endpoints.lastfm.apiKey === 'TU_API_KEY_DE_LASTFM_AQUI') {
            throw new Error('Last.fm API key no configurada. Reemplaza el placeholder.');
        }
        const url = `${this.endpoints.lastfm.base}?method=chart.gettoptracks&api_key=${this.endpoints.lastfm.apiKey}&format=json&limit=1`;
        // Last.fm a veces funciona sin proxy si la API key es correcta.
        // Si da problemas de CORS, se podría añadir un proxy aquí también.
        const response = await fetch(url);
        if (!response.ok) throw new Error('Last.fm API failed');
        const data = await response.json();
        if (data.error) throw new Error(`Last.fm API error: ${data.message}`);
        return data;
    }

    async testMusicBrainz() {
        const url = `${this.endpoints.musicbrainz.base}/recording?query=test&limit=1&fmt=json`;
        const response = await fetch(url, {
            headers: { 'User-Agent': this.endpoints.musicbrainz.userAgent }
        });
        if (!response.ok) throw new Error('MusicBrainz API failed');
        return response.json();
    }

    // ------------------------------------------------------------
    // BLOQUE: Caché
    // ------------------------------------------------------------
    setupCache() {
        this.cacheTimeout = 60 * 60 * 1000; // 1 hora en milisegundos
        setInterval(() => this.cleanExpiredCache(), 30 * 60 * 1000);
    }

    cleanExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    getCachedResult(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        const age = Date.now() - cached.timestamp;
        if (age > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        return cached.data;
    }

    // ------------------------------------------------------------
    // BLOQUE: Notificaciones
    // ------------------------------------------------------------
    notifyMusicExplorer() {
        if (window.musicExplorer && typeof window.musicExplorer.onAPIInitialized === 'function') {
            window.musicExplorer.onAPIInitialized(this.availableAPIs);
        }
        window.dispatchEvent(new CustomEvent('musicAPIInitialized', {
            detail: { apis: this.availableAPIs }
        }));
    }

    // ------------------------------------------------------------
    // BLOQUE: Búsqueda Principal y por API
    // ------------------------------------------------------------
    async search(query, options = {}) {
        const { limit = 20, offset = 0, type = 'track' } = options;
        const cacheKey = `search:${query}:${limit}:${offset}:${type}`;
        const cached = this.getCachedResult(cacheKey);
        if (cached) return cached;

        const results = await this.performSearch(query, { limit, offset, type });
        this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
    }

    async performSearch(query, options) {
        const allResults = [];
        const searchPromises = [];

        if (this.availableAPIs.includes('soundcloud')) {
            searchPromises.push(this.searchSoundCloud(query, options).catch(e => { console.warn("SoundCloud search failed:", e); return []; }));
        }
        if (this.availableAPIs.includes('jamendo')) {
            searchPromises.push(this.searchJamendo(query, options).catch(e => { console.warn("Jamendo search failed:", e); return []; }));
        }
        if (this.availableAPIs.includes('deezer')) {
            searchPromises.push(this.searchDeezer(query, options).catch(e => { console.warn("Deezer search failed:", e); return []; }));
        }
        if (this.availableAPIs.includes('lastfm') && this.endpoints.lastfm.apiKey !== 'TU_API_KEY_DE_LASTFM_AQUI') {
            searchPromises.push(this.searchLastFM(query, options).catch(e => { console.warn("LastFM search failed:", e); return []; }));
        }


        const resultsSettled = await Promise.allSettled(searchPromises);
        resultsSettled.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allResults.push(...result.value);
            }
        });

        if (allResults.length === 0 && searchPromises.length > 0) { // Solo demo si se intentó buscar y no hubo nada
             console.log("No results from APIs, generating demo data for query:", query);
            return this.generateDemoResults(query, options);
        } else if (allResults.length === 0 && searchPromises.length === 0) { // Si no hay APIs disponibles para búsqueda
            console.log("No APIs available for search, generating demo data for query:", query);
            return this.generateDemoResults(query, options);
        }


        return this.diversifyResults(allResults, options.limit);
    }

    async searchSoundCloud(query, options) {
        const { limit = 10 } = options;
        if (!this.endpoints.soundcloud.corsProxy) return [];
        const apiUrl = `${this.endpoints.soundcloud.base}/tracks?client_id=${this.endpoints.soundcloud.clientId}&q=${encodeURIComponent(query)}&limit=${limit}`;
        const proxiedUrl = `${this.endpoints.soundcloud.corsProxy}${encodeURIComponent(apiUrl)}`;

        try {
            const response = await fetch(proxiedUrl);
            if (!response.ok) return [];
            const data = await response.json(); // Asumimos JSON directo del proxy
            return this.formatSoundCloudResults(data || []); // SoundCloud puede devolver un array directamente
        } catch (error) {
            console.error('Error en búsqueda SoundCloud:', error);
            return [];
        }
    }

    async searchJamendo(query, options) {
        const { limit = 10 } = options;
        if (!this.endpoints.jamendo.corsProxy) return [];
        const apiUrl = `${this.endpoints.jamendo.base}/tracks/?client_id=${this.endpoints.jamendo.clientId}&search=${encodeURIComponent(query)}&limit=${limit}&format=json&include=musicinfo&audioformat=mp32`;
        const proxiedUrl = `${this.endpoints.jamendo.corsProxy}${encodeURIComponent(apiUrl)}`;

        try {
            const response = await fetch(proxiedUrl);
            if (!response.ok) return [];
            const data = await response.json(); // Asumimos JSON directo
            return this.formatJamendoResults(data.results || []);
        } catch (error) {
            console.error('Error en búsqueda Jamendo:', error);
            return [];
        }
    }

    async searchDeezer(query, options) {
        const { limit = 10 } = options;
        if (!this.endpoints.deezer.corsProxy) return [];
        const apiUrl = `${this.endpoints.deezer.base}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
        const proxiedUrl = `${this.endpoints.deezer.corsProxy}${encodeURIComponent(apiUrl)}`;

        try {
            const response = await fetch(proxiedUrl);
            if (!response.ok) return [];
            const data = await response.json(); // Asumimos JSON directo
            return this.formatDeezerResults(data.data || []);
        } catch (error) {
            console.error('Error en búsqueda Deezer:', error);
            return [];
        }
    }

    async searchLastFM(query, options) {
        const { limit = 10 } = options;
        if (this.endpoints.lastfm.apiKey === 'TU_API_KEY_DE_LASTFM_AQUI') return [];
        const url = `${this.endpoints.lastfm.base}?method=track.search&track=${encodeURIComponent(query)}&api_key=${this.endpoints.lastfm.apiKey}&format=json&limit=${limit}`;

        try {
            const response = await fetch(url); // Intentar directo, si falla por CORS, habría que proxificar también
            if (!response.ok) return [];
            const data = await response.json();
            if (data.error) { console.warn("LastFM API error:", data.message); return [];}
            return this.formatLastFMResults(data.results?.trackmatches?.track || []);
        } catch (error) {
            console.error('Error en búsqueda Last.fm:', error);
            return [];
        }
    }

    // ------------------------------------------------------------
    // BLOQUE: Búsqueda por Género
    // ------------------------------------------------------------
    async searchByGenre(genre, options = {}) {
        const { limit = 20 } = options;
        const cacheKey = `genre:${genre}:${limit}`;
        const cached = this.getCachedResult(cacheKey);
        if (cached) return cached;

        const results = await this.performGenreSearch(genre, options);
        this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
    }

    async performGenreSearch(genre, options) {
        const allResults = [];
        const genrePromises = [];

        if (this.availableAPIs.includes('jamendo')) {
            const jamendoTags = this.getJamendoGenreTags(genre);
            genrePromises.push(this.searchJamendoByGenre(jamendoTags, options).catch(e => { console.warn("Jamendo genre search failed:", e); return []; }));
        }
        if (this.availableAPIs.includes('deezer')) {
            // Deezer no tiene una búsqueda directa por género fácil, pero podemos buscar "genre music"
             const deezerQuery = `${this.getDeezerGenreQuery(genre)} music`;
            genrePromises.push(this.searchDeezer(deezerQuery, options).catch(e => { console.warn("Deezer genre search failed:", e); return []; }));
        }
        // Last.fm usa `tag.gettoptracks` para géneros.
        if (this.availableAPIs.includes('lastfm') && this.endpoints.lastfm.apiKey !== 'TU_API_KEY_DE_LASTFM_AQUI') {
             genrePromises.push(this.searchLastFMByTag(this.getLastFMGenreQuery(genre), options).catch(e => { console.warn("LastFM genre search failed:", e); return []; }));
        }

        const resultsSettled = await Promise.allSettled(genrePromises);
        resultsSettled.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allResults.push(...result.value);
            }
        });
        
        if (allResults.length === 0 && genrePromises.length > 0) {
            console.log("No results for genre from APIs, generating demo data for genre:", genre);
            return this.generateGenreDemoResults(genre, options);
        } else if (allResults.length === 0 && genrePromises.length === 0) {
             console.log("No APIs for genre search, generating demo data for genre:", genre);
            return this.generateGenreDemoResults(genre, options);
        }

        return this.diversifyResults(allResults, options.limit);
    }

    async searchJamendoByGenre(tags, options) {
        const { limit = 10 } = options;
        if (!this.endpoints.jamendo.corsProxy) return [];
        const apiUrl = `${this.endpoints.jamendo.base}/tracks/?client_id=${this.endpoints.jamendo.clientId}&tags=${encodeURIComponent(tags)}&limit=${limit}&format=json&include=musicinfo&audioformat=mp32`;
        const proxiedUrl = `${this.endpoints.jamendo.corsProxy}${encodeURIComponent(apiUrl)}`;
        
        const response = await fetch(proxiedUrl);
        if (!response.ok) return [];
        const data = await response.json();
        return this.formatJamendoResults(data.results || []);
    }

    async searchLastFMByTag(tag, options) {
        const { limit = 10 } = options;
        if (this.endpoints.lastfm.apiKey === 'TU_API_KEY_DE_LASTFM_AQUI') return [];
        const url = `${this.endpoints.lastfm.base}?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&api_key=${this.endpoints.lastfm.apiKey}&format=json&limit=${limit}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) return [];
            const data = await response.json();
            if (data.error) { console.warn("LastFM API error (tag search):", data.message); return [];}
            return this.formatLastFMResults(data.tracks?.track || []);
        } catch (error) {
            console.error('Error en búsqueda por tag de Last.fm:', error);
            return [];
        }
    }


    // ------------------------------------------------------------
    // BLOQUE: Obtener Canciones Populares
    // ------------------------------------------------------------
    async getPopularTracks(options = {}) {
        const { limit = 20, region = 'world' } = options; // region no se usa mucho aún
        const cacheKey = `popular:${region}:${limit}`;
        const cached = this.getCachedResult(cacheKey);
        if (cached) return cached;

        const results = await this.fetchPopularTracks(region, options);
        this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
    }

    async fetchPopularTracks(region, options) {
        const allResults = [];
        const popularPromises = [];

        if (this.availableAPIs.includes('deezer')) {
            popularPromises.push(this.getDeezerChart(options).catch(e => { console.warn("Deezer chart failed:", e); return []; }));
        }
        if (this.availableAPIs.includes('lastfm') && this.endpoints.lastfm.apiKey !== 'TU_API_KEY_DE_LASTFM_AQUI') {
            popularPromises.push(this.getLastFMChart(options).catch(e => { console.warn("LastFM chart failed:", e); return []; }));
        }
         // Jamendo tiene un orden "popularity_month" o "popularity_week"
        if (this.availableAPIs.includes('jamendo')) {
            popularPromises.push(this.getJamendoPopular(options).catch(e => { console.warn("Jamendo popular failed:", e); return []; }));
        }


        const resultsSettled = await Promise.allSettled(popularPromises);
        resultsSettled.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allResults.push(...result.value);
            }
        });
        
        if (allResults.length === 0 && popularPromises.length > 0) {
             console.log("No popular tracks from APIs, generating demo data.");
            return this.generatePopularDemoResults(options);
        } else if (allResults.length === 0 && popularPromises.length === 0) {
            console.log("No APIs for popular tracks, generating demo data.");
            return this.generatePopularDemoResults(options);
        }


        return this.diversifyResults(allResults, options.limit);
    }

    async getDeezerChart(options) {
        const { limit = 10 } = options;
        if (!this.endpoints.deezer.corsProxy) return [];
        const apiUrl = `${this.endpoints.deezer.base}/chart/0/tracks?limit=${limit}`; // Chart global
        const proxiedUrl = `${this.endpoints.deezer.corsProxy}${encodeURIComponent(apiUrl)}`;
        
        const response = await fetch(proxiedUrl);
        if (!response.ok) return [];
        const data = await response.json();
        return this.formatDeezerResults(data.data || []);
    }

    async getLastFMChart(options) {
        const { limit = 10 } = options;
        if (this.endpoints.lastfm.apiKey === 'TU_API_KEY_DE_LASTFM_AQUI') return [];
        const url = `${this.endpoints.lastfm.base}?method=chart.gettoptracks&api_key=${this.endpoints.lastfm.apiKey}&format=json&limit=${limit}`;
        
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        if (data.error) { console.warn("LastFM API error (chart):", data.message); return [];}
        return this.formatLastFMResults(data.tracks?.track || []);
    }

    async getJamendoPopular(options) {
        const { limit = 10 } = options;
        if (!this.endpoints.jamendo.corsProxy) return [];
        // Ordenar por popularidad mensual
        const apiUrl = `${this.endpoints.jamendo.base}/tracks/?client_id=${this.endpoints.jamendo.clientId}&limit=${limit}&format=json&order=popularity_month&include=musicinfo&audioformat=mp32`;
        const proxiedUrl = `${this.endpoints.jamendo.corsProxy}${encodeURIComponent(apiUrl)}`;
        
        const response = await fetch(proxiedUrl);
        if (!response.ok) return [];
        const data = await response.json();
        return this.formatJamendoResults(data.results || []);
    }

    // ------------------------------------------------------------
    // BLOQUE: Formateo de Resultados
    // ------------------------------------------------------------
    formatSoundCloudResults(tracks) {
        if (!Array.isArray(tracks)) return [];
        return tracks.map(track => ({
            id: `soundcloud_${track.id}`,
            title: track.title || 'Título Desconocido',
            artist: track.user?.username || 'Artista Desconocido',
            album: track.genre || 'SoundCloud', // SoundCloud no tiene álbumes propiamente
            duration: track.duration ? this.formatDuration(track.duration) : '0:00',
            image: track.artwork_url ? track.artwork_url.replace('large', 't300x300') : '/api/placeholder/300/300',
            // Para el stream URL, algunos proxies podrían necesitar decodificar la URL original antes de usarla
            previewUrl: track.streamable && track.stream_url ? `${track.stream_url}?client_id=${this.endpoints.soundcloud.clientId}` : null,
            externalUrl: track.permalink_url,
            provider: 'SoundCloud',
            type: 'soundcloud',
            playable: track.streamable && !!track.stream_url
        }));
    }

    formatJamendoResults(tracks) {
        if (!Array.isArray(tracks)) return [];
        return tracks.map(track => ({
            id: `jamendo_${track.id}`,
            title: track.name || 'Título Desconocido',
            artist: track.artist_name || 'Artista Desconocido',
            album: track.album_name || 'Single',
            duration: track.duration ? this.formatDuration(track.duration * 1000) : '0:00', // Jamendo da duración en segundos
            image: track.album_image || track.image || '/api/placeholder/300/300',
            previewUrl: track.audio, // URL directa al MP3
            externalUrl: track.shareurl,
            provider: 'Jamendo',
            license: 'Creative Commons', // Jamendo suele ser CC
            type: 'jamendo',
            playable: !!track.audio
        }));
    }

    formatDeezerResults(tracks) {
        if (!Array.isArray(tracks)) return [];
        return tracks.map(track => ({
            id: `deezer_${track.id}`,
            title: track.title || 'Título Desconocido',
            artist: track.artist?.name || 'Artista Desconocido',
            album: track.album?.title || 'Álbum Desconocido',
            duration: track.duration ? this.formatDuration(track.duration * 1000) : '0:00', // Deezer da duración en segundos
            image: track.album?.cover_medium || '/api/placeholder/300/300',
            previewUrl: track.preview, // URL de preview MP3
            externalUrl: track.link,
            provider: 'Deezer',
            type: 'deezer',
            playable: !!track.preview
        }));
    }

    formatLastFMResults(tracks) {
        if (!Array.isArray(tracks)) return [];
        return tracks.map(track => ({
            id: `lastfm_${track.mbid || (track.name + track.artist?.name + Math.random()).replace(/\s/g, '')}`, // mbid es mejor, si no, crear uno pseudo-único
            title: track.name || 'Título Desconocido',
            artist: track.artist?.name || (typeof track.artist === 'string' ? track.artist : 'Artista Desconocido'), // API a veces devuelve string, a veces objeto
            album: 'Álbum Desconocido (Last.fm)', // Last.fm no siempre da álbum en búsqueda de tracks
            duration: track.duration ? this.formatDuration(track.duration * 1000) : '3:30', // Last.fm a veces da duración, a veces no
            image: track.image?.find(img => img.size === 'extralarge')?.['#text'] || track.image?.find(img => img.size === 'large')?.['#text'] || '/api/placeholder/300/300',
            previewUrl: null, // Last.fm no proporciona previews directamente
            externalUrl: track.url,
            provider: 'Last.fm',
            type: 'lastfm',
            playable: false // Last.fm es principalmente para metadatos
        }));
    }

    // ------------------------------------------------------------
    // BLOQUE: Utilidades (Duración, Diversificar, Mapeo de Géneros)
    // ------------------------------------------------------------
    formatDuration(milliseconds) {
        if (!milliseconds || isNaN(milliseconds)) return '0:00';
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    diversifyResults(results, limit) {
        const shuffled = results.sort(() => Math.random() - 0.5);
        const unique = [];
        const seen = new Set();
        for (const track of shuffled) {
            const key = `${(track.title || '').toLowerCase()}:${(track.artist || '').toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(track);
            }
        }
        return unique.slice(0, limit);
    }

    getJamendoGenreTags(genre) { /* ... (sin cambios, parece ok) ... */ return genre; }
    getDeezerGenreQuery(genre) { /* ... (sin cambios, parece ok) ... */ return genre; }
    getLastFMGenreQuery(genre) { /* ... (sin cambios, parece ok) ... */ return genre; }


    // ------------------------------------------------------------
    // BLOQUE: Generación de Datos Demo (si todo falla)
    // ------------------------------------------------------------
    generateDemoResults(query, options) {
        const { limit = 10 } = options; // Menos demos por defecto
        console.warn(`Generando datos DEMO para la búsqueda: ${query}`);
        return Array.from({ length: limit }, (_, i) => ({
            id: `demo_search_${Date.now()}_${i}`,
            title: `${query} - Canción Demo ${i + 1}`,
            artist: 'Artista Demo',
            album: 'Álbum Demo',
            duration: '3:30',
            image: `https://picsum.photos/seed/${query}${i}/300/300`, // Placeholder visualmente diferente
            previewUrl: this.getDemoAudioUrl(),
            externalUrl: '#',
            provider: 'Demo',
            type: 'demo',
            playable: true
        }));
    }
    generateGenreDemoResults(genre, options) {
         const { limit = 10 } = options;
         console.warn(`Generando datos DEMO para el género: ${genre}`);
         return Array.from({ length: limit }, (_, i) => ({
            id: `demo_genre_${genre}_${Date.now()}_${i}`,
            title: `${genre.charAt(0).toUpperCase() + genre.slice(1)} - Demo ${i + 1}`,
            artist: `${genre} Demo Band`,
            album: `Best of ${genre} (Demo)`,
            duration: '3:15',
            image: `https://picsum.photos/seed/${genre}${i}/300/300`,
            previewUrl: this.getDemoAudioUrl(),
            externalUrl: '#',
            provider: 'Demo',
            type: 'demo',
            playable: true
        }));
    }
    generatePopularDemoResults(options) {
        const { limit = 10 } = options;
        console.warn(`Generando datos DEMO populares`);
        const popularTracks = [
            { title: 'Hit Demo Global 1', artist: 'The Demo Weeknd' },
            { title: 'Canción Demo Viral', artist: 'Demo Billie' },
            { title: 'Verano Demo Mix', artist: 'Demo Harry' },
        ];
        return Array.from({ length: limit }, (_, i) => ({
            id: `demo_popular_${Date.now()}_${i}`,
            title: popularTracks[i % popularTracks.length].title + (Math.floor(i / popularTracks.length) > 0 ? ` Pt.${Math.floor(i / popularTracks.length)+1}`:''),
            artist: popularTracks[i % popularTracks.length].artist,
            album: 'Hits Demo Mundiales',
            duration: '2:50',
            image: `https://picsum.photos/seed/popular${i}/300/300`,
            previewUrl: this.getDemoAudioUrl(),
            externalUrl: '#',
            provider: 'Demo',
            type: 'demo',
            playable: true
        }));
    }
    getDemoAudioUrl() {
        // Un pequeño WAV en base64 para que algo suene
        return 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    }

    // ------------------------------------------------------------
    // BLOQUE: Recomendaciones (simple, basado en artista/género)
    // ------------------------------------------------------------
    async getRecommendations(seedTrack, options = {}) {
        const { limit = 10 } = options;
        if (!seedTrack || (!seedTrack.artist && !seedTrack.genre)) {
            console.warn("No hay suficiente información en seedTrack para obtener recomendaciones.");
            return this.generateDemoResults("Recomendaciones", { limit });
        }

        const recommendationPromises = [];

        if (seedTrack.artist) {
            // Buscar más del mismo artista, si alguna API lo soporta bien
            // Por ahora, hacemos una búsqueda general con el nombre del artista.
            recommendationPromises.push(this.search(seedTrack.artist, { limit: Math.ceil(limit / 2), type: 'artist_tracks' }));
        }
        if (seedTrack.genre) {
            recommendationPromises.push(this.searchByGenre(seedTrack.genre, { limit: Math.ceil(limit / 2) }));
        }
        
        const resultsSettled = await Promise.allSettled(recommendationPromises);
        let allResults = [];
        resultsSettled.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allResults.push(...result.value);
            }
        });

        // Filtrar la canción original y duplicados
        const filtered = allResults.filter(track => track.id !== seedTrack.id);
        const diversified = this.diversifyResults(filtered, limit);

        if (diversified.length === 0) {
            console.warn("No se encontraron recomendaciones, generando demo.");
            return this.generateDemoResults(`Similares a ${seedTrack.title}`, {limit});
        }
        return diversified;
    }
}


// ============================================================
// BLOQUE: CLASE ModernMusicExplorer
// ============================================================
class ModernMusicExplorer {
    constructor() {
        this.api = new ModernMusicAPI();
        this.currentTrack = null;
        this.currentPlaylist = [];
        this.currentTrackIndex = -1; // Iniciar en -1
        this.isPlaying = false;
        this.volume = 0.5;
        this.audio = null;
        this.isShuffled = false;
        this.isRepeating = false; // 'false' (no repetir), 'one' (repetir una), 'all' (repetir lista)
        this.isExplorerInitialized = false; // Guardián para la inicialización del explorador
        this.lastQuery = ""; // Para paginación futura
    }

    async init() {
        if (this.isExplorerInitialized) {
            console.log('Modern Music Explorer ya está inicializado.');
            return;
        }
        this.isExplorerInitialized = true;
        console.log('Inicializando Modern Music Explorer...');

        // Asegurarse que la API se inicialice (espera si ya está en proceso)
        if (!this.api.isInitialized && !this.api.isInitializing) {
            await this.api.init();
        } else if (this.api.isInitializing) {
            await new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.api.isInitialized) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
            });
        }

        this.setupEventListeners();
        this.initializeVolume();
        await this.loadInitialContent();
        console.log('Modern Music Explorer inicializado');
    }

    // ------------------------------------------------------------
    // BLOQUE: Configuración de Eventos
    // ------------------------------------------------------------
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        if (searchInput) searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.handleSearch());
        if (searchBtn) searchBtn.addEventListener('click', () => this.handleSearch());

        this.setupPlayerControls();
        this.setupKeyboardShortcuts(); // Opcional, si los tienes

        // Escuchar cambios de vista (grid/list) si existen los botones
        const viewGridBtn = document.getElementById('viewGridBtn');
        const viewListBtn = document.getElementById('viewListBtn');
        if(viewGridBtn) viewGridBtn.addEventListener('click', () => this.setViewMode('grid'));
        if(viewListBtn) viewListBtn.addEventListener('click', () => this.setViewMode('list'));
    }

    setupPlayerControls() {
        const controls = {
            playPauseBtn: () => this.togglePlayPause(),
            prevBtn: () => this.playPrevious(),
            nextBtn: () => this.playNext(),
            shuffleBtn: () => this.toggleShuffle(),
            repeatBtn: () => this.toggleRepeat(),
            volumeSlider: (e) => this.setVolumeFromSlider(e) // Cambiado para mejor manejo del click
        };
        Object.entries(controls).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'volumeSlider') { // El slider de volumen necesita un 'mousedown' o 'click'
                    element.addEventListener('click', handler); // O 'input' si es un range real
                } else {
                    element.addEventListener('click', handler);
                }
            }
        });

        // Control de la barra de progreso (scrubbing)
        const progressBarContainer = document.getElementById('progressBarContainer'); // El contenedor de la barra
        if (progressBarContainer) {
            progressBarContainer.addEventListener('click', (e) => this.seek(e));
        }
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            
            const shortcuts = {
                'Space': () => this.togglePlayPause(),
                'ArrowRight': () => this.playNext(),
                'ArrowLeft': () => this.playPrevious(),
                // 'KeyF': () => document.getElementById('searchInput')?.focus(), // Comentado si no es necesario
                'KeyS': () => this.toggleShuffle(),
                'KeyR': () => this.toggleRepeat()
            };
            const handler = shortcuts[e.code];
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
    }

    // ------------------------------------------------------------
    // BLOQUE: Carga de Contenido y UI
    // ------------------------------------------------------------
    async loadInitialContent() {
        this.showLoading('Cargando música popular...');
        try {
            const popularTracks = await this.api.getPopularTracks({ limit: 12 }); // Más para llenar un grid
            this.displayFeatured(popularTracks); // Asumimos que esta función existe y muestra en una sección
            // También podríamos llenar la lista principal con estos tracks
            // this.currentPlaylist = popularTracks;
            // this.displayResults(popularTracks);
        } catch (error) {
            console.error('Error cargando contenido inicial:', error);
            this.showError('No se pudo cargar la música popular.');
            this.displayFeatured([]); // Mostrar sección vacía o mensaje
        }
        this.hideLoading();
    }

    displayFeatured(tracks) {
        // Almacenar tracks para que playFeaturedTrack funcione
        window.featuredTracksStore = {};
        tracks.forEach(track => { window.featuredTracksStore[track.id] = track; });

        const featuredSection = document.getElementById('featuredSection'); // Asume que tienes esta sección
        if (!featuredSection) return;

        if (tracks.length === 0) {
            featuredSection.innerHTML = '<p class="text-center text-muted">No hay música destacada disponible.</p>';
            return;
        }
        
        featuredSection.innerHTML = `
            <div class="container">
                <h2 class="section-title text-center mb-4">Música Destacada</h2>
                <div class="row">
                    ${tracks.slice(0, 8).map(track => `
                        <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                            <div class="album-card efecto-brillo h-100">
                                <div class="album-cover position-relative">
                                    <img src="${track.image}" alt="${track.title}" class="img-fluid">
                                    <div class="album-overlay">
                                        <button class="btn-play" onclick="window.musicExplorer.playTrackById('${track.id}', 'featured')" title="Reproducir ${track.title}">
                                            <i class="fas fa-${track.playable ? 'play' : 'external-link-alt'}"></i>
                                        </button>
                                    </div>
                                    ${track.provider ? `<div class="position-absolute top-0 end-0 m-2"><span class="badge bg-primary">${track.provider}</span></div>` : ''}
                                </div>
                                <div class="p-3">
                                  <h4 class="album-title">${track.title}</h4>
                                  <p class="album-artist">${track.artist}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    async handleSearch() {
        const queryInput = document.getElementById('searchInput');
        const query = queryInput ? queryInput.value.trim() : "";
        if (!query) return;

        this.lastQuery = query; // Guardar para posible paginación
        this.showLoading(`Buscando "${query}"...`);
        document.getElementById('resultsTitle') && (document.getElementById('resultsTitle').textContent = `Resultados para "${query}"`);


        try {
            const results = await this.api.search(query, { limit: 24 }); // Más resultados
            this.currentPlaylist = results; // Actualizar playlist principal con los resultados
            this.displayResults(results);
             if (results.length === 0 || (results.length > 0 && results[0].provider === 'Demo') ) {
                this.showToast('No se encontraron resultados reales, mostrando demos.', 'info');
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.showError('Error al buscar música.');
            this.displayResults([]); // Mostrar vacío
        }
        this.hideLoading();
    }

    async searchByGenre(genre) {
        this.showLoading(`Buscando género "${genre}"...`);
        document.getElementById('resultsTitle') && (document.getElementById('resultsTitle').textContent = `Música de ${genre}`);
        try {
            const results = await this.api.searchByGenre(genre, { limit: 24 });
            this.currentPlaylist = results;
            this.displayResults(results);
            if (results.length === 0 || (results.length > 0 && results[0].provider === 'Demo') ) {
                this.showToast('No se encontraron resultados reales para este género, mostrando demos.', 'info');
            }
        } catch (error) {
           console.error('Error en búsqueda por género:', error);
           this.showError('Error al buscar por género.');
           this.displayResults([]);
        }
        this.hideLoading();
    }

    setViewMode(mode) {
        const viewGridBtn = document.getElementById('viewGridBtn');
        const viewListBtn = document.getElementById('viewListBtn');
        const searchResults = document.getElementById('searchResults');

        if (mode === 'grid') {
            viewGridBtn?.classList.add('active');
            viewListBtn?.classList.remove('active');
            searchResults?.classList.remove('list-view');
            searchResults?.classList.add('grid-view');
        } else {
            viewListBtn?.classList.add('active');
            viewGridBtn?.classList.remove('active');
            searchResults?.classList.remove('grid-view');
            searchResults?.classList.add('list-view');
        }
        // Re-renderizar con el modo actual si es necesario o si el CSS lo maneja automáticamente.
        // Por simplicidad, asumimos que el CSS cambia la apariencia. Si no, hay que re-renderizar.
        this.displayResults(this.currentPlaylist); // Volver a pintar para asegurar el formato
    }


    displayResults(tracks) {
        const resultsSection = document.getElementById('resultsSection'); // Sección general de resultados
        const searchResultsContainer = document.getElementById('searchResults'); // Contenedor específico de la lista/grid
        
        if (!resultsSection || !searchResultsContainer) {
             console.warn("Elementos de UI para resultados no encontrados.");
             return;
        }
        
        resultsSection.style.display = 'block'; // Mostrar la sección de resultados
        
        // Almacenar tracks para que playTrackById funcione con 'playlist'
        window.playlistTracksStore = {};
        tracks.forEach(track => { window.playlistTracksStore[track.id] = track; });


        if (tracks.length === 0) {
            searchResultsContainer.innerHTML = '<p class="text-center text-muted mt-5">No se encontraron canciones.</p>';
            return;
        }

        // Determinar modo de vista (si los botones existen y uno está activo)
        let viewMode = 'grid'; // Por defecto
        const viewListBtn = document.getElementById('viewListBtn');
        if (viewListBtn && viewListBtn.classList.contains('active')) {
            viewMode = 'list';
        }


        if (viewMode === 'grid') {
            searchResultsContainer.classList.remove('list-view');
            searchResultsContainer.classList.add('grid-view'); // Para CSS
            searchResultsContainer.innerHTML = `
                <div class="row">
                    ${tracks.map((track, index) => `
                        <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6 mb-4">
                            <div class="album-card position-relative h-100">
                                <div class="album-cover">
                                    <img src="${track.image}" alt="${track.title}" class="img-fluid">
                                    <div class="album-overlay">
                                        <button class="btn-play" onclick="window.musicExplorer.playTrackById('${track.id}', 'playlist')" title="Reproducir ${track.title}">
                                            <i class="fas fa-${track.playable ? 'play' : 'external-link-alt'}"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="p-2">
                                  <h5 class="album-title small">${track.title}</h5>
                                  <p class="album-artist small">${track.artist}</p>
                                  <div class="d-flex justify-content-between align-items-center mt-1">
                                      <small class="text-muted">${track.duration}</small>
                                      <div>
                                          ${track.provider ? `<span class="badge bg-secondary me-1">${track.provider}</span>` : ''}
                                          <button class="btn btn-sm btn-outline-light" onclick="window.musicExplorer.toggleFavorite('${track.id}')" title="Favorito">
                                              <i class="fas fa-heart" id="fav-${track.id}"></i>
                                          </button>
                                      </div>
                                  </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        } else { // list view
            searchResultsContainer.classList.remove('grid-view');
            searchResultsContainer.classList.add('list-view'); // Para CSS
            searchResultsContainer.innerHTML = tracks.map((track, index) => `
                <div class="track-item d-flex align-items-center p-2 mb-2">
                    <img src="${track.image}" alt="${track.title}" class="track-image me-3" style="width:50px; height:50px; object-fit:cover;">
                    <div class="track-info flex-grow-1">
                        <div class="track-name fw-bold">${track.title}
                            ${track.provider ? `<span class="badge bg-secondary ms-2 small">${track.provider}</span>` : ''}
                        </div>
                        <div class="track-artist small">${track.artist}</div>
                        <!-- <div class="track-album text-muted small">${track.album}</div> -->
                    </div>
                    <div class="track-actions d-flex align-items-center">
                        <span class="text-muted me-3 small">${track.duration}</span>
                        <button class="btn btn-sm btn-outline-light me-2" onclick="window.musicExplorer.toggleFavorite('${track.id}')" title="Favorito">
                            <i class="fas fa-heart" id="fav-${track.id}"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="window.musicExplorer.playTrackById('${track.id}', 'playlist')" title="${track.playable ? 'Reproducir' : 'Ver más'}">
                            <i class="fas fa-${track.playable ? 'play' : 'external-link-alt'}"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        this.updateFavoriteIcons(); // Actualizar todos los iconos de fav
    }


    // ------------------------------------------------------------
    // BLOQUE: Lógica del Reproductor
    // ------------------------------------------------------------

    // Nueva función para reproducir por ID desde stores globales
    playTrackById(trackId, storeName = 'playlist') {
        let track;
        if (storeName === 'featured' && window.featuredTracksStore) {
            track = window.featuredTracksStore[trackId];
            // Si se reproduce de featured, podríamos querer que la playlist actual sea solo esa canción
            // o una lista de las destacadas. Por ahora, la reproducimos individualmente.
            if (track) this.playTrack(track, Object.values(window.featuredTracksStore));

        } else if (storeName === 'playlist' && window.playlistTracksStore) {
            track = window.playlistTracksStore[trackId];
             if (track) this.playTrack(track, this.currentPlaylist); // Usa la currentPlaylist del explorador
        }
        
        if (!track) {
            console.error("Track no encontrado en el store:", trackId, storeName);
            this.showError("No se pudo encontrar la canción para reproducir.");
        }
    }


    playTrack(track, playlistContext) { // playlistContext es la lista de donde viene la canción
        if (!track) {
            console.error("Intento de reproducir un track nulo");
            return;
        }
        console.log('Reproduciendo:', track.title);

        if (this.audio) {
            this.audio.pause();
            this.audio.src = ''; // Liberar recurso anterior
            this.audio = null;
        }

        this.currentTrack = track;
        
        // Si se proporciona un contexto de playlist, usarlo. Si no, la this.currentPlaylist.
        // Si el track no está en this.currentPlaylist y se usa esa, el índice será -1.
        const effectivePlaylist = playlistContext || this.currentPlaylist;
        this.currentTrackIndex = effectivePlaylist.findIndex(t => t.id === track.id);


        if (track.playable && track.previewUrl) {
            // SoundCloud URLs a veces necesitan ser usadas directamente sin pasar por el proxy de audio
            // si el proxy solo se usó para obtener los metadatos.
            let audioUrl = track.previewUrl;
            
            // Si la URL de SoundCloud ya incluye el client_id y es un stream directo, podría funcionar.
            // Si es una API URL que necesita ser proxificada para el audio también, es más complejo.
            // Para Jamendo y Deezer, las previewUrl suelen ser directas a MP3.

            this.audio = new Audio(audioUrl);
            this.setupAudioEvents();
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updatePlayButtonUI(true);
                    this.updatePlayerUI();
                })
                .catch(error => {
                    console.error('Error reproduciendo:', error, "URL:", audioUrl);
                    this.showError(`Error al reproducir: ${track.title}. Puede que el preview no esté disponible.`);
                    this.isPlaying = false;
                    this.updatePlayButtonUI(false);
                });
        } else if (track.externalUrl && track.externalUrl !== '#') {
            this.showToast(`Preview no disponible. Abriendo en ${track.provider || 'sitio externo'}.`, 'info');
            window.open(track.externalUrl, '_blank');
        } else {
            this.showError('Vista previa no disponible para esta canción.');
        }
        this.addToRecentActivity('Reproduciste', `${track.title} - ${track.artist}`);
    }

    setupAudioEvents() {
        if (!this.audio) return;
        this.audio.volume = this.volume;
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('timeupdate', () => this.updateProgressUI());
        this.audio.addEventListener('loadedmetadata', () => this.updateProgressUI()); // Actualiza duración total
        this.audio.addEventListener('error', (e) => {
            console.error('Error de audio:', e.target.error, "Track:", this.currentTrack?.title);
            this.showError('Error al cargar el audio. La pista puede estar corrupta o no ser accesible.');
            // Intentar la siguiente si hay error y no es por pausa manual.
            if (this.isPlaying) this.playNext(); 
        });
    }

    handleTrackEnd() {
        if (this.isRepeating === 'one' && this.currentTrack) { // Repetir la misma canción
            this.audio.currentTime = 0;
            this.audio.play();
        } else {
            this.playNext(); // Avanza incluso si isRepeating es 'all' (se maneja en playNext)
        }
    }

    togglePlayPause() {
        if (!this.audio || !this.currentTrack) {
            // Si no hay audio pero hay una playlist, intenta reproducir la primera.
            if (this.currentPlaylist.length > 0 && !this.currentTrack) {
                this.playTrack(this.currentPlaylist[0], this.currentPlaylist);
            }
            return;
        }
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
        } else {
            this.audio.play().then(() => { this.isPlaying = true; })
            .catch(e => {
                console.error("Error al reanudar play:", e);
                this.showError("No se pudo reanudar la reproducción.");
            });
        }
        this.updatePlayButtonUI(this.isPlaying);
    }

    playNext() {
        if (this.currentPlaylist.length === 0) return;
        
        let nextIndex;
        if (this.isShuffled) {
            if (this.currentPlaylist.length <= 1) nextIndex = 0;
            else {
                do { nextIndex = Math.floor(Math.random() * this.currentPlaylist.length); }
                while (nextIndex === this.currentTrackIndex);
            }
        } else {
            nextIndex = this.currentTrackIndex + 1;
            if (nextIndex >= this.currentPlaylist.length) {
                if (this.isRepeating === 'all') { // Repetir lista
                    nextIndex = 0;
                } else { // Fin de la lista, no repetir
                    this.isPlaying = false;
                    this.updatePlayButtonUI(false);
                    // Opcional: resetear currentTrack y UI del reproductor
                    // this.currentTrack = null;
                    // this.updatePlayerUI();
                    this.showToast("Fin de la lista de reproducción.", "info");
                    return; 
                }
            }
        }
        this.playTrack(this.currentPlaylist[nextIndex], this.currentPlaylist);
    }

    playPrevious() {
        if (this.currentPlaylist.length === 0) return;

        let prevIndex;
        if (this.isShuffled) { // En aleatorio, "anterior" es otra canción aleatoria
            if (this.currentPlaylist.length <= 1) prevIndex = 0;
            else {
                do { prevIndex = Math.floor(Math.random() * this.currentPlaylist.length); }
                while (prevIndex === this.currentTrackIndex);
            }
        } else {
            prevIndex = this.currentTrackIndex - 1;
            if (prevIndex < 0) {
                if (this.isRepeating === 'all') { // Repetir lista (va al final)
                    prevIndex = this.currentPlaylist.length - 1;
                } else { // Inicio de la lista, no repetir hacia atrás
                    // Opcional: ir al inicio de la canción actual si lleva X segundos
                    if (this.audio && this.audio.currentTime > 3) {
                        this.audio.currentTime = 0;
                        return;
                    }
                    prevIndex = 0; // Simplemente se queda en la primera o la reinicia
                }
            }
        }
        this.playTrack(this.currentPlaylist[prevIndex], this.currentPlaylist);
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        const shuffleBtn = document.getElementById('shuffleBtn');
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', this.isShuffled);
            shuffleBtn.style.color = this.isShuffled ? 'var(--bs-primary)' : ''; // Usa variable CSS de Bootstrap
        }
        this.showToast(`Modo aleatorio ${this.isShuffled ? 'activado' : 'desactivado'}.`, 'info');
    }

    toggleRepeat() {
        const repeatBtn = document.getElementById('repeatBtn');
        const repeatIcon = repeatBtn ? repeatBtn.querySelector('i') : null;

        if (this.isRepeating === false) { // Estaba apagado, pasa a repetir lista
            this.isRepeating = 'all';
            if (repeatIcon) repeatIcon.className = 'fas fa-repeat'; // Icono de repetir todo
            if (repeatBtn) repeatBtn.classList.add('active');
            this.showToast('Repetir lista activado.', 'info');
        } else if (this.isRepeating === 'all') { // Estaba en repetir lista, pasa a repetir una
            this.isRepeating = 'one';
            if (repeatIcon) repeatIcon.className = 'fas fa-repeat-1'; // Icono de repetir uno (si tienes FontAwesome Pro) o reusar fa-repeat y cambiar color
            if (repeatBtn) repeatBtn.style.color = 'var(--bs-success)'; // Diferente color para repetir uno
            this.showToast('Repetir canción actual activado.', 'info');
        } else { // Estaba en repetir uno, pasa a apagado
            this.isRepeating = false;
            if (repeatIcon) repeatIcon.className = 'fas fa-repeat';
            if (repeatBtn) {
                repeatBtn.classList.remove('active');
                repeatBtn.style.color = ''; // Color por defecto
            }
            this.showToast('Repetir desactivado.', 'info');
        }
    }

    setVolumeFromSlider(event) {
        const slider = event.currentTarget; // Asumimos que es el div contenedor del progress bar
        const rect = slider.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        this.setVolume(percentage);
    }
    
    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
        this.updateVolumeUI();
        localStorage.setItem('playerVolume', this.volume.toString());
    }

    initializeVolume() {
        const savedVolume = localStorage.getItem('playerVolume');
        this.volume = savedVolume ? parseFloat(savedVolume) : 0.5;
        if (this.audio) this.audio.volume = this.volume;
        this.updateVolumeUI();
    }
    
    seek(event) {
        if (!this.audio || isNaN(this.audio.duration)) return;
        const progressBarContainer = event.currentTarget; // El div que contiene la barra
        const rect = progressBarContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        this.audio.currentTime = this.audio.duration * percentage;
        this.updateProgressUI();
    }

    // ------------------------------------------------------------
    // BLOQUE: Actualizaciones de UI del Reproductor
    // ------------------------------------------------------------
    updatePlayButtonUI(isPlaying) {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = `<i class="fas fa-${isPlaying ? 'pause' : 'play'}"></i>`;
        }
        // También el del reproductor grande si existe
        const mainPlayPauseBtn = document.getElementById('mainPlayPauseBtn');
         if (mainPlayPauseBtn) {
            mainPlayPauseBtn.innerHTML = `<i class="fas fa-${isPlaying ? 'pause' : 'play'} fa-2x"></i>`;
        }
    }

    updatePlayerUI() { // Actualiza la info de la canción en el reproductor fijo/grande
        const playerBar = document.getElementById('playerControls'); // El reproductor fijo inferior
        const currentTrackImage = document.getElementById('currentTrackImage');
        const currentTrackName = document.getElementById('currentTrackName');
        const currentTrackArtist = document.getElementById('currentTrackArtist');
        
        if (this.currentTrack) {
            playerBar?.classList.add('active'); // Mostrar reproductor
            if(currentTrackImage) currentTrackImage.src = this.currentTrack.image || '/api/placeholder/50/50';
            if(currentTrackName) currentTrackName.textContent = this.currentTrack.title;
            if(currentTrackArtist) currentTrackArtist.textContent = this.currentTrack.artist;
            this.updateFavoritePlayerButton();
        } else {
            playerBar?.classList.remove('active'); // Ocultar si no hay canción
        }
    }

    updateProgressUI() {
        if (!this.audio || !this.currentTrack) return;

        const progress = this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0;
        
        const progressBar = document.getElementById('progressBar'); // Barra del reproductor fijo
        if (progressBar) progressBar.style.width = `${progress}%`;

        const currentTimeEl = document.getElementById('currentTime');
        const totalTimeEl = document.getElementById('totalTime');

        if (currentTimeEl) currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        if (totalTimeEl) totalTimeEl.textContent = this.formatTime(this.audio.duration);
    }

    updateVolumeUI() {
        const volumeProgress = document.getElementById('volumeProgress'); // La parte coloreada del slider
        if (volumeProgress) {
            volumeProgress.style.width = `${this.volume * 100}%`;
        }
        // Podrías también cambiar un icono de volumen (mute, low, high)
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // ------------------------------------------------------------
    // BLOQUE: Favoritos y Actividad Reciente
    // ------------------------------------------------------------
    toggleFavorite(trackId) {
        // Encontrar el track. Podría estar en featured o en la playlist actual.
        let track = (window.playlistTracksStore && window.playlistTracksStore[trackId]) || 
                    (window.featuredTracksStore && window.featuredTracksStore[trackId]);

        if (!track) {
            // Último intento: buscar en currentPlaylist por si no está en stores globales
            track = this.currentPlaylist.find(t => t.id === trackId);
        }

        if (!track) {
            console.error("Track no encontrado para favorito:", trackId);
            this.showError("No se pudo encontrar la canción para gestionar favoritos.");
            return;
        }
        
        const favorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
        const favIndex = favorites.findIndex(fav => fav.id === trackId);
        
        if (favIndex !== -1) {
            favorites.splice(favIndex, 1);
            this.showToast(`${track.title} eliminado de favoritos.`, 'info');
        } else {
            favorites.push(track); // Guardar el objeto track completo
            this.showToast(`${track.title} agregado a favoritos!`, 'success');
            this.addToRecentActivity('Agregaste a favoritos', `${track.title} - ${track.artist}`);
        }
        localStorage.setItem('favoriteSongs', JSON.stringify(favorites));
        
        this.updateFavoriteIcons(); // Actualiza todos los iconos en la vista
        this.updateFavoritePlayerButton(); // Actualiza el del reproductor
    }

    updateFavoriteIcons() { // Para los iconos en la lista/grid
        const favorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
        document.querySelectorAll('[id^="fav-"]').forEach(iconEl => {
            const trackId = iconEl.id.substring(4);
            const isFavorite = favorites.some(fav => fav.id === trackId);
            iconEl.classList.toggle('fas', isFavorite); // Icono lleno
            iconEl.classList.toggle('far', !isFavorite); // Icono vacío (si usas far para no favorito)
            iconEl.style.color = isFavorite ? 'var(--bs-danger)' : ''; // Rojo si es favorito
        });
    }
    updateFavoritePlayerButton() { // Para el botón en el reproductor principal
        if (!this.currentTrack) return;
        const favorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
        const favBtnPlayer = document.getElementById('playerAddToFavoritesBtn'); // Asume este ID
        if(favBtnPlayer) {
            const isFavorite = favorites.some(fav => fav.id === this.currentTrack.id);
            favBtnPlayer.classList.toggle('active', isFavorite);
            favBtnPlayer.style.color = isFavorite ? 'var(--bs-danger)' : '';
            favBtnPlayer.querySelector('i')?.classList.toggle('fas', isFavorite);
            favBtnPlayer.querySelector('i')?.classList.toggle('far', !isFavorite);
        }
    }


    addToRecentActivity(action, item) { /* ... (sin cambios, parece ok) ... */ }

    // ------------------------------------------------------------
    // BLOQUE: Recomendaciones (llamada desde UI)
    // ------------------------------------------------------------
    async displayRecommendations() {
        if (!this.currentTrack) {
            this.showError('Selecciona una canción para obtener recomendaciones.');
            return;
        }
        this.showLoading(`Buscando recomendaciones para ${this.currentTrack.title}...`);
        document.getElementById('resultsTitle') && (document.getElementById('resultsTitle').textContent = `Recomendaciones para "${this.currentTrack.title}"`);

        try {
            const recommendations = await this.api.getRecommendations(this.currentTrack, { limit: 12 });
            this.currentPlaylist = recommendations; // Actualizar playlist con recomendaciones
            this.displayResults(recommendations);
            this.showToast('Recomendaciones cargadas.', 'success');
        } catch (error) {
            console.error('Error obteniendo recomendaciones:', error);
            this.showError('Error al obtener recomendaciones.');
            this.displayResults([]);
        }
        this.hideLoading();
    }

    // ------------------------------------------------------------
    // BLOQUE: Utilidades UI (Loading, Error, Toast)
    // ------------------------------------------------------------
    showLoading(message = "Cargando...") {
        const loadingOverlay = document.getElementById('loadingOverlay'); // Necesitas este elemento en tu HTML
        if (loadingOverlay) {
            loadingOverlay.querySelector('.loading-message').textContent = message;
            loadingOverlay.style.display = 'flex';
        }
    }
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    showError(message) { this.showToast(message, 'error'); }

    showToast(message, type = 'info') { // Cambiado default a 'info'
        const toastContainer = document.getElementById('toastContainer'); // Necesitas este div en tu HTML
        if (!toastContainer) {
            console.warn("Toast container not found. Message:", message);
            return;
        }

        const toastId = `toast-${Date.now()}`;
        const toastColors = { success: 'bg-success', error: 'bg-danger', info: 'bg-info', warning: 'bg-warning' };
        const toastIcons = { success: 'check-circle', error: 'exclamation-triangle', info: 'info-circle', warning: 'exclamation-triangle' };

        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${toastColors[type]} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${toastIcons[type]} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>`;
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        const toastElement = document.getElementById(toastId);
        const bootstrapToast = new bootstrap.Toast(toastElement, { delay: 4000 });
        bootstrapToast.show();
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    }

    onAPIInitialized(availableAPIs) {
        console.log('Callback: APIs inicializadas en Explorer:', availableAPIs);
        if (availableAPIs.length > 0) {
            this.showToast(`Conectado con ${availableAPIs.join(', ')}`, 'success');
        } else {
            this.showToast('No se pudo conectar con ninguna API de música. Se usarán datos de demostración.', 'warning');
        }
    }
}


// ============================================================
// BLOQUE: FUNCIONES GLOBALES Y INICIALIZACIÓN
// ============================================================

// Stores globales para acceder a los tracks desde HTML
window.featuredTracksStore = {};
window.playlistTracksStore = {};


// Función global para búsqueda por género (llamada desde HTML, por ejemplo)
window.searchByGenreGlobal = function(genre) {
   if (window.musicExplorer) {
       window.musicExplorer.searchByGenre(genre);
   }
};

// Función global para recomendaciones (llamada desde HTML)
window.getRecommendationsGlobal = function() {
    if (window.musicExplorer) {
        window.musicExplorer.displayRecommendations();
    }
};


// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
   window.musicExplorer = new ModernMusicExplorer();
   window.musicExplorer.init().catch(err => {
       console.error("Error fatal inicializando Music Explorer:", err);
       // Mostrar un error al usuario si la inicialización falla catastróficamente
       const body = document.querySelector('body');
       if (body) {
           body.innerHTML = `<div class="alert alert-danger m-5" role="alert">Error Crítico: La aplicación no pudo iniciar. Revisa la consola para más detalles.</div>`;
       }
   });

    // Ejemplo de cómo manejar el botón de favoritos del reproductor principal
    const favBtnPlayer = document.getElementById('playerAddToFavoritesBtn');
    if(favBtnPlayer && window.musicExplorer) {
        favBtnPlayer.addEventListener('click', () => {
            if (window.musicExplorer.currentTrack) {
                window.musicExplorer.toggleFavorite(window.musicExplorer.currentTrack.id);
            }
        });
    }

});
