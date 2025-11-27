// ==============================================
// MÓDULO: ProfileManager - Gestión de perfil de usuario
// ==============================================

const ProfileManager = {
    isEditing: false,
    originalData: {},
    isPasswordChangeVisible: false,
    currentUserRole: null, // Nuevo: almacenar rol del usuario

    /**
     * ✅ MÉTODO: Cargar y mostrar perfil de usuario
     */
    loadAndShowProfile: async function() {
        try {
            console.log('👤 Cargando perfil de usuario...');
            
            const response = await fetch('/api/usuarios/perfil');
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.displayProfile(result.data);
                this.showProfileModal();
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error cargando perfil:', error);
            this.showNotification('Error al cargar el perfil: ' + error.message, 'error');
        }
    },

    /**
     * ✅ MÉTODO: Mostrar datos del perfil en el modal
     */
    displayProfile: function(userData) {
        try {
            this.originalData = userData;
            this.currentUserRole = userData.role; // Guardar el rol del usuario
            
            // Mostrar información básica
            document.getElementById('profile-name').textContent = userData.nombre || 'No especificado';
            document.getElementById('profile-cedula').textContent = userData.cedula || 'No especificado';
            document.getElementById('profile-email').textContent = userData.correo || 'No especificado';
            
            // Mostrar rol del usuario
            const roleElement = document.getElementById('profile-role') || this.createRoleElement();
            roleElement.textContent = userData.role === 'admin' ? 'Administrador' : 'Usuario';
            
            // Formatear fecha de registro
            if (userData.fecha_registro) {
                const fecha = new Date(userData.fecha_registro);
                document.getElementById('profile-date').textContent = 
                    fecha.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
            } else {
                document.getElementById('profile-date').textContent = 'No disponible';
            }
            
            // Controlar visibilidad del botón de eliminar cuenta
            this.toggleDeleteButtonVisibility();
            
            // Resetear campos de edición
            this.resetEditState();
            
            console.log('✅ Perfil mostrado correctamente. Rol:', this.currentUserRole);
            
        } catch (error) {
            console.error('❌ Error mostrando perfil:', error);
        }
    },

    /**
     * ✅ MÉTODO: Crear elemento para mostrar el rol (si no existe)
     */
    createRoleElement: function() {
        const infoSection = document.querySelector('.info-section');
        if (!infoSection) return null;
        
        const roleCard = document.createElement('div');
        roleCard.className = 'info-card';
        roleCard.innerHTML = `
            <div class="info-row">
                <div class="info-icon"><i class="fas fa-user-tag"></i></div>
                <div class="info-content">
                    <div class="info-label">Rol del usuario</div>
                    <div id="profile-role" class="info-value">Cargando...</div>
                </div>
            </div>
        `;
        
        // Insertar después del último info-card
        const lastCard = infoSection.querySelector('.info-card:last-child');
        if (lastCard) {
            lastCard.parentNode.insertBefore(roleCard, lastCard.nextSibling);
        } else {
            infoSection.appendChild(roleCard);
        }
        
        return roleCard.querySelector('#profile-role');
    },

    /**
     * ✅ MÉTODO: Controlar visibilidad del botón de eliminar cuenta
     */
    toggleDeleteButtonVisibility: function() {
        const deleteButton = document.querySelector('.btn-danger[onclick*="confirmDeleteAccount"]');
        
        if (deleteButton) {
            if (this.currentUserRole === 'admin') {
                // Mostrar botón para administradores
                deleteButton.style.display = 'inline-block';
                deleteButton.title = 'Eliminar cuenta (solo administradores)';
                console.log('👑 Botón de eliminar cuenta HABILITADO para administrador');
            } else {
                // Ocultar botón para usuarios normales
                deleteButton.style.display = 'none';
                console.log('👤 Botón de eliminar cuenta OCULTO para usuario normal');
            }
        } else {
            console.warn('❌ Botón de eliminar cuenta no encontrado');
        }
    },

    /**
     * ✅ MÉTODO: Mostrar modal de perfil
     */
    showProfileModal: function() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },

    /**
     * ✅ MÉTODO: Cerrar modal de perfil
     */
    closeProfileModal: function() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
            this.resetEditState();
        }
    },

    /**
     * ✅ MÉTODO: Alternar modo edición para un campo
     */
    toggleEdit: function(field) {
        const valueElement = document.getElementById(`profile-${field}`);
        const inputElement = document.getElementById(`edit-profile-${field}`);
        
        if (!valueElement || !inputElement) {
            console.error(`❌ Elementos no encontrados para campo: ${field}`);
            return;
        }
        
        // Salir del modo edición en todos los campos primero
        this.exitAllEditModes();
        
        // Entrar en modo edición para este campo
        this.originalData[field] = valueElement.textContent;
        inputElement.value = valueElement.textContent;
        
        valueElement.style.display = 'none';
        inputElement.style.display = 'block';
        inputElement.focus();
        
        this.isEditing = true;
        this.updateSaveButton();
        
        console.log(`✏️ Editando campo: ${field}`);
    },

    /**
     * ✅ MÉTODO: Salir de todos los modos de edición
     */
    exitAllEditModes: function() {
        const fields = ['name', 'cedula', 'email'];
        
        fields.forEach(field => {
            const valueElement = document.getElementById(`profile-${field}`);
            const inputElement = document.getElementById(`edit-profile-${field}`);
            
            if (valueElement && inputElement) {
                valueElement.style.display = 'block';
                inputElement.style.display = 'none';
            }
        });
        
        this.isEditing = false;
    },

    /**
     * ✅ MÉTODO: Alternar visibilidad de la contraseña
     */
    togglePasswordVisibility: function(inputId, button) {
        const passwordInput = document.getElementById(inputId);
        const icon = button.querySelector('i');
        
        if (!passwordInput) return;
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            button.title = 'Ocultar contraseña';
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            button.title = 'Mostrar contraseña';
        }
        
        console.log(`👁️ Contraseña ${passwordInput.type === 'password' ? 'oculta' : 'visible'}`);
    },

    /**
     * ✅ MÉTODO: Validar fortaleza de contraseña en tiempo real
     */
    validatePasswordStrength: function(password) {
        const validations = {
            length: password.length >= 6,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(validations).filter(Boolean).length;
        
        let strength = 'débil';
        let strengthClass = 'strength-weak';
        
        if (score >= 4) {
            strength = 'fuerte';
            strengthClass = 'strength-strong';
        } else if (score >= 3) {
            strength = 'media';
            strengthClass = 'strength-medium';
        }
        
        return { strength, strengthClass, validations, score };
    },

    /**
     * ✅ MÉTODO: Actualizar indicador de fortaleza de contraseña
     */
    updatePasswordStrength: function() {
        const newPassword = document.getElementById('new-password');
        const strengthMeter = document.getElementById('password-strength-meter');
        const strengthText = document.getElementById('password-strength-text');
        
        if (!newPassword || !strengthMeter) return;
        
        const password = newPassword.value;
        const { strength, strengthClass, validations } = this.validatePasswordStrength(password);
        
        // Actualizar barra de fortaleza
        const strengthBar = strengthMeter.querySelector('.strength-bar');
        if (strengthBar) {
            strengthBar.className = 'strength-bar ' + strengthClass;
        }
        
        // Actualizar texto
        if (strengthText) {
            strengthText.textContent = `Fortaleza: ${strength}`;
            strengthText.className = `password-strength-text ${strength}`;
        }
        
        // Actualizar validaciones
        this.updatePasswordValidations(validations);
    },

    /**
     * ✅ MÉTODO: Actualizar lista de validaciones
     */
    updatePasswordValidations: function(validations) {
        const validationContainer = document.getElementById('password-validations');
        if (!validationContainer) return;
        
        const validationItems = {
            length: 'Mínimo 6 caracteres',
            uppercase: 'Al menos una mayúscula',
            lowercase: 'Al menos una minúscula', 
            number: 'Al menos un número',
            special: 'Al menos un carácter especial'
        };
        
        validationContainer.innerHTML = '';
        
        Object.entries(validationItems).forEach(([key, text]) => {
            const isValid = validations[key];
            const item = document.createElement('div');
            item.className = `validation-item ${isValid ? 'valid' : 'invalid'}`;
            item.innerHTML = `
                <i class="fas fa-${isValid ? 'check' : 'times'} validation-icon"></i>
                <span>${text}</span>
            `;
            validationContainer.appendChild(item);
        });
    },

    /**
     * ✅ MÉTODO: Alternar sección de cambio de contraseña
     */
    togglePasswordChange: function() {
        const section = document.getElementById('password-change-section');
        const button = document.getElementById('toggle-password-change');
        
        if (!section || !button) {
            console.error('❌ Elementos de cambio de contraseña no encontrados');
            return;
        }
        
        if (!this.isPasswordChangeVisible) {
            // Mostrar sección de contraseña
            section.style.display = 'block';
            button.innerHTML = '<i class="fas fa-times"></i> Cancelar Cambio';
            button.classList.remove('btn-primary');
            button.classList.add('btn-danger');
            this.isPasswordChangeVisible = true;
            
            // Enfocar el primer campo de contraseña
            setTimeout(() => {
                const newPassword = document.getElementById('new-password');
                if (newPassword) newPassword.focus();
            }, 100);
            
        } else {
            // Ocultar sección de contraseña
            this.hidePasswordChange();
        }
        
        this.updateSaveButton();
        console.log('🔐 Estado cambio contraseña:', this.isPasswordChangeVisible);
    },

    /**
     * ✅ MÉTODO: Ocultar sección de cambio de contraseña
     */
    hidePasswordChange: function() {
        const section = document.getElementById('password-change-section');
        const button = document.getElementById('toggle-password-change');
        
        if (section) section.style.display = 'none';
        if (button) {
            button.innerHTML = '<i class="fas fa-key"></i> Cambiar Contraseña';
            button.classList.remove('btn-danger');
            button.classList.add('btn-primary');
        }
        
        // Limpiar campos
        const newPassword = document.getElementById('new-password');
        const confirmPassword = document.getElementById('confirm-password');
        if (newPassword) newPassword.value = '';
        if (confirmPassword) confirmPassword.value = '';
        
        this.isPasswordChangeVisible = false;
    },

    /**
     * ✅ MÉTODO: Verificar si las contraseñas coinciden
     */
    checkPasswordMatch: function() {
        const newPassword = document.getElementById('new-password');
        const confirmPassword = document.getElementById('confirm-password');
        const matchIndicator = document.getElementById('password-match');
        
        if (!newPassword || !confirmPassword || !matchIndicator) return;
        
        const newPass = newPassword.value;
        const confirmPass = confirmPassword.value;
        
        if (confirmPass === '') {
            matchIndicator.textContent = '';
            matchIndicator.style.color = '';
        } else if (newPass === confirmPass) {
            matchIndicator.textContent = '✓ Las contraseñas coinciden';
            matchIndicator.style.color = '#27ae60';
        } else {
            matchIndicator.textContent = '✗ Las contraseñas no coinciden';
            matchIndicator.style.color = '#e74c3c';
        }
    },

    /**
     * ✅ MÉTODO: Actualizar visibilidad del botón guardar
     */
    updateSaveButton: function() {
        const saveBtn = document.getElementById('save-profile-btn');
        if (!saveBtn) {
            console.error('❌ Botón guardar no encontrado');
            return;
        }
        
        const shouldShow = this.isEditing || this.isPasswordChangeVisible;
        saveBtn.style.display = shouldShow ? 'inline-block' : 'none';
        
        console.log('💾 Botón guardar:', shouldShow ? 'VISIBLE' : 'OCULTO');
    },

    /**
     * ✅ MÉTODO: Guardar cambios del perfil
     */
    saveProfile: async function() {
        try {
            const updates = {};
            let hasChanges = false;

            console.log('💾 Iniciando guardado de perfil...');

            // Recopilar cambios en campos editables
            const fields = [
                { frontend: 'name', backend: 'nombre' },
                { frontend: 'cedula', backend: 'cedula' },
                { frontend: 'email', backend: 'correo' }
            ];

            fields.forEach(({ frontend, backend }) => {
                const inputElement = document.getElementById(`edit-profile-${frontend}`);
                const valueElement = document.getElementById(`profile-${frontend}`);
                
                if (inputElement && inputElement.style.display !== 'none') {
                    const newValue = inputElement.value.trim();
                    const oldValue = valueElement.textContent.trim();
                    
                    if (newValue !== oldValue) {
                        updates[backend] = newValue;
                        hasChanges = true;
                        console.log(`📝 Cambio en ${backend}: "${oldValue}" -> "${newValue}"`);
                    }
                }
            });

            // Verificar cambio de contraseña
            const newPassword = document.getElementById('new-password');
            const confirmPassword = document.getElementById('confirm-password');
            
            if (this.isPasswordChangeVisible && newPassword && confirmPassword) {
                const newPassValue = newPassword.value;
                const confirmPassValue = confirmPassword.value;
                
                if (newPassValue) {
                    if (newPassValue.length < 6) {
                        throw new Error('La contraseña debe tener al menos 6 caracteres');
                    }
                    
                    if (newPassValue !== confirmPassValue) {
                        throw new Error('Las contraseñas no coinciden');
                    }
                    
                    updates.contrasena = newPassValue;
                    hasChanges = true;
                    console.log('🔐 Contraseña a cambiar');
                }
            }

            if (!hasChanges) {
                this.showNotification('No hay cambios para guardar', 'info');
                return;
            }

            console.log('📤 Datos a enviar:', updates);

            // Mostrar loading
            this.showLoading(true);

            const response = await fetch('/api/usuarios/perfil', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Perfil actualizado correctamente', 'success');
                
                // Actualizar datos en la interfaz
                this.displayProfile(result.data);
                
                // Actualizar nombre en el header si cambió
                if (updates.nombre) {
                    const userNameElement = document.getElementById('userName');
                    if (userNameElement) {
                        userNameElement.textContent = updates.nombre;
                    }
                }
                
                // Resetear estado después de guardar
                this.resetEditState();
                
            } else {
                throw new Error(result.message || 'Error desconocido al actualizar perfil');
            }

        } catch (error) {
            console.error('❌ Error al guardar perfil:', error);
            this.showNotification('Error al guardar cambios: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * ✅ MÉTODO: Resetear estado de edición
     */
    resetEditState: function() {
        console.log('🔄 Reseteando estado de edición...');
        
        // Salir de modo edición en campos
        this.exitAllEditModes();
        
        // Ocultar cambio de contraseña
        this.hidePasswordChange();
        
        // Limpiar datos originales
        this.originalData = {};
        
        // Ocultar botón guardar
        this.updateSaveButton();
        
        this.isEditing = false;
        this.isPasswordChangeVisible = false;
    },

    /**
     * ✅ MÉTODO: Confirmar eliminación de cuenta
     */
    confirmDeleteAccount: function() {
        // Verificar si el usuario es administrador
        if (this.currentUserRole !== 'admin') {
            this.showNotification('Solo los administradores pueden eliminar cuentas. Contacta al administrador del sistema.', 'error');
            return;
        }

        const modal = document.getElementById('deleteAccountModal');
        if (!modal) {
            console.error('❌ Modal de confirmación no encontrado');
            return;
        }
        
        modal.style.display = 'block';
        
        // Configurar validación de texto de confirmación
        const confirmInput = document.getElementById('confirm-delete-text');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        
        if (confirmInput && confirmBtn) {
            confirmInput.value = '';
            confirmBtn.disabled = true;
            
            // Limpiar event listeners anteriores
            confirmInput.oninput = null;
            
            // Agregar nuevo event listener
            confirmInput.addEventListener('input', function() {
                confirmBtn.disabled = this.value.toUpperCase() !== 'ELIMINAR';
            });
            
            confirmInput.focus();
        }
    },

    /**
     * ✅ MÉTODO: Eliminar cuenta de usuario
     */
    deleteAccount: async function() {
        try {
            // Verificación adicional de seguridad
            if (this.currentUserRole !== 'admin') {
                throw new Error('No tienes permisos de administrador para eliminar cuentas');
            }

            this.showLoading(true);
            console.log('🗑️ Iniciando eliminación de cuenta...');

            const response = await fetch('/api/usuarios/perfil', {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Cuenta eliminada correctamente', 'success');
                
                // Cerrar modales
                this.closeModal('deleteAccountModal');
                this.closeModal('profileModal');
                
                // Redirigir al login después de un breve delay
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                
            } else {
                throw new Error(result.message);
            }

        } catch (error) {
            console.error('❌ Error al eliminar cuenta:', error);
            this.showNotification('Error al eliminar cuenta: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    /**
     * ✅ MÉTODO: Cerrar modal
     */
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    /**
     * ✅ MÉTODO: Mostrar notificación
     */
    showNotification: function(message, type = 'info') {
        // Usar Utils si está disponible, sino mostrar alerta simple
        if (window.Utils && typeof window.Utils.showNotification === 'function') {
            window.Utils.showNotification(message, type);
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    },

    /**
     * ✅ MÉTODO: Mostrar/ocultar loading
     */
    showLoading: function(show) {
        // Buscar elementos de loading existentes o crear uno simple
        if (show) {
            document.body.style.opacity = '0.7';
            document.body.style.pointerEvents = 'none';
        } else {
            document.body.style.opacity = '1';
            document.body.style.pointerEvents = 'auto';
        }
    },

    /**
     * ✅ MÉTODO: Inicializar event listeners del perfil
     */
    init: function() {
        try {
            console.log('🔄 Inicializando ProfileManager...');
            
            // Configurar event listener para el botón guardar
            const saveProfileBtn = document.getElementById('save-profile-btn');
            if (saveProfileBtn) {
                saveProfileBtn.addEventListener('click', () => {
                    this.saveProfile();
                });
            }
            
            // Event listeners para campos de contraseña
            const confirmPassword = document.getElementById('confirm-password');
            if (confirmPassword) {
                confirmPassword.addEventListener('input', () => {
                    this.checkPasswordMatch();
                });
            }
            
            // Permitir guardar con Enter en los campos de edición
            document.querySelectorAll('.info-input').forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.saveProfile();
                    }
                });
            });
            
            // Event listener para el campo de confirmación de eliminación
            const confirmInput = document.getElementById('confirm-delete-text');
            if (confirmInput) {
                confirmInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const confirmBtn = document.getElementById('confirm-delete-btn');
                        if (confirmBtn && !confirmBtn.disabled) {
                            this.deleteAccount();
                        }
                    }
                });
            }
            
            console.log('✅ ProfileManager inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando ProfileManager:', error);
        }
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ProfileManager.init();
    }, 1000);
});

// Hacer disponible globalmente
window.ProfileManager = ProfileManager;