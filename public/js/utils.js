// ==============================================
// UTILIDADES GENERALES
// ==============================================

const Utils = {
    /**
     * ✅ MÉTODO: Formatea una fecha a formato local
     */
    formatDate: function(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (e) {
            console.warn('Error formateando fecha:', e);
            return 'Fecha inválida';
        }
    },

    /**
     * ✅ MÉTODO: Formatea fecha con formato extendido
     */
    formatExtendedDate: function(dateString) {
        if (!dateString) return 'No disponible';
        try {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('es-ES', options);
        } catch (e) {
            return 'Fecha no válida';
        }
    },

    /**
     * ✅ MÉTODO: Muestra notificación tipo toast
     */
    showNotification: function(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification-toast ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Mostrar notificación
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Ocultar y eliminar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },

    /**
     * ✅ MÉTODO: Muestra/oculta estado de carga
     */
    showLoading: function(show) {
        // Crear un indicador de carga si no existe
        let loader = document.getElementById('loadingIndicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loadingIndicator';
            loader.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                           background: rgba(0,0,0,0.5); z-index: 9999; display: flex; 
                           justify-content: center; align-items: center;">
                    <div style="background: white; padding: 20px; border-radius: 8px; 
                               text-align: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #3498db;"></i>
                        <p style="margin-top: 10px;">Cargando...</p>
                    </div>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = show ? 'block' : 'none';
    },

    /**
     * ✅ MÉTODO: Descarga un archivo
     */
    downloadFile: function(data, filename, type) {
        const blob = data instanceof Blob ? data : new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * ✅ MÉTODO: Valida si un valor es numérico y positivo
     */
    isValidNumber: function(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0;
    },

    /**
     * ✅ MÉTODO: Escapa caracteres HTML para prevenir XSS
     */
    escapeHtml: function(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    // 🔐 FUNCIONES PARA MANEJO DE SESIÓN

    /**
     * 🔐 MÉTODO: Limpiar token JWT al cerrar sesión
     */
    clearAuthToken: function() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('tempAdminSecret');
        console.log('🔐 Token JWT eliminado');
    },

    /**
     * 🔐 MÉTODO: Verificar autenticación sin redirigir automáticamente
     */
    checkAuthStatus: function() {
        return new Promise((resolve) => {
            const token = localStorage.getItem('jwt_token') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            if (!token) {
                console.log('🔐 No hay token disponible');
                resolve({ authenticated: false, user: null });
                return;
            }

            fetch('/api/auth-status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Token inválido');
                }
                return response.json();
            })
            .then(data => {
                console.log('🔐 Estado de autenticación verificado:', data.authenticated);
                resolve({
                    authenticated: data.authenticated || false,
                    user: data.user || null
                });
            })
            .catch(error => {
                console.error('❌ Error verificando estado de autenticación:', error);
                // Limpiar token inválido
                this.clearAuthToken();
                resolve({ authenticated: false, user: null });
            });
        });
    },

    /**
     * 🔐 MÉTODO: Verificar si estamos en una página pública
     */
    isPublicPage: function() {
        const publicPages = [
            '/',
            '/index.html',
            '/registro',
            '/registro.html',
            '/solicitar-reset',
            '/solicitar_reset.html',
            '/reestablecer-contraseña.html'
        ];
        const currentPath = window.location.pathname;
        return publicPages.some(page => currentPath === page || currentPath.startsWith(page));
    }
};

