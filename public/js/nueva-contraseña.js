document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const passwordContainer = document.querySelector('.password-container');
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const togglePasswordButton = document.getElementById('togglePasswordButton');
    const eyeIcon = document.getElementById('eyeIcon');
    const resetForm = document.getElementById("resetForm");
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");
    const resetButton = document.getElementById("resetButton");
    const buttonText = document.querySelector('.button-text');
    const buttonLoader = document.querySelector('.button-loader');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    const tokenInput = document.getElementById('token');

    // Elementos de requisitos
    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    // Obtener token de la URL
    const token = window.location.pathname.split('/').pop();
    tokenInput.value = token;

    // Crear partículas de fondo
    createParticles();

    /** Efecto 3D en el contenedor
    if (window.matchMedia('(pointer: fine)').matches) {
        passwordContainer.addEventListener('mousemove', (e) => {
            const rect = passwordContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xAxis = (rect.width / 2 - x) / 25;
            const yAxis = (rect.height / 2 - y) / -25;
            
            passwordContainer.style.transform = `perspective(1000px) rotateY(${xAxis}deg) rotateX(${yAxis}deg) scale(1.02)`;
            passwordContainer.style.boxShadow = `
                ${xAxis * -2}px ${yAxis * -2}px 30px rgba(0,0,0,0.3),
                0 0 30px rgba(59, 130, 246, 0.2)
            `;
        });

        passwordContainer.addEventListener('mouseenter', () => {
            passwordContainer.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
        });

        passwordContainer.addEventListener('mouseleave', () => {
            passwordContainer.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
            passwordContainer.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
            passwordContainer.style.boxShadow = 'var(--shadow-strong)';
        });
    }
    */
    // Alternar visibilidad de contraseña
    function togglePasswordVisibility() {
        const isPasswordType = passwordInput.type === "password";
        passwordInput.type = isPasswordType ? "text" : "password";
        eyeIcon.className = isPasswordType ? "fas fa-eye-slash" : "fas fa-eye";
        togglePasswordButton.setAttribute('aria-label', isPasswordType ? 'Ocultar contraseña' : 'Mostrar contraseña');
    }
    
    togglePasswordButton.addEventListener('click', togglePasswordVisibility);

    // Validar fuerza de contraseña y requisitos
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        const requirements = checkPasswordRequirements(password);
        
        // Actualizar indicador de fuerza
        updateStrengthIndicator(strength);
        
        // Actualizar requisitos
        updateRequirements(requirements);
    });

    function calculatePasswordStrength(password) {
        let score = 0;
        
        // Longitud
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        
        // Caracteres mixtos
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score <= 2) return 'weak';
        if (score <= 4) return 'medium';
        return 'strong';
    }

    function checkPasswordRequirements(password) {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
    }

    function updateStrengthIndicator(strength) {
        strengthFill.className = 'strength-fill';
        strengthText.className = 'strength-text';
        
        if (passwordInput.value.length === 0) {
            strengthFill.style.width = '0%';
            strengthText.textContent = 'Seguridad de la contraseña';
            return;
        }
        
        switch(strength) {
            case 'weak':
                strengthFill.classList.add('weak');
                strengthText.classList.add('weak');
                strengthText.textContent = 'Débil';
                break;
            case 'medium':
                strengthFill.classList.add('medium');
                strengthText.classList.add('medium');
                strengthText.textContent = 'Media';
                break;
            case 'strong':
                strengthFill.classList.add('strong');
                strengthText.classList.add('strong');
                strengthText.textContent = 'Fuerte';
                break;
        }
    }

    function updateRequirements(requirements) {
        reqLength.className = requirements.length ? 'requirement valid' : 'requirement invalid';
        reqUppercase.className = requirements.uppercase ? 'requirement valid' : 'requirement invalid';
        reqLowercase.className = requirements.lowercase ? 'requirement valid' : 'requirement invalid';
        reqNumber.className = requirements.number ? 'requirement valid' : 'requirement invalid';
        reqSpecial.className = requirements.special ? 'requirement valid' : 'requirement invalid';
    }

    // Validar confirmación de contraseña
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

    // Manejar envío del formulario
    resetForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        hideMessages();

        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const token = tokenInput.value;

        // Validaciones
        if (!validateForm(password, confirmPassword)) {
            return;
        }

        setLoadingState(true);

        try {
            const response = await fetch('/reestablecer-pass', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    token: token, 
                    password: password 
                })
            });
            
            const result = await response.json();

            if (result.success === true) {
                showSuccess("¡Contraseña actualizada exitosamente! Redirigiendo al inicio de sesión...");
                createSuccessAnimation();
                
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 3000);
            } else {
                showError(result.message || "Error al actualizar la contraseña. Intente de nuevo.");
                triggerContainerShake();
            }
        } catch (error) {
            console.error("Error en la petición:", error);
            showError("Error de conexión. Por favor, intente más tarde.");
            triggerContainerShake();
        } finally {
            setLoadingState(false);
        }
    });

    // Validaciones del formulario
    function validateForm(password, confirmPassword) {
        // Validar contraseña
        if (!password || password.length < 8) {
            showError("La contraseña debe tener al menos 8 caracteres.");
            passwordInput.focus();
            triggerContainerShake();
            return false;
        }
        
        const requirements = checkPasswordRequirements(password);
        if (!requirements.uppercase || !requirements.lowercase || !requirements.number || !requirements.special) {
            showError("La contraseña no cumple con todos los requisitos de seguridad.");
            passwordInput.focus();
            triggerContainerShake();
            return false;
        }
        
        // Validar confirmación de contraseña
        if (password !== confirmPassword) {
            showError("Las contraseñas no coinciden.");
            confirmPasswordInput.focus();
            triggerContainerShake();
            return false;
        }
        
        return true;
    }

    // Efecto de sacudida
    function triggerContainerShake() {
        passwordContainer.classList.add('shake-animation');
        setTimeout(() => passwordContainer.classList.remove('shake-animation'), 600);
    }

    // Mostrar/ocultar mensajes
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
        errorMessage.style.animation = 'none';
        void errorMessage.offsetHeight;
        errorMessage.style.animation = 'shake 0.5s ease';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = "block";
        
        // Ocultar formulario después de éxito
        resetForm.style.display = 'none';
    }

    function hideMessages() {
        errorMessage.style.display = "none";
        successMessage.style.display = "none";
        errorMessage.textContent = "";
        successMessage.textContent = "";
    }

    // Estado de carga
    function setLoadingState(isLoading) {
        resetButton.disabled = isLoading;
        resetButton.classList.toggle('loading', isLoading);
        resetButton.setAttribute('aria-busy', isLoading.toString());
    }

    // Efecto ripple en botón
    resetButton.addEventListener('click', function(e) {
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

    // Animación de éxito
    function createSuccessAnimation() {
        const checkmark = document.createElement('div');
        checkmark.innerHTML = '✓';
        checkmark.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 48px;
            color: var(--success-color);
            background: rgba(16, 185, 129, 0.1);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: scaleIn 0.5s ease-out;
        `;
        
        passwordContainer.style.position = 'relative';
        passwordContainer.appendChild(checkmark);
        
        setTimeout(() => {
            checkmark.remove();
        }, 2000);
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

    // Añadir estilos para animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        @keyframes scaleIn {
            from {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
            }
            to {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
        }
        .shake-animation {
            animation: shake 0.5s ease;
        }
    `;
    document.head.appendChild(style);
});