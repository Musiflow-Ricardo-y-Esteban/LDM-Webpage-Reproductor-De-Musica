// resources/js/firebase-library.js

const LibraryManager = (() => {
    let _currentUser = null;
    let _librarySongs = {}; // { songId: songObject }
    const LIBRARY_CHANGED_EVENT = 'libraryChanged';

    async function init() {
        return new Promise((resolve, reject) => {
            if (typeof firebase === 'undefined' || !firebase.auth || !firebase.database) {
                console.error('LibraryManager: Firebase no está disponible.');
                return reject(new Error('Firebase no disponible'));
            }

            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    _currentUser = user;
                    try {
                        const snapshot = await firebase.database().ref(`users/${_currentUser.uid}/library`).once('value');
                        _librarySongs = snapshot.val() || {};
                        console.log('LibraryManager: Biblioteca inicializada con', Object.keys(_librarySongs).length, 'canciones.');
                        resolve();
                    } catch (error) {
                        console.error('LibraryManager: Error al cargar biblioteca desde Firebase:', error);
                        _librarySongs = {}; // Inicializar vacío en caso de error
                        reject(error);
                    }
                } else {
                    _currentUser = null;
                    _librarySongs = {};
                    console.log('LibraryManager: Usuario no autenticado, biblioteca vacía.');
                    resolve(); // Resuelve incluso si no hay usuario, para que la app no se bloquee
                }
            });
        });
    }

    function dispatchLibraryChangedEvent(songId, isInLibrary, songData) {
        const event = new CustomEvent(LIBRARY_CHANGED_EVENT, {
            detail: { songId, isInLibrary, songData, totalLibrarySongs: Object.keys(_librarySongs).length }
        });
        document.dispatchEvent(event);
    }

    async function addSongToLibrary(song) {
        if (!_currentUser) {
            showToast('Debes iniciar sesión para añadir canciones a tu biblioteca.', 'warning');
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        if (!song || !song.id) {
            return Promise.reject(new Error('Datos de canción inválidos.'));
        }
        if (_librarySongs[song.id]) {
            showToast('Esta canción ya está en tu biblioteca.', 'info');
            return Promise.resolve(_librarySongs[song.id]); // Ya existe
        }

        const songDataForLibrary = {
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            image: song.image,
            duration: song.duration,
            source: song.source, // Importante para la reproducción
            sourceOrigin: song.sourceOrigin || (song.source === 'spotify' ? 'spotify' : 'local'),
            externalUrl: song.externalUrl, // Para canciones de Spotify
            addedAt: Date.now()
        };

        try {
            await firebase.database().ref(`users/${_currentUser.uid}/library/${song.id}`).set(songDataForLibrary);
            _librarySongs[song.id] = songDataForLibrary;
            dispatchLibraryChangedEvent(song.id, true, songDataForLibrary);
            showToast(`"${song.title}" añadida a tu biblioteca.`, 'success');
            updateLibraryButtonVisual(song.id, true);
            return songDataForLibrary;
        } catch (error) {
            console.error('Error añadiendo canción a biblioteca:', error);
            showToast('Error al añadir canción a la biblioteca.', 'error');
            return Promise.reject(error);
        }
    }

    async function removeSongFromLibrary(songId) {
        if (!_currentUser) {
            return Promise.reject(new Error('Usuario no autenticado'));
        }
        if (!songId) {
            return Promise.reject(new Error('ID de canción requerido.'));
        }
        if (!_librarySongs[songId]) {
            return Promise.resolve(); // No está en la biblioteca
        }

        const songToRemove = _librarySongs[songId];
        try {
            await firebase.database().ref(`users/${_currentUser.uid}/library/${songId}`).remove();
            delete _librarySongs[songId];
            dispatchLibraryChangedEvent(songId, false, songToRemove);
            showToast(`"${songToRemove.title}" eliminada de tu biblioteca.`, 'success');
            updateLibraryButtonVisual(songId, false);
        } catch (error) {
            console.error('Error eliminando canción de biblioteca:', error);
            showToast('Error al eliminar canción de la biblioteca.', 'error');
            return Promise.reject(error);
        }
    }

    function isInLibrary(songId) {
        return !!_librarySongs[songId];
    }

    function getAllLibrarySongs() {
        return Object.values(_librarySongs).sort((a, b) => b.addedAt - a.addedAt);
    }

    function addLibraryChangeListener(callback) {
        document.addEventListener(LIBRARY_CHANGED_EVENT, (event) => {
            callback(event.detail.songId, event.detail.isInLibrary, event.detail.songData);
        });
    }

    function updateLibraryButtonVisual(songId, isInLib) {
        document.querySelectorAll(`.add-to-library-btn[data-track-id="${songId}"]`).forEach(button => {
            const icon = button.querySelector('i');
            if (isInLib) {
                icon.className = 'fas fa-check-circle'; // O fa-bookmark
                button.title = 'En Biblioteca';
                button.classList.add('active');
            } else {
                icon.className = 'fas fa-plus-circle'; // O fa-bookmark-o
                button.title = 'Añadir a Biblioteca';
                button.classList.remove('active');
            }
        });
    }

    // Función de toast (puedes moverla a un utils.js si la usas en más sitios)
    function showToast(message, type = 'info') {
        const toastId = 'musiflow-toast';
        let toast = document.getElementById(toastId);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = toastId;
            toast.style.cssText = `
                position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                padding: 10px 20px; border-radius: 25px; color: white;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10000;
                opacity: 0; transition: opacity 0.3s, bottom 0.3s;
                font-size: 14px; max-width: 80%; text-align: center;`;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        if (type === 'success') toast.style.backgroundColor = '#28a745';
        else if (type === 'error') toast.style.backgroundColor = '#dc3545';
        else if (type === 'warning') toast.style.backgroundColor = '#ffc107';
        else toast.style.backgroundColor = '#17a2b8'; // info

        toast.style.opacity = '1';
        toast.style.bottom = '30px';

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
        }, 3000);
    }

    return {
        init,
        addSongToLibrary,
        removeSongFromLibrary,
        isInLibrary,
        getAllLibrarySongs,
        addLibraryChangeListener,
        updateLibraryButtonVisual // Exponer para uso externo si es necesario
    };
})();

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => {
    if (window.LikesManager) { // Asegurar que LikesManager también está cargado
         LibraryManager.init().catch(err => console.error("Error en auto-init de LibraryManager:", err));
    } else {
        // Reintentar si LikesManager no está listo aún
        const checkLikesInterval = setInterval(() => {
            if (window.LikesManager) {
                clearInterval(checkLikesInterval);
                LibraryManager.init().catch(err => console.error("Error en reintento de auto-init de LibraryManager:", err));
            }
        }, 200);
    }
});