// ==============================================
// 🔐 SISTEMA DE AUTENTICACIÓN Y ROLES - COMPLETAMENTE CORREGIDO
// ==============================================

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('jwt_token');
        this.user = JSON.parse(localStorage.getItem('userData')) || null;
        this.init();
    }

    /**
     * 🔐 MÉTODO: Inicializar el gestor de autenticación
     */
    init() {
        console.log('🔐 Inicializando AuthManager');
        this.checkAuthState();
        this.setupGlobalHandlers();
        this.setupAuthInterceptor();
    }

    /**
     * 🔥 CORREGIDO: Configurar interceptor para todas las peticiones fetch
     */
    setupAuthInterceptor() {
        const originalFetch = window.fetch;
        
        window.fetch = async (url, options = {}) => {
            // Solo agregar token a rutas API que requieran autenticación
            if (typeof url === 'string' && url.startsWith('/api/') && !this.isPublicRoute(url)) {
                const token = this.getToken();
                if (token) {
                    options.headers = {
                        ...options.headers,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    };
                } else {
                    console.warn('⚠️ No hay token disponible para petición a:', url);
                }
            }
            
            try {
                const response = await originalFetch(url, options);
                
                // Si la respuesta es 401, limpiar sesión
                if (response.status === 401) {
                    console.warn('❌ Token inválido o expirado');
                    this.clearSession();
                    // NO redirigir automáticamente aquí para evitar bucles
                }
                
                return response;
            } catch (error) {
                console.error('❌ Error en petición fetch:', error);
                throw error;
            }
        };

        console.log('✅ Interceptor de autenticación configurado');
    }

    /**
     * 🔥 CORREGIDO: Verificar si es una ruta pública que no requiere token
     */
    isPublicRoute(url) {
        const publicRoutes = [
            '/api/health',
            '/api/auth-status',
            '/auth/login',
            '/auth/registro',
            '/auth/solicitar-reset',
            '/auth/reestablecer-pass'
        ];
        return publicRoutes.some(route => url.includes(route));
    }

    /**
     * 🔐 MÉTODO: Verificar estado de autenticación
     */
    checkAuthState() {
        if (this.isAuthenticated()) {
            console.log('✅ Usuario autenticado:', this.user?.nombre, '- Rol:', this.user?.role);
            this.updateUIForAuthState();
        } else {
            console.log('❌ Usuario no autenticado');
            this.updateUIForAuthState();
        }
    }

    /**
     * 🔐 MÉTODO: Obtener token
     */
    getToken() {
        return this.token || localStorage.getItem('jwt_token');
    }

    /**
     * 🔐 MÉTODO: Verificar si el usuario está autenticado
     */
    isAuthenticated() {
        const token = this.getToken();
        const userData = localStorage.getItem('userData');
        return !!token && !!userData;
    }

    /**
     * 🔐 MÉTODO: Verificar si el usuario es administrador
     */
    isAdmin() {
        return this.isAuthenticated() && this.user && this.user.role === 'admin';
    }

    /**
     * 🔐 MÉTODO: Verificar si el usuario tiene un rol específico
     */
    hasRole(role) {
        return this.isAuthenticated() && this.user && this.user.role === role;
    }

    /**
     * 🔐 MÉTODO: Establecer sesión de usuario
     */
    setSession(token, userData) {
        this.token = token;
        this.user = userData;
        
        localStorage.setItem('jwt_token', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        
        console.log('✅ Sesión establecida para:', userData.nombre, '- Rol:', userData.role);
        this.updateUIForAuthState();
    }

    /**
     * 🔐 MÉTODO: Limpiar sesión (logout)
     */
    clearSession() {
        this.token = null;
        this.user = null;
        
        Utils.clearAuthToken();
        localStorage.removeItem('userData');
        
        console.log('✅ Sesión limpiada completamente');
        this.updateUIForAuthState();
    }

    /**
     * 🔐 MÉTODO: Obtener headers para requests autenticados
     */
    getAuthHeaders() {
        const token = this.getToken();
        if (!token) {
            console.warn('⚠️ No hay token disponible para la petición');
            return {
                'Content-Type': 'application/json'
            };
        }
        
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 🔥 CORREGIDO: Hacer petición autenticada con manejo de errores
     */
    async authenticatedFetch(url, options = {}) {
        try {
            const headers = this.getAuthHeaders();
            const config = {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            };

            console.log('🔐 Realizando petición autenticada:', url);
            const response = await fetch(url, config);

            if (response.status === 401) {
                console.warn('❌ Token inválido en petición a:', url);
                this.clearSession();
                throw new Error('Sesión expirada');
            }

            if (response.status === 403) {
                console.warn('❌ Permisos insuficientes para:', url);
                this.showPermissionError();
                throw new Error('Permisos insuficientes');
            }

            return response;
        } catch (error) {
            console.error('❌ Error en petición autenticada:', error);
            throw error;
        }
    }

    /**
     * 🔐 MÉTODO: Configurar manejadores globales
     */
    setupGlobalHandlers() {
        // Interceptar clics en enlaces que requieren autenticación
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.getAttribute('data-requires-auth') === 'true' && !this.isAuthenticated()) {
                e.preventDefault();
                this.showAuthRequiredMessage();
            }
            
            if (link && link.getAttribute('data-requires-admin') === 'true' && !this.isAdmin()) {
                e.preventDefault();
                this.showAdminRequiredMessage();
            }
        });
    }

    /**
     * 🔐 MÉTODO: Verificar permisos antes de cargar página
     */
    checkPagePermissions(requiredRole = 'user') {
        if (!this.isAuthenticated()) {
            console.warn('❌ Intento de acceso no autenticado');
            this.redirectToLogin();
            return false;
        }

        if (requiredRole === 'admin' && !this.isAdmin()) {
            console.warn('❌ Intento de acceso sin permisos de admin');
            this.showAdminRequiredMessage();
            return false;
        }

        console.log('✅ Permisos verificados - Rol:', this.user.role, 'Requiere:', requiredRole);
        return true;
    }

    /**
     * 🔐 MÉTODO: Actualizar UI según estado de autenticación
     */
    updateUIForAuthState() {
        // Actualizar elementos de información de usuario
        const userInfoElements = document.querySelectorAll('.user-info, [data-user-info]');
        userInfoElements.forEach(element => {
            if (this.isAuthenticated() && this.user) {
                element.innerHTML = `
                    <span class="user-name">${this.user.nombre}</span>
                    <span class="user-role badge ${this.user.role === 'admin' ? 'admin-badge' : 'user-badge'}">
                        ${this.user.role === 'admin' ? '👑 Admin' : '👤 User'}
                    </span>
                `;
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });

        // Mostrar/ocultar elementos según rol
        const adminElements = document.querySelectorAll('.admin-only, [data-requires-admin]');
        adminElements.forEach(element => {
            element.style.display = this.isAdmin() ? 'block' : 'none';
        });

        const authElements = document.querySelectorAll('.auth-only, [data-requires-auth]');
        authElements.forEach(element => {
            element.style.display = this.isAuthenticated() ? 'block' : 'none';
        });

        const guestElements = document.querySelectorAll('.guest-only, [data-requires-guest]');
        guestElements.forEach(element => {
            element.style.display = !this.isAuthenticated() ? 'block' : 'none';
        });

        // Actualizar botones de login/logout
        const loginButtons = document.querySelectorAll('.login-btn, [data-action="login"]');
        const logoutButtons = document.querySelectorAll('.logout-btn, [data-action="logout"]');
        
        loginButtons.forEach(btn => {
            btn.style.display = !this.isAuthenticated() ? 'block' : 'none';
        });
        
        logoutButtons.forEach(btn => {
            btn.style.display = this.isAuthenticated() ? 'block' : 'none';
            if (this.isAuthenticated()) {
                btn.onclick = () => this.logout();
            }
        });
    }

    /**
     * 🔐 MÉTODO: Verificar si la página actual está protegida
     */
    isProtectedPage() {
        const protectedPages = [
            '/paginaPrincipal.html',
            '/registroUsuarios.html',
            '/registroDispositivos.html',
            '/registroMantenimientos.html',
            '/registroRepuestos.html',
            '/dashboard',
            '/usuarios',
            '/admin-register'
        ];
        
        const currentPath = window.location.pathname;
        return protectedPages.some(page => currentPath.includes(page));
    }

    /**
     * 🔥 CORREGIDO: Redirigir al login - solo si es necesario
     */
    redirectToLogin() {
        // Solo redirigir si no estamos ya en una página pública
        if (!Utils.isPublicPage()) {
            console.log('🔄 Redirigiendo al login desde:', window.location.pathname);
            Utils.showNotification('Por favor, inicia sesión para continuar', 'warning');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        }
    }

    /**
     * 🔐 MÉTODO: Mostrar mensaje de autenticación requerida
     */
    showAuthRequiredMessage() {
        Utils.showNotification('Debes iniciar sesión para acceder a esta función', 'warning');
    }

    /**
     * 🔐 MÉTODO: Mostrar mensaje de permisos de admin requeridos
     */
    showAdminRequiredMessage() {
        Utils.showNotification('Se requieren permisos de administrador para esta acción', 'error');
    }

    /**
     * 🔐 MÉTODO: Mostrar error de permisos
     */
    showPermissionError() {
        Utils.showNotification('No tienes permisos para realizar esta acción', 'error');
    }

    /**
     * 🔐 MÉTODO: Cerrar sesión - COMPLETAMENTE CORREGIDO
     */
    async logout() {
        try {
            Utils.showLoading(true);
            
            console.log('🚪 Iniciando proceso de logout...');
            
            // Llamar al endpoint de logout
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Logout exitoso en servidor');
                this.clearSession();
                Utils.showNotification('Sesión cerrada correctamente', 'success');
                
                // Redirigir inmediatamente sin esperar
                setTimeout(() => {
                    window.location.href = '/?logout=true';
                }, 500);
                
            } else {
                throw new Error(result.message || 'Error al cerrar sesión en servidor');
            }
        } catch (error) {
            console.error('❌ Error en logout:', error);
            // Limpiar sesión local aunque falle el servidor
            this.clearSession();
            Utils.showNotification('Sesión cerrada localmente', 'info');
            
            // Redirigir inmediatamente
            setTimeout(() => {
                window.location.href = '/?logout=true';
            }, 500);
        } finally {
            Utils.showLoading(false);
        }
    }

    /**
     * 🔥 CORREGIDO: Manejar carga de página - EVITA BUCLE
     */
    handlePageLoad() {
        console.log('🔐 Verificando autenticación para página:', window.location.pathname);
        
        // Para páginas públicas, no hacer verificaciones de autenticación
        if (Utils.isPublicPage()) {
            console.log('🔐 Página pública, sin verificación de autenticación');
            this.updateUIForAuthState();
            return;
        }
        
        // Verificar páginas que requieren autenticación
        if (this.isProtectedPage() && !this.isAuthenticated()) {
            console.warn('❌ Acceso no autorizado a página protegida');
            this.redirectToLogin();
            return;
        }

        // Verificar páginas que requieren admin
        const adminPages = [
            '/registroUsuarios.html',
            '/usuarios',
            '/admin-register'
        ];
        
        const currentPath = window.location.pathname;
        if (adminPages.some(page => currentPath.includes(page)) && !this.isAdmin()) {
            console.warn('❌ Acceso no autorizado a página de administrador');
            this.showAdminRequiredMessage();
            setTimeout(() => {
                window.location.href = '/paginaPrincipal.html';
            }, 2000);
            return;
        }

        // Actualizar UI
        this.updateUIForAuthState();
        
        console.log('✅ Página inicializada correctamente');
    }

    /**
     * 🔐 MÉTODO: Verificar autenticación al cargar la página - CORREGIDO
     */
    initializePageAuth() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.handlePageLoad();
            });
        } else {
            this.handlePageLoad();
        }
    }
}

