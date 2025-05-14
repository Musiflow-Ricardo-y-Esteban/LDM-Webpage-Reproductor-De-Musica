// global-navigation.js - Sistema de navegación mejorado
class GlobalNavigation {
    constructor() {
        this.init();
    }

    init() {
        this.updateNavigationForAllPages();
        this.addNavigationEventListeners();
        this.checkAndRedirectToAccount();
    }

    updateNavigationForAllPages() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userEmail = localStorage.getItem('userEmail');
        
        // Update all login/account links on all pages
        const loginLinks = document.querySelectorAll('#loginLink, #accountLink');
        
        if (isLoggedIn && userEmail) {
            loginLinks.forEach(link => {
                if (link) {
                    link.innerHTML = `<i class="fas fa-user"></i> Mi Cuenta`;
                    link.href = 'cuenta.html';
                    link.id = 'accountLink';
                }
            });
        } else {
            loginLinks.forEach(link => {
                if (link) {
                    link.innerHTML = `<i class="fas fa-sign-in-alt"></i> Ingresar`;
                    link.href = 'login.html';
                    link.id = 'loginLink';
                }
            });
        }
    }

    addNavigationEventListeners() {
        // Handle clicks on protected pages
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Check if trying to access protected pages
            const protectedPages = ['cuenta.html'];
            const isProtected = protectedPages.some(page => href.includes(page));

            if (isProtected) {
                const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
                if (!isLoggedIn) {
                    e.preventDefault();
                    localStorage.setItem('redirectAfterLogin', href);
                    window.location.href = 'login.html';
                }
            }
        });
    }

    checkAndRedirectToAccount() {
        // If user is logged in and tries to access login page, redirect to account
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (isLoggedIn && currentPage === 'login.html') {
            window.location.href = 'cuenta.html';
        }
    }

    // Utility method to check if user should have access to current page
    static checkPageAccess() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const protectedPages = ['cuenta.html'];

        if (protectedPages.includes(currentPage) && !isLoggedIn) {
            localStorage.setItem('redirectAfterLogin', currentPage);
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Method to handle logout from any page
    static logout() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userAvatar');
            window.location.href = 'index.html';
        }
    }

    // Enhanced navigation with loading states
    static navigateWithLoading(url) {
        // Show loading state
        const currentPage = document.body;
        currentPage.style.opacity = '0.7';
        currentPage.style.pointerEvents = 'none';
        
        // Navigate after a short delay
        setTimeout(() => {
            window.location.href = url;
        }, 300);
    }
}

// Enhanced login system integration
class EnhancedLoginSystem {
    constructor() {
        this.initializeEnhancedFeatures();
    }

    initializeEnhancedFeatures() {
        // Add remember me functionality
        this.loadRememberedCredentials();
        
        // Add auto-login check
        this.checkAutoLogin();
        
        // Enhanced error handling
        this.setupEnhancedErrorHandling();
    }

    loadRememberedCredentials() {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        const savedEmail = localStorage.getItem('savedEmail');
        
        if (rememberMe && savedEmail) {
            const emailInput = document.getElementById('email');
            const rememberCheckbox = document.getElementById('rememberMe');
            
            if (emailInput) emailInput.value = savedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    checkAutoLogin() {
        const autoLogin = localStorage.getItem('autoLogin') === 'true';
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (autoLogin && isLoggedIn) {
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'login.html') {
                window.location.href = 'cuenta.html';
            }
        }
    }

    setupEnhancedErrorHandling() {
        // Improved error messages
        window.showEnhancedError = (message, duration = 5000) => {
            const existingError = document.querySelector('.enhanced-error');
            if (existingError) existingError.remove();

            const errorToast = document.createElement('div');
            errorToast.className = 'enhanced-error';
            errorToast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #ff6b6b, #ff5252);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
                z-index: 10000;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 300px;
            `;

            errorToast.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <div style="font-weight: 600;">Error</div>
                    <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
                </div>
            `;

            document.body.appendChild(errorToast);

            setTimeout(() => {
                errorToast.style.transform = 'translateX(0)';
                errorToast.style.opacity = '1';
            }, 100);

            setTimeout(() => {
                errorToast.style.transform = 'translateX(100%)';
                errorToast.style.opacity = '0';
                setTimeout(() => errorToast.remove(), 300);
            }, duration);
        };
        
        // Global toast function
        window.showToast = (message, type = 'success') => {
            const toastColors = {
                success: '#4caf50',
                error: '#f44336',
                info: '#2196f3',
                warning: '#ff9800'
            };
            
            const toastIcons = {
                success: 'check-circle',
                error: 'exclamation-triangle',
                info: 'info-circle',
                warning: 'exclamation-triangle'
            };
            
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${toastColors[type]};
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 10000;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 300px;
                max-width: 400px;
            `;
            
            toast.innerHTML = `
                <i class="fas fa-${toastIcons[type]}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(toast);
            
            // Animar entrada
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            }, 100);
            
            // Remover después de 4 segundos
            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        };
    }

    // Save login state with enhanced features
    static saveEnhancedLoginState(email, rememberMe) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', email.split('@')[0]);
        localStorage.setItem('lastLoginTime', Date.now().toString());
        
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
        }
    }
}

