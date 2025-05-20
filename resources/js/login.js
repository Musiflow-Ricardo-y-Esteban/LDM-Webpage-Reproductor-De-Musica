// login.js - Sistema de autenticación integrado con Firebase
class AuthSystem {
    constructor() {
        this.init();
    }

    init() {
        // Bind login forms
        this.bindLoginForms();
        
        // Check if user is already logged in
        this.checkLoginStatus();
        
        // Add loading overlay if not exists
        this.ensureLoadingOverlayExists();
    }

    bindLoginForms() {
        // Hero form on homepage
        const heroForm = document.querySelector('.hero form');
        if (heroForm) {
            heroForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Modal form
        const modalForm = document.querySelector('#loginModal form');
        if (modalForm) {
            modalForm.addEventListener('submit', (e) => this.handleLogin(e));
            
            // Add registration option if not exists
            if (!document.getElementById('registerBtn')) {
                const registerBtn = document.createElement('button');
                registerBtn.id = 'registerBtn';
                registerBtn.type = 'button';
                registerBtn.className = 'btn btn-outline-light w-100 mt-2';
                registerBtn.innerHTML = 'Crear cuenta';
                registerBtn.addEventListener('click', () => this.showRegistrationModal());
                
                const container = modalForm.querySelector('.modal-footer');
                if (container) {
                    container.appendChild(registerBtn);
                }
            }
        }

        // Login page form
        const loginPageForm = document.querySelector('.login-page-section form');
        if (loginPageForm) {
            loginPageForm.addEventListener('submit', (e) => this.handleLogin(e));
            
            // Add registration link if on login page
            const registerLink = loginPageForm.querySelector('a[href="#register"]');
            if (registerLink) {
                registerLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showRegistrationModal();
                });
            }
            
            // Add forgot password link
            const forgotPasswordLink = loginPageForm.querySelector('a[href*="forgot"]');
            if (forgotPasswordLink) {
                forgotPasswordLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showForgotPasswordModal();
                });
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validate inputs
        if (!email || !password) {
            this.showError('Por favor, introduce tu correo electrónico y contraseña.');
            return;
        }
        
        // Show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
        submitBtn.disabled = true;

        // Call Firebase login
        const result = await window.firebaseAuth.loginUser(email, password);
        
        if (result.success) {
            // Login successful
            this.showSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
            
            // Get redirect URL from query parameter or localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect') || 
                                localStorage.getItem('redirectAfterLogin') || 
                                'index.html';
            
            // Clear redirect URL
            localStorage.removeItem('redirectAfterLogin');
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } else {
            // Login failed
            this.showError(result.error || 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Add error animation
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
    }

    checkLoginStatus() {
        // Set up auth state observer
        window.firebaseAuth.onAuthStateChanged((authState) => {
            if (authState.loggedIn && authState.user) {
                // User is logged in
                this.updateUIForLoggedInUser(authState.user);
                
                // If on login page, redirect to account
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'account.html';
                }
            }
        });
    }

    updateUIForLoggedInUser(user) {
        // Update navigation
        const loginLinks = document.querySelectorAll('a[data-bs-target="#loginModal"], .nav-link[href*="login"]');
        loginLinks.forEach(link => {
            const displayName = user.displayName || user.username || user.email.split('@')[0];
            link.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
            link.removeAttribute('data-bs-target');
            link.href = 'account.html';
        });
    }

