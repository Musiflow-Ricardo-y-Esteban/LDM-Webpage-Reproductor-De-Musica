// firebase-likes.js - Sistema mejorado de gestión de likes para MusiFlow
// Este archivo proporciona funciones para manejar canciones favoritas entre páginas

/**
 * Módulo que gestiona el sistema de "Me gusta" para canciones
 * Permite sincronizar el estado de likes entre las páginas de exploración y cuenta
 */
(function() {
    // Caché local de canciones favoritas
    let _likedSongs = {};
    let _isInitialized = false;
    let _currentUser = null;
    
    // Evento personalizado para notificar cambios en los likes
    const LIKE_CHANGED_EVENT = 'likeStatusChanged';
    
    /**
     * Inicializa el sistema de likes
     * @return {Promise} Promesa que se resuelve cuando los datos están cargados
     */
    function init() {
        return new Promise((resolve, reject) => {
            console.log('LikesManager: Inicializando sistema de likes...');
            
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
            
            // Cargar canciones favoritas desde Firebase
            firebase.database().ref(`users/${uid}/liked_songs`).once('value')
                .then(snapshot => {
                    _likedSongs = snapshot.val() || {};
                    _isInitialized = true;
                    
                    console.log('LikesManager: Sistema inicializado correctamente con', Object.keys(_likedSongs).length, 'canciones favoritas');
                    
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
     * @return {boolean} true si está en favoritos, false si no
     */
    function isLiked(songId) {
        if (!songId) return false;
        return !!_likedSongs[songId];
    }
    
    /**
     * Obtiene todas las canciones favoritas
     * @return {Object} Objeto con todas las canciones favoritas
     */
    function getAllLikedSongs() {
        return {..._likedSongs};
    }
    
    /**
     * Obtiene el número de canciones favoritas
     * @return {number} Cantidad de canciones favoritas
     */
    function getLikedSongsCount() {
        return Object.keys(_likedSongs).length;
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
            
            // Si ya está en favoritos, no hacer nada
            if (_likedSongs[song.id]) {
                console.log('LikesManager: Canción ya está en favoritos:', song.title);
                resolve(song);
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
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
                added_at: timestamp
            };
            
            console.log('LikesManager: Añadiendo canción a favoritos:', songData.title);
            
            // Guardar en Firebase
            firebase.database().ref(`users/${uid}/liked_songs/${song.id}`).set(songData)
                .then(() => {
                    // Actualizar caché local
                    _likedSongs[song.id] = songData;
                    
                    console.log('LikesManager: Canción añadida exitosamente a favoritos');
                    
                    // Disparar evento personalizado
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
                reject(new Error('ID de canción inválido'));
                return;
            }
            
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            // Si no está en favoritos, no hacer nada
            if (!_likedSongs[songId]) {
                console.log('LikesManager: Canción no está en favoritos:', songId);
                resolve(songId);
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const removedSong = _likedSongs[songId];
            
            console.log('LikesManager: Eliminando canción de favoritos:', removedSong.title);
            
            // Eliminar de Firebase
            firebase.database().ref(`users/${uid}/liked_songs/${songId}`).remove()
                .then(() => {
                    // Eliminar de caché local
                    delete _likedSongs[songId];
                    
                    console.log('LikesManager: Canción eliminada exitosamente de favoritos');
                    
                    // Disparar evento personalizado
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
     * Alterna el estado de "me gusta" de una canción
     * @param {Object} song - Objeto con datos de la canción
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function toggleLike(song) {
        if (!song || !song.id) {
            return Promise.reject(new Error('Datos de canción inválidos'));
        }
        
        console.log('LikesManager: Alternando like para canción:', song.title, '| Estado actual:', isLiked(song.id));
        
        if (isLiked(song.id)) {
            return removeSongFromLiked(song.id);
        } else {
            return addSongToLiked(song);
        }
    }
    
    /**
     * Importa canciones favoritas desde un objeto (útil para migración de datos)
     * @param {Object} songsObject - Objeto con canciones favoritas
     * @return {Promise} Promesa que se resuelve cuando se completa la importación
     */
    function importLikedSongs(songsObject) {
        return new Promise((resolve, reject) => {
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            if (!songsObject || typeof songsObject !== 'object') {
                reject(new Error('Datos de importación inválidos'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const songCount = Object.keys(songsObject).length;
            
            console.log('LikesManager: Importando', songCount, 'canciones favoritas...');
            
            // Importar todas las canciones a Firebase
            firebase.database().ref(`users/${uid}/liked_songs`).set(songsObject)
                .then(() => {
                    // Actualizar caché local
                    _likedSongs = {...songsObject};
                    
                    console.log('LikesManager: Importación completada exitosamente');
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    // Disparar evento para cada canción importada
                    Object.keys(songsObject).forEach(songId => {
                        dispatchLikeChangedEvent(songId, true, songsObject[songId]);
                    });
                    
                    resolve(songsObject);
                })
                .catch(error => {
                    console.error('LikesManager: Error durante la importación:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Exporta todas las canciones favoritas (útil para backup)
     * @return {Object} Objeto con todas las canciones favoritas
     */
    function exportLikedSongs() {
        console.log('LikesManager: Exportando', Object.keys(_likedSongs).length, 'canciones favoritas');
        return {
            exportDate: new Date().toISOString(),
            userId: _currentUser ? _currentUser.uid : null,
            songs: {..._likedSongs}
        };
    }
    
    /**
     * Limpia todas las canciones favoritas (con confirmación)
     * @param {boolean} confirmed - Indica si la operación está confirmada
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function clearAllLikedSongs(confirmed = false) {
        return new Promise((resolve, reject) => {
            if (!confirmed) {
                reject(new Error('Operación no confirmada - para limpiar todos los favoritos, pasar confirmed: true'));
                return;
            }
            
            if (!firebase.auth().currentUser) {
                reject(new Error('Usuario no autenticado'));
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            const songCount = Object.keys(_likedSongs).length;
            
            console.log('LikesManager: Limpiando todas las canciones favoritas (' + songCount + ')...');
            
            // Limpiar en Firebase
            firebase.database().ref(`users/${uid}/liked_songs`).remove()
                .then(() => {
                    // Limpiar caché local
                    const clearedSongs = {..._likedSongs};
                    _likedSongs = {};
                    
                    console.log('LikesManager: Limpieza completada exitosamente');
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    // Disparar eventos para todas las canciones eliminadas
                    Object.keys(clearedSongs).forEach(songId => {
                        dispatchLikeChangedEvent(songId, false, clearedSongs[songId]);
                    });
                    
                    resolve(songCount);
                })
                .catch(error => {
                    console.error('LikesManager: Error al limpiar favoritos:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Sincroniza los datos locales con Firebase (útil después de cambios externos)
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
                    const addedSongs = {};
                    const removedSongs = {};
                    
                    // Buscar canciones añadidas en Firebase
                    Object.keys(firebaseData).forEach(songId => {
                        if (!_likedSongs[songId]) {
                            addedSongs[songId] = firebaseData[songId];
                        }
                    });
                    
                    // Buscar canciones eliminadas en Firebase
                    Object.keys(_likedSongs).forEach(songId => {
                        if (!firebaseData[songId]) {
                            removedSongs[songId] = _likedSongs[songId];
                        }
                    });
                    
                    // Actualizar caché local
                    _likedSongs = {...firebaseData};
                    
                    // Disparar eventos para cambios detectados
                    Object.keys(addedSongs).forEach(songId => {
                        dispatchLikeChangedEvent(songId, true, addedSongs[songId]);
                    });
                    
                    Object.keys(removedSongs).forEach(songId => {
                        dispatchLikeChangedEvent(songId, false, removedSongs[songId]);
                    });
                    
                    // Actualizar UI
                    updateLikeUIElements();
                    
                    console.log('LikesManager: Sincronización completada -', 
                        Object.keys(addedSongs).length, 'añadidas,', 
                        Object.keys(removedSongs).length, 'eliminadas');
                    
                    resolve({
                        totalSongs: Object.keys(_likedSongs).length,
                        addedSongs: Object.keys(addedSongs).length,
                        removedSongs: Object.keys(removedSongs).length
                    });
                })
                .catch(error => {
                    console.error('LikesManager: Error durante sincronización:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Dispara un evento personalizado cuando cambia el estado de un like
     * @param {string} songId - ID de la canción que cambió
     * @param {boolean} isLiked - Nuevo estado (true si está en favoritos, false si no)
     * @param {Object} songData - Datos completos de la canción (opcional)
     */
    function dispatchLikeChangedEvent(songId, isLiked, songData = null) {
        const event = new CustomEvent(LIKE_CHANGED_EVENT, {
            detail: {
                songId,
                isLiked,
                songData,
                timestamp: Date.now(),
                totalLikedSongs: Object.keys(_likedSongs).length
            }
        });
        
        console.log('LikesManager: Disparando evento de cambio de like:', songId, '-> isLiked:', isLiked);
        document.dispatchEvent(event);
    }
    
    /**
     * Añade un listener para eventos de cambio de like
     * @param {Function} callback - Función a llamar cuando cambia un like
     */
    function addLikeChangeListener(callback) {
        if (typeof callback !== 'function') {
            console.error('LikesManager: addLikeChangeListener requiere una función como parámetro');
            return;
        }
        
        document.addEventListener(LIKE_CHANGED_EVENT, (event) => {
            try {
                callback(event.detail.songId, event.detail.isLiked, event.detail.songData, event.detail.totalLikedSongs);
            } catch (error) {
                console.error('LikesManager: Error en callback de cambio de like:', error);
            }
        });
        
        console.log('LikesManager: Listener de cambios añadido correctamente');
    }
    
    /**
     * Actualiza la interfaz de usuario con el estado actual de likes
     * Busca elementos con el ID de canción y actualiza sus clases e íconos
     */
    function updateLikeUIElements() {
        console.log('LikesManager: Actualizando elementos UI con', Object.keys(_likedSongs).length, 'canciones favoritas');
        
        // Buscar todos los elementos de canción que tengan botones de like
        const songItems = document.querySelectorAll('.song-item[data-id]');
        let updatedCount = 0;
        
        songItems.forEach(songItem => {
            const songId = songItem.dataset.id;
            const likeBtn = songItem.querySelector('.song-like, .like-button, .action-button[title*="gusta"]');
            
            if (likeBtn && songId) {
                const isLikedStatus = isLiked(songId);
                
                // Actualizar clases e ícono
                likeBtn.classList.toggle('active', isLikedStatus);
                
                const heartIcon = likeBtn.querySelector('i');
                if (heartIcon) {
                    // Actualizar clase del ícono
                    if (isLikedStatus) {
                        heartIcon.className = 'fas fa-heart';
                        heartIcon.style.color = '#1ed760'; // Verde de Spotify para favoritos
                    } else {
                        heartIcon.className = 'far fa-heart';
                        heartIcon.style.color = '';
                    }
                }
                
                // Actualizar título del botón
                likeBtn.title = isLikedStatus ? 'Eliminar de favoritos' : 'Añadir a favoritos';
                
                updatedCount++;
            }
        });
        
        // Actualizar contadores si existen
        const likedCountElements = document.querySelectorAll('#likedSongsCount, .liked-count, [data-liked-count]');
        likedCountElements.forEach(element => {
            element.textContent = Object.keys(_likedSongs).length;
        });
        
        console.log('LikesManager: UI actualizada -', updatedCount, 'elementos de canción actualizados');
    }
    
    /**
     * Obtiene estadísticas de las canciones favoritas
     * @return {Object} Objeto con estadísticas detalladas
     */
    function getStatistics() {
        const songs = Object.values(_likedSongs);
        const stats = {
            totalSongs: songs.length,
            sourceDistribution: {
                local: 0,
                spotify: 0,
                other: 0
            },
            artists: {},
            albums: {},
            addedThisWeek: 0,
            addedThisMonth: 0,
            oldestSong: null,
            newestSong: null
        };
        
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        
        songs.forEach(song => {
            // Distribución por fuente
            const source = song.sourceOrigin || 'other';
            if (stats.sourceDistribution.hasOwnProperty(source)) {
                stats.sourceDistribution[source]++;
            } else {
                stats.sourceDistribution.other++;
            }
            
            // Conteo por artista
            const artist = song.artist || 'Desconocido';
            stats.artists[artist] = (stats.artists[artist] || 0) + 1;
            
            // Conteo por álbum
            const album = song.album || 'Desconocido';
            stats.albums[album] = (stats.albums[album] || 0) + 1;
            
            // Análisis temporal
            const addedAt = song.added_at || 0;
            if (addedAt > now - oneWeek) {
                stats.addedThisWeek++;
            }
            if (addedAt > now - oneMonth) {
                stats.addedThisMonth++;
            }
            
            // Canción más antigua y más nueva
            if (!stats.oldestSong || addedAt < stats.oldestSong.added_at) {
                stats.oldestSong = song;
            }
            if (!stats.newestSong || addedAt > stats.newestSong.added_at) {
                stats.newestSong = song;
            }
        });
        
        return stats;
    }
    
    // Exportar funciones públicas
    window.LikesManager = {
        // Inicialización
        init,
        reinitialize,
        
        // Consultas
        isLiked,
        getAllLikedSongs,
        getLikedSongsCount,
        getStatistics,
        
        // Operaciones principales
        addSongToLiked,
        removeSongFromLiked,
        toggleLike,
        
        // Operaciones masivas
        importLikedSongs,
        exportLikedSongs,
        clearAllLikedSongs,
        
        // Sincronización
        syncWithFirebase,
        
        // Eventos
        addLikeChangeListener,
        
        // UI
        updateLikeUIElements
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
    }, 5 * 60 * 1000); // Cada 5 minutos
    
    console.log('LikesManager: Módulo cargado correctamente');
})();