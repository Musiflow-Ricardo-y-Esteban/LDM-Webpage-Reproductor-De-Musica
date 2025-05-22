// firebase-library.js - Sistema de gestión de biblioteca de usuario

/**
 * LibraryManager - Gestiona la biblioteca personal del usuario
 * Permite añadir, quitar y gestionar las canciones guardadas por el usuario
 */
class LibraryManager {
    constructor() {
        this.currentUser = null;
        this.librarySongs = {};
        this.isInitialized = false;
        this.listeners = [];
        
        console.log('LibraryManager: Constructor inicializado');
    }

    /**
     * Inicializa el manager y carga los datos del usuario
     */
    async init() {
        if (this.isInitialized) {
            console.log('LibraryManager: Ya está inicializado');
            return;
        }

        try {
            // Esperar a que Firebase Auth esté listo
            this.currentUser = await this.waitForAuth();
            
            if (this.currentUser) {
                await this.loadUserLibrary();
                this.setupRealtimeListener();
                console.log('LibraryManager: Inicializado correctamente para usuario:', this.currentUser.uid);
            } else {
                console.log('LibraryManager: No hay usuario autenticado');
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('LibraryManager: Error durante la inicialización:', error);
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
     * Carga la biblioteca del usuario desde Firebase
     */
    async loadUserLibrary() {
        if (!this.currentUser) {
            console.warn('LibraryManager: No hay usuario autenticado para cargar biblioteca');
            return;
        }

        try {
            const libraryRef = firebase.database().ref(`users/${this.currentUser.uid}/library`);
            const snapshot = await libraryRef.once('value');
            
            this.librarySongs = snapshot.val() || {};
            
            console.log(`LibraryManager: Biblioteca cargada con ${Object.keys(this.librarySongs).length} canciones`);
            
            // Notificar a los listeners
            this.notifyListeners('loaded', null, null);
            
        } catch (error) {
            console.error('LibraryManager: Error cargando biblioteca:', error);
            this.librarySongs = {};
        }
    }

    /**
     * Configura listener en tiempo real para cambios en la biblioteca
     */
    setupRealtimeListener() {
        if (!this.currentUser) return;

        const libraryRef = firebase.database().ref(`users/${this.currentUser.uid}/library`);
        
        libraryRef.on('child_added', (snapshot) => {
            const songId = snapshot.key;
            const songData = snapshot.val();
            
            if (!this.librarySongs[songId]) {
                this.librarySongs[songId] = songData;
                this.notifyListeners('added', songId, songData);
                console.log('LibraryManager: Canción añadida en tiempo real:', songId);
            }
        });

        libraryRef.on('child_removed', (snapshot) => {
            const songId = snapshot.key;
            
            if (this.librarySongs[songId]) {
                delete this.librarySongs[songId];
                this.notifyListeners('removed', songId, null);
                console.log('LibraryManager: Canción eliminada en tiempo real:', songId);
            }
        });

        libraryRef.on('child_changed', (snapshot) => {
            const songId = snapshot.key;
            const songData = snapshot.val();
            
            this.librarySongs[songId] = songData;
            this.notifyListeners('updated', songId, songData);
            console.log('LibraryManager: Canción actualizada en tiempo real:', songId);
        });
    }

    /**
     * Añade una canción a la biblioteca
     */
    async addSongToLibrary(song) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para añadir canciones a tu biblioteca');
        }

        if (!song || !song.id) {
            throw new Error('Datos de canción inválidos');
        }

        if (this.isInLibrary(song.id)) {
            throw new Error('Esta canción ya está en tu biblioteca');
        }

        try {
            const songData = {
                ...song,
                addedAt: Date.now(),
                addedBy: this.currentUser.uid
            };

            // Guardar en Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/library/${song.id}`)
                .set(songData);

            // Actualizar cache local
            this.librarySongs[song.id] = songData;

            // Notificar listeners
            this.notifyListeners('added', song.id, songData);

            console.log(`LibraryManager: Canción "${song.title}" añadida a la biblioteca`);
            return songData;

        } catch (error) {
            console.error('LibraryManager: Error añadiendo canción a biblioteca:', error);
            throw new Error('Error al añadir la canción a tu biblioteca');
        }
    }

    /**
     * Elimina una canción de la biblioteca
     */
    async removeSongFromLibrary(songId) {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para modificar tu biblioteca');
        }

        if (!songId) {
            throw new Error('ID de canción inválido');
        }

        if (!this.isInLibrary(songId)) {
            throw new Error('Esta canción no está en tu biblioteca');
        }

        try {
            // Eliminar de Firebase
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/library/${songId}`)
                .remove();

            // Actualizar cache local
            delete this.librarySongs[songId];

            // Notificar listeners
            this.notifyListeners('removed', songId, null);

            console.log(`LibraryManager: Canción ${songId} eliminada de la biblioteca`);
            return true;

        } catch (error) {
            console.error('LibraryManager: Error eliminando canción de biblioteca:', error);
            throw new Error('Error al eliminar la canción de tu biblioteca');
        }
    }

    /**
     * Verifica si una canción está en la biblioteca
     */
    isInLibrary(songId) {
        return !!(songId && this.librarySongs[songId]);
    }

    /**
     * Obtiene todas las canciones de la biblioteca
     */
    getAllLibrarySongs() {
        return Object.values(this.librarySongs).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }

    /**
     * Obtiene una canción específica de la biblioteca
     */
    getLibrarySong(songId) {
        return this.librarySongs[songId] || null;
    }

    /**
     * Obtiene el número total de canciones en la biblioteca
     */
    getLibraryCount() {
        return Object.keys(this.librarySongs).length;
    }

    /**
     * Busca canciones en la biblioteca
     */
    searchLibrary(query) {
        if (!query || !query.trim()) {
            return this.getAllLibrarySongs();
        }

        const searchTerm = query.toLowerCase().trim();
        
        return Object.values(this.librarySongs).filter(song => {
            return (song.title && song.title.toLowerCase().includes(searchTerm)) ||
                   (song.artist && song.artist.toLowerCase().includes(searchTerm)) ||
                   (song.album && song.album.toLowerCase().includes(searchTerm));
        }).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    }

    /**
     * Limpia toda la biblioteca del usuario
     */
    async clearLibrary() {
        if (!this.currentUser) {
            throw new Error('Debes iniciar sesión para limpiar tu biblioteca');
        }

        try {
            await firebase.database()
                .ref(`users/${this.currentUser.uid}/library`)
                .remove();

            this.librarySongs = {};
            this.notifyListeners('cleared', null, null);

            console.log('LibraryManager: Biblioteca limpiada completamente');
            return true;

        } catch (error) {
            console.error('LibraryManager: Error limpiando biblioteca:', error);
            throw new Error('Error al limpiar tu biblioteca');
        }
    }

    /**
     * Obtiene estadísticas de la biblioteca
     */
    getLibraryStats() {
        const songs = Object.values(this.librarySongs);
        const totalSongs = songs.length;
        
        if (totalSongs === 0) {
            return {
                totalSongs: 0,
                totalArtists: 0,
                totalAlbums: 0,
                mostRecentlyAdded: null,
                oldestAdded: null
            };
        }

        const artists = new Set();
        const albums = new Set();
        let mostRecent = songs[0];
        let oldest = songs[0];

        songs.forEach(song => {
            if (song.artist) artists.add(song.artist);
            if (song.album) albums.add(song.album);
            
            if ((song.addedAt || 0) > (mostRecent.addedAt || 0)) {
                mostRecent = song;
            }
            
            if ((song.addedAt || 0) < (oldest.addedAt || 0)) {
                oldest = song;
            }
        });

        return {
            totalSongs,
            totalArtists: artists.size,
            totalAlbums: albums.size,
            mostRecentlyAdded: mostRecent,
            oldestAdded: oldest
        };
    }

    /**
     * Exporta la biblioteca a formato JSON
     */
    exportLibrary() {
        const exportData = {
            exportedAt: Date.now(),
            userId: this.currentUser?.uid,
            totalSongs: Object.keys(this.librarySongs).length,
            songs: Object.values(this.librarySongs)
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Añade un listener para cambios en la biblioteca
     */
    addLibraryChangeListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            console.log('LibraryManager: Listener añadido');
        }
    }

    /**
     * Elimina un listener
     */
    removeLibraryChangeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
            console.log('LibraryManager: Listener eliminado');
        }
    }

    /**
     * Notifica a todos los listeners sobre cambios
     */
    notifyListeners(action, songId, songData) {
        this.listeners.forEach(callback => {
            try {
                callback(songId, this.isInLibrary(songId), songData, action);
            } catch (error) {
                console.error('LibraryManager: Error ejecutando listener:', error);
            }
        });
    }

    /**
     * Actualiza la apariencia visual del botón de biblioteca
     */
    updateLibraryButtonVisual(songId, isInLibrary) {
        document.querySelectorAll(`[data-track-id="${songId}"] .add-to-library-btn, .add-to-library-btn[data-track-id="${songId}"]`).forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                if (isInLibrary) {
                    icon.className = 'fas fa-check-circle';
                    button.style.color = '#1ed760';
                } else {
                    icon.className = 'fas fa-plus-circle';
                    button.style.color = '';
                }
            }
            
            button.classList.toggle('active', isInLibrary);
            button.title = isInLibrary ? 'En biblioteca' : 'Añadir a biblioteca';
        });
    }

    /**
     * Limpia los datos cuando el usuario cierra sesión
     */
    cleanup() {
        this.librarySongs = {};
        this.currentUser = null;
        this.isInitialized = false;
        this.listeners = [];
        
        // Remover listeners de Firebase
        if (this.currentUser) {
            firebase.database().ref(`users/${this.currentUser.uid}/library`).off();
        }
        
        console.log('LibraryManager: Datos limpiados');
    }
}

// Crear instancia global
window.LibraryManager = new LibraryManager();

// Listener para cambios de autenticación
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Usuario ha iniciado sesión
        if (!window.LibraryManager.isInitialized) {
            try {
                await window.LibraryManager.init();
            } catch (error) {
                console.error('Error inicializando LibraryManager:', error);
            }
        }
    } else {
        // Usuario ha cerrado sesión
        window.LibraryManager.cleanup();
    }
});

console.log('firebase-library.js: LibraryManager cargado y disponible globalmente');