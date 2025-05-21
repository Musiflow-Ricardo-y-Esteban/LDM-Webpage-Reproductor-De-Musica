// account.js - Script mejorado para gestión de cuentas de usuario

/**
 * FUNCIÓN PRINCIPAL: Este script gestiona todas las funcionalidades de la cuenta de usuario 
 * en MusiFlow, incluyendo la visualización de datos del perfil, historial de reproducción, 
 * canciones favoritas y preferencias de usuario.
 */

// Se ejecuta cuando la página está completamente cargada
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa las animaciones (si AOS está disponible)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }

    // Obtiene referencias a elementos importantes de la interfaz
    const profileNameElement = document.getElementById('profileName');
    const profileEmailElement = document.getElementById('profileEmail');
    const profileAvatarElement = document.getElementById('profileAvatar');
    const memberSinceElement = document.getElementById('memberSince');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    // Almacenamiento local de datos del usuario
    let currentUser = null;         // Información básica del usuario
    let likedSongs = {};            // Canciones que le gustan al usuario
    let recentlyPlayed = [];        // Historial de reproducción
    let userPlaylists = [];         // Listas de reproducción del usuario
    let followedArtists = [];       // Artistas seguidos
    
    // Inicia los efectos visuales
    initializeEffects();
    
    // Espera a que Firebase Authentication esté listo antes de continuar
    document.addEventListener('authStateChanged', async (event) => {
        const user = event.detail.user;
        
        if (user) {
            // Si el usuario está autenticado, carga sus datos
            await initializeUserData(user);
        } 
        // Si no está autenticado, common-auth.js redirigirá automáticamente
    });
    
    /**
     * FUNCIÓN IMPORTANTE: Inicializa todos los datos del usuario
     * Carga la información del perfil, canciones, listas y artistas
     */
    async function initializeUserData(user) {
        try {
            // Oculta la pantalla de carga
            showLoading(false);
            
            // Guarda los datos del usuario
            currentUser = user;
            
            // Actualiza la interfaz del perfil con los datos del usuario
            updateUserProfile(user);
            
            // Carga todos los datos del usuario desde Firebase
            await loadUserData();
            
            // Configura los controladores de eventos
            setupEventListeners();
        } catch (error) {
            console.error('Error al inicializar datos de usuario:', error);
            showToast('Error al cargar datos de usuario', 'error');
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Carga todos los datos del usuario desde Firebase
     * Utilizando llamadas en paralelo para mejorar el rendimiento
     */
    async function loadUserData() {
        try {
            showLoading(true);
            
            // Verifica que el usuario siga autenticado
            if (!firebase.auth().currentUser) {
                throw new Error('Usuario no autenticado');
            }
            
            // Carga todos los datos del usuario en paralelo para mayor eficiencia
            const [likedResult, recentResult, playlistResult, artistResult] = await Promise.all([
                loadLikedSongs(),            // Carga canciones favoritas
                loadRecentlyPlayed(),        // Carga historial de reproducción
                loadUserPlaylists(),         // Carga listas de reproducción
                loadFollowedArtists()        // Carga artistas seguidos
            ]);
            
            // Actualiza la interfaz con los datos cargados
            updateUserStats();
            updateRecentlyPlayedUI();
            
            showLoading(false);
        } catch (error) {
            console.error('Error al cargar datos de usuario:', error);
            showToast('Error al cargar datos de usuario', 'error');
            showLoading(false);
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Actualiza la información del perfil en la interfaz
     * Muestra nombre, email, avatar y fecha de registro
     */
    function updateUserProfile(user) {
        // Establece el nombre y correo del perfil
        if (profileNameElement) {
            profileNameElement.textContent = user.displayName || user.username || user.email.split('@')[0];
        }
        
        if (profileEmailElement) {
            profileEmailElement.textContent = user.email;
        }
        
        // Establece la fecha de registro
        if (memberSinceElement) {
            const memberSinceDate = user.created_at 
                ? new Date(user.created_at)
                : new Date();
            
            const formattedDate = new Intl.DateTimeFormat('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(memberSinceDate);
            
            memberSinceElement.textContent = `Miembro desde: ${formattedDate}`;
        }
        
        // Establece el avatar
        if (profileAvatarElement) {
            if (user.photoURL || user.profile_picture) {
                // Si el usuario tiene foto de perfil
                const photoUrl = user.photoURL || user.profile_picture;
                profileAvatarElement.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                // Genera un avatar con la primera letra del nombre/email
                const firstLetter = (user.displayName || user.username || user.email).charAt(0).toUpperCase();
                profileAvatarElement.innerHTML = firstLetter;
                
                // Color aleatorio basado en el nombre de usuario
                const hue = Math.abs(hashCode(user.email) % 360);
                profileAvatarElement.style.background = `hsl(${hue}, 70%, 60%)`;
            }
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Actualiza el historial de reproducción en la interfaz
     * Muestra las canciones reproducidas recientemente con formato de tiempo relativo
     */
    function updateRecentlyPlayedUI() {
        const recentlyPlayedList = document.getElementById('recentlyPlayedList');
        if (!recentlyPlayedList) return;
        
        // Limpia la lista actual
        recentlyPlayedList.innerHTML = '';
        
        if (recentlyPlayed.length === 0) {
            // Muestra mensaje si no hay canciones recientes
            recentlyPlayedList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--texto-secundario);">
                    <i class="fas fa-music" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Todavía no has escuchado ninguna canción</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light">Explorar música</a>
                </div>
            `;
            return;
        }
        
        // Añade cada canción reproducida recientemente
        recentlyPlayed.forEach(song => {
            const timeAgo = getTimeAgo(song.timestamp);
            
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.innerHTML = `
                <img src="${song.image || '/api/placeholder/50/50'}" alt="${song.title}" class="song-cover">
                <div class="song-details">
                    <h5 class="song-title">${song.title}</h5>
                    <p class="song-artist">${song.artist}</p>
                </div>
                <div class="song-time">${timeAgo}</div>
            `;
            
            // Añade evento de clic para reproducir la canción
            songItem.addEventListener('click', () => {
                playSong(song);
            });
            
            recentlyPlayedList.appendChild(songItem);
        });
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Abre el modal para editar el perfil
     * Permite al usuario cambiar su nombre, biografía y avatar
     */
    function openEditProfileModal() {
        // Verifica que el usuario esté autenticado
        if (!currentUser || !currentUser.uid) {
            showToast('Debes iniciar sesión para editar tu perfil', 'error');
            return;
        }
        
        // Crea el modal si no existe
        if (!document.getElementById('editProfileModal')) {
            // Código para crear el modal de edición de perfil
            // [El código del modal es extenso y se omite para brevedad]
            
            // Configuración del formulario y subida de avatar
            // [Configuración omitida para brevedad]
        }
        
        // Rellena los datos actuales del usuario
        if (window.firebaseAuth && window.firebaseAuth.getCurrentUser) {
            window.firebaseAuth.getCurrentUser().then(user => {
                // Rellena los campos con los datos actuales
                // [Código omitido para brevedad]
            });
        }
        
        // Muestra el modal
        if (typeof bootstrap !== 'undefined') {
            const editProfileModal = document.getElementById('editProfileModal');
            if (editProfileModal) {
                const modal = new bootstrap.Modal(editProfileModal);
                modal.show();
            }
        }
    }
    
    /**
     * FUNCIÓN IMPORTANTE: Muestra un mensaje de notificación
     * Utilizado para informar al usuario sobre acciones exitosas o errores
     */
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        // Estilos y animación del toast
        // [Código de estilos omitido para brevedad]
        
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Muestra el toast con animación
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Oculta el toast después de 3 segundos
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            
            // Elimina del DOM después de la animación
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
 * Inicializa efectos visuales y decorativos en la página de cuenta
 * Agrega animaciones, partículas y efectos interactivos
 */
function initializeEffects() {
    // Crear notas musicales flotantes en el fondo
    createFloatingNotes();
    
    // Agregar efectos de hover a los elementos interactivos
    addHoverEffects();
    
    // Inicializar animaciones para las estadísticas
    initStatisticAnimations();
    
    console.log('Efectos visuales inicializados en la página de cuenta');
}

/**
 * Crea notas musicales decorativas flotantes en el fondo
 */
function createFloatingNotes() {
    const notesContainer = document.querySelector('.notes-container');
    if (!notesContainer) return;
    
    const notes = ['♪', '♫', '𝅘𝅥𝅮', '𝅘𝅥', '𝅘𝅥𝅯', '𝅗𝅥', '𝄞'];
    const noteCount = 15;
    
    // Limpiar notas existentes
    notesContainer.innerHTML = '';
    
    // Generar nuevas notas
    for (let i = 0; i < noteCount; i++) {
        const note = document.createElement('div');
        note.className = 'floating-note';
        note.innerHTML = notes[Math.floor(Math.random() * notes.length)];
        note.style.left = `${Math.random() * 100}%`;
        note.style.top = `${Math.random() * 100}%`;
        note.style.animationDelay = `${Math.random() * 5}s`;
        note.style.animationDuration = `${10 + Math.random() * 15}s`;
        note.style.opacity = 0.2 + Math.random() * 0.3;
        note.style.fontSize = `${1 + Math.random() * 1.5}rem`;
        
        notesContainer.appendChild(note);
    }
}

/**
 * Agrega efectos de hover a elementos interactivos
 */
function addHoverEffects() {
    // Efectos para las cajas de estadísticas
    const statBoxes = document.querySelectorAll('.stat-box');
    statBoxes.forEach(box => {
        box.addEventListener('mouseenter', () => {
            box.style.transform = 'translateY(-5px)';
            box.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
        });
        
        box.addEventListener('mouseleave', () => {
            box.style.transform = '';
            box.style.boxShadow = '';
        });
    });
    
    // Efectos para elementos de canción
    const songItems = document.querySelectorAll('.song-item');
    songItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            item.style.transform = 'translateX(5px)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
            item.style.transform = '';
        });
    });
}

/**
 * Inicializa animaciones para las estadísticas
 */
function initStatisticAnimations() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(statNumber => {
        const originalValue = parseInt(statNumber.textContent);
        
        // Solo animar si hay un valor numérico
        if (!isNaN(originalValue)) {
            // Resetear a cero para animación
            statNumber.textContent = '0';
            
            // Crear animación de conteo
            let currentValue = 0;
            const duration = 1500; // milisegundos
            const interval = 50; // milisegundos
            const increment = originalValue / (duration / interval);
            
            const counter = setInterval(() => {
                currentValue += increment;
                
                if (currentValue >= originalValue) {
                    clearInterval(counter);
                    statNumber.textContent = originalValue;
                } else {
                    statNumber.textContent = Math.floor(currentValue);
                }
            }, interval);
        }
    });
}
});