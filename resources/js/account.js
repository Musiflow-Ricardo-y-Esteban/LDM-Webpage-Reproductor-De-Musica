// account.js - Enhanced script for user account management
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true
        });
    }

    // Initialize UI elements
    const profileNameElement = document.getElementById('profileName');
    const profileEmailElement = document.getElementById('profileEmail');
    const profileAvatarElement = document.getElementById('profileAvatar');
    const memberSinceElement = document.getElementById('memberSince');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    // User data cache
    let currentUser = null;
    let likedSongs = {};
    let recentlyPlayed = [];
    let userPlaylists = [];
    let followedArtists = [];
    
    // Add visual effects
    initializeEffects();
    
    // Wait for Firebase Auth to be ready before proceeding
    document.addEventListener('authStateChanged', async (event) => {
        const user = event.detail.user;
        
        if (user) {
            // User is logged in
            await initializeUserData(user);
        } else {
            // User is not logged in
            // The redirect should already be handled by common-auth.js
        }
    });
    
    // Initialize user data
    async function initializeUserData(user) {
        try {
            // Hide loading overlay that might be shown
            showLoading(false);
            
            // Store user data
            currentUser = user;
            
            // Update profile UI
            updateUserProfile(user);
            
            // Load all user data
            await loadUserData();
            
            // Setup event listeners
            setupEventListeners();
        } catch (error) {
            console.error('Error initializing user data:', error);
            showToast('Error al cargar datos de usuario', 'error');
        }
    }
    
    // Load user data from Firebase
    async function loadUserData() {
        try {
            showLoading(true);
            
            // First verify if user is still logged in
            if (!firebase.auth().currentUser) {
                throw new Error('User not logged in');
            }
            
            // Load all user data in parallel for efficiency
            const [likedResult, recentResult, playlistResult, artistResult] = await Promise.all([
                loadLikedSongs(),
                loadRecentlyPlayed(),
                loadUserPlaylists(),
                loadFollowedArtists()
            ]);
            
            // Update UI with fetched data
            updateUserStats();
            updateRecentlyPlayedUI();
            
            showLoading(false);
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Error al cargar datos de usuario', 'error');
            showLoading(false);
        }
    }
    
    // Load liked songs from Firebase
    async function loadLikedSongs() {
        try {
            if (!currentUser || !currentUser.uid) return {};
            
            const userId = currentUser.uid;
            const likedSongsRef = firebase.database().ref(`users/${userId}/likedSongs`);
            
            const snapshot = await likedSongsRef.once('value');
            likedSongs = snapshot.val() || {};
            
            // Update saved songs count
            const songCount = Object.keys(likedSongs).length;
            const savedSongsCountElement = document.querySelector('.stat-box:nth-child(2) .stat-number');
            if (savedSongsCountElement) {
                savedSongsCountElement.textContent = songCount;
            }
            
            return likedSongs;
        } catch (error) {
            console.error('Error loading liked songs:', error);
            return {};
        }
    }
    
    // Load recently played songs from Firebase
    async function loadRecentlyPlayed() {
        try {
            if (!currentUser || !currentUser.uid) return [];
            
            const userId = currentUser.uid;
            const recentlyPlayedRef = firebase.database().ref(`users/${userId}/recentlyPlayed`)
                .orderByChild('timestamp')
                .limitToLast(10);
            
            const snapshot = await recentlyPlayedRef.once('value');
            const recentlyPlayedObj = snapshot.val() || {};
            
            // Convert to array and sort by timestamp (newest first)
            recentlyPlayed = Object.values(recentlyPlayedObj).sort((a, b) => b.timestamp - a.timestamp);
            
            return recentlyPlayed;
        } catch (error) {
            console.error('Error loading recently played:', error);
            return [];
        }
    }
    
    // Load user playlists from Firebase
    async function loadUserPlaylists() {
        try {
            if (!currentUser || !currentUser.uid) return [];
            
            const userId = currentUser.uid;
            const playlistsRef = firebase.database().ref(`users/${userId}/playlists`);
            
            const snapshot = await playlistsRef.once('value');
            const playlistsObj = snapshot.val() || {};
            
            // Convert to array
            userPlaylists = Object.values(playlistsObj);
            
            // Update playlists count
            const playlistCountElement = document.querySelector('.stat-box:nth-child(1) .stat-number');
            if (playlistCountElement) {
                playlistCountElement.textContent = userPlaylists.length;
            }
            
            return userPlaylists;
        } catch (error) {
            console.error('Error loading user playlists:', error);
            return [];
        }
    }
    
    // Load followed artists from Firebase
    async function loadFollowedArtists() {
        try {
            if (!currentUser || !currentUser.uid) return [];
            
            const userId = currentUser.uid;
            const artistsRef = firebase.database().ref(`users/${userId}/followedArtists`);
            
            const snapshot = await artistsRef.once('value');
            const artistsObj = snapshot.val() || {};
            
            // Convert to array
            followedArtists = Object.values(artistsObj);
            
            // Update followed artists count
            const followedArtistsCountElement = document.querySelector('.stat-box:nth-child(3) .stat-number');
            if (followedArtistsCountElement) {
                followedArtistsCountElement.textContent = followedArtists.length;
            }
            
            return followedArtists;
        } catch (error) {
            console.error('Error loading followed artists:', error);
            return [];
        }
    }
    
    // Update recently played UI
    function updateRecentlyPlayedUI() {
        const recentlyPlayedList = document.getElementById('recentlyPlayedList');
        if (!recentlyPlayedList) return;
        
        // Clear current list
        recentlyPlayedList.innerHTML = '';
        
        if (recentlyPlayed.length === 0) {
            recentlyPlayedList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--texto-secundario);">
                    <i class="fas fa-music" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Todavía no has escuchado ninguna canción</p>
                    <a href="explorar.html" class="btn btn-sm btn-outline-light">Explorar música</a>
                </div>
            `;
            return;
        }
        
        // Add each recently played song
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
            
            // Add click event to play song
            songItem.addEventListener('click', () => {
                playSong(song);
            });
            
            recentlyPlayedList.appendChild(songItem);
        });
    }
    
    // Format timestamp to "time ago" text
    function getTimeAgo(timestamp) {
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);
        
        if (seconds < 60) {
            return 'Hace un momento';
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
        }
        
        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
        }
        
        const weeks = Math.floor(days / 7);
        if (weeks < 4) {
            return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
        }
        
        const months = Math.floor(days / 30);
        return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    
    // Play a song from the recently played list
    function playSong(song) {
        // If we're on a page with a music player, use it
        if (window.musicManager) {
            window.musicManager.playTrack(song);
        } else {
            // Otherwise, redirect to explorar.html with search query
            localStorage.setItem('play_song', JSON.stringify(song));
            window.location.href = `explorar.html?q=${encodeURIComponent(song.title + ' ' + song.artist)}`;
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    const result = await window.firebaseAuth.logoutUser();
                    if (result.success) {
                        // Redirect to home page
                        window.location.href = 'index.html';
                    } else {
                        // Show error
                        showToast(result.error, 'error');
                    }
                } catch (error) {
                    console.error('Logout error:', error);
                    showToast('Error al cerrar sesión', 'error');
                }
            });
        }
        
        // Edit profile button
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                openEditProfileModal();
            });
        }
        
        // Setup preference toggles with localStorage
        const darkModeSwitch = document.getElementById('darkModeSwitch');
        const notificationsSwitch = document.getElementById('notificationsSwitch');
        const autoplaySwitch = document.getElementById('autoplaySwitch');
        
        if (darkModeSwitch && notificationsSwitch && autoplaySwitch) {
            // Load preferences from localStorage or set defaults
            darkModeSwitch.checked = localStorage.getItem('darkMode') !== 'false';
            notificationsSwitch.checked = localStorage.getItem('notifications') !== 'false';
            autoplaySwitch.checked = localStorage.getItem('autoplay') !== 'false';
            
            // Save preferences to localStorage and Firebase on change
            darkModeSwitch.addEventListener('change', () => {
                localStorage.setItem('darkMode', darkModeSwitch.checked);
                saveUserPreference('darkMode', darkModeSwitch.checked);
                showToast('Preferencia guardada', 'success');
            });
            
            notificationsSwitch.addEventListener('change', () => {
                localStorage.setItem('notifications', notificationsSwitch.checked);
                saveUserPreference('notifications', notificationsSwitch.checked);
                showToast('Preferencia guardada', 'success');
            });
            
            autoplaySwitch.addEventListener('change', () => {
                localStorage.setItem('autoplay', autoplaySwitch.checked);
                saveUserPreference('autoplay', autoplaySwitch.checked);
                showToast('Preferencia guardada', 'success');
            });
        }
    }
    
    // Save user preference to Firebase
    async function saveUserPreference(preferenceName, value) {
        if (!currentUser || !currentUser.uid) return;
        
        try {
            const userId = currentUser.uid;
            await firebase.database().ref(`users/${userId}/preferences/${preferenceName}`).set(value);
        } catch (error) {
            console.error(`Error saving preference ${preferenceName}:`, error);
        }
    }
    
    // Update user profile information in the UI
    function updateUserProfile(user) {
        // Set profile name, email, and avatar
        if (profileNameElement) {
            profileNameElement.textContent = user.displayName || user.username || user.email.split('@')[0];
        }
        
        if (profileEmailElement) {
            profileEmailElement.textContent = user.email;
        }
        
        // Set member since date
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
        
        // Set avatar
        if (profileAvatarElement) {
            if (user.photoURL || user.profile_picture) {
                // If user has a profile picture
                const photoUrl = user.photoURL || user.profile_picture;
                profileAvatarElement.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                // Get first letter of username or email
                const firstLetter = (user.displayName || user.username || user.email).charAt(0).toUpperCase();
                profileAvatarElement.innerHTML = firstLetter;
                
                // Random pastel color based on username
                const hue = Math.abs(hashCode(user.email) % 360);
                profileAvatarElement.style.background = `hsl(${hue}, 70%, 60%)`;
            }
        }
    }
    
    // Update user stats in the UI
    function updateUserStats() {
        // Update playlists count
        const playlistCountElement = document.querySelector('.stat-box:nth-child(1) .stat-number');
        if (playlistCountElement) {
            playlistCountElement.textContent = userPlaylists.length;
        }
        
        // Update saved songs count
        const savedSongsCountElement = document.querySelector('.stat-box:nth-child(2) .stat-number');
        if (savedSongsCountElement) {
            savedSongsCountElement.textContent = Object.keys(likedSongs).length;
        }
        
        // Update followed artists count
        const followedArtistsCountElement = document.querySelector('.stat-box:nth-child(3) .stat-number');
        if (followedArtistsCountElement) {
            followedArtistsCountElement.textContent = followedArtists.length;
        }
    }
    
    // Open edit profile modal
    function openEditProfileModal() {
        // Check if user is logged in
        if (!currentUser || !currentUser.uid) {
            showToast('Debes iniciar sesión para editar tu perfil', 'error');
            return;
        }
        
        // Create modal if not exists
        if (!document.getElementById('editProfileModal')) {
            const modalHtml = `
                <div class="modal fade" id="editProfileModal" tabindex="-1" aria-labelledby="editProfileModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-0">
                                <h5 class="modal-title" id="editProfileModalLabel">Editar perfil</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="profileForm">
                                    <div class="text-center mb-4">
                                        <div class="profile-avatar-editor">
                                            <div class="avatar-preview" id="avatarPreview">
                                                <i class="fas fa-user"></i>
                                            </div>
                                            <div class="avatar-actions">
                                                <button type="button" class="btn btn-sm btn-outline-light" id="uploadAvatarBtn">
                                                    <i class="fas fa-upload me-1"></i> Subir foto
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-danger" id="removeAvatarBtn">
                                                    <i class="fas fa-trash me-1"></i> Eliminar
                                                </button>
                                            </div>
                                            <input type="file" id="avatarUpload" accept="image/*" style="display: none;">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editUsername" class="form-label">Nombre de usuario</label>
                                        <input type="text" class="form-control" id="editUsername" placeholder="Nombre de usuario">
                                    </div>
                                    <div class="mb-3">
                                        <label for="editBio" class="form-label">Biografía (opcional)</label>
                                        <textarea class="form-control" id="editBio" rows="3" placeholder="Cuéntanos algo sobre ti..."></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Guardar cambios</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Append modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add styles for avatar editor
            const style = document.createElement('style');
            style.textContent = `
                .profile-avatar-editor {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }
                .avatar-preview {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: linear-gradient(45deg, var(--arcoiris-1), var(--arcoiris-5));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 48px;
                    color: white;
                    cursor: pointer;
                    overflow: hidden;
                    position: relative;
                }
                .avatar-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-preview:hover::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .avatar-actions {
                    display: flex;
                    gap: 10px;
                }
            `;
            document.head.appendChild(style);
            
            // Avatar upload functionality
            const avatarPreview = document.getElementById('avatarPreview');
            const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
            const removeAvatarBtn = document.getElementById('removeAvatarBtn');
            const avatarUpload = document.getElementById('avatarUpload');
            
            // Check if elements exist
            if (avatarPreview && uploadAvatarBtn && removeAvatarBtn && avatarUpload) {
                // Preview click also triggers file upload
                avatarPreview.addEventListener('click', () => {
                    avatarUpload.click();
                });
                
                // Upload button click
                uploadAvatarBtn.addEventListener('click', () => {
                    avatarUpload.click();
                });
                
                // Handle file selection
                avatarUpload.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        
                        // Validate file type and size
                        if (!file.type.match('image.*')) {
                            showToast('Por favor, selecciona una imagen válida', 'error');
                            return;
                        }
                        
                        if (file.size > 2 * 1024 * 1024) { // 2MB limit
                            showToast('La imagen debe ser menor de 2MB', 'error');
                            return;
                        }
                        
                        // Preview the image
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            avatarPreview.innerHTML = `<img src="${event.target.result}" alt="Avatar Preview">`;
                        };
                        reader.readAsDataURL(file);
                    }
                });
                
                // Remove avatar button
                removeAvatarBtn.addEventListener('click', () => {
                    // Clear file input
                    avatarUpload.value = '';
                    
                    // Reset preview to default
                    const firstLetter = (currentUser.displayName || currentUser.username || currentUser.email).charAt(0).toUpperCase();
                    avatarPreview.innerHTML = firstLetter;
                    
                    // Random pastel color
                    const hue = Math.abs(hashCode(currentUser.email) % 360);
                    avatarPreview.style.background = `hsl(${hue}, 70%, 60%)`;
                });
            }
            
            // Set up form submission
            const profileForm = document.getElementById('profileForm');
            if (profileForm) {
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const username = document.getElementById('editUsername').value.trim();
                    const bio = document.getElementById('editBio').value.trim();
                    const avatarFile = avatarUpload.files[0];
                    
                    if (!username) {
                        showToast('El nombre de usuario es obligatorio', 'error');
                        return;
                    }
                    
                    // Show loading
                    showLoading(true);
                    
                    try {
                        // Upload avatar if selected
                        let photoURL = currentUser.photoURL;
                        
                        if (avatarFile) {
                            photoURL = await uploadUserAvatar(avatarFile);
                        } else if (avatarUpload.value === '' && avatarPreview.querySelector('img') === null) {
                            // User removed avatar
                            photoURL = '';
                        }
                        
                        // Update profile data
                        const result = await updateUserProfileData(username, photoURL, bio);
                        
                        if (result.success) {
                            showToast('Perfil actualizado con éxito', 'success');
                            
                            // Close modal
                            const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            // Reload user data
                            const user = await window.firebaseAuth.getCurrentUser();
                            if (user) {
                                currentUser = user;
                                updateUserProfile(user);
                            }
                        } else {
                            showToast(result.error || 'Error al actualizar el perfil', 'error');
                        }
                    } catch (error) {
                        console.error('Error updating profile:', error);
                        showToast('Error al actualizar el perfil', 'error');
                    } finally {
                        showLoading(false);
                    }
                });
            }
        }
        
        // Fill in current user data
        if (window.firebaseAuth && window.firebaseAuth.getCurrentUser) {
            window.firebaseAuth.getCurrentUser().then(user => {
                if (!user) return;
                
                const userNameInput = document.getElementById('editUsername');
                const bioInput = document.getElementById('editBio');
                const avatarPreview = document.getElementById('avatarPreview');
                
                if (userNameInput) {
                    userNameInput.value = user.displayName || user.username || '';
                }
                
                if (bioInput) {
                    bioInput.value = user.bio || '';
                }
                
                if (avatarPreview) {
                    if (user.photoURL || user.profile_picture) {
                        const photoUrl = user.photoURL || user.profile_picture;
                        avatarPreview.innerHTML = `<img src="${photoUrl}" alt="Avatar">`;
                    } else {
                        // Default avatar with first letter
                        const firstLetter = (user.displayName || user.username || user.email).charAt(0).toUpperCase();
                        avatarPreview.innerHTML = firstLetter;
                        
                        // Random pastel color
                        const hue = Math.abs(hashCode(user.email) % 360);
                        avatarPreview.style.background = `hsl(${hue}, 70%, 60%)`;
                    }
                }
            });
        }
        
        // Show modal
        if (typeof bootstrap !== 'undefined') {
            const editProfileModal = document.getElementById('editProfileModal');
            if (editProfileModal) {
                const modal = new bootstrap.Modal(editProfileModal);
                modal.show();
            }
        }
    }
    
    // Upload user avatar to Firebase Storage
    async function uploadUserAvatar(file) {
        return new Promise((resolve, reject) => {
            if (!currentUser || !currentUser.uid) {
                reject(new Error('User not logged in'));
                return;
            }
            
            const userId = currentUser.uid;
            const storageRef = firebase.storage().ref();
            const avatarRef = storageRef.child(`user_avatars/${userId}/${Date.now()}_${file.name}`);
            
            // Upload file
            const uploadTask = avatarRef.put(file);
            
            // Listen for state changes
            uploadTask.on('state_changed', 
                // Progress
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload progress: ${progress}%`);
                },
                // Error
                (error) => {
                    console.error('Avatar upload error:', error);
                    reject(error);
                },
                // Success
                async () => {
                    // Get download URL
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve(downloadURL);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }
    
    // Update user profile data in Firebase
    async function updateUserProfileData(displayName, photoURL, bio) {
        try {
            if (!currentUser || !currentUser.uid) {
                throw new Error('User not logged in');
            }
            
            const userId = currentUser.uid;
            
            // Update in Authentication
            await firebase.auth().currentUser.updateProfile({
                displayName: displayName,
                photoURL: photoURL
            });
            
            // Update in Realtime Database
            await firebase.database().ref(`users/${userId}`).update({
                username: displayName,
                profile_picture: photoURL,
                bio: bio,
                updated_at: new Date().toISOString()
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error updating profile data:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Helper function to generate a hash code for a string
    function hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    
    // Initialize visual effects
    function initializeEffects() {
        // Create musical notes animation
        createNotes();
        
        // Initialize glowing cursor
        initGlowingCursor();
    }
    
    // Create floating musical notes
    function createNotes() {
        const notesContainer = document.querySelector('.notes-container');
        if (!notesContainer) return;
        
        const notes = ['♪', '♫', '𝅘𝅥𝅮', '𝅘𝅥', '𝅘𝅥𝅯', '𝅗𝅥', '𝄞'];
        const noteCount = 15;
        
        for (let i = 0; i < noteCount; i++) {
            const note = document.createElement('div');
            note.classList.add('note');
            note.innerHTML = notes[Math.floor(Math.random() * notes.length)];
            note.style.left = `${Math.random() * 100}%`;
            note.style.animationDelay = `${Math.random() * 15}s`;
            note.style.animationDuration = `${15 + Math.random() * 15}s`;
            note.style.fontSize = `${1 + Math.random() * 1.5}rem`;
            note.style.color = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.3})`;
            notesContainer.appendChild(note);
        }
    }
    
    // Initialize glowing cursor effect
    function initGlowingCursor() {
        const cursor = document.querySelector('.glowing-cursor');
        if (!cursor) return;
        
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = `${e.clientX}px`;
            cursor.style.top = `${e.clientY}px`;
            cursor.style.opacity = '1';
        });
        
        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
        });
    }
    
    // Show toast message
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 25px;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            
            // Remove from DOM after animation
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Helper function to show/hide loading overlay
    function showLoading(show) {
        let loadingOverlay = document.getElementById('loadingOverlay');
        
        if (!loadingOverlay) return;
        
        if (show) {
            loadingOverlay.classList.add('show');
        } else {
            loadingOverlay.classList.remove('show');
        }
    }
});