// Music integration utilities
class MusicIntegrationUtils {
    // Share track functionality
    static shareTrack(track) {
        if (navigator.share) {
            navigator.share({
                title: `${track.title} - ${track.artist}`,
                text: `Escucha "${track.title}" de ${track.artist} en MusiFlow`,
                url: track.externalUrl || window.location.href
            }).catch(err => console.log('Error sharing:', err));
        } else {
            // Fallback for browsers without Web Share API
            const shareText = `${track.title} - ${track.artist}`;
            navigator.clipboard.writeText(shareText).then(() => {
                this.showToast('Información de la canción copiada al portapapeles', 'info');
            });
        }
    }
// Export favorites functionality
   static exportFavorites() {
       const favorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
       const playlist = {
           name: 'Mis Favoritos - MusiFlow',
           description: 'Exportado desde MusiFlow',
           tracks: favorites,
           exportDate: new Date().toISOString(),
           totalTracks: favorites.length
       };
       
       const blob = new Blob([JSON.stringify(playlist, null, 2)], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `favoritos-musiflow-${new Date().toISOString().split('T')[0]}.json`;
       a.click();
       URL.revokeObjectURL(url);
       
       this.showToast(`Exportados ${favorites.length} favoritos`, 'success');
   }

   // Import favorites functionality
   static importFavorites(event) {
       const file = event.target.files[0];
       if (!file) return;
       
       const reader = new FileReader();
       reader.onload = (e) => {
           try {
               const importedData = JSON.parse(e.target.result);
               
               // Validate imported data structure
               if (!importedData.tracks || !Array.isArray(importedData.tracks)) {
                   throw new Error('Archivo de favoritos inválido');
               }
               
               const existingFavorites = JSON.parse(localStorage.getItem('favoriteSongs') || '[]');
               const merged = [...existingFavorites];
               let added = 0;
               
               importedData.tracks.forEach(track => {
                   if (!merged.find(existing => existing.id === track.id)) {
                       merged.push(track);
                       added++;
                   }
               });
               
               localStorage.setItem('favoriteSongs', JSON.stringify(merged));
               this.showToast(`Se importaron ${added} canciones nuevas`, 'success');
               
               // Refresh the page if we're on the account page
               if (window.location.pathname.includes('cuenta.html')) {
                   window.location.reload();
               }
           } catch (error) {
               this.showToast('Error al importar el archivo', 'error');
               console.error('Import error:', error);
           }
       };
       reader.readAsText(file);
   }

   // Export playlists functionality
   static exportPlaylists() {
       const playlists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');
       const exportData = {
           name: 'Listas de Reproducción - MusiFlow',
           description: 'Exportado desde MusiFlow',
           playlists: playlists,
           exportDate: new Date().toISOString(),
           totalPlaylists: playlists.length
       };
       
       const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `playlists-musiflow-${new Date().toISOString().split('T')[0]}.json`;
       a.click();
       URL.revokeObjectURL(url);
       
       this.showToast(`Exportadas ${playlists.length} listas de reproducción`, 'success');
   }

   // Import playlists functionality
   static importPlaylists(event) {
       const file = event.target.files[0];
       if (!file) return;
       
       const reader = new FileReader();
       reader.onload = (e) => {
           try {
               const importedData = JSON.parse(e.target.result);
               
               // Validate imported data structure
               if (!importedData.playlists || !Array.isArray(importedData.playlists)) {
                   throw new Error('Archivo de listas de reproducción inválido');
               }
               
               const existingPlaylists = JSON.parse(localStorage.getItem('userPlaylists') || '[]');
               const merged = [...existingPlaylists];
               let added = 0;
               
               importedData.playlists.forEach(playlist => {
                   // Generate new ID to avoid conflicts
                   playlist.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                   playlist.name = playlist.name + ' (Importada)';
                   merged.push(playlist);
                   added++;
               });
               
               localStorage.setItem('userPlaylists', JSON.stringify(merged));
               this.showToast(`Se importaron ${added} listas de reproducción`, 'success');
               
               // Refresh the page if we're on the account page
               if (window.location.pathname.includes('cuenta.html')) {
                   window.location.reload();
               }
           } catch (error) {
               this.showToast('Error al importar el archivo', 'error');
               console.error('Import error:', error);
           }
       };
       reader.readAsText(file);
   }

   // Backup all user data
   static backupUserData() {
       const userData = {
           profile: {
               email: localStorage.getItem('userEmail'),
               name: localStorage.getItem('userName'),
               avatar: localStorage.getItem('userAvatar'),
               bio: localStorage.getItem('userBio')
           },
           favorites: JSON.parse(localStorage.getItem('favoriteSongs') || '[]'),
           playlists: JSON.parse(localStorage.getItem('userPlaylists') || '[]'),
           recentActivity: JSON.parse(localStorage.getItem('recentActivity') || '[]'),
           settings: {
               defaultVolume: localStorage.getItem('defaultVolume'),
               shuffleMode: localStorage.getItem('shuffleMode'),
               notifications: localStorage.getItem('notifications')
           },
           stats: {
               totalPlayTime: localStorage.getItem('totalPlayTime')
           },
           backupDate: new Date().toISOString()
       };
       
       const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `backup-musiflow-${new Date().toISOString().split('T')[0]}.json`;
       a.click();
       URL.revokeObjectURL(url);
       
       this.showToast('Copia de seguridad creada exitosamente', 'success');
   }

   // Restore user data from backup
   static restoreUserData(event) {
       const file = event.target.files[0];
       if (!file) return;
       
       const reader = new FileReader();
       reader.onload = (e) => {
           try {
               const backupData = JSON.parse(e.target.result);
               
               // Validate backup structure
               if (!backupData.backupDate) {
                   throw new Error('Archivo de respaldo inválido');
               }
               
               // Restore profile data
               if (backupData.profile) {
                   if (backupData.profile.name) localStorage.setItem('userName', backupData.profile.name);
                   if (backupData.profile.avatar) localStorage.setItem('userAvatar', backupData.profile.avatar);
                   if (backupData.profile.bio) localStorage.setItem('userBio', backupData.profile.bio);
               }
               
               // Restore favorites
               if (backupData.favorites) {
                   localStorage.setItem('favoriteSongs', JSON.stringify(backupData.favorites));
               }
               
               // Restore playlists
               if (backupData.playlists) {
                   // Update IDs to avoid conflicts
                   const updatedPlaylists = backupData.playlists.map(playlist => ({
                       ...playlist,
                       id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                       name: playlist.name + ' (Restaurada)'
                   }));
                   localStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));
               }
               
               // Restore settings
               if (backupData.settings) {
                   Object.entries(backupData.settings).forEach(([key, value]) => {
                       if (value !== null && value !== undefined) {
                           localStorage.setItem(key, value);
                       }
                   });
               }
               
               // Restore stats
               if (backupData.stats && backupData.stats.totalPlayTime) {
                   localStorage.setItem('totalPlayTime', backupData.stats.totalPlayTime);
               }
               
               this.showToast('Datos restaurados exitosamente', 'success');
               
               // Reload page to show restored data
               setTimeout(() => {
                   window.location.reload();
               }, 2000);
               
           } catch (error) {
               this.showToast('Error al restaurar los datos', 'error');
               console.error('Restore error:', error);
           }
       };
       reader.readAsText(file);
   }

   static showToast(message, type = 'info') {
       // Reuse the toast functionality from other modules
       if (window.showToast) {
           window.showToast(message, type);
       } else {
           console.log(`${type.toUpperCase()}: ${message}`);
       }
   }
}

