// ==============================================
// LOGIN - Manejo de formulario de inicio de sesión
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ login.js cargado correctamente');
    
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePasswordButton');
    const loginButton = document.getElementById('loginButton');
    const errorMessage = document.getElementById('error-message');

    console.log('🔍 Elementos encontrados:');
    console.log('   - Formulario:', !!loginForm);
    console.log('   - Email input:', !!emailInput);
    console.log('   - Password input:', !!passwordInput);
    console.log('   - Botón login:', !!loginButton);

    if (!loginForm) {
        console.error('❌ FORMULARIO NO ENCONTRADO!');
        if (errorMessage) {
            errorMessage.textContent = 'Error: Formulario no encontrado';
            errorMessage.classList.add('show');
        }
        return;
    }

    // 🔐 CORREGIDO: Eliminada la verificación de autenticación que causaba el bucle
    // NO verificar autenticación en la página de login para evitar bucles

    // Manejar visibilidad de contraseña
    if (togglePasswordButton && passwordInput) {
        togglePasswordButton.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            const eyeIcon = document.getElementById('eyeIcon');
            if (eyeIcon) {
                eyeIcon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
        });
    }

    // Envío del formulario - CORREGIDO para usar ApiService y manejar JWT correctamente
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('✅ Formulario enviado!');
        
        const formData = {
            correo: emailInput.value.trim(),
            pass: passwordInput.value.trim()
        };

        // Validación básica
        if (!formData.correo || !formData.pass) {
            showError('Por favor, completa todos los campos');
            return;
        }

        console.log('📤 Enviando datos:', { ...formData, pass: '***' }); // No loguear contraseña real

        try {
            // Mostrar estado de carga
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.classList.add('loading');
            }
            
            if (errorMessage) {
                errorMessage.textContent = '';
                errorMessage.classList.remove('show', 'success');
            }

            console.log('🔄 Realizando petición de login...');
            
            // 🔐 CORREGIDO: Usar ApiService para el login
            let data;
            if (typeof ApiService !== 'undefined') {
                // Usar ApiService si está disponible
                data = await ApiService.login(formData);
            } else {
                // Fallback a fetch directo
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });
                data = await response.json();
            }

            console.log('📊 Datos de respuesta:', data);

            if (data.success) {
                console.log('✅ Login exitoso!');
                console.log('👤 Usuario:', data.user);
                console.log('🔐 Token recibido:', data.token ? 'SÍ' : 'NO');
                
                // 🔐 CORREGIDO: Guardar token y datos de usuario correctamente
                if (data.token && data.user) {
                    // Usar authManager si está disponible
                    if (typeof authManager !== 'undefined') {
                        authManager.setSession(data.token, {
                            id: data.user.id,
                            nombre: data.user.nombre,
                            correo: data.user.correo,
                            role: data.user.role
                        });
                        console.log('💾 Sesión guardada en AuthManager - Rol:', data.user.role);
                    } else {
                        // Fallback: guardar en localStorage directamente
                        localStorage.setItem('jwt_token', data.token);
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        console.log('💾 Sesión guardada en localStorage - Rol:', data.user.role);
                    }
                    
                    // 🔥 NUEVO: Configurar ApiService con el token
                    if (typeof ApiService !== 'undefined' && ApiService.setAuthToken) {
                        ApiService.setAuthToken(data.token);
                        console.log('💾 Token configurado en ApiService');
                    }
                }
                
                // 🔐 CORREGIDO: Mensaje personalizado según el rol
                const welcomeMessage = data.user.role === 'admin' 
                    ? `👑 ¡Bienvenido Administrador ${data.user.nombre}!` 
                    : `👤 ¡Bienvenido ${data.user.nombre}!`;
                
                showSuccess(welcomeMessage + ' Redirigiendo...');
                
                // 🔐 CORREGIDO: Pequeña animación para admin
                if (data.user.role === 'admin') {
                    document.body.classList.add('admin-login-success');
                    setTimeout(() => {
                        document.body.classList.remove('admin-login-success');
                    }, 2000);
                }
                
                console.log('🔄 Redirigiendo a:', data.redirect || '/dashboard');
                
                // Pequeño delay para mostrar el mensaje de éxito
                setTimeout(() => {
                    window.location.href = data.redirect || '/dashboard';
                }, 1500);
                
            } else {
                console.log('❌ Error en login:', data.message);
                throw new Error(data.message || 'Error en el login');
            }

        } catch (error) {
            console.error('❌ Error en login:', error);
            
            // Manejar diferentes tipos de errores
            let errorMsg = error.message || 'Error de conexión. Intenta nuevamente.';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMsg = 'Error de conexión. Verifica tu internet e intenta nuevamente.';
            } else if (error.message.includes('JSON')) {
                errorMsg = 'Error en la respuesta del servidor. Intenta más tarde.';
            }
            
            showError(errorMsg);
            
            // Agitar el formulario para indicar error
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        } finally {
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.classList.remove('loading');
            }
        }
    });

    // 🔐 CORREGIDO: Función para mostrar errores
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            errorMessage.classList.remove('success');
        } else {
            console.error('Error:', message);
        }
    }

    // 🔐 CORREGIDO: Función para mostrar éxito
    function showSuccess(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show', 'success');
        } else {
            console.log('Éxito:', message);
        }
    }

    // 🔐 CORREGIDO: Función para recuperación de contraseña
    function setupPasswordRecovery() {
        const forgotPasswordLink = document.querySelector('.forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = '/solicitar-reset';
            });
        }
    }

    // 🔐 CORREGIDO: Función para mostrar/ocultar información de roles
    function setupRoleInfo() {
        // Solo mostrar si estamos en entorno de desarrollo o si no hay usuarios registrados
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const roleInfo = document.createElement('div');
            roleInfo.className = 'role-info';
            roleInfo.innerHTML = `
                <div style="text-align: center; margin-top: 20px; padding: 15px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.2);">
                    <p style="margin: 0; font-size: 14px; color: #7c3aed;">
                        <i class="fas fa-info-circle"></i>
                        Sistema de roles activado: 
                        <span style="font-weight: 600;">Usuario</span> y 
                        <span style="font-weight: 600; color: #8b5cf6;">Administrador</span>
                    </p>
                </div>
            `;
            
            // Insertar después del formulario
            if (loginForm.parentNode) {
                loginForm.parentNode.insertBefore(roleInfo, loginForm.nextSibling);
            }
        }
    }

    // 🔐 CORREGIDO: Verificar parámetros de URL para mensajes
    function checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Mensaje de registro exitoso
        if (urlParams.get('registered') === 'true' && typeof Utils !== 'undefined') {
            Utils.showNotification('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.', 'success');
        }
        
        // Mensaje de logout
        if (urlParams.get('logout') === 'true' && typeof Utils !== 'undefined') {
            Utils.showNotification('Sesión cerrada correctamente', 'info');
        }
        
        // Mensaje de contraseña restablecida
        if (urlParams.get('passwordReset') === 'true' && typeof Utils !== 'undefined') {
            Utils.showNotification('Contraseña restablecida correctamente', 'success');
        }
        
        // Mensaje de sin permisos
        if (urlParams.get('unauthorized') === 'true' && typeof Utils !== 'undefined') {
            Utils.showNotification('No tienes permisos para acceder a esa página', 'error');
        }

        // Limpiar URL después de mostrar mensajes
        if (urlParams.toString()) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    // 🔐 CORREGIDO: Configurar tecla Enter para login
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && loginButton && !loginButton.disabled) {
                // Verificar que algún campo tenga foco
                if (document.activeElement === emailInput || document.activeElement === passwordInput) {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    // 🔐 NUEVO: Función para verificar dependencias
    function checkDependencies() {
        const missingDeps = [];
        
        if (typeof authManager === 'undefined') {
            console.warn('⚠️ authManager no está disponible');
            missingDeps.push('authManager');
        }
        
        if (typeof Utils === 'undefined') {
            console.warn('⚠️ Utils no está disponible');
            missingDeps.push('Utils');
        }
        
        if (typeof ApiService === 'undefined') {
            console.warn('⚠️ ApiService no está disponible - usando fetch directo');
            missingDeps.push('ApiService');
        }
        
        if (missingDeps.length > 0) {
            console.warn('⚠️ Dependencias faltantes:', missingDeps.join(', '));
        } else {
            console.log('✅ Todas las dependencias cargadas correctamente');
        }
    }

    // 🔐 NUEVO: Función para mejorar UX del formulario
    function enhanceFormUX() {
        // Auto-focus en email al cargar
        if (emailInput) {
            setTimeout(() => {
                emailInput.focus();
            }, 500);
        }

        // Validación en tiempo real
        if (emailInput && passwordInput) {
            const validateForm = () => {
                const isValid = emailInput.value.trim() && passwordInput.value.trim();
                if (loginButton) {
                    loginButton.style.opacity = isValid ? '1' : '0.7';
                }
            };

            emailInput.addEventListener('input', validateForm);
            passwordInput.addEventListener('input', validateForm);
            
            // Validación inicial
            validateForm();
        }
    }

    // 🔥 NUEVO: Función para helpers de desarrollo
    function setupDevHelpers() {
        // Solo en desarrollo local
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const devHelpers = document.createElement('div');
            devHelpers.className = 'dev-helpers';
            devHelpers.innerHTML = `
              
            `;
            
            loginForm.parentNode.insertBefore(devHelpers, loginForm);
            
            // Agregar event listeners a los botones
            devHelpers.querySelectorAll('.dev-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const userType = this.getAttribute('data-user');
                    if (userType === 'admin') {
                        emailInput.value = 'admin@demo.com';
                        passwordInput.value = 'admin123';
                    } else {
                        emailInput.value = 'user@demo.com';
                        passwordInput.value = 'user123';
                    }
                    
                    // Disparar evento de input para actualizar UI
                    emailInput.dispatchEvent(new Event('input'));
                    passwordInput.dispatchEvent(new Event('input'));
                    
                    Utils.showNotification(`Credenciales de ${userType} cargadas`, 'info');
                });
            });
        }
    }

    // Inicializar funciones adicionales
    checkDependencies();
    setupPasswordRecovery();
    setupRoleInfo();
    checkURLParameters();
    setupKeyboardShortcuts();
    setupDevHelpers();
    enhanceFormUX();

    // Agregar CSS para las nuevas funcionalidades
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes adminGlow {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); 
            }
            50% { 
                box-shadow: 0 0 30px rgba(139, 92, 246, 0.6); 
            }
        }
        
        @keyframes loadingShine {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        .shake {
            animation: shake 0.3s ease-in-out;
        }
        
        .admin-login-success {
            animation: adminGlow 1s ease-in-out;
        }
        
        .loading {
            position: relative;
            overflow: hidden;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: loadingShine 1.5s infinite;
        }
        
        /* Estilos para mensajes de error/éxito */
        .error-message.success {
            background: rgba(46, 204, 113, 0.1) !important;
            border: 1px solid #2ecc71 !important;
            color: #27ae60 !important;
        }
        
        .error-message.show {
            display: block !important;
            animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Estilos para helpers de desarrollo */
        .dev-helpers {
            font-family: 'Poppins', sans-serif;
            margin-bottom: 20px;
        }
        
        .dev-btn {
            transition: all 0.2s ease;
        }
        
        .dev-btn:hover {
            opacity: 0.8;
            transform: translateY(-1px);
        }
        
        .role-info {
            font-family: 'Poppins', sans-serif;
            margin-top: 20px;
        }
        
        /* Mejoras de accesibilidad */
        .login-form input:focus {
            outline: 2px solid #8b5cf6;
            outline-offset: 2px;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .dev-helpers div {
                flex-direction: column;
                align-items: center;
            }
            
            .dev-btn {
                width: 100%;
                margin-bottom: 5px;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('✅ login.js completamente inicializado con sistema de autenticación');
});

// 🔐 CORREGIDO: Función global para manejar logout desde otras páginas
if (typeof window !== 'undefined') {
    window.handleLogout = async function() {
        try {
            // Limpiar sesión local primero
            if (typeof authManager !== 'undefined') {
                authManager.clearSession();
            } else {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
            }
            
            // Limpiar token de ApiService
            if (typeof ApiService !== 'undefined' && ApiService.clearAuthToken) {
                ApiService.clearAuthToken();
            }
            
            // Intentar logout en servidor
            if (typeof ApiService !== 'undefined') {
                await ApiService.logout();
            } else {
                await fetch('/auth/logout', { method: 'POST' });
            }
            
            // Redirigir al login con mensaje
            window.location.href = '/?logout=true';
        } catch (error) {
            console.error('Error en logout:', error);
            // Redirigir de todas formas
            window.location.href = '/?logout=true';
        }
    };
}