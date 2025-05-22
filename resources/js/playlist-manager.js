// playlist-manager.js - Sistema completo de gestión de playlists

/**
 * PlaylistManager - Gestiona las playlists del usuario
 * Permite crear, editar, eliminar y gestionar playlists y sus canciones
 */
class PlaylistManager {
    constructor() {
        this.currentUser = null;
        this.userPlaylists = {};
        this.isInitialized = false;
        this.listeners = [];
        
        console.log('PlaylistManager: Constructor inicializado');
    }

    /**
     * Inicializa el manager y carga los datos del usuario
     */
    async init() {
        if (this.isInitialized) {
            console.log('PlaylistManager: Ya está inicializado');
            return;
        }

        try {
            // Esperar a que Firebase Auth esté listo
            this.currentUser = await this.waitForAuth();
            
            if (this.currentUser) {
                await this.loadUserPlaylists();
                this.setupRealtimeListener();
                console.log('PlaylistManager: Inicializado correctamente para usuario:', this.currentUser.uid);
            } else {
                console.log('PlaylistManager: No hay usuario autenticado');
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('PlaylistManager: Error durante la inicialización:', error);
            throw error;
        }
    }

    /**
     * Espera a que Firebase Auth esté listo
     */
    waitForAuth() {
        return new Promise((resolve) => {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                resolve(currentUser);
            } else {
                const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                    unsubscribe();
                    resolve(user);
                });
            }
        });
    }

    /**
     * Carga las playlists del usuario desde Firebase
     */
    async loadUserPlaylists() {
        if (!this.currentUser) {
            console.warn('PlaylistManager: No hay usuario autenticado para cargar playlists');
            return;
        }

        try {
            const playlistsRef = firebase.database().ref(`users/${this.currentUser.uid}/playlists`);
            const snapshot = await playlistsRef.once('value');
            
            this.userPlaylists = snapshot.val() || {};
            
            console.log(`PlaylistManager: Playlists cargadas: ${Object.keys(this.userPlaylists).length}`);
            
            // Notificar a los listeners
            this.notifyListeners('loaded', null, null);
            
        } catch (error) {
            console.error('PlaylistManager: Error cargando playlists:', error);
            this.userPlaylists = {};
        }
    }

    /**
     * Configura listener en tiempo real para cambios en las playlists
     */
    setupRealtimeListener() {
        if (!this.currentUser) return;

        const playlistsRef = firebase.database().ref(`users/${this.currentUser.uid}/playlists`);
        
        playlistsRef.on('child_added', (snapshot) => {
            const playlistId = snapshot.key;
            const playlistData = snapshot.val();
            
            if (!this.userPlaylists[playlistId]) {
                this.userPlaylists[playlistId] = playlistData;
                this.notifyListeners('create', playlistData, null);
                console.log('PlaylistManager: Playlist añadida en tiempo real:', playlistId);
            }
        });

        playlistsRef.on('child_removed', (snapshot) => {
            const playlistId = snapshot.key;
            const playlistData = snapshot.val();
            
            if (this.userPlaylists[playlistId]) {
                delete this.userPlaylists[playlistId];
                this.notifyListeners('delete', { id: playlistId, ...playlistData }, null);
                console.log('PlaylistManager: Playlist eliminada en tiempo real:', playlistId);
            }
        });

        playlistsRef.on('child_changed', (snapshot) => {
            const playlistId = snapshot.key;
            const playlistData = snapshot.val();
            
            this.userPlaylists[playlistId] = playlistData;
            this.notifyListeners('update', playlistData, null);
            console.log('PlaylistManager: Playlist actualizada en tiempo real:', playlistId);
        });
    }

    /**
     * Crea una nueva playlist
     */
    async createPlaylist(playlistData) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para crear playlists');
        }

        if (!playlistData || !playlistData.name || !playlistData.name.trim()) {
            throw new Error('El nombre de la playlist es requerido');
        }

        try {
            const playlistId = `playlist_${this.currentUser.uid}_${Date.now()}`;
            const timestamp = Date.now();
            
            const newPlaylist = {
                id: playlistId,
                name: playlistData.name.trim(),
                description: playlistData.description?.trim() || '',
                public: playlistData.public || false,
                owner: this.currentUser.uid,
                ownerName: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'Usuario',
                created_at: timestamp,
                updated_at: timestamp,
                songs: {},
                coverImage: playlistData.coverImage || null
            };

            // Guardar en Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}`)
                .set(newPlaylist);

            // Actualizar cache local
            this.userPlaylists[playlistId] = newPlaylist;

            // Notificar listeners
            this.notifyListeners('create', newPlaylist, null);

            console.log(`PlaylistManager: Playlist "${newPlaylist.name}" creada con ID: ${playlistId}`);
            return newPlaylist;

        } catch (error) {
            console.error('PlaylistManager: Error creando playlist:', error);
            throw new Error('Error al crear la playlist');
        }
    }

    /**
     * Actualiza una playlist existente
     */
    async updatePlaylist(playlistId, updateData) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para editar playlists');
        }

        if (!playlistId || !this.userPlaylists[playlistId]) {
            throw new Error('Playlist no encontrada');
        }

        const playlist = this.userPlaylists[playlistId];
        
        // Verificar que el usuario es el propietario
        if (playlist.owner !== this.currentUser.uid) {
            throw new Error('No tienes permisos para editar esta playlist');
        }

        try {
            const updatedPlaylist = {
                ...playlist,
                ...updateData,
                updated_at: Date.now()
            };

            // No permitir cambiar ciertos campos
            delete updatedPlaylist.id;
            delete updatedPlaylist.owner;
            delete updatedPlaylist.created_at;

            // Guardar en Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}`)
                .update({
                    name: updatedPlaylist.name,
                    description: updatedPlaylist.description,
                    public: updatedPlaylist.public,
                    updated_at: updatedPlaylist.updated_at,
                    coverImage: updatedPlaylist.coverImage
                });

            // Actualizar cache local
            this.userPlaylists[playlistId] = updatedPlaylist;

            // Notificar listeners
            this.notifyListeners('update', updatedPlaylist, null);

            console.log(`PlaylistManager: Playlist "${updatedPlaylist.name}" actualizada`);
            return updatedPlaylist;

        } catch (error) {
            console.error('PlaylistManager: Error actualizando playlist:', error);
            throw new Error('Error al actualizar la playlist');
        }
    }

    /**
     * Elimina una playlist
     */
    async deletePlaylist(playlistId) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para eliminar playlists');
        }

        if (!playlistId || !this.userPlaylists[playlistId]) {
            throw new Error('Playlist no encontrada');
        }

        const playlist = this.userPlaylists[playlistId];
        
        // Verificar que el usuario es el propietario
        if (playlist.owner !== this.currentUser.uid) {
            throw new Error('No tienes permisos para eliminar esta playlist');
        }

        try {
            // Eliminar de Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}`)
                .remove();

            // Actualizar cache local
            delete this.userPlaylists[playlistId];

            // Notificar listeners
            this.notifyListeners('delete', playlist, null);

            console.log(`PlaylistManager: Playlist "${playlist.name}" eliminada`);
            return true;

        } catch (error) {
            console.error('PlaylistManager: Error eliminando playlist:', error);
            throw new Error('Error al eliminar la playlist');
        }
    }

    /**
     * Añade una canción a una playlist
     */
    async addSongToPlaylist(song, playlistId) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para añadir canciones a playlists');
        }

        if (!song || !song.id) {
            throw new Error('Datos de canción inválidos');
        }

        if (!playlistId || !this.userPlaylists[playlistId]) {
            throw new Error('Playlist no encontrada');
        }

        const playlist = this.userPlaylists[playlistId];
        
        // Verificar que el usuario es el propietario
        if (playlist.owner !== this.currentUser.uid) {
            throw new Error('No tienes permisos para añadir canciones a esta playlist');
        }

        // Verificar si la canción ya está en la playlist
        if (playlist.songs && playlist.songs[song.id]) {
            throw new Error('Esta canción ya está en la playlist');
        }

        try {
            const songData = {
                ...song,
                added_at: Date.now(),
                added_by: this.currentUser.uid
            };

            // Guardar en Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}/songs/${song.id}`)
                .set(songData);

            // Actualizar timestamp de la playlist
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}/updated_at`)
                .set(Date.now());

            // Actualizar cache local
            if (!this.userPlaylists[playlistId].songs) {
                this.userPlaylists[playlistId].songs = {};
            }
            this.userPlaylists[playlistId].songs[song.id] = songData;
            this.userPlaylists[playlistId].updated_at = Date.now();

            // Notificar listeners
            this.notifyListeners('addSong', this.userPlaylists[playlistId], songData);

            console.log(`PlaylistManager: Canción "${song.title}" añadida a playlist "${playlist.name}"`);
            return this.userPlaylists[playlistId];

        } catch (error) {
            console.error('PlaylistManager: Error añadiendo canción a playlist:', error);
            throw new Error('Error al añadir la canción a la playlist');
        }
    }

    /**
     * Elimina una canción de una playlist
     */
    async removeSongFromPlaylist(songId, playlistId) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para eliminar canciones de playlists');
        }

        if (!songId) {
            throw new Error('ID de canción inválido');
        }

        if (!playlistId || !this.userPlaylists[playlistId]) {
            throw new Error('Playlist no encontrada');
        }

        const playlist = this.userPlaylists[playlistId];
        
        // Verificar que el usuario es el propietario
        if (playlist.owner !== this.currentUser.uid) {
            throw new Error('No tienes permisos para eliminar canciones de esta playlist');
        }

        // Verificar si la canción está en la playlist
        if (!playlist.songs || !playlist.songs[songId]) {
            throw new Error('Esta canción no está en la playlist');
        }

        try {
            // Eliminar de Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}/songs/${songId}`)
                .remove();

            // Actualizar timestamp de la playlist
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/playlists/${playlistId}/updated_at`)
                .set(Date.now());

            // Actualizar cache local
            delete this.userPlaylists[playlistId].songs[songId];
            this.userPlaylists[playlistId].updated_at = Date.now();

            // Notificar listeners
            this.notifyListeners('removeSong', this.userPlaylists[playlistId], { id: songId });

            console.log(`PlaylistManager: Canción ${songId} eliminada de playlist "${playlist.name}"`);
            return this.userPlaylists[playlistId];

        } catch (error) {
            console.error('PlaylistManager: Error eliminando canción de playlist:', error);
            throw new Error('Error al eliminar la canción de la playlist');
        }
    }

    /**
     * Obtiene todas las playlists del usuario
     */
    getAllPlaylists() {
        return Object.values(this.userPlaylists).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
    }

    /**
     * Obtiene una playlist específica por ID
     */
    getPlaylistById(playlistId) {
        return this.userPlaylists[playlistId] || null;
    }

    /**
     * Busca playlists por nombre
     */
    searchPlaylists(query) {
        if (!query || !query.trim()) {
            return this.getAllPlaylists();
        }

        const searchTerm = query.toLowerCase().trim();
        
        return Object.values(this.userPlaylists).filter(playlist => {
            return (playlist.name && playlist.name.toLowerCase().includes(searchTerm)) ||
                   (playlist.description && playlist.description.toLowerCase().includes(searchTerm));
        }).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
    }

    /**
     * Obtiene las canciones de una playlist
     */
    getPlaylistSongs(playlistId) {
        const playlist = this.userPlaylists[playlistId];
        if (!playlist || !playlist.songs) {
            return [];
        }
        
        return Object.values(playlist.songs).sort((a, b) => (a.added_at || 0) - (b.added_at || 0));
    }

    /**
     * Obtiene estadísticas de las playlists
     */
    getPlaylistsStats() {
        const playlists = Object.values(this.userPlaylists);
        const totalPlaylists = playlists.length;
        
        if (totalPlaylists === 0) {
            return {
                totalPlaylists: 0,
                totalSongs: 0,
                averageSongsPerPlaylist: 0,
                mostRecentPlaylist: null,
                oldestPlaylist: null,
                largestPlaylist: null
            };
        }

        let totalSongs = 0;
        let mostRecent = playlists[0];
        let oldest = playlists[0];
        let largest = playlists[0];

        playlists.forEach(playlist => {
            const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
            totalSongs += songCount;
            
            if ((playlist.updated_at || 0) > (mostRecent.updated_at || 0)) {
                mostRecent = playlist;
            }
            
            if ((playlist.created_at || 0) < (oldest.created_at || 0)) {
                oldest = playlist;
            }

            const largestSongCount = largest.songs ? Object.keys(largest.songs).length : 0;
            if (songCount > largestSongCount) {
                largest = playlist;
            }
        });

        return {
            totalPlaylists,
            totalSongs,
            averageSongsPerPlaylist: Math.round(totalSongs / totalPlaylists),
            mostRecentPlaylist: mostRecent,
            oldestPlaylist: oldest,
            largestPlaylist: largest
        };
    }

    /**
     * Duplica una playlist
     */
    async duplicatePlaylist(playlistId, newName = null) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para duplicar playlists');
        }

        const originalPlaylist = this.userPlaylists[playlistId];
        if (!originalPlaylist) {
            throw new Error('Playlist no encontrada');
        }

        try {
            const duplicatedPlaylist = await this.createPlaylist({
                name: newName || `${originalPlaylist.name} (Copia)`,
                description: originalPlaylist.description,
                public: false // Las copias son privadas por defecto
            });

            // Copiar todas las canciones si las hay
            if (originalPlaylist.songs) {
                for (const song of Object.values(originalPlaylist.songs)) {
                    await this.addSongToPlaylist(song, duplicatedPlaylist.id);
                }
            }

            console.log(`PlaylistManager: Playlist "${originalPlaylist.name}" duplicada`);
            return duplicatedPlaylist;

        } catch (error) {
            console.error('PlaylistManager: Error duplicando playlist:', error);
            throw new Error('Error al duplicar la playlist');
        }
    }

    /**
     * Exporta una playlist a formato JSON
     */
    exportPlaylist(playlistId) {
        const playlist = this.userPlaylists[playlistId];
        if (!playlist) {
            throw new Error('Playlist no encontrada');
        }

        const exportData = {
            exportedAt: Date.now(),
            playlist: {
                name: playlist.name,
                description: playlist.description,
                created_at: playlist.created_at,
                songs: playlist.songs ? Object.values(playlist.songs) : []
            }
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Añade un listener para cambios en las playlists
     */
    addPlaylistChangeListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            console.log('PlaylistManager: Listener añadido');
        }
    }

    /**
     * Elimina un listener
     */
    removePlaylistChangeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
            console.log('PlaylistManager: Listener eliminado');
        }
    }

    /**
     * Notifica a todos los listeners sobre cambios
     */
    notifyListeners(action, playlist, song) {
        this.listeners.forEach(callback => {
            try {
                callback(action, playlist, song);
            } catch (error) {
                console.error('PlaylistManager: Error ejecutando listener:', error);
            }
        });
    }

    /**
     * Limpia los datos cuando el usuario cierra sesión
     */
    cleanup() {
        this.userPlaylists = {};
        this.currentUser = null;
        this.isInitialized = false;
        this.listeners = [];
        
        // Remover listeners de Firebase
        if (this.currentUser) {
            firebase.database().ref(`users/${this.currentUser.uid}/playlists`).off();
        }
        
        console.log('PlaylistManager: Datos limpiados');
    }
}

// Crear instancia global
window.PlaylistManager = new PlaylistManager();

// Listener para cambios de autenticación
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Usuario ha iniciado sesión
        if (!window.PlaylistManager.isInitialized) {
            try {
                await window.PlaylistManager.init();
            } catch (error) {
                console.error('Error inicializando PlaylistManager:', error);
            }
        }
    } else {
        // Usuario ha cerrado sesión
        window.PlaylistManager.cleanup();
    }
});

console.log('playlist-manager.js: PlaylistManager cargado y disponible globalmente');