// Analytics and Statistics
class MusicAnalytics {
   static recordEvent(eventType, data) {
       const events = JSON.parse(localStorage.getItem('musicAnalytics') || '[]');
       events.push({
           type: eventType,
           data: data,
           timestamp: Date.now(),
           date: new Date().toISOString()
       });
       
       // Keep only last 1000 events
       if (events.length > 1000) {
           events.splice(0, events.length - 1000);
       }
       
       localStorage.setItem('musicAnalytics', JSON.stringify(events));
   }
   
   static getListeningStats() {
       const events = JSON.parse(localStorage.getItem('musicAnalytics') || '[]');
       const playEvents = events.filter(e => e.type === 'track_played');
       
       const stats = {
           totalTracks: playEvents.length,
           uniqueTracks: new Set(playEvents.map(e => e.data.trackId)).size,
           artistStats: {},
           genreStats: {},
           hourlyStats: Array(24).fill(0),
           dailyStats: {}
       };
       
       playEvents.forEach(event => {
           // Artist stats
           const artist = event.data.artist;
           stats.artistStats[artist] = (stats.artistStats[artist] || 0) + 1;
           
           // Genre stats (if available)
           if (event.data.genre) {
               stats.genreStats[event.data.genre] = (stats.genreStats[event.data.genre] || 0) + 1;
           }
           
           // Hourly stats
           const hour = new Date(event.timestamp).getHours();
           stats.hourlyStats[hour]++;
           
           // Daily stats
           const day = new Date(event.timestamp).toDateString();
           stats.dailyStats[day] = (stats.dailyStats[day] || 0) + 1;
       });
       
       // Sort artist stats
       stats.topArtists = Object.entries(stats.artistStats)
           .sort((a, b) => b[1] - a[1])
           .slice(0, 10);
       
       return stats;
   }
   
