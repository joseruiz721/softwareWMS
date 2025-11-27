// public/js/admin-users.js - VERSIÓN CORREGIDA - MANEJO MEJORADO DEL MODAL
class AdminUsersManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
        this.isAdmin = false;
        this.modalOpen = false;
        this.init();
    }

    async init() {
        console.log('👑 Inicializando AdminUsersManager para página principal');
        
        await this.checkAdminPermissions();
        if (this.isAdmin) {
            this.setupEventListeners();
            this.showAdminMenu();
        } else {
            this.hideAdminMenu();
        }
    }

    /**
     * 🔐 Verificar permisos de administrador
     */
    async checkAdminPermissions() {
        try {
            const response = await fetch('/api/check-admin');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            
            if (result.success && result.isAdmin) {
                this.isAdmin = true;
                this.currentUser = result.user;
                console.log('✅ Usuario administrador detectado:', this.currentUser.nombre);
                return true;
            } else {
                console.log('👤 Usuario normal - características de admin ocultas');
                return false;
            }
        } catch (error) {
            console.error('❌ Error verificando permisos:', error);
            return false;
        }
    }

    /**
     * 📝 Mostrar/ocultar menú de administración
     */
    showAdminMenu() {
        const adminLink = document.getElementById('admin-users-link');
        if (adminLink) {
            adminLink.style.display = 'block';
            console.log('✅ Enlace de gestión de usuarios mostrado');
        }
        
        // Agregar badge de administrador al nombre de usuario
        this.addAdminBadge();
    }

    hideAdminMenu() {
        const adminLink = document.getElementById('admin-users-link');
        if (adminLink) {
            adminLink.style.display = 'none';
            console.log('🚫 Enlace de gestión de usuarios oculto');
        }
    }

    /**
     * 🏷️ Agregar badge de administrador
     */
    addAdminBadge() {
        const userNameElement = document.getElementById('userName');
        if (userNameElement && !userNameElement.querySelector('.admin-badge')) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'ADMIN';
            badge.title = 'Administrador del sistema';
            userNameElement.appendChild(badge);
            console.log('👑 Badge de administrador agregado');
        }
    }

    /**
     * 🔗 Configurar event listeners
     */
    setupEventListeners() {
        // Event listener para el enlace de gestión de usuarios
        const adminLink = document.getElementById('admin-users-link');
        if (adminLink) {
            adminLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUsersManagement();
            });
            console.log('✅ Event listener para gestión de usuarios configurado');
        }

        // Cerrar modal al hacer clic fuera
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('adminUsersModal');
            if (modal && e.target === modal) {
                this.closeModal();
            }
        });

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOpen) {
                this.closeModal();
            }
        });

        // 🔥 CORRECCIÓN: Prevenir apertura múltiple del modal
        document.addEventListener('DOMContentLoaded', () => {
            this.cleanupExistingModals();
        });
    }

    /**
     * 🧹 Limpiar modales existentes
     */
    cleanupExistingModals() {
        const existingModals = document.querySelectorAll('#adminUsersModal');
        if (existingModals.length > 0) {
            existingModals.forEach(modal => modal.remove());
            console.log('🧹 Modales existentes limpiados');
        }
    }

    /**
     * 👥 Mostrar gestión de usuarios
     */
    async showUsersManagement() {
        if (!this.isAdmin) {
            this.showNotification('No tienes permisos de administrador', 'error');
            return;
        }

        // 🔥 CORRECCIÓN: Prevenir múltiples aperturas
        if (this.modalOpen) {
            console.log('⚠️ Modal ya abierto, ignorando solicitud');
            return;
        }

        console.log('📋 Abriendo gestión de usuarios...');
        await this.loadUsers();
        this.showUsersModal();
    }

    /**
     * 📋 Cargar lista de usuarios
     */
    async loadUsers() {
        try {
            console.log('🔄 Cargando lista de usuarios...');
            
            const response = await fetch('/api/admin/usuarios/lista');
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.users = result.data;
                console.log(`✅ ${this.users.length} usuarios cargados correctamente`);
                return true;
            } else {
                throw new Error(result.message || 'Error al cargar usuarios');
            }
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this.showNotification('Error al cargar usuarios: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * 🎨 Mostrar modal de gestión de usuarios
     */
    showUsersModal() {
        // Verificar que hay usuarios cargados
        if (this.users.length === 0) {
            this.showNotification('No se pudieron cargar los usuarios', 'error');
            return;
        }

        // 🔥 CORRECCIÓN: Limpiar modal existente antes de crear uno nuevo
        this.cleanupExistingModals();

        const modalContent = `
            <div class="modal admin-users-modal" id="adminUsersModal" style="display: block;">
                <div class="modal-content" style="max-width: 95%; width: 1200px; max-height: 90vh;">
                    <span class="close-modal" onclick="window.adminUsersManager.closeModal()">&times;</span>
                    
                    <div class="modal-header">
                        <h2><i class="fas fa-users-cog"></i> Gestión de Usuarios</h2>
                        <p class="modal-subtitle">Administra los usuarios del sistema</p>
                    </div>

                    <div class="admin-stats-grid">
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="admin-stat-info">
                                <h3>Total Usuarios</h3>
                                <div class="admin-stat-value" id="totalUsersCount">${this.users.length}</div>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">
                                <i class="fas fa-crown"></i>
                            </div>
                            <div class="admin-stat-info">
                                <h3>Administradores</h3>
                                <div class="admin-stat-value" id="adminUsersCount">
                                    ${this.users.filter(u => u.role === 'admin').length}
                                </div>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <div class="admin-stat-icon">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="admin-stat-info">
                                <h3>Usuarios Normales</h3>
                                <div class="admin-stat-value" id="regularUsersCount">
                                    ${this.users.filter(u => u.role === 'user').length}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="users-table-container">
                        <div class="table-header-actions">
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" id="usersSearchInput" placeholder="Buscar por nombre, correo o cédula..." autocomplete="off">
                            </div>
                            <button class="btn btn-primary" onclick="window.adminUsersManager.refreshUsers()">
                                <i class="fas fa-sync-alt"></i> Actualizar
                            </button>
                        </div>

                        <div class="table-responsive">
                            <table class="users-table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Correo Electrónico</th>
                                        <th>Cédula</th>
                                        <th>Rol</th>
                                        <th>Fecha Registro</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    ${this.renderUsersTable()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="window.adminUsersManager.closeModal()">
                            <i class="fas fa-times"></i> Cerrar
                        </button>
                        <button class="btn btn-info" onclick="window.adminUsersManager.openAdminRegister()">
                            <i class="fas fa-user-plus"></i> Registrar Nuevo Usuario
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Crear el modal
        const modal = document.createElement('div');
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);

        this.modalOpen = true;
        this.attachTableEventListeners();
        this.setupSearch();
        
        console.log('✅ Modal de gestión de usuarios mostrado');
    }

    /**
     * 🔗 Abrir registro de administradores de forma controlada
     */
    openAdminRegister() {
        console.log('📝 Abriendo registro de administradores...');
        // 🔥 CORRECCIÓN: Usar la misma ventana en lugar de abrir nueva pestaña
        window.location.href = '/admin-register';
    }

    /**
     * 🎨 Renderizar tabla de usuarios
     */
    renderUsersTable() {
        if (this.users.length === 0) {
            return `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                        <p>No hay usuarios registrados en el sistema</p>
                    </td>
                </tr>
            `;
        }

        return this.users.map(user => `
            <tr data-user-id="${user.id}">
                <td>
                    <div class="user-info-cell">
                        <strong>${this.escapeHtml(user.nombre || 'No especificado')}</strong>
                        ${user.id === this.currentUser?.id ? '<span class="current-user-badge">(Tú)</span>' : ''}
                    </div>
                </td>
                <td>${this.escapeHtml(user.correo || 'No especificado')}</td>
                <td>${this.escapeHtml(user.cedula || 'No especificado')}</td>
                <td>
                    <span class="role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}">
                        ${user.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
                    </span>
                </td>
                <td>${this.formatDate(user.fecha_registro)}</td>
                <td>
                    <div class="action-buttons">
                        ${this.renderRoleButton(user)}
                        ${this.renderDeleteButton(user)}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * 🎯 Renderizar botón de cambio de rol
     */
    renderRoleButton(user) {
        if (!user || !user.id) return '';

        if (user.id === this.currentUser?.id) {
            return '<button class="btn btn-sm btn-outline" disabled title="No puedes cambiar tu propio rol">Auto</button>';
        }

        if (user.role === 'admin') {
            return `<button class="btn btn-sm btn-warning change-role-btn" data-user-id="${user.id}" data-new-role="user">
                Hacer Usuario
            </button>`;
        } else {
            return `<button class="btn btn-sm btn-success change-role-btn" data-user-id="${user.id}" data-new-role="admin">
                Hacer Admin
            </button>`;
        }
    }

    /**
     * 🗑️ Renderizar botón de eliminación
     */
    renderDeleteButton(user) {
        if (!user || !user.id) return '';

        if (user.id === this.currentUser?.id) {
            return '<button class="btn btn-sm btn-outline" disabled title="No puedes eliminarte a ti mismo">Eliminar</button>';
        }

        const adminCount = this.users.filter(u => u.role === 'admin').length;
        if (user.role === 'admin' && adminCount <= 1) {
            return '<button class="btn btn-sm btn-outline" disabled title="No puedes eliminar el último administrador">Eliminar</button>';
        }

        return `<button class="btn btn-sm btn-danger delete-user-btn" data-user-id="${user.id}">
            Eliminar
        </button>`;
    }

    /**
     * 🔗 Adjuntar event listeners a la tabla
     */
    attachTableEventListeners() {
        // Event listeners para botones de cambio de rol
        document.querySelectorAll('.change-role-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                const newRole = e.target.getAttribute('data-new-role');
                this.changeUserRole(userId, newRole);
            });
        });

        // Event listeners para botones de eliminación
        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                this.confirmDeleteUser(userId);
            });
        });

        console.log('✅ Event listeners de tabla adjuntados');
    }

    /**
     * 🔄 Cambiar rol de usuario
     */
    async changeUserRole(userId, newRole) {
        const user = this.users.find(u => u.id === parseInt(userId));
        if (!user) {
            this.showNotification('Usuario no encontrado', 'error');
            return;
        }

        try {
            console.log(`🔄 Cambiando rol de usuario ${user.nombre} a ${newRole}`);
            
            const response = await fetch(`/api/admin/usuarios/${userId}/rol`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Rol de ${user.nombre} cambiado a ${newRole}`, 'success');
                await this.loadUsers();
                this.showUsersModal(); // Recargar el modal
            } else {
                throw new Error(result.message || 'Error al cambiar rol');
            }
        } catch (error) {
            console.error('❌ Error cambiando rol:', error);
            this.showNotification('Error al cambiar rol: ' + error.message, 'error');
        }
    }

    /**
     * 🗑️ Confirmar eliminación de usuario
     */
    confirmDeleteUser(userId) {
        const user = this.users.find(u => u.id === parseInt(userId));
        if (!user) {
            this.showNotification('Usuario no encontrado', 'error');
            return;
        }

        const confirmation = confirm(
            `¿Estás seguro de que quieres eliminar al usuario "${user.nombre}"?\n\n` +
            `Correo: ${user.correo}\n` +
            `Rol: ${user.role}\n\n` +
            `⚠️ Esta acción no se puede deshacer.`
        );

        if (confirmation) {
            this.deleteUser(userId);
        }
    }

    /**
     * 🗑️ Eliminar usuario
     */
    async deleteUser(userId) {
        const user = this.users.find(u => u.id === parseInt(userId));
        if (!user) {
            this.showNotification('Usuario no encontrado', 'error');
            return;
        }

        try {
            console.log(`🗑️ Eliminando usuario: ${user.nombre}`);
            
            const response = await fetch(`/api/admin/usuarios/${userId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Usuario ${user.nombre} eliminado correctamente`, 'success');
                await this.loadUsers();
                this.showUsersModal(); // Recargar el modal
            } else {
                throw new Error(result.message || 'Error al eliminar usuario');
            }
        } catch (error) {
            console.error('❌ Error eliminando usuario:', error);
            this.showNotification('Error al eliminar usuario: ' + error.message, 'error');
        }
    }

    /**
     * 🔍 Configurar búsqueda
     */
    setupSearch() {
        const searchInput = document.getElementById('usersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
            console.log('✅ Búsqueda configurada');
        }
    }

    /**
     * 🔍 Buscar usuarios
     */
    searchUsers(query) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (!query.trim()) {
            tbody.innerHTML = this.renderUsersTable();
            this.attachTableEventListeners();
            return;
        }

        const filteredUsers = this.users.filter(user => {
            const searchTerm = query.toLowerCase();
            return (
                (user.nombre && user.nombre.toLowerCase().includes(searchTerm)) ||
                (user.correo && user.correo.toLowerCase().includes(searchTerm)) ||
                (user.cedula && user.cedula.includes(query))
            );
        });

        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-search" style="font-size: 48px; color: #d1d5db; margin-bottom: 16px;"></i>
                        <p>No se encontraron usuarios que coincidan con la búsqueda</p>
                    </td>
                </tr>
            `;
        } else {
            // Guardar usuarios filtrados temporalmente y renderizar
            const originalUsers = this.users;
            this.users = filteredUsers;
            tbody.innerHTML = this.renderUsersTable();
            this.users = originalUsers;
            this.attachTableEventListeners();
        }
    }

    /**
     * 🔄 Actualizar usuarios
     */
    async refreshUsers() {
        const success = await this.loadUsers();
        if (success) {
            this.showUsersModal();
        }
    }

    /**
     * ❌ Cerrar modal
     */
    closeModal() {
        const modal = document.getElementById('adminUsersModal');
        if (modal) {
            modal.remove();
            this.modalOpen = false;
            console.log('✅ Modal de gestión de usuarios cerrado');
        }
    }

    /**
     * 💫 Mostrar notificación
     */
    showNotification(message, type = 'info') {
        if (window.Utils && typeof window.Utils.showNotification === 'function') {
            window.Utils.showNotification(message, type);
        } else {
            // Fallback simple
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            
            if (type === 'success') {
                notification.style.background = '#10b981';
            } else if (type === 'error') {
                notification.style.background = '#ef4444';
            } else if (type === 'warning') {
                notification.style.background = '#f59e0b';
            } else {
                notification.style.background = '#3b82f6';
            }
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 4000);
        }
    }

    /**
     * 🛡️ Escapar HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 📅 Formatear fecha
     */
    formatDate(dateString) {
        if (!dateString) return 'No disponible';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ AdminUsersManager cargado para página principal');
    
    // Esperar a que se carguen otros componentes esenciales
    setTimeout(() => {
        window.adminUsersManager = new AdminUsersManager();
        console.log('👑 AdminUsersManager inicializado correctamente');
    }, 1500);
});

// Hacer disponible globalmente
window.AdminUsersManager = AdminUsersManager;