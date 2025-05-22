// explorar-integration.js - Script específico para integrar likes y reproductor global en explorar.html

document.addEventListener('DOMContentLoaded', () => {
    console.log('Explorar: Inicializando integración de likes y reproductor global...');
    
    // Esperar a que los sistemas estén listos
    initializeExplorarPage();
});

/**
 * Inicializa la página de explorar con todas las integraciones
 */
async function initializeExplorarPage() {
    // Esperar a que Firebase esté listo
    await waitForFirebase();
    
    // Esperar a que los sistemas de gestión estén listos
    await waitForManagementSystems();
    
    // Configurar listeners para el reproductor global
    setupGlobalPlayerIntegration();
    
    // Configurar botones de like en canciones existentes
    setupLikeButtonsForExistingTracks();
    
    // Configurar el sistema de búsqueda mejorado
    setupEnhancedSearch();
    
    console.log('Explorar: Integración completada exitosamente');
}

/**
 * Espera a que Firebase esté disponible
 */
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            resolve();
        } else {
            const checkFirebase = setInterval(() => {
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
        }
    });
}

/**
 * Espera a que los sistemas de gestión estén disponibles
 */
function waitForManagementSystems() {
    return new Promise((resolve) => {
        if (window.LikesManager && window.PlaylistManager) {
            resolve();
        } else {
            const checkSystems = setInterval(() => {
                if (window.LikesManager && window.PlaylistManager) {
                    clearInterval(checkSystems);
                    resolve();
                }
            }, 100);
        }
    });
}

/**
 * Configura la integración con el reproductor global
 */
function setupGlobalPlayerIntegration() {
    // Esperar a que el reproductor global esté disponible
    const checkGlobalPlayer = setInterval(() => {
        if (window.globalPlayer) {
            clearInterval(checkGlobalPlayer);
            
            // Reemplazar la función playTrack del music manager si existe
            if (window.musicManager) {
                const originalPlayTrack = window.musicManager.playTrack.bind(window.musicManager);
                window.musicManager.playTrack = function(track) {
                    // Usar el reproductor global en su lugar
                    window.globalPlayer.playTrack(track);
                    // Mantener la compatibilidad con el music manager local
                    originalPlayTrack(track);
                };
            }
            
            console.log('Explorar: Integración con reproductor global configurada');
        }
    }, 100);
}

/**
 * Configura botones de like para las canciones existentes
 */
function setupLikeButtonsForExistingTracks() {
    // Observar cambios en el contenedor de resultados
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        // Configurar observer para detectar cuando se añaden nuevas canciones
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            setupLikeButtonsInContainer(node);
                        }
                    });
                }
            });
        });
        
        observer.observe(searchResults, { childList: true, subtree: true });
        
        // Configurar botones existentes
        setupLikeButtonsInContainer(searchResults);
    }
}

/**
 * Configura botones de like en un contenedor específico
 */
function setupLikeButtonsInContainer(container) {
    const trackRows = container.querySelectorAll('.track-row, .track-item');
    
    trackRows.forEach(trackRow => {
        addLikeButtonToTrack(trackRow);
        addPlaylistButtonToTrack(trackRow);
    });
}

/**
 * Añade botón de like a una fila de canción
 */
function addLikeButtonToTrack(trackRow) {
    const trackId = trackRow.dataset.trackId;
    if (!trackId) return;
    
    // Buscar el contenedor de duración
    const durationContainer = trackRow.querySelector('.track-duration');
    if (!durationContainer) return;
    
    // Verificar si ya tiene botones de acción
    let actionsContainer = durationContainer.querySelector('.track-actions');
    if (!actionsContainer) {
        // Crear contenedor de acciones
        actionsContainer = document.createElement('div');
        actionsContainer.className = 'track-actions';
        
        // Reestructurar el contenedor de duración
        const durationSpan = durationContainer.querySelector('span');
        durationContainer.innerHTML = '';
        if (durationSpan) {
            durationContainer.appendChild(durationSpan);
        }
        durationContainer.appendChild(actionsContainer);
    }
    
    // Verificar si ya tiene botón de like
    if (actionsContainer.querySelector('.like-button')) return;
    
    // Obtener datos de la canción
    const track = getTrackDataFromRow(trackRow);
    if (!track) return;
    
    // Verificar estado de like
    const isLiked = window.LikesManager ? window.LikesManager.isLiked(trackId) : false;
    
    // Crear botón de like
    const likeButton = document.createElement('button');
    likeButton.className = `action-button like-button ${isLiked ? 'active' : ''}`;
    likeButton.title = isLiked ? 'Eliminar de favoritos' : 'Añadir a favoritos';
    likeButton.dataset.trackId = trackId;
    likeButton.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
    
    // Event listener para el botón de like
    likeButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        await handleLikeButtonClick(track, likeButton);
    });
    
    actionsContainer.appendChild(likeButton);
}

/**
 * Añade botón de playlist a una fila de canción
 */
