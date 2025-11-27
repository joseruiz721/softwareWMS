// ==============================================
// SERVICIO DE API - VERSIÓN MEJORADA CON REPORTES MENSUALES
// ==============================================

const ApiService = {
    // 🔥 NUEVO: Token de autenticación
    authToken: localStorage.getItem('jwt_token') || null,
    
    /**
     * 🔥 NUEVO: Configurar token de autenticación
     */
    setAuthToken: function(token) {
        this.authToken = token;
        localStorage.setItem('jwt_token', token);
        console.log('💾 Token configurado en ApiService');
    },
    
    /**
     * 🔥 NUEVO: Limpiar token de autenticación
     */
    clearAuthToken: function() {
        this.authToken = null;
        localStorage.removeItem('jwt_token');
        console.log('🧹 Token limpiado de ApiService');
    },
    
    /**
     * 🔥 NUEVO: Obtener headers con autenticación
     */
    getAuthHeaders: function() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    },

    /**
     * ✅ MÉTODO MEJORADO: Realiza una petición a la API con autenticación automática
     */
    request: async function(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: this.getAuthHeaders()
        };

        const config = { ...defaultOptions, ...options };

        try {
            console.log(`🔐 Realizando petición API a: ${endpoint}`);
            const response = await fetch(endpoint, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Error ${response.status} en ${endpoint}:`, errorText);
                
                // Manejar errores de autenticación específicos
                if (response.status === 401) {
                    this.clearAuthToken();
                    if (typeof authManager !== 'undefined') {
                        authManager.clearSession();
                    }
                    throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
                }
                if (response.status === 403) {
                    throw new Error('No tienes permisos para realizar esta acción.');
                }
                
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            // Manejar diferentes tipos de respuesta
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else if (contentType && (contentType.includes('application/vnd.openxmlformats') || contentType.includes('application/octet-stream'))) {
                return await response.blob();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error(`❌ Error en petición a ${endpoint}:`, error);
            
            // Mostrar notificación solo para errores críticos
            if (error.message.includes('Sesión expirada') || error.message.includes('No tienes permisos')) {
                if (window.Utils) {
                    window.Utils.showNotification(error.message, 'error');
                }
                
                // Redirigir al login si la sesión expiró
                if (error.message.includes('Sesión expirada')) {
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 2000);
                }
            }
            
            throw error;
        }
    },

    /**
     * ✅ MÉTODO COMPATIBILIDAD: Realiza petición sin autenticación (para login, registro, etc.)
     */
    publicRequest: async function(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            console.log(`🌐 Realizando petición pública a: ${endpoint}`);
            const response = await fetch(endpoint, config);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`❌ Error en petición pública a ${endpoint}:`, error);
            throw error;
        }
    },

    // ==============================================
    // MÉTODOS DE REPORTES MENSUALES - NUEVOS
    // ==============================================

    /**
     * ✅ NUEVO MÉTODO: Obtiene mantenimientos por mes para reportes
     */
    getMaintenancesByMonth: function(mes, anio, tipo = 'completo') {
        return this.request(`/api/mantenimientos/mensual?mes=${mes}&anio=${anio}&tipo=${tipo}`);
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene estadísticas mensuales para dashboard de reportes
     */
    getMonthlyStats: function(mes, anio) {
        return this.request(`/api/reportes/estadisticas-mensuales?mes=${mes}&anio=${anio}`);
    },

    /**
     * ✅ NUEVO MÉTODO: Genera reporte PDF de mantenimientos mensuales
     */
    generateMonthlyPDF: function(mes, anio, tipo = 'completo') {
        return this.request(`/api/reportes/generar-pdf?mes=${mes}&anio=${anio}&tipo=${tipo}`, {
            headers: {
                ...this.getAuthHeaders(),
                'Accept': 'application/pdf'
            }
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Exporta reporte mensual a Excel
     */
    exportMonthlyExcel: function(mes, anio, tipo = 'completo') {
        return this.request(`/api/reportes/exportar-excel?mes=${mes}&anio=${anio}&tipo=${tipo}`, {
            headers: {
                ...this.getAuthHeaders(),
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene datos para gráficas de reportes mensuales
     */
    getChartsData: function(mes, anio) {
        return this.request(`/api/reportes/datos-graficas?mes=${mes}&anio=${anio}`);
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene años disponibles para reportes
     */
    getAvailableYears: function() {
        return this.request('/api/reportes/anios-disponibles');
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene resumen ejecutivo mensual
     */
    getExecutiveSummary: function(mes, anio) {
        return this.request(`/api/reportes/resumen-ejecutivo?mes=${mes}&anio=${anio}`);
    },

    // ==============================================
    // MÉTODOS DE AUTENTICACIÓN Y USUARIO
    // ==============================================

    /**
     * ✅ MÉTODO: Obtiene perfil de usuario
     */
    getUserProfile: function() {
        return this.request('/api/usuarios/perfil');
    },

    /**
     * ✅ MÉTODO: Actualiza perfil de usuario
     */
    updateUserProfile: function(updates) {
        return this.request('/api/usuarios/perfil', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    /**
     * ✅ MÉTODO: Elimina cuenta de usuario
     */
    deleteUserAccount: function() {
        return this.request('/api/usuarios/perfil', {
            method: 'DELETE'
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Verifica estado de autenticación
     */
    checkAuthStatus: function() {
        return this.request('/api/auth-status');
    },

    /**
     * ✅ NUEVO MÉTODO: Verifica permisos de administrador
     */
    checkAdminPermissions: function() {
        return this.request('/api/check-admin');
    },

    // ==============================================
    // MÉTODOS DEL DASHBOARD
    // ==============================================

    /**
     * ✅ MÉTODO: Obtiene estadísticas del dashboard
     */
    getDashboardStats: function() {
        return this.request('/api/dashboard/stats');
    },

    // ==============================================
    // MÉTODOS DE DISPOSITIVOS
    // ==============================================

    /**
     * ✅ MÉTODO: Obtiene datos de dispositivos
     */
    getDevices: function(type) {
        const endpoint = type ? `/api/dispositivos/${type}` : '/api/dispositivos';
        return this.request(endpoint);
    },

    /**
     * ✅ MÉTODO: Actualiza un dispositivo
     */
    updateDevice: function(type, id, updates) {
        return this.request(`/api/dispositivos/${type}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    /**
     * ✅ MÉTODO: Elimina un dispositivo
     */
    deleteDevice: function(type, id) {
        return this.request(`/api/dispositivos/${type}/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene dispositivo específico para edición
     */
    getDeviceForEdit: function(type, id) {
        return this.request(`/api/dispositivos/${type}/${id}`);
    },

    /**
     * ✅ NUEVO MÉTODO: Crea un nuevo dispositivo
     */
    createDevice: function(type, deviceData) {
        return this.request(`/api/dispositivos/${type}`, {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    },

    // ==============================================
    // MÉTODOS DE REPUESTOS/INSUMOS
    // ==============================================

    /**
     * ✅ MÉTODO: Obtiene datos de repuestos
     */
    getSupplies: function() {
        return this.request('/api/repuestos');
    },

    /**
     * ✅ MÉTODO: Actualiza un repuesto
     */
    updateSupply: function(id, updates) {
        return this.request(`/api/repuestos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene repuesto específico para edición
     */
    getSupplyForEdit: function(id) {
        return this.request(`/api/repuestos/${id}`);
    },

    /**
     * ✅ NUEVO MÉTODO: Crea un nuevo repuesto
     */
    createSupply: function(supplyData) {
        return this.request('/api/repuestos', {
            method: 'POST',
            body: JSON.stringify(supplyData)
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Elimina un repuesto
     */
    deleteSupply: function(id) {
        return this.request(`/api/repuestos/${id}`, {
            method: 'DELETE'
        });
    },

    // ==============================================
    // MÉTODOS DE MANTENIMIENTOS
    // ==============================================

    /**
     * ✅ MÉTODO: Obtiene datos de mantenimientos
     */
    getMaintenances: function() {
        return this.request('/api/mantenimientos');
    },

    /**
     * ✅ MÉTODO: Obtiene técnicos para mantenimientos
     */
    getTechnicians: function() {
        return this.request('/api/mantenimientos/lista/tecnicos');
    },

    /**
     * ✅ MÉTODO: Obtiene dispositivos para mantenimientos
     */
    getDevicesForMaintenance: function() {
        return this.request('/api/mantenimientos/lista/dispositivos');
    },

    /**
     * ✅ MÉTODO: Obtiene repuestos para mantenimientos
     */
    getSuppliesForMaintenance: function() {
        return this.request('/api/mantenimientos/lista/repuestos');
    },

    /**
     * ✅ MÉTODO: Crea o actualiza un mantenimiento
     */
    saveMaintenance: function(maintenanceData, id = null) {
        const url = id ? `/api/mantenimientos/${id}` : '/api/mantenimientos';
        const method = id ? 'PUT' : 'POST';
        
        return this.request(url, {
            method: method,
            body: JSON.stringify(maintenanceData)
        });
    },

    /**
     * ✅ MÉTODO: Elimina un mantenimiento
     */
    deleteMaintenance: function(id) {
        return this.request(`/api/mantenimientos/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene mantenimiento específico para edición
     */
    getMaintenanceForEdit: function(id) {
        return this.request(`/api/mantenimientos/${id}`);
    },

    // ==============================================
    // MÉTODOS DE BÚSQUEDA
    // ==============================================

    /**
     * ✅ MÉTODO MEJORADO: Realiza búsqueda unificada
     */
    search: function(query) {
        return this.request(`/api/buscar?q=${encodeURIComponent(query)}`);
    },

    /**
     * ✅ NUEVO MÉTODO: Búsqueda avanzada con acceso directo
     */
    searchAdvanced: function(query) {
        return this.request(`/api/buscar-avanzado?q=${encodeURIComponent(query)}`);
    },

    // ==============================================
    // MÉTODOS DE EXPORTACIÓN
    // ==============================================

    /**
     * ✅ MÉTODO: Exporta inventario
     */
    exportInventory: function() {
        return this.request('/api/exportar-excel');
    },

    /**
     * ✅ NUEVO MÉTODO: Exporta reporte específico
     */
    exportReport: function(reportType, filters = {}) {
        return this.request('/api/exportar-excel', {
            method: 'POST',
            body: JSON.stringify({ reportType, filters })
        });
    },

    // ==============================================
    // MÉTODOS DE ADMINISTRACIÓN (SOLO ADMIN)
    // ==============================================

    /**
     * ✅ NUEVO MÉTODO: Obtiene lista de usuarios (solo admin)
     */
    getUsers: function() {
        return this.request('/api/admin/usuarios/lista');
    },

    /**
     * ✅ NUEVO MÉTODO: Crea un nuevo usuario (solo admin)
     */
    createUser: function(userData) {
        return this.request('/api/admin/usuarios', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Actualiza usuario (solo admin)
     */
    updateUser: function(id, userData) {
        return this.request(`/api/admin/usuarios/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Elimina usuario (solo admin)
     */
    deleteUser: function(id) {
        return this.request(`/api/admin/usuarios/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene estadísticas de admin (solo admin)
     */
    getAdminStats: function() {
        return this.request('/api/admin/dashboard/stats');
    },

    // ==============================================
    // MÉTODOS PÚBLICOS (SIN AUTENTICACIÓN)
    // ==============================================

    /**
     * ✅ MÉTODO: Login de usuario
     */
    login: function(credentials) {
        return this.publicRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Registro de usuario
     */
    register: function(userData) {
        return this.publicRequest('/auth/registro', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Solicitar recuperación de contraseña
     */
    requestPasswordReset: function(email) {
        return this.publicRequest('/auth/solicitar-reset', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    /**
     * ✅ NUEVO MÉTODO: Restablecer contraseña con token
     */
    resetPassword: function(token, newPassword) {
        return this.publicRequest('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    },

    /**
     * ✅ MÉTODO: Cierra sesión
     */
    logout: function() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    },

    // ==============================================
    // MÉTODOS DE UTILIDAD
    // ==============================================

    /**
     * ✅ NUEVO MÉTODO: Verifica conectividad con el servidor
     */
    checkServerStatus: function() {
        return this.publicRequest('/api/health');
    },

    /**
     * ✅ NUEVO MÉTODO: Obtiene configuración de la aplicación
     */
    getAppConfig: function() {
        return this.request('/api/config');
    },

    /**
     * ✅ NUEVO MÉTODO: Verifica si un endpoint está disponible
     */
    checkEndpoint: function(endpoint) {
        return this.request(endpoint, { method: 'HEAD' });
    }
};

// ==============================================
// COMPATIBILIDAD CON CÓDIGO EXISTENTE
// ==============================================

/**
 * 🔄 Función de compatibilidad global para código existente
 */
window.apiCall = function(url, options = {}) {
    return ApiService.request(url, options);
};

/**
 * 🔄 Función de compatibilidad para obtener perfil
 */
window.getUserProfile = function() {
    return ApiService.getUserProfile();
};

/**
 * 🔄 Función de compatibilidad para dashboard
 */
window.getDashboardData = function() {
    return ApiService.getDashboardStats();
};

/**
 * 🔄 Función de compatibilidad para mantenimientos
 */
window.getMaintenanceData = function() {
    return ApiService.getMaintenances();
};

/**
 * 🔄 Función de compatibilidad para reportes mensuales
 */
window.getMonthlyMaintenances = function(mes, anio, tipo) {
    return ApiService.getMaintenancesByMonth(mes, anio, tipo);
};

// ==============================================
// INICIALIZACIÓN Y CONFIGURACIÓN
// ==============================================

// Hacer disponible globalmente
window.ApiService = ApiService;

// Configuración por defecto
ApiService.config = {
    timeout: 30000,
    retryAttempts: 3,
    baseURL: ''
};

// Método para reintentar peticiones fallidas
ApiService.retryRequest = async function(endpoint, options, retries = 3) {
    try {
        return await this.request(endpoint, options);
    } catch (error) {
        if (retries > 0) {
            console.log(`🔄 Reintentando petición (${retries} intentos restantes)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.retryRequest(endpoint, options, retries - 1);
        }
        throw error;
    }
};

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ ApiService inicializado correctamente');
        
        // Verificar si hay un token guardado
        if (ApiService.authToken) {
            console.log('🔐 Token JWT encontrado en ApiService');
            
            // Verificar autenticación al cargar
            ApiService.checkAuthStatus().then(() => {
                console.log('🔐 Sesión válida confirmada');
            }).catch(error => {
                console.warn('⚠️ Sesión inválida, limpiando token:', error);
                ApiService.clearAuthToken();
            });
        } else {
            console.log('⚠️ No hay token JWT en ApiService');
        }
        
        // Verificar conectividad al cargar
        ApiService.checkServerStatus().then(() => {
            console.log('🌐 Conectado al servidor correctamente');
        }).catch(error => {
            console.warn('⚠️ No se pudo verificar la conectividad con el servidor:', error);
        });
    });
} else {
    console.log('✅ ApiService inicializado correctamente');
}

// Exportar para módulos (si se usa ES6)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}

console.log('🚀 ApiService cargado - Versión 2.2 con Reportes Mensuales');