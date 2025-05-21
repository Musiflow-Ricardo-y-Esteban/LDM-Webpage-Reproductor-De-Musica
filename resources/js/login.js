// login.js - Sistema de autenticación integrado con Firebase

/**
 * Clase AuthSystem: Gestiona todo el sistema de autenticación de la aplicación
 * - Maneja el registro de usuarios
 * - Procesa inicios de sesión
 * - Permite recuperación de contraseñas
 * - Gestiona la interfaz visual según el estado de autenticación
 */
class AuthSystem {
    constructor() {
        this.init();
    }

    /**
     * Inicializa el sistema de autenticación
     * Configura formularios y verifica estado de login
     */
    init() {
        // Vincular formularios de login
        this.bindLoginForms();
        
        // Verificar si el usuario ya está logueado
        this.checkLoginStatus();
        
        // Añadir overlay de carga si no existe
        this.ensureLoadingOverlayExists();
    }

    /**
     * Vincula todos los formularios de inicio de sesión de la aplicación
     * Configura eventos para cada tipo de formulario
     */
    bindLoginForms() {
        // Hero form en la página principal
        const heroForm = document.querySelector('.hero form');
        if (heroForm) {
            heroForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Formulario del modal
        const modalForm = document.querySelector('#loginModal form');
        if (modalForm) {
            modalForm.addEventListener('submit', (e) => this.handleLogin(e));
            
            // Añadir opción de registro si no existe
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

        // Formulario en página de login
        const loginPageForm = document.querySelector('.login-page-section form');
        if (loginPageForm) {
            loginPageForm.addEventListener('submit', (e) => this.handleLogin(e));
            
            // Añadir link de registro en página de login
            const registerLink = loginPageForm.querySelector('a[href="#register"]');
            if (registerLink) {
                registerLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showRegistrationModal();
                });
            }
            
            // Añadir link de contraseña olvidada
            const forgotPasswordLink = loginPageForm.querySelector('a[href*="forgot"]');
            if (forgotPasswordLink) {
                forgotPasswordLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showForgotPasswordModal();
                });
            }
        }
    }

    /**
     * Maneja el proceso de inicio de sesión
     * Valida credenciales y se comunica con Firebase
     */
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Validar inputs
        if (!email || !password) {
            this.showError('Por favor, introduce tu correo electrónico y contraseña.');
            return;
        }
        
        // Mostrar estado de carga
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
        submitBtn.disabled = true;

        // Llamar a Firebase para login
        const result = await window.firebaseAuth.loginUser(email, password);
        
        if (result.success) {
            // Login exitoso
            this.showSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
            
            // Obtener URL de redirección desde parámetro o localStorage
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect') || 
                                localStorage.getItem('redirectAfterLogin') || 
                                'index.html';
            
            // Limpiar URL de redirección
            localStorage.removeItem('redirectAfterLogin');
            
            // Redireccionar después de un breve retraso
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } else {
            // Login fallido
            this.showError(result.error || 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Añadir animación de error
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
    }

    /**
     * Verifica si el usuario ya está autenticado
     * Actualiza la interfaz según el estado
     */
    checkLoginStatus() {
        // Configurar observador de estado de autenticación
        window.firebaseAuth.onAuthStateChanged((authState) => {
            if (authState.loggedIn && authState.user) {
                // Usuario logueado
                this.updateUIForLoggedInUser(authState.user);
                
                // Si estamos en página de login, redirigir a cuenta
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = 'account.html';
                }
            }
        });
    }

    /**
     * Actualiza la interfaz para usuario autenticado
     * Cambia enlaces de login por nombre de usuario
     */
    updateUIForLoggedInUser(user) {
        // Actualizar navegación
        const loginLinks = document.querySelectorAll('a[data-bs-target="#loginModal"], .nav-link[href*="login"]');
        loginLinks.forEach(link => {
            const displayName = user.displayName || user.username || user.email.split('@')[0];
            link.innerHTML = `<i class="fas fa-user"></i> ${displayName}`;
            link.removeAttribute('data-bs-target');
            link.href = 'account.html';
        });
    }

    /**
     * Muestra el modal de registro de nuevos usuarios
     * Crea y configura formulario de registro
     */
    showRegistrationModal() {
        // Crear modal si no existe
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
            
            // Añadir modal al body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Configurar envío del formulario
            document.getElementById('registerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('registerUsername').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerConfirmPassword').value;
                const terms = document.getElementById('registerTerms').checked;
                
                // Validar inputs
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
                
                // Estado de carga del botón
                const submitBtn = document.querySelector('#registerForm button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registrando...';
                submitBtn.disabled = true;
                
                // Registrar usuario con Firebase
                const result = await window.firebaseAuth.registerUser(email, password, username);
                
                if (result.success) {
                    // Registro exitoso
                    this.showSuccess('¡Registro exitoso! Redirigiendo a tu cuenta...');
                    
                    // Cerrar modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
                    modal.hide();
                    
                    // Redirigir a página de cuenta
                    setTimeout(() => {
                        window.location.href = 'account.html';
                    }, 1500);
                } else {
                    // Registro fallido
                    this.showError(result.error || 'Error al registrar. Por favor, inténtalo de nuevo.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Cerrar modal de login si está abierto
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const bsLoginModal = bootstrap.Modal.getInstance(loginModal);
            if (bsLoginModal) bsLoginModal.hide();
        }
        
        // Mostrar modal de registro
        const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
        registerModal.show();
    }

    /**
     * Muestra el modal de recuperación de contraseña
     * Permite solicitar link de reseteo por email
     */
    showForgotPasswordModal() {
        // Crear modal si no existe
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
            
            // Añadir modal al body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Configurar envío del formulario
            document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('resetEmail').value.trim();
                
                // Validar email
                if (!email) {
                    this.showError('Por favor, introduce tu correo electrónico.');
                    return;
                }
                
                // Estado de carga del botón
                const submitBtn = document.querySelector('#forgotPasswordForm button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
                submitBtn.disabled = true;
                
                // Llamar a Firebase para reset de contraseña
                const result = await window.firebaseAuth.resetPassword(email);
                
                if (result.success) {
                    // Email enviado
                    this.showSuccess('Se ha enviado un enlace de recuperación a tu correo electrónico.');
                    
                    // Cerrar modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
                    modal.hide();
                } else {
                    // Reset fallido
                    this.showError(result.error || 'Error al enviar el enlace. Verifica tu correo electrónico.');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
        
        // Cerrar modal de login si está abierto
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const bsLoginModal = bootstrap.Modal.getInstance(loginModal);
            if (bsLoginModal) bsLoginModal.hide();
        }
        
        // Mostrar modal de recuperación
        const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
        forgotPasswordModal.show();
    }

    /**
     * Cierra la sesión del usuario actual
     * Llama a Firebase y actualiza la interfaz
     */
    logout() {
        window.firebaseAuth.logoutUser()
            .then(result => {
                if (result.success) {
                    this.showSuccess('Has cerrado sesión correctamente.');
                    
                    // Recargar página
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    this.showError('Error al cerrar sesión.');
                }
            });
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Muestra mensaje de error
     */
    showError(message) {
        this.showToast(message, 'error');
    }

    /**
     * Muestra notificación tipo toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de toast ('success' o 'error')
     */
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
        
        // Animar entrada
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            toast.style.transform = 'translateY(100px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
     * Crea el overlay de carga si no existe
     * Añade estilos y HTML necesarios
     */
    ensureLoadingOverlayExists() {
        if (!document.getElementById('loadingOverlay')) {
            const loadingHtml = `
                <div class="loading-overlay" id="loadingOverlay">
                    <div class="spinner"></div>
                </div>
            `;
            
            // Añadir al body
            document.body.insertAdjacentHTML('beforeend', loadingHtml);
            
            // Añadir estilos si no están definidos
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

// Inicializar cuando el DOM está cargado
document.addEventListener('DOMContentLoaded', () => {
    // Comprobar si Firebase auth está disponible
    if (typeof window.firebaseAuth === 'undefined') {
        console.error('Firebase Auth no inicializado. Cargando scripts...');
        
        // Cargar scripts de Firebase si no están cargados
        const loadFirebaseScripts = () => {
            // Cargar scripts de Firebase
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
                        // Todos los scripts cargados, inicializar sistema de auth
                        window.authSystem = new AuthSystem();
                    }
                };
                document.head.appendChild(script);
            });
        };
        
        loadFirebaseScripts();
    } else {
        // Firebase Auth ya cargado, inicializar sistema de auth
        window.authSystem = new AuthSystem();
    }
});