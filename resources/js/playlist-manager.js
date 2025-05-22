// playlist-manager.js - Sistema mejorado de gestión de playlists para MusiFlow
// Este archivo proporciona funciones para manejar playlists entre páginas

/**
 * Módulo que gestiona el sistema de playlists
 * Permite crear, editar y reproducir playlists con sincronización en tiempo real
 */
(function() {
    // Caché local de playlists
    let _userPlaylists = [];
    let _isInitialized = false;
    let _currentUser = null;
    
    // Evento personalizado para notificar cambios en playlists
    const PLAYLIST_CHANGED_EVENT = 'playlistStatusChanged';
    
    /**
     * Inicializa el sistema de playlists
     * @return {Promise} Promesa que se resuelve cuando los datos están cargados
     */
    function init() {
        return new Promise((resolve, reject) => {
            console.log('PlaylistManager: Inicializando sistema de playlists...');
            
            // Verificar si el usuario está autenticado
            if (!firebase.auth().currentUser) {
                console.log('PlaylistManager: Usuario no autenticado, inicializando vacío');
                _userPlaylists = [];
                _isInitialized = true;
                resolve([]);
                return;
            }
            
            _currentUser = firebase.auth().currentUser;
            const uid = _currentUser.uid;
            
            // Cargar playlists desde Firebase
            firebase.database().ref(`users/${uid}/playlists`).once('value')
                .then(snapshot => {
                    const data = snapshot.val() || {};
                    _userPlaylists = Object.values(data);
                    _isInitialized = true;
                    
                    console.log('PlaylistManager: Sistema inicializado correctamente con', _userPlaylists.length, 'playlists');
                    
                    // Actualizar UI después de cargar datos
                    updatePlaylistUIElements();
                    
                    resolve(_userPlaylists);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al inicializar sistema de playlists:', error);
                    _userPlaylists = [];
                    _isInitialized = true;
                    reject(error);
                });
        });
    }
    
    /**
     * Fuerza la reinicialización del sistema (útil después de cambios de usuario)
     * @return {Promise} Promesa que se resuelve cuando se completa la reinicialización
     */
    function reinitialize() {
        console.log('PlaylistManager: Reinicializando sistema...');
        _isInitialized = false;
        _userPlaylists = [];
        _currentUser = null;
        return init();
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
        if (!playlistId) return null;
        return _userPlaylists.find(p => p.id === playlistId) || null;
    }
    
    /**
     * Obtiene el número total de playlists
     * @return {number} Cantidad de playlists del usuario
     */
    function getPlaylistsCount() {
        return _userPlaylists.length;
    }
    
    /**
     * Crea una nueva playlist
     * @param {Object} playlistData - Datos de la nueva playlist
     * @return {Promise} Promesa que se resuelve con la playlist creada
     */
    function createPlaylist(playlistData) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!playlistData || !playlistData.name || !playlistData.name.trim()) {
                reject(new Error('Nombre de playlist requerido'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const timestamp = Date.now();
            const playlistId = `playlist_${uid}_${timestamp}`;
            
            // Crear objeto de playlist con datos completos
            const playlist = {
                id: playlistId,
                name: playlistData.name.trim(),
                description: playlistData.description ? playlistData.description.trim() : '',
                public: playlistData.public || false,
                owner: uid,
                ownerName: _currentUser.displayName || _currentUser.email.split('@')[0],
                created_at: timestamp,
                updated_at: timestamp,
                songs: {}, // Inicialmente vacío
                tags: playlistData.tags || [],
                coverImage: playlistData.coverImage || null
            };
            
            console.log('PlaylistManager: Creando nueva playlist:', playlist.name);
            
            // Guardar en Firebase
            firebase.database().ref(`users/${uid}/playlists/${playlistId}`).set(playlist)
                .then(() => {
                    // Añadir a caché local
                    _userPlaylists.push(playlist);
                    
                    console.log('PlaylistManager: Playlist creada exitosamente');
                    
                    // Disparar evento
                    dispatchPlaylistChangedEvent('create', playlist);
                    
                    // Actualizar UI
                    updatePlaylistUIElements();
                    
                    resolve(playlist);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al crear playlist:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Actualiza una playlist existente
     * @param {string} playlistId - ID de la playlist a actualizar
     * @param {Object} updateData - Datos a actualizar
     * @return {Promise} Promesa que se resuelve con la playlist actualizada
     */
    function updatePlaylist(playlistId, updateData) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!playlistId) {
                reject(new Error('ID de playlist requerido'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
            
            if (playlistIndex === -1) {
                reject(new Error('Playlist no encontrada'));
                return;
            }
            
            // Verificar que el usuario sea el propietario
            if (_userPlaylists[playlistIndex].owner !== uid) {
                reject(new Error('No tienes permisos para editar esta playlist'));
                return;
            }
            
            // Actualizar datos sin modificar campos críticos
            const updatedPlaylist = {
                ..._userPlaylists[playlistIndex],
                ...updateData,
                id: playlistId, // Asegurar que ID no cambia
                owner: uid, // Asegurar que owner no cambia
                created_at: _userPlaylists[playlistIndex].created_at, // Mantener fecha de creación
                updated_at: Date.now() // Actualizar timestamp
            };
            
            // Campos que se pueden actualizar
            const allowedFields = ['name', 'description', 'public', 'tags', 'coverImage'];
            const updateFields = {};
            
            allowedFields.forEach(field => {
                if (updateData.hasOwnProperty(field)) {
                    updateFields[field] = updateData[field];
                }
            });
            
            updateFields.updated_at = updatedPlaylist.updated_at;
            
            console.log('PlaylistManager: Actualizando playlist:', updatedPlaylist.name);
            
            // Actualizar en Firebase
            firebase.database().ref(`users/${uid}/playlists/${playlistId}`).update(updateFields)
                .then(() => {
                    // Actualizar en caché local
                    _userPlaylists[playlistIndex] = updatedPlaylist;
                    
                    console.log('PlaylistManager: Playlist actualizada exitosamente');
                    
                    // Disparar evento
                    dispatchPlaylistChangedEvent('update', updatedPlaylist);
                    
                    // Actualizar UI
                    updatePlaylistUIElements();
                    
                    resolve(updatedPlaylist);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al actualizar playlist:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Elimina una playlist
     * @param {string} playlistId - ID de la playlist a eliminar
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function deletePlaylist(playlistId) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!playlistId) {
                reject(new Error('ID de playlist requerido'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
            
            if (playlistIndex === -1) {
                reject(new Error('Playlist no encontrada'));
                return;
            }
            
            // Verificar que el usuario sea el propietario
            if (_userPlaylists[playlistIndex].owner !== uid) {
                reject(new Error('No tienes permisos para eliminar esta playlist'));
                return;
            }
            
            // Guardar referencia para evento
            const deletedPlaylist = _userPlaylists[playlistIndex];
            
            console.log('PlaylistManager: Eliminando playlist:', deletedPlaylist.name);
            
            // Eliminar de Firebase
            firebase.database().ref(`users/${uid}/playlists/${playlistId}`).remove()
                .then(() => {
                    // Eliminar de caché local
                    _userPlaylists.splice(playlistIndex, 1);
                    
                    console.log('PlaylistManager: Playlist eliminada exitosamente');
                    
                    // Disparar evento
                    dispatchPlaylistChangedEvent('delete', deletedPlaylist);
                    
                    // Actualizar UI
                    updatePlaylistUIElements();
                    
                    resolve(playlistId);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al eliminar playlist:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Añade una canción a una playlist
     * @param {Object} song - Objeto con datos de la canción
     * @param {string} playlistId - ID de la playlist
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function addSongToPlaylist(song, playlistId) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!song || !song.id) {
                reject(new Error('Datos de canción inválidos: se requiere ID'));
                return;
            }
            
            if (!playlistId) {
                reject(new Error('ID de playlist requerido'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
            
            if (playlistIndex === -1) {
                reject(new Error('Playlist no encontrada'));
                return;
            }
            
            // Verificar que el usuario sea el propietario
            if (_userPlaylists[playlistIndex].owner !== uid) {
                reject(new Error('No tienes permisos para modificar esta playlist'));
                return;
            }
            
            // Verificar si la canción ya está en la playlist
            const playlist = _userPlaylists[playlistIndex];
            
            if (playlist.songs && playlist.songs[song.id]) {
                reject(new Error('Esta canción ya está en la playlist'));
                return;
            }
            
            const timestamp = Date.now();
            
            // Preparar datos de la canción con metadatos adicionales
            const songData = {
                id: song.id,
                title: song.title || 'Título desconocido',
                artist: song.artist || 'Artista desconocido',
                album: song.album || 'Álbum desconocido',
                image: song.image || 'resources/album covers/placeholder.png',
                duration: song.duration || '0:00',
                source: song.source || '',
                sourceOrigin: song.sourceOrigin || (song.source === 'spotify' ? 'spotify' : 'local'),
                externalUrl: song.externalUrl || '',
                added_at: timestamp,
                added_by: uid
            };
            
            console.log('PlaylistManager: Añadiendo canción a playlist:', songData.title, '→', playlist.name);
            
            // Añadir canción a la playlist en Firebase
            firebase.database().ref(`users/${uid}/playlists/${playlistId}/songs/${song.id}`).set(songData)
                .then(() => {
                    // Actualizar timestamp de la playlist
                    return firebase.database().ref(`users/${uid}/playlists/${playlistId}/updated_at`).set(timestamp);
                })
                .then(() => {
                    // Actualizar caché local
                    if (!_userPlaylists[playlistIndex].songs) {
                        _userPlaylists[playlistIndex].songs = {};
                    }
                    
                    _userPlaylists[playlistIndex].songs[song.id] = songData;
                    _userPlaylists[playlistIndex].updated_at = timestamp;
                    
                    console.log('PlaylistManager: Canción añadida exitosamente a la playlist');
                    
                    // Disparar evento
                    dispatchPlaylistChangedEvent('addSong', _userPlaylists[playlistIndex], songData);
                    
                    // Actualizar UI
                    updatePlaylistUIElements();
                    
                    resolve(_userPlaylists[playlistIndex]);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al añadir canción a playlist:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Elimina una canción de una playlist
     * @param {string} songId - ID de la canción a eliminar
     * @param {string} playlistId - ID de la playlist
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function removeSongFromPlaylist(songId, playlistId) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!songId) {
                reject(new Error('ID de canción requerido'));
                return;
            }
            
            if (!playlistId) {
                reject(new Error('ID de playlist requerido'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const playlistIndex = _userPlaylists.findIndex(p => p.id === playlistId);
            
            if (playlistIndex === -1) {
                reject(new Error('Playlist no encontrada'));
                return;
            }
            
            // Verificar que el usuario sea el propietario
            if (_userPlaylists[playlistIndex].owner !== uid) {
                reject(new Error('No tienes permisos para modificar esta playlist'));
                return;
            }
            
            // Verificar si la canción está en la playlist
            const playlist = _userPlaylists[playlistIndex];
            
            if (!playlist.songs || !playlist.songs[songId]) {
                reject(new Error('Esta canción no está en la playlist'));
                return;
            }
            
            // Guardar referencia para evento
            const removedSong = playlist.songs[songId];
            const timestamp = Date.now();
            
            console.log('PlaylistManager: Eliminando canción de playlist:', removedSong.title, '→', playlist.name);
            
            // Eliminar canción de la playlist en Firebase
            firebase.database().ref(`users/${uid}/playlists/${playlistId}/songs/${songId}`).remove()
                .then(() => {
                    // Actualizar timestamp de la playlist
                    return firebase.database().ref(`users/${uid}/playlists/${playlistId}/updated_at`).set(timestamp);
                })
                .then(() => {
                    // Actualizar caché local
                    delete _userPlaylists[playlistIndex].songs[songId];
                    _userPlaylists[playlistIndex].updated_at = timestamp;
                    
                    console.log('PlaylistManager: Canción eliminada exitosamente de la playlist');
                    
                    // Disparar evento
                    dispatchPlaylistChangedEvent('removeSong', _userPlaylists[playlistIndex], removedSong);
                    
                    // Actualizar UI
                    updatePlaylistUIElements();
                    
                    resolve(_userPlaylists[playlistIndex]);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al eliminar canción de playlist:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Obtiene todas las canciones de una playlist
     * @param {string} playlistId - ID de la playlist
     * @return {Array} Array con las canciones de la playlist
     */
    function getPlaylistSongs(playlistId) {
        const playlist = getPlaylistById(playlistId);
        if (!playlist || !playlist.songs) {
            return [];
        }
        
        // Convertir objeto de canciones a array y ordenar por fecha de adición
        return Object.values(playlist.songs).sort((a, b) => (a.added_at || 0) - (b.added_at || 0));
    }
    
    /**
     * Duplica una playlist existente
     * @param {string} playlistId - ID de la playlist a duplicar
     * @param {string} newName - Nombre para la nueva playlist (opcional)
     * @return {Promise} Promesa que se resuelve con la nueva playlist
     */
    function duplicatePlaylist(playlistId, newName = null) {
        return new Promise((resolve, reject) => {
            const originalPlaylist = getPlaylistById(playlistId);
            
            if (!originalPlaylist) {
                reject(new Error('Playlist original no encontrada'));
                return;
            }
            
            // Crear datos para la nueva playlist
            const duplicatedPlaylistData = {
                name: newName || `${originalPlaylist.name} (Copia)`,
                description: originalPlaylist.description ? `Copia de: ${originalPlaylist.description}` : `Copia de ${originalPlaylist.name}`,
                public: false, // Las copias son privadas por defecto
                tags: [...(originalPlaylist.tags || [])],
                coverImage: originalPlaylist.coverImage
            };
            
            console.log('PlaylistManager: Duplicando playlist:', originalPlaylist.name);
            
            // Crear la nueva playlist
            createPlaylist(duplicatedPlaylistData)
                .then(newPlaylist => {
                    // Si la playlist original tiene canciones, copiarlas
                    if (originalPlaylist.songs && Object.keys(originalPlaylist.songs).length > 0) {
                        const songs = Object.values(originalPlaylist.songs);
                        const copyPromises = songs.map(song => addSongToPlaylist(song, newPlaylist.id));
                        
                        return Promise.all(copyPromises).then(() => newPlaylist);
                    }
                    
                    return newPlaylist;
                })
                .then(newPlaylist => {
                    console.log('PlaylistManager: Playlist duplicada exitosamente');
                    resolve(newPlaylist);
                })
                .catch(error => {
                    console.error('PlaylistManager: Error al duplicar playlist:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Busca playlists por nombre o descripción
     * @param {string} query - Texto a buscar
     * @return {Array} Array con playlists que coinciden con la búsqueda
     */
    function searchPlaylists(query) {
        if (!query || !query.trim()) {
            return getAllPlaylists();
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return _userPlaylists.filter(playlist => {
            return playlist.name.toLowerCase().includes(searchTerm) ||
                   (playlist.description && playlist.description.toLowerCase().includes(searchTerm)) ||
                   (playlist.tags && playlist.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        });
    }
    
    /**
     * Obtiene estadísticas de las playlists del usuario
     * @return {Object} Objeto con estadísticas detalladas
     */
    function getStatistics() {
        const stats = {
            totalPlaylists: _userPlaylists.length,
            totalSongs: 0,
            publicPlaylists: 0,
            privatePlaylists: 0,
            sourceDistribution: {
                local: 0,
                spotify: 0,
                other: 0
            },
            averageSongsPerPlaylist: 0,
            oldestPlaylist: null,
            newestPlaylist: null,
            mostPopularTags: {},
            playlistsCreatedThisWeek: 0,
            playlistsCreatedThisMonth: 0
        };
        
        if (_userPlaylists.length === 0) {
            return stats;
        }
        
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        
        _userPlaylists.forEach(playlist => {
            // Conteo básico
            const songCount = playlist.songs ? Object.keys(playlist.songs).length : 0;
            stats.totalSongs += songCount;
            
            if (playlist.public) {
                stats.publicPlaylists++;
            } else {
                stats.privatePlaylists++;
            }
            
            // Análisis de canciones por fuente
            if (playlist.songs) {
                Object.values(playlist.songs).forEach(song => {
                    const source = song.sourceOrigin || 'other';
                    if (stats.sourceDistribution.hasOwnProperty(source)) {
                        stats.sourceDistribution[source]++;
                    } else {
                        stats.sourceDistribution.other++;
                    }
                });
            }
            
            // Análisis temporal
            const createdAt = playlist.created_at || 0;
            if (createdAt > now - oneWeek) {
                stats.playlistsCreatedThisWeek++;
            }
            if (createdAt > now - oneMonth) {
                stats.playlistsCreatedThisMonth++;
            }
            
            // Playlist más antigua y más nueva
            if (!stats.oldestPlaylist || createdAt < stats.oldestPlaylist.created_at) {
                stats.oldestPlaylist = playlist;
            }
            if (!stats.newestPlaylist || createdAt > stats.newestPlaylist.created_at) {
                stats.newestPlaylist = playlist;
            }
            
            // Análisis de tags
            if (playlist.tags) {
                playlist.tags.forEach(tag => {
                    stats.mostPopularTags[tag] = (stats.mostPopularTags[tag] || 0) + 1;
                });
            }
        });
        
        stats.averageSongsPerPlaylist = stats.totalPlaylists > 0 ? 
            Math.round(stats.totalSongs / stats.totalPlaylists * 100) / 100 : 0;
        
        return stats;
    }
    
    /**
     * Sincroniza los datos locales con Firebase
     * @return {Promise} Promesa que se resuelve cuando se completa la sincronización
     */
    function syncWithFirebase() {
        return new Promise((resolve, reject) => {
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            
            console.log('PlaylistManager: Sincronizando con Firebase...');
            
            firebase.database().ref(`users/${uid}/playlists`).once('value')
                .then(snapshot => {
                    const firebaseData = snapshot.val() || {};
                    const firebasePlaylists = Object.values(firebaseData);
                    const localCount = _userPlaylists.length;
                    const firebaseCount = firebasePlaylists.length;
                    
                    console.log('PlaylistManager: Sincronización - Local:', localCount, 'Firebase:', firebaseCount);
                    
                    // Detectar cambios
                    const addedPlaylists = [];
                    const removedPlaylists = [];
                    const updatedPlaylists = [];
                    
                    // Buscar playlists añadidas o actualizadas en Firebase
                    firebasePlaylists.forEach(firebasePlaylist => {
                        const localPlaylist = _userPlaylists.find(p => p.id === firebasePlaylist.id);
                        
                        if (!localPlaylist) {
                            addedPlaylists.push(firebasePlaylist);
                        } else if (firebasePlaylist.updated_at > localPlaylist.updated_at) {
                            updatedPlaylists.push(firebasePlaylist);
                        }
                    });
                    
                    // Buscar playlists eliminadas en Firebase
                    _userPlaylists.forEach(localPlaylist => {
                        const firebasePlaylist = firebasePlaylists.find(p => p.id === localPlaylist.id);
                        if (!firebasePlaylist) {
                            removedPlaylists.push(localPlaylist);
                        }
                    });
                    
                    // Actualizar caché local
                    _userPlaylists = [...firebasePlaylists];
                    
                    // Disparar eventos para cambios detectados
                    addedPlaylists.forEach(playlist => {
                        dispatchPlaylistChangedEvent('create', playlist);
                    });
                    
                    updatedPlaylists.forEach(playlist => {
                        dispatchPlaylistChangedEvent('update', playlist);
                    });
                    
                    removedPlaylists.forEach(playlist => {
                        dispatchPlaylistChangedEvent('delete', playlist);
                    });
                    
                    // Actualizar UI
                    updatePlaylistUIElements();
                    
                    console.log('PlaylistManager: Sincronización completada -', 
                        addedPlaylists.length, 'añadidas,', 
                        updatedPlaylists.length, 'actualizadas,',
                        removedPlaylists.length, 'eliminadas');
                    
                    resolve({
                        totalPlaylists: _userPlaylists.length,
                        addedPlaylists: addedPlaylists.length,
                        updatedPlaylists: updatedPlaylists.length,
                        removedPlaylists: removedPlaylists.length
                    });
                })
                .catch(error => {
                    console.error('PlaylistManager: Error durante sincronización:', error);
                    reject(error);
                });
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
                song,
                timestamp: Date.now(),
                totalPlaylists: _userPlaylists.length,
                totalSongs: _userPlaylists.reduce((total, p) => total + (p.songs ? Object.keys(p.songs).length : 0), 0)
            }
        });
        
        console.log('PlaylistManager: Disparando evento de cambio de playlist:', action, '→', playlist.name);
        document.dispatchEvent(event);
    }
    
    /**
     * Añade un listener para eventos de cambio en playlists
     * @param {Function} callback - Función a llamar cuando hay cambios
     */
    function addPlaylistChangeListener(callback) {
        if (typeof callback !== 'function') {
            console.error('PlaylistManager: addPlaylistChangeListener requiere una función como parámetro');
            return;
        }
        
        document.addEventListener(PLAYLIST_CHANGED_EVENT, (event) => {
            try {
                callback(event.detail.action, event.detail.playlist, event.detail.song);
            } catch (error) {
                console.error('PlaylistManager: Error en callback de cambio de playlist:', error);
            }
        });
        
        console.log('PlaylistManager: Listener de cambios añadido correctamente');
    }
    
    /**
     * Actualiza la interfaz de usuario con el estado actual de playlists
     */
    function updatePlaylistUIElements() {
        console.log('PlaylistManager: Actualizando elementos UI con', _userPlaylists.length, 'playlists');
        
        // Actualizar contadores si existen
        const playlistCountElements = document.querySelectorAll('#playlistsCount, .playlist-count, [data-playlist-count]');
        playlistCountElements.forEach(element => {
            element.textContent = _userPlaylists.length;
        });
        
        // Disparar evento de actualización de UI si es necesario
        const uiUpdateEvent = new CustomEvent('playlistUIUpdate', {
            detail: {
                totalPlaylists: _userPlaylists.length,
                playlists: [..._userPlaylists]
            }
        });
        document.dispatchEvent(uiUpdateEvent);
    }
    
    // Exportar funciones públicas
    window.PlaylistManager = {
        // Inicialización
        init,
        reinitialize,
        
        // Consultas básicas
        getAllPlaylists,
        getPlaylistById,
        getPlaylistsCount,
        getPlaylistSongs,
        searchPlaylists,
        getStatistics,
        
        // Operaciones de playlist
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        duplicatePlaylist,
        
        // Operaciones de canciones
        addSongToPlaylist,
        removeSongFromPlaylist,
        
        // Sincronización
        syncWithFirebase,
        
        // Eventos
        addPlaylistChangeListener,
        
        // UI
        updatePlaylistUIElements
    };
    
    // Auto-inicializar cuando Firebase esté listo
    document.addEventListener('DOMContentLoaded', () => {
        console.log('PlaylistManager: DOM cargado, configurando auto-inicialización...');
        
        // Verificar si Firebase Auth está disponible
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Esperar a que se inicialice la autenticación
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    console.log('PlaylistManager: Usuario autenticado detectado, inicializando...');
                    // El usuario está autenticado, inicializar sistema de playlists
                    init().then(() => {
                        console.log('PlaylistManager: Auto-inicialización completada exitosamente');
                    }).catch(error => {
                        console.error('PlaylistManager: Error durante auto-inicialización:', error);
                    });
                } else {
                    console.log('PlaylistManager: Usuario no autenticado, limpiando datos locales');
                    // No hay usuario autenticado, limpiar datos
                    _userPlaylists = [];
                    _isInitialized = true;
                    _currentUser = null;
                    
                    // Actualizar UI para reflejar estado sin autenticación
                    updatePlaylistUIElements();
                }
            });
        } else {
            console.warn('PlaylistManager: Firebase no disponible durante inicialización automática');
        }
    });
    
    // Configurar sincronización periódica (opcional)
    setInterval(() => {
        if (_isInitialized && _currentUser) {
            console.log('PlaylistManager: Sincronización automática programada ejecutándose...');
            syncWithFirebase().catch(error => {
                console.error('PlaylistManager: Error en sincronización automática:', error);
            });
        }
    }, 10 * 60 * 1000); // Cada 10 minutos
    
    console.log('PlaylistManager: Módulo cargado correctamente');
})();