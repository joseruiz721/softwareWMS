document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const resetContainer = document.querySelector('.reset-container');
    const emailInput = document.getElementById("email");
    const requestForm = document.getElementById("requestForm");
    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");
    const submitButton = document.getElementById("submitButton");
    
    // Obtener referencias a los elementos del botón
    const buttonText = submitButton.querySelector('.button-text');
    const buttonLoader = submitButton.querySelector('.button-loader');

    // Manejar envío del formulario
    requestForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        hideMessages();

        const email = emailInput.value.trim();

        // Validaciones
        if (!validateForm(email)) {
            return;
        }

        setLoadingState(true);

        try {
            const response = await fetch('/auth/solicitar-reset', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    correo: email 
                })
            });
            
            const result = await response.json();
            console.log('📨 Respuesta del servidor:', result);

            if (result.success === true) {
                showSuccess("¡Enlace de recuperación enviado! Revisa tu correo electrónico para continuar.");
                createSuccessAnimation();
                
                // Ocultar formulario después de éxito
                requestForm.style.display = 'none';
                
                // Mostrar información adicional
                showSuccessInfo();
                
                // Mostrar enlace de debug en desarrollo
                if (result.debug_link) {
                    console.log('🔗 Enlace de desarrollo:', result.debug_link);
                    const debugLink = document.createElement('p');
                    debugLink.innerHTML = `<small>Enlace de prueba: <a href="${result.debug_link}" target="_blank">${result.debug_link}</a></small>`;
                    successMessage.appendChild(debugLink);
                }
            } else {
                showError(result.message || "Error al enviar el enlace de recuperación. Intente de nuevo.");
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
    function validateForm(email) {
        if (!email) {
            showError("El correo electrónico es obligatorio.");
            emailInput.focus();
            triggerContainerShake();
            return false;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError("Por favor, introduce un correo electrónico válido.");
            emailInput.focus();
            triggerContainerShake();
            return false;
        }
        
        return true;
    }

    // Efecto de sacudida
    function triggerContainerShake() {
        resetContainer.classList.add('shake-animation');
        setTimeout(() => resetContainer.classList.remove('shake-animation'), 600);
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
    }

    function hideMessages() {
        errorMessage.style.display = "none";
        successMessage.style.display = "none";
        errorMessage.textContent = "";
        successMessage.textContent = "";
    }

    // Estado de carga
    function setLoadingState(isLoading) {
        submitButton.disabled = isLoading;
        if (buttonText) buttonText.style.opacity = isLoading ? '0' : '1';
        if (buttonLoader) buttonLoader.style.display = isLoading ? 'block' : 'none';
    }

    // Animación de éxito
    function createSuccessAnimation() {
        const successIcon = document.createElement('div');
        successIcon.className = 'success-animation';
        successIcon.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3 style="color: var(--success-color); margin-bottom: 10px;">¡Enlace Enviado!</h3>
            <p style="color: var(--text-muted); font-size: 14px;">Revisa tu bandeja de entrada y carpeta de spam</p>
        `;
        
        resetContainer.insertBefore(successIcon, resetContainer.querySelector('.reset-footer'));
    }

    // Mostrar información de éxito
    function showSuccessInfo() {
        const infoCard = document.querySelector('.info-card');
        if (infoCard) {
            infoCard.innerHTML = `
                <i class="fas fa-clock info-icon"></i>
                <div class="info-content">
                    <h4>Enlace Temporal</h4>
                    <p>El enlace de recuperación expirará en 1 hora por seguridad</p>
                </div>
            `;
        }
    }

    // Efectos de focus en inputs
    document.querySelectorAll('.input-container input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
});