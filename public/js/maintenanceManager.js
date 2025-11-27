// ==============================================
// MÓDULO: MaintenanceManager - Gestión de mantenimientos - CORREGIDO
// ==============================================

const MaintenanceManager = {
    editingMaintenance: null,

    /**
     * ✅ MÉTODO: Inicializar el módulo
     */
    init: function() {
        this.setupEventListeners();
        console.log('✅ MaintenanceManager inicializado');
    },

    /**
     * ✅ MÉTODO: Configurar event listeners
     */
    setupEventListeners: function() {
        try {
            // Evento para mostrar la sección
            const maintenanceLink = document.getElementById('control-mantenimientos-link');
            if (maintenanceLink) {
                maintenanceLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showMaintenanceSection();
                });
            }

            // Evento para actualizar
            const refreshBtn = document.getElementById('refresh-maintenance');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.loadMaintenanceData();
                });
            }

            // Evento para enviar formulario
            const maintenanceForm = document.getElementById('maintenanceForm');
            if (maintenanceForm) {
                maintenanceForm.addEventListener('submit', (e) => {
                    this.handleMaintenanceSubmit(e);
                });
            }

            // Cerrar modal
            const closeBtn = document.querySelector('#maintenanceModal .close-modal');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeModal();
                });
            }

            // Cerrar modal al hacer clic fuera
            const modal = document.getElementById('maintenanceModal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal();
                    }
                });
            }

            console.log('✅ Event listeners configurados correctamente');

        } catch (error) {
            console.error('❌ Error configurando event listeners:', error);
        }
    },

    /**
     * ✅ MÉTODO: Mostrar sección de mantenimientos
     */
    showMaintenanceSection: function() {
        try {
            // Ocultar otras secciones
            const sections = [
                'dashboard-section',
                'estadisticas-section', 
                'estadisticas-insumos-section'
            ];
            
            sections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'none';
                }
            });
            
            // Mostrar sección de mantenimientos
            const maintenanceSection = document.getElementById('control-mantenimientos-section');
            if (maintenanceSection) {
                maintenanceSection.style.display = 'block';
                this.loadMaintenanceData();
            }
        } catch (error) {
            console.error('❌ Error mostrando sección de mantenimientos:', error);
        }
    },

    /**
     * ✅ MÉTODO MEJORADO: Cargar datos de mantenimientos con debug del tipo
     */
    loadMaintenanceData: async function() {
        try {
            this.showLoadingState('maintenance');
            
            console.log('🔄 Cargando datos de mantenimientos...');
            const response = await fetch('/api/mantenimientos');
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const maintenanceData = await response.json();
            console.log('✅ Datos recibidos:', maintenanceData);
            
            // DEBUG: Verificar estructura de datos y campos "tipo"
            if (maintenanceData && maintenanceData.length > 0) {
                console.log('🔍 Estructura del primer mantenimiento:', maintenanceData[0]);
                console.log('📋 Campos disponibles:', Object.keys(maintenanceData[0]));
                
                // Verificar específicamente el campo "tipo"
                maintenanceData.forEach((m, index) => {
                    console.log(`📝 Mantenimiento ${index + 1}:`, {
                        id: m.id,
                        tipo: m.tipo,
                        tipo_mantenimiento: m.tipo_mantenimiento,
                        maintenance_type: m.maintenance_type,
                        tipo_de_mantenimiento: m.tipo_de_mantenimiento,
                        estado: m.estado
                    });
                });
            }
            
            this.updateMaintenanceTable(maintenanceData);
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.showError('maintenance', 'Error al cargar los mantenimientos: ' + error.message);
        }
    },

    /**
     * ✅ MÉTODO CORREGIDO: Actualizar tabla de mantenimientos - BUSCAR TIPO EN MÚLTIPLES CAMPOS
     */
    updateMaintenanceTable: function(maintenanceData) {
        const tableBody = document.getElementById('maintenance-table-body');
        if (!tableBody) {
            console.error('❌ Tabla de mantenimientos no encontrada');
            return;
        }
        
        if (!maintenanceData || maintenanceData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">No hay mantenimientos registrados</td></tr>';
            return;
        }
        
        tableBody.innerHTML = maintenanceData.map(maintenance => {
            // ✅ CORRECCIÓN PRINCIPAL: Buscar tipo en múltiples campos posibles
            const tipo = this.obtenerTipoMantenimiento(maintenance);
            const estado = maintenance.estado || 'Pendiente';
            const statusClass = this.getMaintenanceStatusClass(estado);
            
            let formattedDate = 'N/A';
            if (maintenance.fecha) {
                try {
                    const date = new Date(maintenance.fecha);
                    formattedDate = date.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    });
                } catch (e) {
                    console.warn('Error formateando fecha:', e);
                }
            }
            
            return `
                <tr data-id="${maintenance.id}">
                    <td>${maintenance.tecnico || 'Técnico no especificado'}</td>
                    <td>
                        <span class="maintenance-type ${this.getTipoClass(tipo)}">
                            ${tipo}
                        </span>
                    </td>
                    <td>
                        <strong>${maintenance.ubicacion_dispositivo || 'Ubicación no especificada'}</strong>
                        ${maintenance.tipo_dispositivo ? `<br><small class="device-type">${maintenance.tipo_dispositivo}</small>` : ''}
                        ${maintenance.nombre_dispositivo && maintenance.nombre_dispositivo !== 'Dispositivo no encontrado' ? 
                          `<br><small class="device-name">${maintenance.nombre_dispositivo}</small>` : ''}
                    </td>
                    <td>${formattedDate}</td>
                    <td><span class="maintenance-status ${statusClass}">${estado}</span></td>
                    <td>${maintenance.descripcion || 'Sin descripción'}</td>
                    <td>
                        <div class="maintenance-actions">
                            <button class="btn-action btn-edit" onclick="MaintenanceManager.editMaintenance(${maintenance.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="MaintenanceManager.deleteMaintenance(${maintenance.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    /**
     * ✅ NUEVO MÉTODO: Buscar tipo de mantenimiento en múltiples campos
     */
    obtenerTipoMantenimiento: function(mantenimiento) {
        if (!mantenimiento) return 'No especificado';
        
        console.log('🔍 Buscando tipo en mantenimiento:', mantenimiento.id, mantenimiento);
        
        // Lista de campos posibles donde puede estar el tipo
        const camposPosibles = [
            'tipo',                    // Campo principal
            'tipo_mantenimiento',      // Campo alternativo
            'maintenance_type',        // Campo en inglés
            'tipo_de_mantenimiento',   // Campo completo
            'type',                    // Campo simple
            'categoria',               // Campo categoría
            'clasificacion'            // Campo clasificación
        ];
        
        // Buscar en todos los campos posibles
        for (const campo of camposPosibles) {
            if (mantenimiento[campo]) {
                console.log(`✅ Tipo encontrado en campo '${campo}':`, mantenimiento[campo]);
                return this.normalizarTipo(mantenimiento[campo]);
            }
        }
        
        console.warn('⚠️ No se pudo determinar el tipo del mantenimiento:', mantenimiento.id);
        return 'No especificado';
    },

    /**
     * ✅ NUEVO MÉTODO: Normalizar el tipo a valores estándar
     */
    normalizarTipo: function(tipo) {
        if (!tipo) return 'Preventivo';
        
        const tipoLower = tipo.toString().toLowerCase().trim();
        
        // Mapeo de tipos comunes
        const mapeoTipos = {
            'preventivo': 'Preventivo',
            'preventiva': 'Preventivo',
            'preventive': 'Preventivo',
            'correctivo': 'Correctivo',
            'correctiva': 'Correctivo',
            'corrective': 'Correctivo',
            'predictivo': 'Predictivo',
            'predictiva': 'Predictivo',
            'predictive': 'Predictivo',
            'rutinario': 'Preventivo',
            'programado': 'Preventivo',
            'emergencia': 'Correctivo',
            'urgente': 'Correctivo'
        };
        
        // Buscar coincidencia exacta
        if (mapeoTipos[tipoLower]) {
            return mapeoTipos[tipoLower];
        }
        
        // Buscar coincidencia parcial
        for (const [key, value] of Object.entries(mapeoTipos)) {
            if (tipoLower.includes(key)) {
                return value;
            }
        }
        
        // Si no coincide, devolver el original capitalizado
        return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
    },

    /**
     * ✅ NUEVO MÉTODO: Obtener clase CSS para el tipo de mantenimiento
     */
    getTipoClass: function(tipo) {
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('preventivo')) return 'tipo-preventivo';
        if (tipoLower.includes('correctivo')) return 'tipo-correctivo';
        if (tipoLower.includes('predictivo')) return 'tipo-predictivo';
        return 'tipo-default';
    },

    /**
     * ✅ MÉTODO: Obtener clase CSS para el estado del mantenimiento
     */
    getMaintenanceStatusClass: function(status) {
        if (!status) return 'status-pending';
        const statusLower = status.toLowerCase();
        if (statusLower.includes('completado') || statusLower.includes('completo')) return 'status-completed';
        if (statusLower.includes('pendiente')) return 'status-pending';
        if (statusLower.includes('cancelado')) return 'status-cancelled';
        if (statusLower.includes('progreso') || statusLower.includes('en curso')) return 'status-in-progress';
        return 'status-pending';
    },

    /**
     * ✅ MÉTODO: Abrir modal de mantenimiento
     */
    openMaintenanceModal: function(maintenanceId = null) {
        const modal = document.getElementById('maintenanceModal');
        const title = document.getElementById('maintenance-modal-title');
        
        if (!modal || !title) {
            console.error('❌ Elementos del modal no encontrados');
            return;
        }
        
        console.log('🔧 Abriendo modal para ID:', maintenanceId);
        
        if (maintenanceId) {
            title.textContent = 'Editar Mantenimiento';
            this.loadMaintenanceForEdit(maintenanceId);
        } else {
            title.textContent = 'Registrar Mantenimiento';
            this.resetForm();
            this.editingMaintenance = null;
            
            // Fecha actual por defecto
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('maintenance-date');
            if (dateInput) {
                dateInput.value = today;
            }
            
            // Cargar selectores
            this.loadFormData();
        }
        
        modal.style.display = 'block';
    },

    /**
     * ✅ MÉTODO: Resetear formulario
     */
    resetForm: function() {
        const form = document.getElementById('maintenanceForm');
        if (form) {
            form.reset();
            
            // Resetear estado a "Pendiente"
            const statusSelect = document.getElementById('maintenance-status');
            if (statusSelect) {
                statusSelect.value = 'Pendiente';
            }
        }
    },

    /**
     * ✅ MÉTODO: Cargar datos para el formulario
     */
    loadFormData: async function() {
        try {
            console.log('🔄 Cargando selectores...');
            
            await Promise.all([
                this.loadTechnicians(),
                this.loadDevices(),
                this.loadSupplies()
            ]);
            
            console.log('✅ Todos los selectores cargados');
            
        } catch (error) {
            console.error('❌ Error cargando selectores:', error);
        }
    },

    /**
     * ✅ MÉTODO: Cargar técnicos
     */
    loadTechnicians: async function() {
        try {
            const response = await fetch('/api/mantenimientos/lista/tecnicos');
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const technicians = await response.json();
            const techSelect = document.getElementById('maintenance-technician');
            
            if (!techSelect) {
                console.error('❌ Selector de técnicos no encontrado');
                return;
            }
            
            techSelect.innerHTML = '<option value="">Seleccionar técnico</option>';
            technicians.forEach(tech => {
                techSelect.innerHTML += `<option value="${tech.id}">${tech.nombre}</option>`;
            });
            
            console.log(`✅ ${technicians.length} técnicos cargados`);
            
        } catch (error) {
            console.error('❌ Error cargando técnicos:', error);
        }
    },

    /**
     * ✅ MÉTODO: Cargar dispositivos CON DEBUG MEJORADO
     */
    loadDevices: async function() {
        try {
            console.log('🔄 Cargando dispositivos...');
            const response = await fetch('/api/mantenimientos/lista/dispositivos');
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const devices = await response.json();
            const deviceSelect = document.getElementById('maintenance-device');
            
            if (!deviceSelect) {
                console.error('❌ Selector de dispositivos no encontrado');
                return;
            }
            
            console.log('🔍 Dispositivos cargados desde API:', devices);
            
            // Limpiar selector
            deviceSelect.innerHTML = '<option value="">Seleccionar dispositivo</option>';
            
            // Llenar opciones
            devices.forEach(device => {
                const displayName = `${device.tipo_display} - ${device.ubicacion || 'Sin ubicación'} - ${device.nombre} ${device.ip ? `(${device.ip})` : ''}`;
                console.log(`📋 Agregando opción: value="${device.id_unico}" - ${displayName}`);
                
                const option = document.createElement('option');
                option.value = device.id_unico; // ✅ Usar id_unico con prefijo
                option.textContent = displayName;
                option.setAttribute('data-tipo', device.tipo_tabla);
                option.setAttribute('data-id-original', device.id_original);
                deviceSelect.appendChild(option);
            });
            
            console.log(`✅ ${devices.length} dispositivos cargados en el selector`);
            
        } catch (error) {
            console.error('❌ Error cargando dispositivos:', error);
        }
    },

    /**
     * ✅ MÉTODO: Cargar repuestos
     */
    loadSupplies: async function() {
        try {
            const response = await fetch('/api/mantenimientos/lista/repuestos');
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const supplies = await response.json();
            const supplySelect = document.getElementById('maintenance-supply');
            
            if (!supplySelect) {
                console.error('❌ Selector de repuestos no encontrado');
                return;
            }
            
            supplySelect.innerHTML = '<option value="">Sin repuesto</option>';
            supplies.forEach(supply => {
                const displayName = `${supply.nombre} (${supply.cantidad} disponibles)`;
                supplySelect.innerHTML += `<option value="${supply.id}">${displayName}</option>`;
            });
            
            console.log(`✅ ${supplies.length} repuestos cargados`);
            
        } catch (error) {
            console.error('❌ Error cargando repuestos:', error);
        }
    },

    /**
     * ✅ MÉTODO: Cargar mantenimiento para edición
     */
    loadMaintenanceForEdit: async function(maintenanceId) {
        try {
            console.log('🔄 Cargando mantenimiento para edición ID:', maintenanceId);
            
            const response = await fetch(`/api/mantenimientos/${maintenanceId}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Error en la respuesta del servidor');
            }
            
            const maintenance = result.data;
            console.log('✅ Mantenimiento cargado para edición:', maintenance);
            
            this.editingMaintenance = maintenance;
            
            // Cargar selectores primero
            await this.loadFormData();
            
            // Llenar formulario después de cargar selectores
            setTimeout(() => {
                this.fillEditForm(maintenance);
            }, 100);
            
        } catch (error) {
            console.error('❌ Error cargando mantenimiento para edición:', error);
            this.showNotification('Error al cargar datos del mantenimiento: ' + error.message, 'error');
        }
    },

    /**
     * ✅ MÉTODO CORREGIDO: Llenar formulario de edición
     */
    fillEditForm: function(maintenance) {
        try {
            console.log('📝 Llenando formulario con:', maintenance);
            
            // Llenar técnico
            const techSelect = document.getElementById('maintenance-technician');
            if (techSelect && maintenance.id_usuarios) {
                techSelect.value = maintenance.id_usuarios.toString();
                console.log('👤 Técnico seleccionado:', techSelect.value);
            }
            
            // Llenar tipo
            const typeSelect = document.getElementById('maintenance-type');
            if (typeSelect) {
                // ✅ CORRECCIÓN: Usar el método mejorado para obtener el tipo
                const tipo = this.obtenerTipoMantenimiento(maintenance);
                typeSelect.value = tipo;
                console.log('🔧 Tipo seleccionado:', typeSelect.value);
            }
            
            // ✅ CORRECCIÓN CRÍTICA: Llenar dispositivo - BUSCAR EL ID ÚNICO CORRESPONDIENTE
            const deviceSelect = document.getElementById('maintenance-device');
            if (deviceSelect && maintenance.id_dispositivo) {
                console.log('🔍 Buscando dispositivo ID:', maintenance.id_dispositivo);
                
                let dispositivoEncontrado = false;
                
                // Buscar en todas las opciones
                for (let i = 0; i < deviceSelect.options.length; i++) {
                    const option = deviceSelect.options[i];
                    const idOriginal = option.getAttribute('data-id-original');
                    
                    console.log(`🔍 Opción ${i}:`, {
                        value: option.value,
                        idOriginal: idOriginal,
                        text: option.textContent
                    });
                    
                    // Comparar con el ID original del dispositivo
                    if (idOriginal === maintenance.id_dispositivo.toString()) {
                        deviceSelect.value = option.value;
                        dispositivoEncontrado = true;
                        console.log('✅ Dispositivo encontrado y seleccionado:', option.value);
                        break;
                    }
                }
                
                if (!dispositivoEncontrado) {
                    console.warn('⚠️ Dispositivo no encontrado en selector, ID:', maintenance.id_dispositivo);
                    // Crear una opción temporal
                    const tempOption = document.createElement('option');
                    tempOption.value = maintenance.dispositivo_tipo + '_' + maintenance.id_dispositivo;
                    tempOption.textContent = `${maintenance.nombre_dispositivo} (${maintenance.ubicacion_dispositivo}) - ID: ${maintenance.id_dispositivo}`;
                    tempOption.selected = true;
                    deviceSelect.appendChild(tempOption);
                }
            }
            
            // Llenar repuesto
            const supplySelect = document.getElementById('maintenance-supply');
            if (supplySelect) {
                if (maintenance.id_repuesto) {
                    supplySelect.value = maintenance.id_repuesto.toString();
                    console.log('🔩 Repuesto seleccionado:', supplySelect.value);
                } else {
                    supplySelect.value = '';
                }
            }
            
            // Llenar fecha
            if (maintenance.fecha) {
                const dateInput = document.getElementById('maintenance-date');
                if (dateInput) {
                    const fecha = new Date(maintenance.fecha);
                    const formattedDate = fecha.toISOString().split('T')[0];
                    dateInput.value = formattedDate;
                    console.log('📅 Fecha establecida:', dateInput.value);
                }
            }
            
            // Llenar estado
            const statusSelect = document.getElementById('maintenance-status');
            if (statusSelect) {
                statusSelect.value = maintenance.estado || 'Pendiente';
                console.log('📊 Estado establecido:', statusSelect.value);
            }
            
            // Llenar descripción
            const descriptionInput = document.getElementById('maintenance-description');
            if (descriptionInput) {
                descriptionInput.value = maintenance.descripcion || '';
            }
            
            // Llenar observaciones
            const observationsInput = document.getElementById('maintenance-observations');
            if (observationsInput) {
                observationsInput.value = maintenance.observaciones || '';
            }
            
            console.log('✅ Formulario llenado correctamente');
            
        } catch (error) {
            console.error('❌ Error llenando formulario de edición:', error);
        }
    },

    /**
     * ✅ MÉTODO: Validar formulario COMPLETO
     */
    validateMaintenanceForm: function() {
        console.log('🔍 Validando formulario...');
        
        const deviceSelect = document.getElementById('maintenance-device');
        const technicianSelect = document.getElementById('maintenance-technician');
        const typeSelect = document.getElementById('maintenance-type');
        const descriptionInput = document.getElementById('maintenance-description');
        const dateInput = document.getElementById('maintenance-date');
        
        // Debug de todos los campos
        console.log('📋 Estado de los campos:', {
            dispositivo: deviceSelect?.value,
            tecnico: technicianSelect?.value,
            tipo: typeSelect?.value,
            descripcion: descriptionInput?.value,
            fecha: dateInput?.value
        });
        
        let errors = [];
        
        // Validar dispositivo CRÍTICO
        if (!deviceSelect) {
            errors.push('Selector de dispositivos no encontrado');
        } else if (!deviceSelect.value || deviceSelect.value === '' || deviceSelect.value === 'undefined') {
            errors.push('Debe seleccionar un dispositivo');
            deviceSelect.style.borderColor = 'red';
            
            // Debug adicional del selector
            console.error('❌ Selector de dispositivos:', {
                value: deviceSelect.value,
                optionsLength: deviceSelect.options.length,
                selectedIndex: deviceSelect.selectedIndex
            });
        } else {
            deviceSelect.style.borderColor = '';
        }
        
        // Validar otros campos
        if (!technicianSelect || !technicianSelect.value) {
            errors.push('Debe seleccionar un técnico');
            if (technicianSelect) technicianSelect.style.borderColor = 'red';
        } else if (technicianSelect) {
            technicianSelect.style.borderColor = '';
        }
        
        if (!typeSelect || !typeSelect.value) {
            errors.push('Debe seleccionar un tipo de mantenimiento');
            if (typeSelect) typeSelect.style.borderColor = 'red';
        } else if (typeSelect) {
            typeSelect.style.borderColor = '';
        }
        
        if (!descriptionInput || !descriptionInput.value.trim()) {
            errors.push('La descripción es obligatoria');
            if (descriptionInput) descriptionInput.style.borderColor = 'red';
        } else if (descriptionInput) {
            descriptionInput.style.borderColor = '';
        }
        
        if (!dateInput || !dateInput.value) {
            errors.push('La fecha es obligatoria');
            if (dateInput) dateInput.style.borderColor = 'red';
        } else if (dateInput) {
            dateInput.style.borderColor = '';
        }
        
        if (errors.length > 0) {
            console.error('❌ Errores de validación:', errors);
            this.showNotification('❌ ' + errors.join(', '), 'error');
            return false;
        }
        
        console.log('✅ Validación exitosa');
        return true;
    },

    /**
     * ✅ MÉTODO CORREGIDO: Preparar datos antes del envío (compatible con prefijos)
     */
    prepareMaintenanceData: function(formData) {
        const data = Object.fromEntries(formData);
        
        console.log('📝 Datos del formulario original:', data);
        
        // ✅ VALIDACIÓN ESTRICTA DEL DISPOSITIVO
        if (!data.id_dispositivo || 
            data.id_dispositivo === '' || 
            data.id_dispositivo === 'undefined' || 
            data.id_dispositivo === 'null') {
            
            console.error('❌ ERROR: id_dispositivo no válido:', data.id_dispositivo);
            throw new Error('Debe seleccionar un dispositivo válido');
        }
        
        // ✅ CORRECCIÓN: NO convertir a número si tiene prefijo
        // El backend ahora maneja ambos formatos
        if (typeof data.id_dispositivo === 'string' && data.id_dispositivo.includes('_')) {
            console.log('🔧 ID con prefijo detectado, manteniendo como string:', data.id_dispositivo);
            // Mantener como string - el backend lo procesará
        } else {
            // ID numérico antiguo
            const idDispositivoNum = parseInt(data.id_dispositivo);
            if (isNaN(idDispositivoNum)) {
                console.error('❌ ERROR: id_dispositivo no es número válido:', data.id_dispositivo);
                throw new Error('ID de dispositivo no válido: ' + data.id_dispositivo);
            }
            data.id_dispositivo = idDispositivoNum;
        }
        
        // ✅ OBTENER TIPO DE DISPOSITIVO DEL SELECTOR
        const deviceSelect = document.getElementById('maintenance-device');
        if (deviceSelect) {
            const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
            if (selectedOption) {
                data.dispositivo_tipo = selectedOption.getAttribute('data-tipo');
                console.log('📋 Tipo de dispositivo detectado:', data.dispositivo_tipo);
            }
        }
        
        // Manejar otros campos
        if (!data.id_repuesto || data.id_repuesto === '') {
            data.id_repuesto = null;
        } else {
            data.id_repuesto = parseInt(data.id_repuesto);
        }
        
        if (data.id_usuarios && data.id_usuarios !== '') {
            data.id_usuarios = parseInt(data.id_usuarios);
        } else {
            if (this.editingMaintenance) {
                data.id_usuarios = this.editingMaintenance.id_usuarios;
            } else {
                data.id_usuarios = null;
            }
        }
        
        console.log('📝 Datos procesados para envío:', data);
        return data;
    },

    /**
     * ✅ MÉTODO CORREGIDO: Manejar envío del formulario
     */
    handleMaintenanceSubmit: async function(event) {
        event.preventDefault();
        
        const submitBtn = document.getElementById('maintenance-submit-btn');
        const submitText = document.getElementById('maintenance-submit-text');
        const spinner = document.getElementById('maintenance-loading-spinner');
        
        try {
            // ✅ VALIDAR ANTES DE ENVIAR
            if (!this.validateMaintenanceForm()) {
                return;
            }
            
            // Mostrar estado de carga
            submitBtn.disabled = true;
            submitText.textContent = 'Guardando...';
            if (spinner) spinner.style.display = 'inline-block';
            
            const formData = new FormData(event.target);
            const maintenanceData = this.prepareMaintenanceData(formData);
            
            console.log('📤 Enviando datos para:', this.editingMaintenance ? 'EDICIÓN' : 'CREACIÓN', maintenanceData);
            
            let url = '/api/mantenimientos';
            let method = 'POST';
            
            if (this.editingMaintenance) {
                url = `/api/mantenimientos/${this.editingMaintenance.id}`;
                method = 'PUT';
            }
            
            console.log(`🔄 Enviando ${method} a: ${url}`, maintenanceData);
            
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(maintenanceData)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || `Error ${response.status}: ${response.statusText}`);
            }
            
            if (result.success) {
                this.showNotification(
                    this.editingMaintenance ? '✅ Mantenimiento actualizado correctamente' : '✅ Mantenimiento registrado correctamente', 
                    'success'
                );
                
                this.closeModal();
                this.loadMaintenanceData();
                
                // Recargar dashboard si estamos en la página principal
                if (window.location.pathname === '/dashboard') {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            } else {
                throw new Error(result.message || 'Error desconocido al guardar');
            }
            
        } catch (error) {
            console.error('❌ Error guardando mantenimiento:', error);
            this.showNotification('Error al guardar mantenimiento: ' + error.message, 'error');
        } finally {
            // Restaurar estado del botón
            submitBtn.disabled = false;
            submitText.textContent = this.editingMaintenance ? 'Actualizar' : 'Guardar';
            if (spinner) spinner.style.display = 'none';
        }
    },

    /**
     * ✅ MÉTODO: Editar mantenimiento
     */
    editMaintenance: function(maintenanceId) {
        this.openMaintenanceModal(maintenanceId);
    },

    /**
     * ✅ MÉTODO: Eliminar mantenimiento
     */
    deleteMaintenance: async function(maintenanceId) {
        if (!confirm('¿Está seguro que desea eliminar este mantenimiento?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/mantenimientos/${maintenanceId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ Mantenimiento eliminado', 'success');
                this.loadMaintenanceData();
                
                // Recargar dashboard si estamos en la página principal
                if (window.location.pathname === '/dashboard') {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('❌ Error eliminando:', error);
            this.showNotification('Error al eliminar mantenimiento', 'error');
        }
    },

    /**
     * ✅ MÉTODO: Cerrar modal
     */
    closeModal: function() {
        const modal = document.getElementById('maintenanceModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingMaintenance = null;
        this.resetForm();
    },

    /**
     * ✅ MÉTODO: Mostrar estado de carga
     */
    showLoadingState: function(section) {
        const container = document.getElementById(`${section}-table-body`);
        if (container) {
            container.innerHTML = '<tr><td colspan="7" class="loading">Cargando datos...</td></tr>';
        }
    },
    
    /**
     * ✅ MÉTODO: Mostrar error
     */
    showError: function(section, message) {
        const container = document.getElementById(`${section}-table-body`);
        if (container) {
            container.innerHTML = `<tr><td colspan="7" class="error">${message}</td></tr>`;
        }
    },

    /**
     * ✅ MÉTODO: Mostrar notificación
     */
    showNotification: function(message, type = 'info') {
        // Usar Utils si está disponible
        if (window.Utils && window.Utils.showNotification) {
            window.Utils.showNotification(message, type);
            return;
        }
        
        // Sistema de notificaciones alternativo
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 400px;
        `;
        
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },

    /**
     * ✅ NUEVO MÉTODO: Registrar nuevo mantenimiento (para botones externos)
     */
    registerNewMaintenance: function() {
        this.openMaintenanceModal();
    },

    /**
     * ✅ NUEVO MÉTODO: Obtener estadísticas de mantenimientos
     */
    getMaintenanceStats: async function() {
        try {
            const response = await fetch('/api/mantenimientos');
            if (!response.ok) {
                throw new Error('Error al cargar estadísticas');
            }
            
            const mantenimientos = await response.json();
            
            const stats = {
                total: mantenimientos.length,
                pendientes: mantenimientos.filter(m => m.estado === 'Pendiente').length,
                enProgreso: mantenimientos.filter(m => m.estado === 'En Progreso').length,
                completados: mantenimientos.filter(m => m.estado === 'Completado').length,
                porTipo: {}
            };
            
            // Agrupar por tipo usando el método mejorado
            mantenimientos.forEach(m => {
                const tipo = this.obtenerTipoMantenimiento(m);
                if (!stats.porTipo[tipo]) {
                    stats.porTipo[tipo] = 0;
                }
                stats.porTipo[tipo]++;
            });
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return null;
        }
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Inicializando MaintenanceManager...');
    MaintenanceManager.init();
});

// Hacer disponible globalmente
window.MaintenanceManager = MaintenanceManager;