document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const registerContainer = document.querySelector('.register-container');
    const cedulaInput = document.getElementById("cedula");
    const nombreInput = document.getElementById("nombre");
    const correoInput = document.getElementById("correo");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const togglePasswordButton = document.getElementById('togglePasswordButton');
    const eyeIcon = document.getElementById('eyeIcon');
    const registerForm = document.getElementById("registerForm");
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");
    const registerButton = document.getElementById("registerButton");
    const buttonText = document.querySelector('.button-text');
    const buttonLoader = document.querySelector('.button-loader');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    // 🔐 NUEVO: Elementos para registro de administrador
    const adminToggle = document.getElementById('adminToggle');
    const adminSecretSection = document.getElementById('adminSecretSection');
    const adminSecretInput = document.getElementById('adminSecret');
    const toggleAdminSecretButton = document.getElementById('toggleAdminSecretButton');
    const adminEyeIcon = document.getElementById('adminEyeIcon');

    // Crear partículas de fondo
    createParticles();

    /** Efecto 3D en el contenedor
    if (window.matchMedia('(pointer: fine)').matches) {
        registerContainer.addEventListener('mousemove', (e) => {
            const rect = registerContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xAxis = (rect.width / 2 - x) / 25;
            const yAxis = (rect.height / 2 - y) / -25;
            
            registerContainer.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg) scale(1.02)`;
            registerContainer.style.boxShadow = `
                ${xAxis * -2}px ${yAxis * -2}px 30px rgba(0,0,0,0.3),
                0 0 30px rgba(59, 130, 246, 0.2)
            `;
        });

        registerContainer.addEventListener('mouseenter', () => {
            registerContainer.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
        });

        registerContainer.addEventListener('mouseleave', () => {
            registerContainer.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
            registerContainer.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
            registerContainer.style.boxShadow = 'var(--shadow-strong)';
        });
    }
     */

    // 🔐 NUEVO: Alternar sección de administrador
    function toggleAdminSection() {
        if (adminToggle && adminSecretSection) {
            if (adminToggle.checked) {
                adminSecretSection.classList.add('show');
                if (adminSecretInput) adminSecretInput.required = true;
            } else {
                adminSecretSection.classList.remove('show');
                if (adminSecretInput) {
                    adminSecretInput.required = false;
                    adminSecretInput.value = '';
                }
            }
        }
    }

    // Inicializar sección de administrador
    if (adminToggle && adminSecretSection) {
        adminToggle.addEventListener('change', toggleAdminSection);
        // Ocultar por defecto
        adminSecretSection.classList.remove('show');
        if (adminSecretInput) adminSecretInput.required = false;
    }

    // Alternar visibilidad de contraseña
    function togglePasswordVisibility() {
        const isPasswordType = passwordInput.type === "password";
        passwordInput.type = isPasswordType ? "text" : "password";
        eyeIcon.className = isPasswordType ? "fas fa-eye-slash" : "fas fa-eye";
        togglePasswordButton.setAttribute('aria-label', isPasswordType ? 'Ocultar contraseña' : 'Mostrar contraseña');
    }
    
    if (togglePasswordButton) {
        togglePasswordButton.addEventListener('click', togglePasswordVisibility);
    }

    // 🔐 NUEVO: Alternar visibilidad de contraseña de administrador
    if (toggleAdminSecretButton && adminEyeIcon && adminSecretInput) {
        toggleAdminSecretButton.addEventListener('click', function() {
            const isPasswordType = adminSecretInput.type === "password";
            adminSecretInput.type = isPasswordType ? "text" : "password";
            adminEyeIcon.className = isPasswordType ? "fas fa-eye-slash" : "fas fa-eye";
            toggleAdminSecretButton.setAttribute('aria-label', isPasswordType ? 'Ocultar clave secreta' : 'Mostrar clave secreta');
        });
    }

    // Validar fuerza de contraseña
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            if (strengthFill) strengthFill.className = 'strength-fill';
            if (strengthText) strengthText.className = 'strength-text';
            
            if (password.length === 0) {
                if (strengthFill) strengthFill.style.width = '0%';
                if (strengthText) strengthText.textContent = 'Seguridad de la contraseña';
                return;
            }
            
            switch(strength) {
                case 'weak':
                    if (strengthFill) {
                        strengthFill.classList.add('weak');
                        strengthFill.style.width = '33%';
                    }
                    if (strengthText) {
                        strengthText.classList.add('weak');
                        strengthText.textContent = 'Débil';
                    }
                    break;
                case 'medium':
                    if (strengthFill) {
                        strengthFill.classList.add('medium');
                        strengthFill.style.width = '66%';
                    }
                    if (strengthText) {
                        strengthText.classList.add('medium');
                        strengthText.textContent = 'Media';
                    }
                    break;
                case 'strong':
                    if (strengthFill) {
                        strengthFill.classList.add('strong');
                        strengthFill.style.width = '100%';
                    }
                    if (strengthText) {
                        strengthText.classList.add('strong');
                        strengthText.textContent = 'Fuerte';
                    }
                    break;
            }
        });
    }

    function calculatePasswordStrength(password) {
        let score = 0;
        
        // Longitud mínima
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        
        // Caracteres mixtos
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score <= 2) return 'weak';
        if (score <= 4) return 'medium';
        return 'strong';
    }

    // Validar confirmación de contraseña
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = passwordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.style.borderColor = 'var(--error-color)';
            } else if (confirmPassword) {
                this.style.borderColor = 'var(--success-color)';
            } else {
                this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
        });
    }

    // Manejar envío del formulario - MODIFICADO para roles
    if (registerForm) {
        registerForm.addEventListener("submit", async function(event) {
            event.preventDefault();
            hideMessages();

            const cedula = cedulaInput.value.trim();
            const nombre = nombreInput.value.trim();
            const correo = correoInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            const terms = document.getElementById('terms').checked;
            
            // 🔐 NUEVO: Obtener datos de rol
            const isAdminRegistration = adminToggle ? adminToggle.checked : false;
            const adminSecret = adminSecretInput ? adminSecretInput.value.trim() : '';

            // Validaciones
            if (!validateForm(cedula, nombre, correo, password, confirmPassword, terms, isAdminRegistration, adminSecret)) {
                return;
            }

            setLoadingState(true);

            try {
                // 🔐 MODIFICADO: Preparar datos con rol
                const formData = {
                    ced: cedula,
                    nom: nombre,
                    correo: correo,
                    pass: password
                };

                // 🔐 NUEVO: Agregar clave secreta si es registro de admin
                if (isAdminRegistration && adminSecret) {
                    formData.role = 'admin';
                    formData.adminSecret = adminSecret;
                }

                // 🔐 MODIFICADO: Usar el endpoint correcto según el tipo de registro
                const endpoint = isAdminRegistration ? '/auth/registro-admin' : '/auth/registro';

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();

                if (result.success === true) {
                    const userType = result.user && result.user.role === 'admin' ? 'administrador' : 'usuario';
                    showSuccess(`¡Cuenta de ${userType} creada exitosamente! Redirigiendo...`);
                    createConfetti();
                    
                    setTimeout(() => {
                        window.location.href = result.redirect || '/index.html';
                    }, 2000);
                } else {
                    showError(result.message || "Error en el registro. Intente de nuevo.");
                    triggerContainerShake();
                }
            } catch (error) {
                console.error("Error en la petición de registro:", error);
                showError("Error de conexión. Por favor, intente más tarde.");
                triggerContainerShake();
            } finally {
                setLoadingState(false);
            }
        });
    }

    // Validaciones del formulario - MEJORADO para roles
    function validateForm(cedula, nombre, correo, password, confirmPassword, terms, isAdminRegistration, adminSecret) {
        // Validar cédula
        if (!cedula || cedula.length < 5) {
            showError("La cédula debe tener al menos 5 caracteres.");
            if (cedulaInput) cedulaInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // Validar nombre
        if (!nombre || nombre.length < 3) {
            showError("El nombre debe tener al menos 3 caracteres.");
            if (nombreInput) nombreInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // Validar correo
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            showError("Por favor, introduce un correo electrónico válido.");
            if (correoInput) correoInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // Validar contraseña
        if (!password || password.length < 6) {
            showError("La contraseña debe tener al menos 6 caracteres.");
            if (passwordInput) passwordInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // Validar confirmación de contraseña
        if (password !== confirmPassword) {
            showError("Las contraseñas no coinciden.");
            if (confirmPasswordInput) confirmPasswordInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // 🔐 NUEVO: Validar clave secreta para administrador
        if (isAdminRegistration && (!adminSecret || adminSecret.length < 1)) {
            showError("La clave secreta de administrador es requerida.");
            if (adminSecretInput) adminSecretInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // Validar términos
        if (!terms) {
            showError("Debes aceptar los términos y condiciones.");
            triggerContainerShake();
            return false;
        }
        
        return true;
    }

    // Efecto de sacudida
    function triggerContainerShake() {
        if (registerContainer) {
            registerContainer.classList.add('shake-animation');
            setTimeout(() => registerContainer.classList.remove('shake-animation'), 600);
        }
    }

    // Mostrar/ocultar mensajes
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = "block";
            errorMessage.style.animation = 'none';
            void errorMessage.offsetHeight;
            errorMessage.style.animation = 'shake 0.5s ease';
        }
    }

    function showSuccess(message) {
        if (successMessage) {
            successMessage.textContent = message;
            successMessage.style.display = "block";
        }
    }

    function hideMessages() {
        if (errorMessage) {
            errorMessage.style.display = "none";
            errorMessage.textContent = "";
        }
        if (successMessage) {
            successMessage.style.display = "none";
            successMessage.textContent = "";
        }
    }

    // Estado de carga
    function setLoadingState(isLoading) {
        if (registerButton) {
            registerButton.disabled = isLoading;
            registerButton.classList.toggle('loading', isLoading);
            registerButton.setAttribute('aria-busy', isLoading.toString());
            
            if (buttonText && buttonLoader) {
                if (isLoading) {
                    buttonText.textContent = 'Creando cuenta...';
                    buttonLoader.style.display = 'block';
                } else {
                    buttonText.textContent = 'Crear Cuenta';
                    buttonLoader.style.display = 'none';
                }
            }
        }
    }

    // Efecto ripple en botón
    if (registerButton) {
        registerButton.addEventListener('click', function(e) {
            if (this.disabled) return;
            
            const rect = e.target.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
            
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    }

    // Crear partículas animadas
    function createParticles() {
        const particlesContainer = document.createElement('div');
        particlesContainer.className = 'particles';
        document.body.appendChild(particlesContainer);

        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 4 + 1;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const delay = Math.random() * 8;
            
            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${posX}%;
                top: ${posY}%;
                animation-delay: ${delay}s;
            `;
            
            particlesContainer.appendChild(particle);
        }
    }

    // Crear efecto confeti
    function createConfetti() {
        const colors = ['#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            document.body.appendChild(confetti);
            
            const animation = confetti.animate([
                { 
                    transform: 'translateY(0) rotate(0deg)',
                    opacity: 0 
                },
                { 
                    transform: 'translateY(' + (Math.random() * 300 + 100) + 'px) rotate(' + (Math.random() * 360) + 'deg)',
                    opacity: 1 
                },
                { 
                    transform: 'translateY(' + (Math.random() * 300 + 400) + 'px) rotate(' + (Math.random() * 720) + 'deg)',
                    opacity: 0 
                }
            ], {
                duration: 2000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
            });
            
            animation.onfinish = () => confetti.remove();
        }
    }

    // Efectos de focus en inputs
    document.querySelectorAll('.input-container input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });

    // 🔐 NUEVO: Añadir estilos para la sección de administrador
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        .shake-animation {
            animation: shake 0.5s ease;
        }
        
        /* 🔐 Estilos para la sección de administrador */
        .admin-toggle-section {
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            position: relative;
            overflow: hidden;
        }
        
        .admin-toggle-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #8b5cf6, #3b82f6, #8b5cf6);
        }
        
        .admin-toggle {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            cursor: pointer;
        }
        
        .admin-toggle input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }
        
        .admin-toggle label {
            font-weight: 600;
            color: #8b5cf6;
            cursor: pointer;
        }
        
        .admin-secret-section {
            margin-top: 15px;
            padding: 15px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            display: none;
        }
        
        .admin-secret-section.show {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        .admin-secret-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .admin-note {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
        }
        
        .admin-badge {
            background: linear-gradient(135deg, #8b5cf6, #3b82f6);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
                max-height: 0;
            }
            to {
                opacity: 1;
                transform: translateY(0);
                max-height: 300px;
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        /* Indicador de fuerza de contraseña mejorado */
        .strength-fill {
            transition: width 0.3s ease, background-color 0.3s ease;
        }
        
        .strength-fill.weak {
            background: linear-gradient(90deg, #ef4444, #f87171);
        }
        
        .strength-fill.medium {
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }
        
        .strength-fill.strong {
            background: linear-gradient(90deg, #10b981, #34d399);
        }
    `;
    document.head.appendChild(style);

    // 🔐 NUEVO: Verificar si hay una clave secreta temporal (desde el login)
    function checkTempAdminSecret() {
        const tempAdminSecret = sessionStorage.getItem('tempAdminSecret');
        if (tempAdminSecret && adminToggle && adminSecretInput) {
            adminToggle.checked = true;
            toggleAdminSection();
            adminSecretInput.value = tempAdminSecret;
            
            // Limpiar la clave temporal
            sessionStorage.removeItem('tempAdminSecret');
        }
    }

    // 🔐 NUEVO: Verificar si hay un parámetro de admin en la URL
    function checkAdminParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const adminParam = urlParams.get('admin');
        
        if (adminParam === 'true' && adminToggle) {
            adminToggle.checked = true;
            toggleAdminSection();
        }
    }

    // Ejecutar verificaciones al cargar
    checkTempAdminSecret();
    checkAdminParameter();

    // 🔐 NUEVO: Manejar enlace de login
    const loginLink = document.querySelector('.login-link');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/index.html';
        });
    }
});