// ==============================================
// 🔄 FUNCIONES DE COMPATIBILIDAD
// ==============================================

function apiCall(url, options = {}) {
    return authManager.authenticatedFetch(url, options);
}

async function getUserProfile() {
    try {
        const response = await authManager.authenticatedFetch('/api/usuarios/perfil');
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Error obteniendo perfil');
    } catch (error) {
        console.error('❌ Error obteniendo perfil:', error);
        throw error;
    }
}

function checkAuthentication() {
    return authManager.isAuthenticated();
}

function isUserAdmin() {
    return authManager.isAdmin();
}

// ==============================================
// 🔐 INICIALIZACIÓN GLOBAL
// ==============================================

// Crear instancia global de AuthManager
const authManager = new AuthManager();

// Hacer disponibles globalmente
window.Utils = Utils;
window.AuthManager = AuthManager;
window.authManager = authManager;
window.apiCall = apiCall;
window.getUserProfile = getUserProfile;
window.checkAuthentication = checkAuthentication;
window.isUserAdmin = isUserAdmin;

// Inicializar autenticación cuando se carga la página
authManager.initializePageAuth();

console.log('✅ Utils y AuthManager cargados correctamente');

// Exportar para módulos (si se usa ES6)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Utils, AuthManager, authManager, apiCall, getUserProfile };
}