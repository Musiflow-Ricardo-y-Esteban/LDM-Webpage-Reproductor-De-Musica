// account.js - Script for the user account page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Initialize UI elements
    const profileNameElement = document.getElementById('profileName');
    const profileEmailElement = document.getElementById('profileEmail');
    const profileAvatarElement = document.getElementById('profileAvatar');
    const memberSinceElement = document.getElementById('memberSince');
    const logoutBtn = document.getElementById('logoutBtn');
    const editProfileBtn = document.getElementById('editProfileBtn');
    
    // Add visual effects
    initializeEffects();
    
    // Check if user is logged in
    window.firebaseAuth.onAuthStateChanged(async (authState) => {
        if (authState.loggedIn && authState.user) {
            // User is logged in
            updateUserProfile(authState.user);
            setupEventListeners();
        } else {
            // User is not logged in, redirect to login page
            window.location.href = 'login.html?redirect=account.html';
        }
    });
    
    // Set up event listeners
    function setupEventListeners() {
        // Logout button
        logoutBtn.addEventListener('click', async () => {
            const result = await window.firebaseAuth.logoutUser();
            if (result.success) {
                // Redirect to home page
                window.location.href = 'index.html';
            } else {
                // Show error
                showToast(result.error, 'error');
            }
        });
        
        // Edit profile button
        editProfileBtn.addEventListener('click', () => {
            openEditProfileModal();
        });
        
        // Setup preference toggles with localStorage
        const darkModeSwitch = document.getElementById('darkModeSwitch');
        const notificationsSwitch = document.getElementById('notificationsSwitch');
        const autoplaySwitch = document.getElementById('autoplaySwitch');
        
        // Load preferences from localStorage
        darkModeSwitch.checked = localStorage.getItem('darkMode') !== 'false';
        notificationsSwitch.checked = localStorage.getItem('notifications') !== 'false';
        autoplaySwitch.checked = localStorage.getItem('autoplay') !== 'false';
        
        // Save preferences to localStorage on change
        darkModeSwitch.addEventListener('change', () => {
            localStorage.setItem('darkMode', darkModeSwitch.checked);
            showToast('Preferencia guardada', 'success');
        });
        
        notificationsSwitch.addEventListener('change', () => {
            localStorage.setItem('notifications', notificationsSwitch.checked);
            showToast('Preferencia guardada', 'success');
        });
        
        autoplaySwitch.addEventListener('change', () => {
            localStorage.setItem('autoplay', autoplaySwitch.checked);
            showToast('Preferencia guardada', 'success');
        });
    }
    
    // Update user profile information in the UI
    function updateUserProfile(user) {
        // Set profile name, email, and avatar
        profileNameElement.textContent = user.displayName || user.username || user.email.split('@')[0];
        profileEmailElement.textContent = user.email;
        
        // Set member since date
        const memberSinceDate = user.created_at 
            ? new Date(user.created_at)
            : new Date();
        
        const formattedDate = new Intl.DateTimeFormat('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(memberSinceDate);
        
        memberSinceElement.textContent = `Miembro desde: ${formattedDate}`;
        
        // Set avatar
        if (user.photoURL) {
            // If user has a profile picture
            profileAvatarElement.innerHTML = `<img src="${user.photoURL}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            // Get first letter of username or email
            const firstLetter = (user.displayName || user.username || user.email).charAt(0).toUpperCase();
            profileAvatarElement.innerHTML = firstLetter;
            
            // Random pastel color based on username
            const hue = Math.abs(hashCode(user.email) % 360);
            profileAvatarElement.style.background = `hsl(${hue}, 70%, 60%)`;
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
    
    // Open edit profile modal
    function openEditProfileModal() {
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
                                    <div class="mb-3">
                                        <label for="editUsername" class="form-label">Nombre de usuario</label>
                                        <input type="text" class="form-control" id="editUsername" placeholder="Nombre de usuario">
                                    </div>
                                    <div class="mb-3">
                                        <label for="editAvatar" class="form-label">Avatar URL (opcional)</label>
                                        <input type="text" class="form-control" id="editAvatar" placeholder="URL de imagen para avatar">
                                        <small class="form-text text-muted">Deja en blanco para usar avatar generado</small>
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
            
            // Set up form submission
            document.getElementById('profileForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('editUsername').value.trim();
                const avatarURL = document.getElementById('editAvatar').value.trim();
                
                if (!username) {
                    showToast('El nombre de usuario es obligatorio', 'error');
                    return;
                }
                
                const result = await window.firebaseAuth.updateUserProfile(username, avatarURL);
                
                if (result.success) {
                    showToast('Perfil actualizado con éxito', 'success');
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                    modal.hide();
                    
                    // Reload user data
                    const user = await window.firebaseAuth.getCurrentUser();
                    updateUserProfile(user);
                } else {
                    showToast(result.error, 'error');
                }
            });
        }
        
        // Fill in current user data
        window.firebaseAuth.getCurrentUser().then(user => {
            document.getElementById('editUsername').value = user.displayName || user.username || '';
            document.getElementById('editAvatar').value = user.photoURL || '';
        });
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();
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
        // Create toast element
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
});