function addPlaylistButtonToTrack(trackRow) {
    const trackId = trackRow.dataset.trackId;
    if (!trackId) return;
    
    const actionsContainer = trackRow.querySelector('.track-actions');
    if (!actionsContainer) return;
    
    // Verificar si ya tiene botón de playlist
    if (actionsContainer.querySelector('.add-to-playlist-button')) return;
    
    // Obtener datos de la canción
    const track = getTrackDataFromRow(trackRow);
    if (!track) return;
    
    // Crear botón de añadir a playlist
    const playlistButton = document.createElement('button');
    playlistButton.className = 'action-button add-to-playlist-button';
    playlistButton.title = 'Añadir a playlist';
    playlistButton.dataset.trackId = trackId;
    playlistButton.innerHTML = '<i class="fas fa-list-ul"></i>';
    
    // Event listener para el botón de playlist
    playlistButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handlePlaylistButtonClick(track);
    });
    
    actionsContainer.appendChild(playlistButton);
}

/**
 * Extrae datos de canción desde una fila de la tabla
 */
function getTrackDataFromRow(trackRow) {
    const trackId = trackRow.dataset.trackId;
    
    // Intentar obtener desde musicDatabase primero
    if (typeof musicDatabase !== 'undefined') {
        const localTrack = musicDatabase.tracks.find(t => t.id === trackId);
        if (localTrack) return localTrack;
    }
    
    // Si no está en musicDatabase, extraer desde DOM
    const titleElement = trackRow.querySelector('.track-title');
    const artistElement = trackRow.querySelector('.track-artist');
    const albumElement = trackRow.querySelector('.track-album');
    const imageElement = trackRow.querySelector('.track-image');
    const durationElement = trackRow.querySelector('.track-duration span');
    
    if (!titleElement || !artistElement) return null;
    
    return {
        id: trackId,
        title: titleElement.textContent,
        artist: artistElement.textContent,
        album: albumElement ? albumElement.textContent : 'Álbum desconocido',
        image: imageElement ? imageElement.src : 'resources/album covers/placeholder.png',
        duration: durationElement ? durationElement.textContent : '0:00',
        sourceOrigin: 'local' // Por defecto
    };
}

/**
 * Maneja el clic en el botón de like
 */
async function handleLikeButtonClick(track, button) {
    // Verificar autenticación
    if (!firebase.auth().currentUser) {
        showNotification('Debes iniciar sesión para añadir favoritos', 'warning');
        return;
    }
    
    try {
        if (window.LikesManager) {
            await window.LikesManager.toggleLike(track);
            
            // El botón se actualizará automáticamente mediante el evento de cambio
            console.log('Explorar: Estado de like cambiado para:', track.title);
        } else {
            showNotification('Sistema de favoritos no disponible', 'error');
        }
    } catch (error) {
        console.error('Explorar: Error al cambiar estado de like:', error);
        showNotification(error.message || 'Error al actualizar favoritos', 'error');
    }
}

/**
 * Maneja el clic en el botón de añadir a playlist
 */
function handlePlaylistButtonClick(track) {
    // Verificar autenticación
    if (!firebase.auth().currentUser) {
        showNotification('Debes iniciar sesión para gestionar playlists', 'warning');
        return;
    }
    
    // Usar la función global de mostrarCanciones.js si está disponible
    if (typeof showAddToPlaylistModal === 'function') {
        showAddToPlaylistModal(track);
    } else {
        showNotification('Función de playlist no disponible', 'error');
    }
}

/**
 * Configura el sistema de búsqueda mejorado
 */
function setupEnhancedSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchInput && searchBtn) {
        // Mejorar la búsqueda para incluir integración automática
        const originalSearchHandler = () => {
            // Después de que se ejecute la búsqueda, configurar botones
            setTimeout(() => {
                setupLikeButtonsInContainer(document.getElementById('searchResults'));
            }, 500);
        };
        
        searchBtn.addEventListener('click', originalSearchHandler);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                originalSearchHandler();
            }
        });
    }
}

/**
 * Configura listeners para cambios en el sistema de likes
 */
function setupLikeChangeListeners() {
    if (window.LikesManager) {
        window.LikesManager.addLikeChangeListener((songId, isLiked) => {
            // Actualizar todos los botones de like para esta canción
            const likeButtons = document.querySelectorAll(`.like-button[data-track-id="${songId}"]`);
            
            likeButtons.forEach(button => {
                const icon = button.querySelector('i');
                if (icon) {
                    icon.className = isLiked ? 'fas fa-heart' : 'far fa-heart';
                }
                
                button.classList.toggle('active', isLiked);
                button.title = isLiked ? 'Eliminar de favoritos' : 'Añadir a favoritos';
            });
            
            console.log('Explorar: UI actualizada por cambio de like:', songId, isLiked);
        });
    }
}

/**
 * Muestra una notificación al usuario
 */
function showNotification(message, type = 'info') {
    // Usar la función del reproductor global si está disponible
    if (window.globalPlayer && typeof window.globalPlayer.showNotification === 'function') {
        window.globalPlayer.showNotification(message, type);
        return;
    }
    
    // Fallback: crear notificación simple
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => notification.style.opacity = '1', 100);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Configurar listeners cuando los sistemas estén listos
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que se carguen los sistemas
    setTimeout(() => {
        setupLikeChangeListeners();
    }, 1000);
});

console.log('explorar-integration.js: Script de integración cargado');