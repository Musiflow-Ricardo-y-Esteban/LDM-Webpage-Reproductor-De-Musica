// firebase-likes.js - Sistema completo de gestión de likes para MusiFlow

/**
 * Módulo que gestiona el sistema de "me gusta" para canciones
 * Permite marcar canciones como favoritas con sincronización en Firebase
 */
(function() {
    // Variables globales del módulo
    let _likedSongs = {}; // Caché local de canciones favoritas
    let _isInitialized = false; // Estado de inicialización
    let _currentUser = null; // Usuario actual
    
    // Constantes
    const LIKE_CHANGED_EVENT = 'likeStatusChanged';
    
    /**
     * Inicializa el sistema de likes
     * @return {Promise} Promesa que se resuelve cuando el sistema está listo
     */
    function init() {
        return new Promise((resolve, reject) => {
            console.log('LikesManager: Inicializando sistema de likes...');
            
            // Verificar si Firebase está disponible
            if (typeof firebase === 'undefined') {
                console.error('LikesManager: Firebase no está disponible');
                reject(new Error('Firebase no disponible'));
                return;
            }
            
            // Verificar si el usuario está autenticado
            if (!firebase.auth().currentUser) {
                console.log('LikesManager: Usuario no autenticado, inicializando vacío');
                _likedSongs = {};
                _isInitialized = true;
                resolve({});
                return;
            }
            
            _currentUser = firebase.auth().currentUser;
            const uid = _currentUser.uid;
            
            // Cargar likes desde Firebase
            firebase.database().ref(`users/${uid}/liked_songs`).once('value')
                .then(snapshot => {
                    const data = snapshot.val() || {};
                    _likedSongs = { ...data }; // Crear copia para evitar referencias directas
                    _isInitialized = true;
                    
                    console.log('LikesManager: Sistema inicializado correctamente con', Object.keys(_likedSongs).length, 'likes');
                    
                    // Actualizar UI después de cargar datos
                    updateLikeUIElements();
                    
                    resolve(_likedSongs);
                })
                .catch(error => {
                    console.error('LikesManager: Error al inicializar sistema de likes:', error);
                    _likedSongs = {};
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
        console.log('LikesManager: Reinicializando sistema...');
        _isInitialized = false;
        _likedSongs = {};
        _currentUser = null;
        return init();
    }
    
    /**
     * Verifica si una canción está marcada como favorita
     * @param {string} songId - ID de la canción a verificar
     * @return {boolean} True si la canción está marcada como favorita
     */
    function isLiked(songId) {
        if (!songId || !_isInitialized) return false;
        return !!_likedSongs[songId];
    }
    
    /**
     * Obtiene todas las canciones favoritas
     * @return {Object} Objeto con todas las canciones favoritas
     */
    function getAllLikedSongs() {
        return { ..._likedSongs }; // Devolver copia para evitar modificaciones externas
    }
    
    /**
     * Obtiene el número total de canciones favoritas
     * @return {number} Cantidad de canciones favoritas
     */
    function getLikedSongsCount() {
        return Object.keys(_likedSongs).length;
    }
    
    /**
     * Obtiene una canción favorita específica por ID
     * @param {string} songId - ID de la canción a buscar
     * @return {Object|null} Datos de la canción o null si no existe
     */
    function getLikedSong(songId) {
        if (!songId || !_likedSongs[songId]) return null;
        return { ..._likedSongs[songId] }; // Devolver copia
    }
    
    /**
     * Alterna el estado de "me gusta" de una canción
     * @param {Object} song - Objeto con datos de la canción
     * @return {Promise} Promesa que se resuelve con el nuevo estado (true/false)
     */
    function toggleLike(song) {
        return new Promise((resolve, reject) => {
            if (!song || !song.id) {
                reject(new Error('Datos de canción inválidos'));
                return;
            }
            
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            const isCurrentlyLiked = isLiked(song.id);
            
            if (isCurrentlyLiked) {
                // Si ya está marcada como favorita, quitarla
                removeSongFromLiked(song.id)
                    .then(() => resolve(false))
                    .catch(reject);
            } else {
                // Si no está marcada como favorita, añadirla
                addSongToLiked(song)
                    .then(() => resolve(true))
                    .catch(reject);
            }
        });
    }
    
    /**
     * Añade una canción a favoritos
     * @param {Object} song - Objeto con datos de la canción
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function addSongToLiked(song) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!song || !song.id) {
                reject(new Error('Datos de canción inválidos: se requiere ID'));
                return;
            }
            
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            // Verificar si ya está en favoritos
            if (isLiked(song.id)) {
                reject(new Error('Esta canción ya está en favoritos'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const timestamp = Date.now();
            
            // Preparar datos completos de la canción
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
            
            console.log('LikesManager: Añadiendo canción a favoritos:', songData.title);
            
            // Guardar en Firebase
            firebase.database().ref(`users/${uid}/liked_songs/${song.id}`).set(songData)
                .then(() => {
                    // Actualizar caché local
                    _likedSongs[song.id] = songData;
                    
                    console.log('LikesManager: Canción añadida a favoritos exitosamente');
                    
                    // Disparar evento de cambio
                    dispatchLikeChangedEvent(song.id, true, songData);
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    resolve(songData);
                })
                .catch(error => {
                    console.error('LikesManager: Error al añadir canción a favoritos:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Elimina una canción de favoritos
     * @param {string} songId - ID de la canción a eliminar
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function removeSongFromLiked(songId) {
        return new Promise((resolve, reject) => {
            // Validaciones
            if (!songId) {
                reject(new Error('ID de canción requerido'));
                return;
            }
            
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            // Verificar si la canción está en favoritos
            if (!isLiked(songId)) {
                reject(new Error('Esta canción no está en favoritos'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            
            // Guardar referencia de la canción antes de eliminarla
            const removedSong = _likedSongs[songId];
            
            console.log('LikesManager: Eliminando canción de favoritos:', removedSong.title);
            
            // Eliminar de Firebase
            firebase.database().ref(`users/${uid}/liked_songs/${songId}`).remove()
                .then(() => {
                    // Eliminar del caché local
                    delete _likedSongs[songId];
                    
                    console.log('LikesManager: Canción eliminada de favoritos exitosamente');
                    
                    // Disparar evento de cambio
                    dispatchLikeChangedEvent(songId, false, removedSong);
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    resolve(songId);
                })
                .catch(error => {
                    console.error('LikesManager: Error al eliminar canción de favoritos:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Busca canciones favoritas por título o artista
     * @param {string} query - Texto a buscar
     * @return {Array} Array con canciones que coinciden con la búsqueda
     */
    function searchLikedSongs(query) {
        if (!query || !query.trim()) {
            return Object.values(_likedSongs);
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return Object.values(_likedSongs).filter(song => {
            return song.title.toLowerCase().includes(searchTerm) ||
                   song.artist.toLowerCase().includes(searchTerm) ||
                   song.album.toLowerCase().includes(searchTerm);
        });
    }
    
    /**
     * Obtiene canciones favoritas ordenadas por diferentes criterios
     * @param {string} sortBy - Criterio de ordenación ('date', 'title', 'artist', 'album')
     * @param {string} order - Orden ('asc' o 'desc')
     * @return {Array} Array ordenado de canciones favoritas
     */
    function getSortedLikedSongs(sortBy = 'date', order = 'desc') {
        const songs = Object.values(_likedSongs);
        
        return songs.sort((a, b) => {
            let compareResult = 0;
            
            switch (sortBy) {
                case 'date':
                    compareResult = (a.added_at || 0) - (b.added_at || 0);
                    break;
                case 'title':
                    compareResult = a.title.localeCompare(b.title);
                    break;
                case 'artist':
                    compareResult = a.artist.localeCompare(b.artist);
                    break;
                case 'album':
                    compareResult = a.album.localeCompare(b.album);
                    break;
                default:
                    compareResult = (a.added_at || 0) - (b.added_at || 0);
            }
            
            return order === 'desc' ? -compareResult : compareResult;
        });
    }
    
    /**
     * Obtiene estadísticas de las canciones favoritas
     * @return {Object} Objeto con estadísticas detalladas
     */
    function getLikedSongsStatistics() {
        const songs = Object.values(_likedSongs);
        const stats = {
            totalSongs: songs.length,
            sourceDistribution: {
                local: 0,
                spotify: 0,
                other: 0
            },
            artistsCount: 0,
            albumsCount: 0,
            mostLikedArtists: {},
            mostLikedAlbums: {},
            recentlyAdded: [],
            oldestLiked: null,
            newestLiked: null
        };
        
        if (songs.length === 0) {
            return stats;
        }
        
        const uniqueArtists = new Set();
        const uniqueAlbums = new Set();
        
        songs.forEach(song => {
            // Distribución por fuente
            const source = song.sourceOrigin || 'other';
            if (stats.sourceDistribution.hasOwnProperty(source)) {
                stats.sourceDistribution[source]++;
            } else {
                stats.sourceDistribution.other++;
            }
            
            // Artistas únicos
            if (song.artist) {
                uniqueArtists.add(song.artist);
                stats.mostLikedArtists[song.artist] = (stats.mostLikedArtists[song.artist] || 0) + 1;
            }
            
            // Álbumes únicos
            if (song.album) {
                uniqueAlbums.add(song.album);
                stats.mostLikedAlbums[song.album] = (stats.mostLikedAlbums[song.album] || 0) + 1;
            }
            
            // Fechas de adición
            const addedAt = song.added_at || 0;
            if (!stats.oldestLiked || addedAt < stats.oldestLiked.added_at) {
                stats.oldestLiked = song;
            }
            if (!stats.newestLiked || addedAt > stats.newestLiked.added_at) {
                stats.newestLiked = song;
            }
        });
        
        stats.artistsCount = uniqueArtists.size;
        stats.albumsCount = uniqueAlbums.size;
        
        // Canciones añadidas recientemente (últimos 7 días)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        stats.recentlyAdded = songs.filter(song => (song.added_at || 0) > weekAgo);
        
        return stats;
    }
    
    /**
     * Exporta las canciones favoritas a diferentes formatos
     * @param {string} format - Formato de exportación ('json', 'csv', 'txt')
     * @return {string} Datos exportados en el formato especificado
     */
    function exportLikedSongs(format = 'json') {
        const songs = Object.values(_likedSongs);
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(songs, null, 2);
                
            case 'csv':
                if (songs.length === 0) return '';
                
                const headers = ['Título', 'Artista', 'Álbum', 'Duración', 'Fuente', 'Fecha de Adición'];
                const csvRows = [headers.join(',')];
                
                songs.forEach(song => {
                    const row = [
                        `"${song.title}"`,
                        `"${song.artist}"`,
                        `"${song.album}"`,
                        `"${song.duration}"`,
                        `"${song.sourceOrigin || 'local'}"`,
                        `"${new Date(song.added_at || 0).toLocaleDateString()}"`
                    ];
                    csvRows.push(row.join(','));
                });
                
                return csvRows.join('\n');
                
            case 'txt':
                if (songs.length === 0) return 'No hay canciones favoritas.';
                
                let txtOutput = 'MIS CANCIONES FAVORITAS\n';
                txtOutput += '========================\n\n';
                
                songs.forEach((song, index) => {
                    txtOutput += `${index + 1}. ${song.title}\n`;
                    txtOutput += `   Artista: ${song.artist}\n`;
                    txtOutput += `   Álbum: ${song.album}\n`;
                    txtOutput += `   Duración: ${song.duration}\n`;
                    txtOutput += `   Fuente: ${song.sourceOrigin || 'local'}\n`;
                    txtOutput += `   Añadida: ${new Date(song.added_at || 0).toLocaleDateString()}\n\n`;
                });
                
                return txtOutput;
                
            default:
                throw new Error('Formato de exportación no soportado');
        }
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
            
            console.log('LikesManager: Sincronizando con Firebase...');
            
            firebase.database().ref(`users/${uid}/liked_songs`).once('value')
                .then(snapshot => {
                    const firebaseData = snapshot.val() || {};
                    const localCount = Object.keys(_likedSongs).length;
                    const firebaseCount = Object.keys(firebaseData).length;
                    
                    console.log('LikesManager: Sincronización - Local:', localCount, 'Firebase:', firebaseCount);
                    
                    // Detectar cambios
                    const addedSongs = [];
                    const removedSongs = [];
                    const updatedSongs = [];
                    
                    // Buscar canciones añadidas o actualizadas en Firebase
                    Object.keys(firebaseData).forEach(songId => {
                        const firebaseSong = firebaseData[songId];
                        const localSong = _likedSongs[songId];
                        
                        if (!localSong) {
                            addedSongs.push(firebaseSong);
                        } else if (firebaseSong.added_at !== localSong.added_at) {
                            updatedSongs.push(firebaseSong);
                        }
                    });
                    
                    // Buscar canciones eliminadas en Firebase
                    Object.keys(_likedSongs).forEach(songId => {
                        if (!firebaseData[songId]) {
                            removedSongs.push(_likedSongs[songId]);
                        }
                    });
                    
                    // Actualizar caché local
                    _likedSongs = { ...firebaseData };
                    
                    // Disparar eventos para cambios detectados
                    addedSongs.forEach(song => {
                        dispatchLikeChangedEvent(song.id, true, song);
                    });
                    
                    removedSongs.forEach(song => {
                        dispatchLikeChangedEvent(song.id, false, song);
                    });
                    
                    updatedSongs.forEach(song => {
                        dispatchLikeChangedEvent(song.id, true, song);
                    });
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    console.log('LikesManager: Sincronización completada -', 
                        addedSongs.length, 'añadidas,', 
                        updatedSongs.length, 'actualizadas,',
                        removedSongs.length, 'eliminadas');
                    
                    resolve({
                        totalLikedSongs: Object.keys(_likedSongs).length,
                        addedSongs: addedSongs.length,
                        updatedSongs: updatedSongs.length,
                        removedSongs: removedSongs.length
                    });
                })
                .catch(error => {
                    console.error('LikesManager: Error durante sincronización:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Dispara un evento personalizado cuando hay cambios en likes
     * @param {string} songId - ID de la canción afectada
     * @param {boolean} isLiked - Nuevo estado de like
     * @param {Object} songData - Datos de la canción
     */
    function dispatchLikeChangedEvent(songId, isLiked, songData) {
        const event = new CustomEvent(LIKE_CHANGED_EVENT, {
            detail: {
                songId,
                isLiked,
                songData,
                timestamp: Date.now(),
                totalLikedSongs: Object.keys(_likedSongs).length
            }
        });
        
        console.log('LikesManager: Disparando evento de cambio de like:', songId, '→', isLiked);
        document.dispatchEvent(event);
    }
    
    /**
     * Añade un listener para eventos de cambio en likes
     * @param {Function} callback - Función a llamar cuando hay cambios
     */
    function addLikeChangeListener(callback) {
        if (typeof callback !== 'function') {
            console.error('LikesManager: addLikeChangeListener requiere una función como parámetro');
            return;
        }
        
        document.addEventListener(LIKE_CHANGED_EVENT, (event) => {
            try {
                callback(event.detail.songId, event.detail.isLiked, event.detail.songData);
            } catch (error) {
                console.error('LikesManager: Error en callback de cambio de like:', error);
            }
        });
        
        console.log('LikesManager: Listener de cambios añadido correctamente');
    }
    
    /**
     * Actualiza la interfaz de usuario con el estado actual de likes
     */
    function updateLikeUIElements() {
        const likedCount = Object.keys(_likedSongs).length;
        console.log('LikesManager: Actualizando elementos UI con', likedCount, 'likes');
        
        // Actualizar contadores si existen
        const likeCountElements = document.querySelectorAll('#likedSongsCount, .liked-count, [data-liked-count]');
        likeCountElements.forEach(element => {
            element.textContent = likedCount;
        });
        
        // Actualizar botones de like en la interfaz
        Object.keys(_likedSongs).forEach(songId => {
            updateLikeButtonUI(songId, true);
        });
        
        // Disparar evento de actualización de UI si es necesario
        const uiUpdateEvent = new CustomEvent('likeUIUpdate', {
            detail: {
                totalLikedSongs: likedCount,
                likedSongs: { ..._likedSongs }
            }
        });
        document.dispatchEvent(uiUpdateEvent);
    }
    
    /**
     * Actualiza el estado visual de un botón de like específico
     * @param {string} songId - ID de la canción
     * @param {boolean} isLiked - Estado de like
     */
    function updateLikeButtonUI(songId, isLiked) {
        // Buscar todos los botones de like para esta canción
        const likeButtons = document.querySelectorAll(`[data-song-id="${songId}"] .like-button, [data-track-id="${songId}"] .like-button`);
        
        likeButtons.forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                icon.style.color = isLiked ? '#1ed760' : '';
            }
            
            button.classList.toggle('active', isLiked);
            button.title = isLiked ? 'Eliminar de favoritos' : 'Añadir a favoritos';
        });
    }
    
    /**
     * Limpia todos los datos de likes (usar con precaución)
     * @return {Promise} Promesa que se resuelve cuando se completa la limpieza
     */
    function clearAllLikedSongs() {
        return new Promise((resolve, reject) => {
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!confirm('¿Estás seguro de que quieres eliminar todas las canciones favoritas? Esta acción no se puede deshacer.')) {
                reject(new Error('Operación cancelada por el usuario'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            
            console.log('LikesManager: Limpiando todas las canciones favoritas...');
            
            firebase.database().ref(`users/${uid}/liked_songs`).remove()
                .then(() => {
                    // Limpiar caché local
                    const clearedSongs = { ..._likedSongs };
                    _likedSongs = {};
                    
                    console.log('LikesManager: Todas las canciones favoritas eliminadas');
                    
                    // Disparar eventos para todas las canciones eliminadas
                    Object.keys(clearedSongs).forEach(songId => {
                        dispatchLikeChangedEvent(songId, false, clearedSongs[songId]);
                    });
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    resolve(Object.keys(clearedSongs).length);
                })
                .catch(error => {
                    console.error('LikesManager: Error al limpiar canciones favoritas:', error);
                    reject(error);
                });
        });
    }
    
    // Exportar funciones públicas
    window.LikesManager = {
        // Inicialización
        init,
        reinitialize,
        
        // Consultas básicas
        isLiked,
        getAllLikedSongs,
        getLikedSongsCount,
        getLikedSong,
        searchLikedSongs,
        getSortedLikedSongs,
        getLikedSongsStatistics,
        
        // Operaciones de like
        toggleLike,
        addSongToLiked,
        removeSongFromLiked,
        clearAllLikedSongs,
        
        // Utilidades
        exportLikedSongs,
        syncWithFirebase,
        
        // Eventos
        addLikeChangeListener,
        
        // UI
        updateLikeUIElements,
        updateLikeButtonUI
    };
    
    // Auto-inicializar cuando Firebase esté listo
    document.addEventListener('DOMContentLoaded', () => {
        console.log('LikesManager: DOM cargado, configurando auto-inicialización...');
        
        // Verificar si Firebase Auth está disponible
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Esperar a que se inicialice la autenticación
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    console.log('LikesManager: Usuario autenticado detectado, inicializando...');
                    // El usuario está autenticado, inicializar sistema de likes
                    init().then(() => {
                        console.log('LikesManager: Auto-inicialización completada exitosamente');
                    }).catch(error => {
                        console.error('LikesManager: Error durante auto-inicialización:', error);
                    });
                } else {
                    console.log('LikesManager: Usuario no autenticado, limpiando datos locales');
                    // No hay usuario autenticado, limpiar datos
                    _likedSongs = {};
                    _isInitialized = true;
                    _currentUser = null;
                    
                    // Actualizar UI para reflejar estado sin autenticación
                    updateLikeUIElements();
                }
            });
        } else {
            console.warn('LikesManager: Firebase no disponible durante inicialización automática');
        }
    });
    
    // Configurar sincronización periódica (opcional)
    setInterval(() => {
        if (_isInitialized && _currentUser) {
            console.log('LikesManager: Sincronización automática programada ejecutándose...');
            syncWithFirebase().catch(error => {
                console.error('LikesManager: Error en sincronización automática:', error);
            });
        }
    }, 15 * 60 * 1000); // Cada 15 minutos
    
    console.log('LikesManager: Módulo cargado correctamente');
})();