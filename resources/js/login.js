// login.js - Sistema de autenticación
class AuthSystem {
    constructor() {
        this.init();
    }

    init() {
        // Bind login forms
        this.bindLoginForms();
        // Check if user is already logged in
        this.checkLoginStatus();
    }

    bindLoginForms() {
        // Hero form
        const heroForm = document.querySelector('.hero form');
        if (heroForm) {
            heroForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Modal form
        const modalForm = document.querySelector('#loginModal form');
        if (modalForm) {
            modalForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Login page form
        const loginPageForm = document.querySelector('.login-page-section form');
        if (loginPageForm) {
            loginPageForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const password = form.querySelector('input[type="password"]').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
        submitBtn.disabled = true;

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (this.validateCredentials(email, password)) {
            // Login successful
            this.setLoginStatus(true, email);
            this.showSuccess('¡Inicio de sesión exitoso! Redirigiendo...');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Login failed
            this.showError('Credenciales inválidas. Intenta con admin/admin');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    validateCredentials(email, password) {

        return email === 'admin@gmail.com' && password === 'admin';
    }

    setLoginStatus(isLoggedIn, email = null) {
        localStorage.setItem('isLoggedIn', isLoggedIn);
        if (email) {
            localStorage.setItem('userEmail', email);
        }
    }

    checkLoginStatus() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userEmail = localStorage.getItem('userEmail');
        
        if (isLoggedIn && userEmail) {
            this.updateUIForLoggedInUser(userEmail);
        }
    }

    updateUIForLoggedInUser(email) {
        // Update navigation
        const loginLinks = document.querySelectorAll('a[data-bs-target="#loginModal"], .nav-link[href*="login"]');
        loginLinks.forEach(link => {
            link.innerHTML = `<i class="fas fa-user"></i> ${email}`;
            link.removeAttribute('data-bs-target');
            link.href = '#';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUserMenu(e.target);
            });
        });
    }

    showUserMenu(element) {
        // Create dropdown menu
        const existingMenu = document.querySelector('.user-dropdown');
        if (existingMenu) {
            existingMenu.remove();
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--oscuro-secundario);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 10px;
            min-width: 200px;
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        dropdown.innerHTML = `
            <div style="color: var(--texto-primario); margin-bottom: 10px;">
                <strong>${localStorage.getItem('userEmail')}</strong>
            </div>
            <hr style="border-color: rgba(255,255,255,0.1);">
            <a href="#" style="color: var(--texto-secundario); text-decoration: none; display: block; padding: 5px 0;" onclick="authSystem.logout()">
                <i class="fas fa-sign-out-alt"></i> Cerrar sesión
            </a>
        `;

        element.parentElement.style.position = 'relative';
        element.parentElement.appendChild(dropdown);

        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target) && !element.contains(e.target)) {
                    dropdown.remove();
                }
            }, { once: true });
        }, 100);
    }

    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        window.location.reload();
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
        `;

        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span style="margin-left: 10px;">${message}</span>
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});