   static generateInsights() {
       const stats = this.getListeningStats();
       const insights = [];
       
       // Most played artist
       if (stats.topArtists.length > 0) {
           insights.push({
               type: 'top_artist',
               title: 'Tu artista favorito',
               text: `Has escuchado más a ${stats.topArtists[0][0]} con ${stats.topArtists[0][1]} reproducciones`,
               icon: 'fa-user-music'
           });
       }
       
       // Listening patterns
       const maxHour = stats.hourlyStats.indexOf(Math.max(...stats.hourlyStats));
       if (maxHour !== -1) {
           const timeOfDay = maxHour < 12 ? 'mañana' : maxHour < 18 ? 'tarde' : 'noche';
           insights.push({
               type: 'listening_time',
               title: 'Tu momento musical',
               text: `Escuchas más música por la ${timeOfDay} (${maxHour}:00)`,
               icon: 'fa-clock'
           });
       }
       
       // Discovery rate
       const discoveryRate = stats.uniqueTracks / Math.max(stats.totalTracks, 1);
       if (discoveryRate > 0.7) {
           insights.push({
               type: 'discovery',
               title: 'Explorador musical',
               text: `Descubres nueva música frecuentemente (${Math.round(discoveryRate * 100)}% variedad)`,
               icon: 'fa-compass'
           });
       }
       
       return insights;
   }
}

// Initialize global navigation and enhanced features
document.addEventListener('DOMContentLoaded', () => {
   new GlobalNavigation();
   new EnhancedLoginSystem();
   
   // Make utilities available globally
   window.GlobalNavigation = GlobalNavigation;
   window.MusicIntegrationUtils = MusicIntegrationUtils;
   window.EnhancedLoginSystem = EnhancedLoginSystem;
   window.MusicAnalytics = MusicAnalytics;
   
   // Add keyboard shortcuts for power users
   document.addEventListener('keydown', (e) => {
       // Alt + E: Export favorites
       if (e.altKey && e.key === 'e') {
           e.preventDefault();
           MusicIntegrationUtils.exportFavorites();
       }
       
       // Alt + I: Import favorites (create input on demand)
       if (e.altKey && e.key === 'i') {
           e.preventDefault();
           const input = document.createElement('input');
           input.type = 'file';
           input.accept = '.json';
           input.onchange = MusicIntegrationUtils.importFavorites;
           input.click();
       }
       
       // Alt + B: Backup user data
       if (e.altKey && e.key === 'b') {
           e.preventDefault();
           MusicIntegrationUtils.backupUserData();
       }
   });
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
   module.exports = {
       GlobalNavigation,
       EnhancedLoginSystem,
       MusicIntegrationUtils,
       MusicAnalytics
   };
}