    showRegistrationModal() {
        // Create modal if not exists
        if (!document.getElementById('registerModal')) {
            const modalHtml = `
                <div class="modal fade" id="registerModal" tabindex="-1" aria-labelledby="registerModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-0">
                                <h5 class="modal-title" id="registerModalLabel">Crear una cuenta</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="registerForm">
                                    <div class="mb-3">
                                        <label for="registerUsername" class="form-label">Nombre de usuario</label>
                                        <input type="text" class="form-control" id="registerUsername" placeholder="Tu nombre de usuario">
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerEmail" class="form-label">Correo electrónico</label>
                                        <input type="email" class="form-control" id="registerEmail" placeholder="nombre@ejemplo.com">
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerPassword" class="form-label">Contraseña</label>
                                        <input type="password" class="form-control" id="registerPassword" placeholder="Contraseña (mínimo 6 caracteres)">
                                    </div>
                                    <div class="mb-3">
                                        <label for="registerConfirmPassword" class="form-label">Confirmar contraseña</label>
                                        <input type="password" class="form-control" id="registerConfirmPassword" placeholder="Confirma tu contraseña">
                                    </div>
                                    <div class="mb-3 form-check">
                                        <input type="checkbox" class="form-check-input" id="registerTerms">
                                        <label class="form-check-label" for="registerTerms">Acepto los <a href="#" class="text-decoration-none">términos y condiciones</a></label>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Registrarme</button>
                                </form>
                            </div>
                            <div class="modal-footer border-0 justify-content-center">
                                <p class="mb-0">¿Ya tienes cuenta? <a href="#" class="text-decoration-none" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#loginModal">Inicia sesión</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Append modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Set up form submission
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('registerUsername').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerConfirmPassword').value;
                const terms = document.getElementById('registerTerms').checked;
                
                // Validate inputs
                if (!username || !email || !password) {
                    this.showError('Por favor, completa todos los campos.');
                    return;
                }
                
                if (password.length < 6) {
                    this.showError('La contraseña debe tener al menos 6 caracteres.');
                    return;
                }
                
                if (password !== confirmPassword) {
                    this.showError('Las contraseñas no coinciden.');
                    return;
                }
                
                if (!terms) {
                    this.showError('Debes aceptar los términos y condiciones.');
                    return;
                }
                
                // Submit button loading state
                const submitBtn = document.querySelector('#registerForm button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';
                submitBtn.disabled = true;
                
                // Register user with Firebase
                const result = await window.firebaseAuth.registerUser(email, password, username);
                
                if (result.success) {
                    // Registration successful
                    this.showSuccess('¡Registro exitoso! Redirigiendo a tu cuenta...');
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    modal.hide();
                    
                    // Redirect to account page after a short delay
                    setTimeout(() => {
                        window.location.href = 'account.html';
                    }, 1500);
                } else {
                    // Registration failed
                    this.showError(result.error || 'Error al registrar. Por favor, inténtalo de nuevo.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Close login modal if open
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const bsLoginModal = bootstrap.Modal.getInstance(loginModal);
            if (bsLoginModal) bsLoginModal.hide();
        }
        
        // Show registration modal
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();
    }

    showForgotPasswordModal() {
        // Create modal if not exists
        if (!document.getElementById('forgotPasswordModal')) {
            const modalHtml = `
                <div class="modal fade" id="forgotPasswordModal" tabindex="-1" aria-labelledby="forgotPasswordModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content bg-dark text-white">
                            <div class="modal-header border-0">
                                <h5 class="modal-title" id="forgotPasswordModalLabel">Recuperar contraseña</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
                                <form id="forgotPasswordForm">
                                    <div class="mb-3">
                                        <label for="resetEmail" class="form-label">Correo electrónico</label>
                                        <input type="email" class="form-control" id="resetEmail" placeholder="nombre@ejemplo.com">
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100">Enviar enlace de recuperación</button>
                                </form>
                            </div>
                            <div class="modal-footer border-0 justify-content-center">
                                <p class="mb-0">¿Recordaste tu contraseña? <a href="#" class="text-decoration-none" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#loginModal">Inicia sesión</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Append modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Set up form submission
            document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('resetEmail').value.trim();
                
                // Validate email
                if (!email) {
                    this.showError('Por favor, introduce tu correo electrónico.');
                    return;
                }
                
                // Submit button loading state
                const submitBtn = document.querySelector('#forgotPasswordForm button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
                submitBtn.disabled = true;
                
                // Call Firebase reset password
                const result = await window.firebaseAuth.resetPassword(email);
                
                if (result.success) {
                    // Reset email sent
                    this.showSuccess('Se ha enviado un enlace de recuperación a tu correo electrónico.');
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                    modal.hide();
                } else {
                    // Reset failed
                    this.showError(result.error || 'Error al enviar el enlace. Verifica tu correo electrónico.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Close login modal if open
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const bsLoginModal = bootstrap.Modal.getInstance(loginModal);
            if (bsLoginModal) bsLoginModal.hide();
        }
        
        // Show forgot password modal
        const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        forgotPasswordModal.show();
    }

    logout() {
        window.firebaseAuth.logoutUser()
            .then(result => {
                if (result.success) {
                    this.showSuccess('Has cerrado sesión correctamente.');
                    
                    // Reload page
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    this.showError('Error al cerrar sesión.');
                }
            });
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'success') {
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
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Create loading overlay if doesn't exist
    ensureLoadingOverlayExists() {
        if (!document.getElementById('loadingOverlay')) {
            const loadingHtml = `
                <div class="loading-overlay" id="loadingOverlay">
                    <div class="spinner"></div>
                </div>
            `;
            
            // Append to body
            document.body.insertAdjacentHTML('beforeend', loadingHtml);
            
            // Add styles if not already defined
            if (!document.getElementById('loadingStyles')) {
                const style = document.createElement('style');
                style.id = 'loadingStyles';
                style.textContent = `
                    .loading-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background-color: rgba(0, 0, 0, 0.7);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                        visibility: hidden;
                        opacity: 0;
                        transition: all 0.3s ease;
                    }
                    .loading-overlay.show {
                        visibility: visible;
                        opacity: 1;
                    }
                    .spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid rgba(255, 255, 255, 0.1);
                        border-left-color: var(--acento-actual, #ff1493);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    .shake {
                        animation: shake 0.5s;
                    }
                    @keyframes shake {
                        0%, 50%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-5px); }
                        75% { transform: translateX(5px); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase auth is available
    if (typeof window.firebaseAuth === 'undefined') {
        console.error('Firebase Auth not initialized. Loading scripts...');
        
        // Load Firebase scripts if not already loaded
        const loadFirebaseScripts = () => {
            // Load Firebase scripts
            const scripts = [
                'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js',
                'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js',
                'resources/js/firebase-auth.js'
            ];
            
            let scriptsLoaded = 0;
            
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => {
                    scriptsLoaded++;
                    if (scriptsLoaded === scripts.length) {
                        // All scripts loaded, initialize auth system
                        window.authSystem = new AuthSystem();
                    }
                };
                document.head.appendChild(script);
            });
        };
        
        loadFirebaseScripts();
    } else {
        // Firebase Auth already loaded, initialize auth system
        window.authSystem = new AuthSystem();
    }
});