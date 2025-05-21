// playlist-manager.js - Sistema de gestión de playlists para MusiFlow
// Este archivo proporciona funciones para manejar playlists entre páginas

/**
 * Módulo que gestiona el sistema de playlists
 * Permite crear, editar y reproducir playlists
 */
(function() {
    // Caché local de playlists
    let _userPlaylists = [];
    let _isInitialized = false;
    
    // Evento personalizado para notificar cambios en playlists
    const PLAYLIST_CHANGED_EVENT = 'playlistStatusChanged';
    
    /**
     * Inicializa el sistema de playlists
     * @return {Promise} Promesa que se resuelve cuando los datos están cargados
     */
    function init() {
        if (_isInitialized) return Promise.resolve(_userPlaylists);
        
        return new Promise((resolve, reject) => {
            // Verificar si el usuario está autenticado
            if (!firebase.auth().currentUser) {
                _isInitialized = true;
                resolve([]);
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            
            // Cargar playlists desde Firebase
            firebase.database().ref(`users/${uid}/playlists`).once('value')
                .then(snapshot => {
                    const data = snapshot.val() || {};
                    _userPlaylists = Object.values(data);
                    _isInitialized = true;
                    console.log('Sistema de playlists inicializado:', _userPlaylists.length, 'playlists');
                    resolve(_userPlaylists);
                })
                .catch(error => {
                    console.error('Error al inicializar sistema de playlists:', error);
                    _isInitialized = true;
                    reject(error);
                });
        });
    }
    
    /**
     * Obtiene todas las playlists del usuario
     * @return {Array} Array con todas las playlists
     */
    function getAllPlaylists() {
        return [..._userPlaylists];
    }
    
    /**
     * Obtiene una playlist por su ID
     * @param {string} playlistId - ID de la playlist a buscar
     * @return {Object|null} Objeto de playlist o null si no se encuentra
     */
    function getPlaylistById(playlistId) {
        return _userPlaylists.find(p => p.id === playlistId) || null;
    }
    
    /**
     * Crea una nueva playlist
     * @param {Object} playlistData - Datos de la nueva playlist
     * @return {Promise} Promesa que se resuelve con la playlist creada
     */
    function createPlaylist(playlistData) {
        if (!firebase.auth().currentUser) {
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        
        const uid = firebase.auth().currentUser.uid;
        const timestamp = Date.now();
        const playlistId = `playlist_${uid}_${timestamp}`;
        
        // Crear objeto de playlist
        const playlist = {
            id: playlistId,
            name: playlistData.name || 'Nueva Playlist',
            description: playlistData.description || '',
            public: playlistData.public || false,
            owner: uid,
            created_at: timestamp,
            updated_at: timestamp,
            songs: {} // Inicialmente vacío
        };
        
        return firebase.database().ref(`users/${uid}/playlists/${playlistId}`).set(playlist)
            .then(() => {
                // Añadir a caché local
                _userPlaylists.push(playlist);
                
                // Disparar evento
                dispatchPlaylistChangedEvent('create', playlist);
                
                return playlist;
            });
    }
    
    /**
     * Actualiza una playlist existente
     * @param {string} playlistId - ID de la playlist a actualizar
     * @param {Object} updateData - Datos a actualizar
     * @return {Promise} Promesa que se resuelve con la playlist actualizada
     */
    function updatePlaylist(playlistId, updateData) {
        if (!firebase.auth().currentUser) {
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        
        const uid = firebase.auth().currentUser.uid;
        const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return Promise.reject(new Error('Playlist no encontrada'));
        }
        
        // Actualizar datos sin modificar ID, owner, created_at
        const updatedPlaylist = {
            ..._userPlaylists[playlistIndex],
            ...updateData,
            id: playlistId, // Asegurar que ID no cambia
            owner: uid, // Asegurar que owner no cambia
            created_at: _userPlaylists[playlistIndex].created_at, // Mantener fecha de creación
            updated_at: Date.now() // Actualizar timestamp
        };
        
        return firebase.database().ref(`users/${uid}/playlists/${playlistId}`).update({
            name: updatedPlaylist.name,
            description: updatedPlaylist.description,
            public: updatedPlaylist.public,
            updated_at: updatedPlaylist.updated_at
        })
        .then(() => {
            // Actualizar en caché local
            _userPlaylists[playlistIndex] = updatedPlaylist;
            
            // Disparar evento
            dispatchPlaylistChangedEvent('update', updatedPlaylist);
            
            return updatedPlaylist;
        });
    }
    
    /**
     * Elimina una playlist
     * @param {string} playlistId - ID de la playlist a eliminar
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function deletePlaylist(playlistId) {
        if (!firebase.auth().currentUser) {
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        
        const uid = firebase.auth().currentUser.uid;
        const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return Promise.reject(new Error('Playlist no encontrada'));
        }
        
        // Guardar referencia para evento
        const deletedPlaylist = _userPlaylists[playlistIndex];
        
        return firebase.database().ref(`users/${uid}/playlists/${playlistId}`).remove()
            .then(() => {
                // Eliminar de caché local
                _userPlaylists.splice(playlistIndex, 1);
                
                // Disparar evento
                dispatchPlaylistChangedEvent('delete', deletedPlaylist);
                
                return playlistId;
            });
    }
    
    /**
     * Añade una canción a una playlist
     * @param {Object} song - Objeto con datos de la canción
     * @param {string} playlistId - ID de la playlist
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function addSongToPlaylist(song, playlistId) {
        if (!firebase.auth().currentUser) {
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        
        const uid = firebase.auth().currentUser.uid;
        const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return Promise.reject(new Error('Playlist no encontrada'));
        }
        
        // Verificar si la canción ya está en la playlist
        const playlist = _userPlaylists[playlistIndex];
        
        if (playlist.songs && playlist.songs[song.id]) {
            return Promise.resolve(playlist); // Ya existe, no hacer nada
        }
        
        // Añadir canción a la playlist
        return firebase.database().ref(`users/${uid}/playlists/${playlistId}/songs/${song.id}`).set({
            ...song,
            added_at: Date.now()
        })
        .then(() => {
            // Actualizar timestamp de la playlist
            return firebase.database().ref(`users/${uid}/playlists/${playlistId}/updated_at`).set(Date.now());
        })
        .then(() => {
            // Actualizar caché local
            if (!_userPlaylists[playlistIndex].songs) {
                _userPlaylists[playlistIndex].songs = {};
            }
            
            _userPlaylists[playlistIndex].songs[song.id] = {
                ...song,
                added_at: Date.now()
            };
            
            _userPlaylists[playlistIndex].updated_at = Date.now();
            
            // Disparar evento
            dispatchPlaylistChangedEvent('addSong', _userPlaylists[playlistIndex], song);
            
            return _userPlaylists[playlistIndex];
        });
    }
    
    /**
     * Elimina una canción de una playlist
     * @param {string} songId - ID de la canción a eliminar
     * @param {string} playlistId - ID de la playlist
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function removeSongFromPlaylist(songId, playlistId) {
        if (!firebase.auth().currentUser) {
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        
        const uid = firebase.auth().currentUser.uid;
        const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
        
        if (playlistIndex === -1) {
            return Promise.reject(new Error('Playlist no encontrada'));
        }
        
        // Verificar si la canción está en la playlist
        const playlist = _userPlaylists[playlistIndex];
        
        if (!playlist.songs || !playlist.songs[songId]) {
            return Promise.resolve(playlist); // No existe, no hacer nada
        }
        
        // Guardar referencia para evento
        const removedSong = playlist.songs[songId];
        
        // Eliminar canción de la playlist
        return firebase.database().ref(`users/${uid}/playlists/${playlistId}/songs/${songId}`).remove()
        .then(() => {
            // Actualizar timestamp de la playlist
            return firebase.database().ref(`users/${uid}/playlists/${playlistId}/updated_at`).set(Date.now());
        })
        .then(() => {
            // Actualizar caché local
            delete _userPlaylists[playlistIndex].songs[songId];
            _userPlaylists[playlistIndex].updated_at = Date.now();
            
            // Disparar evento
            dispatchPlaylistChangedEvent('removeSong', _userPlaylists[playlistIndex], removedSong);
            
            return _userPlaylists[playlistIndex];
        });
    }
    
    /**
     * Dispara un evento personalizado cuando hay cambios en playlists
     * @param {string} action - Tipo de acción ('create', 'update', 'delete', 'addSong', 'removeSong')
     * @param {Object} playlist - Playlist afectada
     * @param {Object} song - Canción afectada (solo para addSong y removeSong)
     */
    function dispatchPlaylistChangedEvent(action, playlist, song = null) {
        const event = new CustomEvent(PLAYLIST_CHANGED_EVENT, {
            detail: {
                action,
                playlist,
                song
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * Añade un listener para eventos de cambio en playlists
     * @param {Function} callback - Función a llamar cuando hay cambios
     */
    function addPlaylistChangeListener(callback) {
        document.addEventListener(PLAYLIST_CHANGED_EVENT, (event) => {
            callback(event.detail.action, event.detail.playlist, event.detail.song);
        });
    }
    
    // Exportar funciones públicas
    window.PlaylistManager = {
        init,
        getAllPlaylists,
        getPlaylistById,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        addPlaylistChangeListener
    };
    
    // Auto-inicializar cuando Firebase esté listo
    document.addEventListener('DOMContentLoaded', () => {
        // Verificar si Firebase Auth está disponible
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Esperar a que se inicialice la autenticación
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    // El usuario está autenticado, inicializar sistema de playlists
                    init();
                } else {
                    // No hay usuario autenticado, limpiar datos
                    _userPlaylists = [];
                    _isInitialized = true;
                }
            });
        }
    });
})();