// firebase-likes.js - Sistema de gestión de likes para MusiFlow
// Este archivo proporciona funciones para manejar canciones favoritas entre páginas

/**
 * Módulo que gestiona el sistema de "Me gusta" para canciones
 * Permite sincronizar el estado de likes entre las páginas de exploración y cuenta
 */
(function() {
    // Caché local de canciones favoritas
    let _likedSongs = {};
    let _isInitialized = false;
    
    // Evento personalizado para notificar cambios en los likes
    const LIKE_CHANGED_EVENT = 'likeStatusChanged';
    
    /**
     * Inicializa el sistema de likes
     * @return {Promise} Promesa que se resuelve cuando los datos están cargados
     */
    function init() {
        if (_isInitialized) return Promise.resolve(_likedSongs);
        
        return new Promise((resolve, reject) => {
            // Verificar si el usuario está autenticado
            if (!firebase.auth().currentUser) {
                _isInitialized = true;
                resolve({});
                return;
            }
            
            const uid = firebase.auth().currentUser.uid;
            
            // Cargar canciones favoritas desde Firebase
            firebase.database().ref(`users/${uid}/liked_songs`).once('value')
                .then(snapshot => {
                    _likedSongs = snapshot.val() || {};
                    _isInitialized = true;
                    console.log('Sistema de likes inicializado:', Object.keys(_likedSongs).length, 'canciones');
                    resolve(_likedSongs);
                })
                .catch(error => {
                    console.error('Error al inicializar sistema de likes:', error);
                    _isInitialized = true;
                    reject(error);
                });
        });
    }
    
    /**
     * Verifica si una canción está marcada como favorita
     * @param {string} songId - ID de la canción a verificar
     * @return {boolean} true si está en favoritos, false si no
     */
    function isLiked(songId) {
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
     * Añade una canción a favoritos
     * @param {Object} song - Objeto con datos de la canción
     * @return {Promise} Promesa que se resuelve cuando se completa la operación
     */
    function addSongToLiked(song) {
        if (!song || !song.id || !firebase.auth().currentUser) {
            return Promise.reject(new Error('Datos de canción inválidos o usuario no autenticado'));
        }
        
        return new Promise((resolve, reject) => {
            const uid = firebase.auth().currentUser.uid;
            
            // Guardar en Firebase
            firebase.database().ref(`users/${uid}/liked_songs/${song.id}`).set({
                ...song,
                added_at: Date.now()
            })
            .then(() => {
                // Actualizar caché local
                _likedSongs[song.id] = {
                    ...song,
                    added_at: Date.now()
                };
                
                // Disparar evento personalizado
                dispatchLikeChangedEvent(song.id, true);
                
                resolve(song);
            })
            .catch(error => {
                console.error('Error al añadir canción a favoritos:', error);
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
        if (!songId || !firebase.auth().currentUser) {
            return Promise.reject(new Error('ID de canción inválido o usuario no autenticado'));
        }
        
        return new Promise((resolve, reject) => {
            const uid = firebase.auth().currentUser.uid;
            
            // Eliminar de Firebase
            firebase.database().ref(`users/${uid}/liked_songs/${songId}`).remove()
            .then(() => {
                // Eliminar de caché local
                delete _likedSongs[songId];
                
                // Disparar evento personalizado
                dispatchLikeChangedEvent(songId, false);
                
                resolve(songId);
            })
            .catch(error => {
                console.error('Error al eliminar canción de favoritos:', error);
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
        
        if (isLiked(song.id)) {
            return removeSongFromLiked(song.id);
        } else {
            return addSongToLiked(song);
        }
    }
    
    /**
     * Dispara un evento personalizado cuando cambia el estado de un like
     * @param {string} songId - ID de la canción que cambió
     * @param {boolean} isLiked - Nuevo estado (true si está en favoritos, false si no)
     */
    function dispatchLikeChangedEvent(songId, isLiked) {
        const event = new CustomEvent(LIKE_CHANGED_EVENT, {
            detail: {
                songId,
                isLiked
            }
        });
        
        document.dispatchEvent(event);
    }
    
    /**
     * Añade un listener para eventos de cambio de like
     * @param {Function} callback - Función a llamar cuando cambia un like
     */
    function addLikeChangeListener(callback) {
        document.addEventListener(LIKE_CHANGED_EVENT, (event) => {
            callback(event.detail.songId, event.detail.isLiked);
        });
    }
    
    /**
     * Actualiza la interfaz de usuario con el estado actual de likes
     * Busca elementos con el ID de canción y actualiza sus clases e íconos
     */
    function updateLikeUIElements() {
        // Buscar todos los elementos de canción que tengan botones de like
        document.querySelectorAll('.song-item[data-id]').forEach(songItem => {
            const songId = songItem.dataset.id;
            const likeBtn = songItem.querySelector('.song-like');
            
            if (likeBtn && songId) {
                const isLikedStatus = isLiked(songId);
                
                // Actualizar clases e ícono
                likeBtn.classList.toggle('active', isLikedStatus);
                
                const heartIcon = likeBtn.querySelector('i');
                if (heartIcon) {
                    heartIcon.className = isLikedStatus ? 'fas fa-heart' : 'far fa-heart';
                }
            }
        });
    }
    
    // Exportar funciones públicas
    window.LikesManager = {
        init,
        isLiked,
        getAllLikedSongs,
        addSongToLiked,
        removeSongFromLiked,
        toggleLike,
        addLikeChangeListener,
        updateLikeUIElements
    };
    
    // Auto-inicializar cuando Firebase esté listo
    document.addEventListener('DOMContentLoaded', () => {
        // Verificar si Firebase Auth está disponible
        if (typeof firebase !== 'undefined' && firebase.auth) {
            // Esperar a que se inicialice la autenticación
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    // El usuario está autenticado, inicializar sistema de likes
                    init().then(() => {
                        // Actualizar interfaz después de cargar
                        updateLikeUIElements();
                    });
                } else {
                    // No hay usuario autenticado, limpiar datos
                    _likedSongs = {};
                    _isInitialized = true;
                }
            });
        }
    });
})();