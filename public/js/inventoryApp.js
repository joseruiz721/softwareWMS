// ==============================================
// MÓDULO PRINCIPAL: InventoryApp - Aplicación principal
// ==============================================

const InventoryApp = {
    // ==============================================
    // VARIABLES DE ESTADO Y CONFIGURACIÓN
    // ==============================================
    
    currentData: {
        devices: {},
        supplies: []
    },
    
    currentTable: 'ordenadores',
    currentUser: null,
    currentSupplyCategory: 'todos',
    searchTimeout: null,
    editingDevice: null,
    searchResults: [],
    selectedResultIndex: -1,
    
    deviceTypes: {
        ordenadores: {
            name: 'Ordenadores',
            table: 'ordenadores',
            fields: ['id', 'ip', 'ubicacion', 'activo', 'serial', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuario_responsable', 'marca', 'activo_fijo']
        },
        access_point: {
            name: 'Access Point',
            table: 'access_point',
            fields: ['id', 'ip', 'ubicacion', 'serial', 'modelo', 'version', 'arquitectura', 'mac', 'estado', 'fecha_ingreso', 'observacion', 'id_usuarios_responsable', 'activo_fijo']
        },
        readers: {
            name: 'Readers',
            table: 'readers',
            fields: ['id', 'ip', 'ubicacion', 'no_maquina', 'serial', 'mac', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuario_responsable', 'activo_fijo']
        },
        etiquetadoras: {
            name: 'Etiquetadoras',
            table: 'etiquetadoras',
            fields: ['id', 'ip', 'ubicacion', 'activo', 'serial', 'modelo', 'serial_aplicador', 'mac', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuarios_responsable', 'activo_fijo']
        },
        tablets: {
            name: 'Tablets',
            table: 'tablets',
            fields: ['id', 'ip', 'ubicacion', 'no_maquina', 'activo', 'serial', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuario_responsable', 'activo_fijo']
        },
        lectores_qr: {
            name: 'Lectores QR',
            table: 'lectores_qr',
            fields: ['id', 'ubicacion', 'activo', 'modelo', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuarios_responsable', 'activo_fijo']
        }
    },

    supplyCategories: {
        todos: {
            name: 'Todos',
            filter: () => true
        },
        bajo_stock: {
            name: 'Bajo Stock',
            filter: supply => {
                const cantidad = parseInt(supply.cantidad) || 0;
                const minimo = parseInt(supply.stock_minimo) || 0;
                return cantidad > 0 && cantidad <= minimo;
            }
        },
        agotados: {
            name: 'Agotados',
            filter: supply => (parseInt(supply.cantidad) || 0) === 0
        }
    },

    // ==============================================
    // MÉTODOS DE INICIALIZACIÓN
    // ==============================================

    init: function() {
        this.loadUserData();
        this.loadDashboardStats();
        this.setupEventListeners();
        this.setupEnhancedSearch();
        this.setupEditModal();
        
        console.log('✅ InventoryApp inicializado');
    },

    // ==============================================
    // MÉTODOS DE BÚSQUEDA MEJORADA
    // ==============================================

    setupEnhancedSearch: function() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput || !searchResults) return;
        
        // Evento focus
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2 && this.searchResults.length > 0) {
                searchResults.classList.add('show');
            }
        });
        
        // Cerrar resultados al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                this.hideSearchResults();
            }
        });
        
        // Búsqueda en tiempo real
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const term = e.target.value.trim();
            
            if (term.length >= 2) {
                this.searchTimeout = setTimeout(() => {
                    this.performEnhancedSearch(term);
                }, 300);
            } else {
                this.hideSearchResults();
                this.searchResults = [];
                this.selectedResultIndex = -1;
            }
        });
        
        // Navegación con teclado
        searchInput.addEventListener('keydown', (e) => {
            if (!searchResults.classList.contains('show')) return;
            
            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateSearchResults(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateSearchResults(-1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.selectSearchResult();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideSearchResults();
                    break;
            }
        });
    },

    performEnhancedSearch: async function(term) {
        try {
            const results = await ApiService.searchAdvanced(term);
            this.searchResults = results;
            this.selectedResultIndex = -1;
            this.displayEnhancedSearchResults(results);
            
        } catch (error) {
            console.error('Error en búsqueda mejorada:', error);
            this.displaySearchError('Error al realizar la búsqueda');
        }
    },

    displayEnhancedSearchResults: function(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        if (!results || results.length === 0) {
            container.innerHTML = `
                <div class="search-result-category">
                    <div class="category-header">
                        <i class="fas fa-search"></i>
                        <span>No se encontraron resultados</span>
                    </div>
                    <div class="no-results">
                        Intenta con otros términos de búsqueda
                    </div>
                </div>
            `;
            container.classList.add('show');
            return;
        }

        // Agrupar resultados por tipo
        const groupedResults = this.groupSearchResults(results);
        
        container.innerHTML = this.buildSearchResultsHTML(groupedResults);
        container.classList.add('show');
    },

    groupSearchResults: function(results) {
        const grouped = {
            dispositivos: [],
            repuestos: [],
            mantenimientos: []
        };
        
        results.forEach(item => {
            if (item.tipo && grouped[item.tipo.toLowerCase()]) {
                grouped[item.tipo.toLowerCase()].push(item);
            } else if (item.tipo === 'Repuesto') {
                grouped.repuestos.push(item);
            } else {
                grouped.dispositivos.push(item);
            }
        });
        
        return grouped;
    },

    buildSearchResultsHTML: function(groupedResults) {
        let html = '';
        
        // Dispositivos
        if (groupedResults.dispositivos.length > 0) {
            html += this.buildCategoryHTML('dispositivos', 'fa-desktop', 'Dispositivos', groupedResults.dispositivos);
        }
        
        // Repuestos
        if (groupedResults.repuestos.length > 0) {
            html += this.buildCategoryHTML('repuestos', 'fa-box', 'Repuestos', groupedResults.repuestos);
        }
        
        // Mantenimientos
        if (groupedResults.mantenimientos.length > 0) {
            html += this.buildCategoryHTML('mantenimientos', 'fa-tools', 'Mantenimientos', groupedResults.mantenimientos);
        }
        
        return html;
    },

    buildCategoryHTML: function(category, icon, title, items) {
        return `
            <div class="search-result-category">
                <div class="category-header">
                    <i class="fas ${icon}"></i>
                    <span>${title} (${items.length})</span>
                </div>
                <div class="category-results">
                    ${items.map((item, index) => this.buildResultItemHTML(item, category, index)).join('')}
                </div>
            </div>
        `;
    },

    buildResultItemHTML: function(item, category, index) {
        const isSelected = this.selectedResultIndex === index;
        const selectedClass = isSelected ? 'selected' : '';
        
        let details = '';
        let actionText = 'Editar';
        let actionIcon = 'fa-edit';
        
        switch(category) {
            case 'dispositivos':
                details = this.buildDeviceDetails(item);
                break;
            case 'repuestos':
                details = this.buildSupplyDetails(item);
                break;
            case 'mantenimientos':
                details = this.buildMaintenanceDetails(item);
                actionText = 'Ver';
                actionIcon = 'fa-eye';
                break;
        }
        
        return `
            <div class="search-result-item ${selectedClass}" 
                 data-id="${item.id}" 
                 data-type="${category}"
                 data-index="${index}"
                 onclick="InventoryApp.handleSearchResultClick('${category}', ${item.id}, '${item.tipo_detalle || item.tipo}')">
                <div class="result-main">
                    <div class="result-icon">
                        <i class="fas ${this.getCategoryIcon(category)}"></i>
                    </div>
                    <div class="result-content">
                        <div class="result-title">${item.nombre || item.serial || 'Sin nombre'}</div>
                        <div class="result-details">${details}</div>
                    </div>
                </div>
                <div class="result-actions">
                    <button class="btn-action btn-edit" 
                            onclick="event.stopPropagation(); InventoryApp.handleSearchResultClick('${category}', ${item.id}, '${item.tipo_detalle || item.tipo}')"
                            title="${actionText}">
                        <i class="fas ${actionIcon}"></i>
                        <span>${actionText}</span>
                    </button>
                </div>
            </div>
        `;
    },

    buildDeviceDetails: function(device) {
        const details = [];
        if (device.serial) details.push(`Serial: ${device.serial}`);
        if (device.ip) details.push(`IP: ${device.ip}`);
        if (device.ubicacion) details.push(`Ubicación: ${device.ubicacion}`);
        if (device.estado) details.push(`Estado: ${device.estado}`);
        
        return details.join(' • ') || 'Dispositivo sin detalles adicionales';
    },

    buildSupplyDetails: function(supply) {
        const details = [];
        if (supply.codigo) details.push(`Código: ${supply.codigo}`);
        if (supply.cantidad !== undefined) details.push(`Stock: ${supply.cantidad}`);
        if (supply.stock_minimo !== undefined) details.push(`Mínimo: ${supply.stock_minimo}`);
        if (supply.ubicacion) details.push(`Ubicación: ${supply.ubicacion}`);
        
        return details.join(' • ') || 'Repuesto sin detalles adicionales';
    },

    buildMaintenanceDetails: function(maintenance) {
        const details = [];
        if (maintenance.tipo) details.push(`Tipo: ${maintenance.tipo}`);
        if (maintenance.estado) details.push(`Estado: ${maintenance.estado}`);
        if (maintenance.fecha) details.push(`Fecha: ${Utils.formatDate(maintenance.fecha)}`);
        
        return details.join(' • ') || 'Mantenimiento sin detalles adicionales';
    },

    getCategoryIcon: function(category) {
        const icons = {
            dispositivos: 'fa-desktop',
            repuestos: 'fa-box',
            mantenimientos: 'fa-tools'
        };
        return icons[category] || 'fa-search';
    },

    navigateSearchResults: function(direction) {
        if (this.searchResults.length === 0) return;
        
        const newIndex = this.selectedResultIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.searchResults.length) {
            this.selectedResultIndex = newIndex;
            this.updateSelectedResult();
        }
    },

    updateSelectedResult: function() {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedResultIndex);
        });
    },

    selectSearchResult: function() {
        if (this.selectedResultIndex >= 0 && this.selectedResultIndex < this.searchResults.length) {
            const result = this.searchResults[this.selectedResultIndex];
            this.handleSearchResultClick(result.tipo.toLowerCase(), result.id, result.tipo_detalle || result.tipo);
        } else if (this.searchResults.length > 0) {
            // Seleccionar el primer resultado si no hay selección
            const result = this.searchResults[0];
            this.handleSearchResultClick(result.tipo.toLowerCase(), result.id, result.tipo_detalle || result.tipo);
        }
    },

    handleSearchResultClick: async function(category, id, detailType) {
        console.log(`🔍 Navegando a: ${category} - ID: ${id} - Tipo: ${detailType}`);
        
        this.hideSearchResults();
        document.getElementById('searchInput').value = '';
        
        try {
            switch(category) {
                case 'dispositivos':
                    await this.navigateToDeviceEdit(detailType, id);
                    break;
                case 'repuestos':
                    await this.navigateToSupplyEdit(id);
                    break;
                case 'mantenimientos':
                    await this.navigateToMaintenanceView(id);
                    break;
                default:
                    console.warn('Tipo de resultado no reconocido:', category);
            }
        } catch (error) {
            console.error('Error al navegar al resultado:', error);
            this.showNotification('Error al acceder al elemento seleccionado', 'error');
        }
    },

    navigateToDeviceEdit: async function(deviceType, deviceId) {
        // Mostrar la sección de estadísticas de dispositivos
        this.showSection('estadisticas-section');
        
        // Cambiar a la tabla correspondiente
        const normalizedType = this.normalizeDeviceType(deviceType);
        if (normalizedType && this.deviceTypes[normalizedType]) {
            this.switchDeviceTable(normalizedType);
            
            // Esperar a que la tabla se cargue y luego editar el dispositivo
            setTimeout(async () => {
                await this.editDevice(normalizedType, deviceId);
            }, 500);
        } else {
            this.showNotification('Tipo de dispositivo no reconocido', 'warning');
        }
    },

    navigateToSupplyEdit: async function(supplyId) {
        // Mostrar la sección de inventario de repuestos
        this.showSection('estadisticas-insumos-section');
        await this.loadSuppliesStats();
        
        // Aquí podrías implementar la edición directa del repuesto
        this.showNotification(`Repuesto seleccionado (ID: ${supplyId}). Implementar edición directa.`, 'info');
        
        // Scroll to the specific supply in the table
        this.highlightTableRow('supplies-table-body', supplyId);
    },

    navigateToMaintenanceView: async function(maintenanceId) {
        // Mostrar la sección de control de mantenimientos
        this.showSection('control-mantenimientos-section');
        
        // Aquí podrías implementar la visualización directa del mantenimiento
        this.showNotification(`Mantenimiento seleccionado (ID: ${maintenanceId}). Implementar visualización directa.`, 'info');
        
        // Scroll to the specific maintenance in the table
        this.highlightTableRow('maintenance-table-body', maintenanceId);
    },

    normalizeDeviceType: function(deviceType) {
        const typeMap = {
            'ordenador': 'ordenadores',
            'access point': 'access_point',
            'reader': 'readers',
            'etiquetadora': 'etiquetadoras',
            'tablet': 'tablets',
            'lector qr': 'lectores_qr'
        };
        
        return typeMap[deviceType.toLowerCase()] || deviceType.toLowerCase();
    },

    highlightTableRow: function(tableBodyId, itemId) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.getAttribute('data-id') === itemId.toString()) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.style.backgroundColor = '#e3f2fd';
                setTimeout(() => {
                    row.style.backgroundColor = '';
                }, 3000);
            }
        });
    },

    hideSearchResults: function() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.classList.remove('show');
        }
        this.selectedResultIndex = -1;
    },

    displaySearchError: function(message) {
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = `
                <div class="search-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${message}</span>
                </div>
            `;
            container.classList.add('show');
        }
    },

    // ==============================================
    // MÉTODOS DE CARGA DE DATOS (sin cambios)
    // ==============================================

    loadAllData: async function() {
        try {
            this.showLoadingState('devices');
            
            const [devices, supplies] = await Promise.all([
                this.fetchDevicesData(),
                this.fetchSuppliesData()
            ]);
            
            this.currentData.devices = devices;
            this.currentData.supplies = supplies;
            
            this.updateDeviceTable(this.currentData.devices[this.currentTable]);
            
            if (window.ChartsManager) {
                window.ChartsManager.updateCharts(this.currentData.devices);
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('devices', 'Error al cargar los datos: ' + error.message);
        }
    },
    
    loadDashboardStats: async function() {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) throw new Error('Error al cargar estadísticas');
            
            const stats = await response.json();
            this.updateStatsUI(stats);
            
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            const mainStats = document.getElementById('main-stats');
            if (mainStats) {
                mainStats.innerHTML = `
                    <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--accent-color);">
                        Error al cargar las estadísticas. Intente nuevamente.
                    </div>
                `;
            }
        }
    },

    loadSuppliesStats: async function() {
        try {
            this.showLoadingState('supplies');
            
            if (!this.currentData.supplies || this.currentData.supplies.length === 0) {
                this.currentData.supplies = await this.fetchSuppliesData();
            }
            
            if (window.SuppliesTableManager) {
                window.SuppliesTableManager.updateSuppliesTable(this.currentData.supplies);
            } else {
                this.updateSuppliesTable(this.currentData.supplies);
            }
            
            if (window.ChartsManager) {
                window.ChartsManager.updateSuppliesCharts(this.currentData.supplies);
            }
            
        } catch (error) {
            console.error('Error loading supplies stats:', error);
            this.showError('supplies', 'Error al cargar estadísticas de repuestos: ' + error.message);
        }
    },

    fetchDevicesData: async function() {
        const deviceTypes = Object.keys(this.deviceTypes);
        const requests = deviceTypes.map(type => 
            fetch(`/api/dispositivos/${this.deviceTypes[type].table}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Error al cargar ${this.deviceTypes[type].name}`);
                    return res.json();
                })
                .catch(error => {
                    console.error(`Error fetching ${type}:`, error);
                    return [];
                })
        );
        
        const results = await Promise.all(requests);
        return deviceTypes.reduce((acc, type, index) => {
            acc[type] = results[index] || [];
            return acc;
        }, {});
    },
    
    fetchSuppliesData: async function() {
        try {
            const response = await fetch('/api/repuestos');
            if (!response.ok) throw new Error('Error al cargar repuestos');
            return await response.json();
        } catch (error) {
            console.error('Error fetching supplies:', error);
            this.showError('supplies', 'Error al cargar repuestos');
            return [];
        }
    },

    // ==============================================
    // MÉTODOS DE INTERFAZ DE USUARIO (sin cambios)
    // ==============================================

    updateStatsUI: function(stats) {
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('active-devices', stats.activeDevices);
        updateElement('total-supplies', stats.totalSupplies);
        updateElement('today-alerts', stats.todayAlerts);
        updateElement('active-techs', stats.activeTechs);
    },

    updateDeviceTable: function(devices) {
        const tableBody = document.getElementById('devices-table-body');
        if (!tableBody) return;
        
        if (!devices || devices.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">No hay dispositivos registrados</td></tr>';
            return;
        }
        
        tableBody.innerHTML = devices.map(device => {
            const statusClass = this.getStatusClass(device.estado);
            
            const fields = {
                serial: device.serial || 'No especificado',
                ip: device.ip || 'N/A',
                ubicacion: device.ubicacion || 'No especificada',
                activo_fijo: device.activo_fijo || 'No asignado',
                estado: device.estado || 'Desconocido',
                observaciones: device.observaciones || device.observacion || 'Ninguna'
            };
            
            return `
                <tr data-id="${device.id}">
                    <td>${fields.serial}</td>
                    <td>${fields.ip}</td>
                    <td>${fields.ubicacion}</td>
                    <td>${fields.activo_fijo}</td>
                    <td><span class="status-badge ${statusClass}">${fields.estado}</span></td>
                    <td>${fields.observaciones}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="InventoryApp.editDevice('${this.currentTable}', ${device.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="InventoryApp.deleteDevice('${this.currentTable}', ${device.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    updateSuppliesTable: function(supplies) {
        const tableBody = document.getElementById('supplies-table-body');
        if (!tableBody) return;
        
        const filteredSupplies = this.applySupplyFilters(supplies);
        
        if (!filteredSupplies || filteredSupplies.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No hay repuestos registrados</td></tr>';
            return;
        }
        
        tableBody.innerHTML = filteredSupplies.map(supply => {
            const statusClass = this.getSupplyStatusClass(supply);
            
            return `
                <tr data-id="${supply.id}">
                    <td>${supply.nombre || 'No especificado'}</td>
                    <td>${supply.codigo || 'No especificado'}</td>
                    <td>${supply.cantidad || 0}</td>
                    <td>${supply.stock_minimo || 0}</td>
                    <td class="${statusClass}">${this.getSupplyStatusText(supply)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action btn-edit" onclick="alert('Editar repuesto: ${supply.nombre}')" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="alert('Eliminar repuesto: ${supply.nombre}')" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ==============================================
    // MÉTODOS DE EDICIÓN Y ELIMINACIÓN (sin cambios)
    // ==============================================

    editDevice: async function(tipo, id) {
        try {
            console.log(`✏️ Editando dispositivo tipo: ${tipo}, ID: ${id}`);
            
            const response = await fetch(`/api/dispositivos/${tipo}/${id}`);
            if (!response.ok) throw new Error('Error al obtener datos del dispositivo');
            
            const result = await response.json();
            
            if (!result.success && !result.id) {
                throw new Error(result.message || 'Error en la respuesta del servidor');
            }
            
            // Manejar tanto el formato antiguo como el nuevo
            const device = result.success ? result.data : result;
            this.editingDevice = { tipo, id, data: device };
            
            this.showEditModal(device, tipo);
            
        } catch (error) {
            console.error('Error al cargar dispositivo para editar:', error);
            this.showNotification('Error al cargar datos del dispositivo: ' + error.message, 'error');
        }
    },

    showEditModal: function(device, tipo) {
        const modal = document.getElementById('editModal');
        const formFields = document.getElementById('editFormFields');
        
        if (!modal || !formFields) {
            console.error('❌ Elementos del modal de edición no encontrados');
            this.showNotification('Error: Modal de edición no disponible', 'error');
            return;
        }
        
        const fieldsConfig = this.getEditFieldsConfig(tipo);
        
        formFields.innerHTML = fieldsConfig.map(field => {
            const value = device[field.name] || '';
            let fieldHtml = '';
            
            if (field.type === 'select' && field.options) {
                const options = field.options.map(opt => 
                    `<option value="${opt.value}" ${String(value) === String(opt.value) ? 'selected' : ''}>${opt.label}</option>`
                ).join('');
                fieldHtml = `
                    <div class="form-group">
                        <label for="edit-${field.name}">${field.label}</label>
                        <select id="edit-${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
                            <option value="">Seleccionar...</option>
                            ${options}
                        </select>
                    </div>
                `;
            } else if (field.type === 'textarea') {
                fieldHtml = `
                    <div class="form-group">
                        <label for="edit-${field.name}">${field.label}</label>
                        <textarea id="edit-${field.name}" name="${field.name}" rows="3" 
                                  ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">${value}</textarea>
                    </div>
                `;
            } else {
                const inputValue = field.type === 'date' && value ? 
                    new Date(value).toISOString().split('T')[0] : 
                    value;
                    
                fieldHtml = `
                    <div class="form-group">
                        <label for="edit-${field.name}">${field.label}</label>
                        <input type="${field.type}" id="edit-${field.name}" name="${field.name}" 
                               value="${inputValue}" ${field.required ? 'required' : ''} 
                               placeholder="${field.placeholder || ''}">
                    </div>
                `;
            }
            
            return fieldHtml;
        }).join('');
        
        // Mostrar el modal
        modal.style.display = 'block';
    },

    getEditFieldsConfig: function(tipo) {
        const baseFields = [
            { name: 'ubicacion', label: 'Ubicación', type: 'text', required: true, placeholder: 'Ej: Bodega Principal' },
            { name: 'estado', label: 'Estado', type: 'select', required: true, options: [
                { value: 'Activo', label: 'Activo' },
                { value: 'En reparación', label: 'En reparación' },
                { value: 'Dañado', label: 'Dañado' },
                { value: 'Retirado', label: 'Retirado' },
                { value: 'Standby', label: 'Standby' }
            ]},
            { name: 'observaciones', label: 'Observaciones', type: 'textarea', required: false, placeholder: 'Observaciones adicionales...' }
        ];

        const specificFields = {
            ordenadores: [
                { name: 'ip', label: 'Dirección IP', type: 'text', required: false, placeholder: 'Ej: 192.168.1.100' },
                { name: 'serial', label: 'Número de Serie', type: 'text', required: true, placeholder: 'Número de serie del equipo' },
                { name: 'activo_fijo', label: 'Activo Fijo', type: 'text', required: true, placeholder: 'Código de activo fijo' },
                { name: 'marca', label: 'Marca', type: 'text', required: false, placeholder: 'Ej: Dell, HP, Lenovo' }
            ],
            access_point: [
                { name: 'ip', label: 'Dirección IP', type: 'text', required: true, placeholder: 'Ej: 192.168.1.50' },
                { name: 'serial', label: 'Número de Serie', type: 'text', required: true, placeholder: 'Número de serie del access point' },
                { name: 'activo_fijo', label: 'Activo Fijo', type: 'text', required: true, placeholder: 'Código de activo fijo' },
                { name: 'modelo', label: 'Modelo', type: 'text', required: false, placeholder: 'Modelo del equipo' },
                { name: 'version', label: 'Versión', type: 'text', required: false, placeholder: 'Versión del firmware' },
                { name: 'arquitectura', label: 'Arquitectura', type: 'text', required: false, placeholder: 'Arquitectura del equipo' },
                { name: 'mac', label: 'Dirección MAC', type: 'text', required: false, placeholder: 'Dirección MAC' }
            ],
            readers: [
                { name: 'ip', label: 'Dirección IP', type: 'text', required: true, placeholder: 'Ej: 192.168.1.60' },
                { name: 'serial', label: 'Número de Serie', type: 'text', required: true, placeholder: 'Número de serie del reader' },
                { name: 'activo_fijo', label: 'Activo Fijo', type: 'text', required: true, placeholder: 'Código de activo fijo' },
                { name: 'no_maquina', label: 'Número de Máquina', type: 'text', required: false, placeholder: 'Número interno de máquina' },
                { name: 'mac', label: 'Dirección MAC', type: 'text', required: false, placeholder: 'Dirección MAC' }
            ],
            etiquetadoras: [
                { name: 'ip', label: 'Dirección IP', type: 'text', required: true, placeholder: 'Ej: 192.168.1.70' },
                { name: 'serial', label: 'Número de Serie', type: 'text', required: true, placeholder: 'Número de serie de la etiquetadora' },
                { name: 'activo_fijo', label: 'Activo Fijo', type: 'text', required: true, placeholder: 'Código de activo fijo' },
                { name: 'modelo', label: 'Modelo', type: 'text', required: false, placeholder: 'Modelo de la etiquetadora' },
                { name: 'serial_aplicador', label: 'Serial Aplicador', type: 'text', required: false, placeholder: 'Serial del aplicador' },
                { name: 'mac', label: 'Dirección MAC', type: 'text', required: false, placeholder: 'Dirección MAC' }
            ],
            tablets: [
                { name: 'ip', label: 'Dirección IP', type: 'text', required: true, placeholder: 'Ej: 192.168.1.80' },
                { name: 'serial', label: 'Número de Serie', type: 'text', required: true, placeholder: 'Número de serie de la tablet' },
                { name: 'activo_fijo', label: 'Activo Fijo', type: 'text', required: true, placeholder: 'Código de activo fijo' },
                { name: 'no_maquina', label: 'Número de Máquina', type: 'text', required: false, placeholder: 'Número interno de máquina' }
            ],
            lectores_qr: [
                { name: 'serial', label: 'Número de Serie', type: 'text', required: true, placeholder: 'Número de serie del lector QR' },
                { name: 'activo_fijo', label: 'Activo Fijo', type: 'text', required: true, placeholder: 'Código de activo fijo' },
                { name: 'modelo', label: 'Modelo', type: 'text', required: false, placeholder: 'Modelo del lector QR' }
            ]
        };

        return [...(specificFields[tipo] || []), ...baseFields];
    },

    handleEditSubmit: async function(event) {
        event.preventDefault();
        
        if (!this.editingDevice) {
            this.showNotification('Error: No hay dispositivo en edición', 'error');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            submitBtn.disabled = true;

            const formData = new FormData(event.target);
            const updates = {};
            
            for (let [key, value] of formData.entries()) {
                if (value !== '') {
                    updates[key] = value;
                }
            }
            
            console.log('📤 Actualizando dispositivo:', {
                tipo: this.editingDevice.tipo,
                id: this.editingDevice.id,
                updates: updates
            });
            
            const response = await fetch(`/api/dispositivos/${this.editingDevice.tipo}/${this.editingDevice.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ Dispositivo actualizado con éxito', 'success');
                this.closeEditModal();
                
                // Recargar los datos actualizados
                await this.loadAllData();
            } else {
                throw new Error(result.message || 'Error desconocido al actualizar');
            }
            
        } catch (error) {
            console.error('❌ Error al actualizar dispositivo:', error);
            this.showNotification('❌ Error al actualizar dispositivo: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    },

    deleteDevice: async function(tipo, id) {
        if (!confirm('¿Está seguro que desea eliminar este dispositivo? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/dispositivos/${tipo}/${id}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('✅ Dispositivo eliminado con éxito', 'success');
                this.loadAllData();
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('Error al eliminar dispositivo:', error);
            this.showNotification('❌ Error al eliminar dispositivo: ' + error.message, 'error');
        }
    },

    closeEditModal: function() {
        const modal = document.getElementById('editModal');
        if (modal) {
            modal.style.display = 'none';
            this.editingDevice = null;
            
            // Limpiar formulario
            const form = document.getElementById('editForm');
            if (form) {
                form.reset();
            }
        }
    },

    // ==============================================
    // MÉTODOS DE NOTIFICACIÓN (sin cambios)
    // ==============================================

    showNotification: function(message, type = 'info') {
        // Usar el sistema de notificaciones existente si está disponible
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

    // ==============================================
    // MÉTODOS AUXILIARES DE INTERFAZ (sin cambios)
    // ==============================================

    showLoadingState: function(section) {
        const container = document.getElementById(`${section}-table-body`);
        if (container) {
            container.innerHTML = '<tr><td colspan="10" class="loading">Cargando datos...</td></tr>';
        }
    },
    
    showError: function(section, message) {
        const container = document.getElementById(`${section}-table-body`);
        if (container) {
            container.innerHTML = `<tr><td colspan="10" class="error">${message}</td></tr>`;
        }
    },

    showMainDashboard: function() {
        const sections = [
            'main-stats',
            'estadisticas-section',
            'estadisticas-insumos-section',
            'control-mantenimientos-section'
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = sectionId === 'main-stats' ? 'grid' : 'none';
            }
        });
        
        this.loadDashboardStats();
    },

    // ==============================================
    // MÉTODOS DE NAVEGACIÓN (sin cambios)
    // ==============================================

    switchDeviceTable: function(deviceType) {
        if (!this.deviceTypes[deviceType]) return;
        
        this.currentTable = deviceType;
        
        document.querySelectorAll('.device-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `btn-${deviceType}`);
        });
        
        if (this.currentData.devices[deviceType]) {
            this.updateDeviceTable(this.currentData.devices[deviceType]);
        } else {
            this.loadAllData();
        }
    },

    switchSupplyCategory: function(category) {
        if (!this.supplyCategories[category]) return;
        
        this.currentSupplyCategory = category;
        
        document.querySelectorAll('.supply-category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `btn-${category}`);
        });
        
        if (this.currentData.supplies) {
            if (window.SuppliesTableManager) {
                window.SuppliesTableManager.updateSuppliesTable(this.currentData.supplies);
            } else {
                this.updateSuppliesTable(this.currentData.supplies);
            }
        }
    },

    // ==============================================
    // MÉTODOS DE UTILIDAD (sin cambios)
    // ==============================================

    getStatusClass: function(status) {
        if (!status) return 'status-unknown';
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('activo')) return 'status-active';
        if (statusLower.includes('reparación') || statusLower.includes('mantenimiento')) 
            return 'status-maintenance';
        if (statusLower.includes('dañado') || statusLower.includes('error')) 
            return 'status-error';
        if (statusLower.includes('retirado')) return 'status-inactive';
        if (statusLower.includes('standby')) return 'status-warning';
        return 'status-unknown';
    },

    getSupplyStatusClass: function(supply) {
        const cantidad = parseInt(supply.cantidad) || 0;
        const minimo = parseInt(supply.stock_minimo) || 0;
        
        if (cantidad === 0) return 'status-error';
        if (cantidad <= minimo) return 'status-warning';
        return 'status-active';
    },

    getSupplyStatusText: function(supply) {
        const cantidad = parseInt(supply.cantidad) || 0;
        const minimo = parseInt(supply.stock_minimo) || 0;
        
        if (cantidad === 0) return 'Agotado';
        if (cantidad <= minimo) return 'Bajo Stock';
        return 'Disponible';
    },

    applySupplyFilters: function(supplies) {
        const filterFn = this.supplyCategories[this.currentSupplyCategory]?.filter;
        return filterFn ? supplies.filter(filterFn) : supplies;
    },

    // ==============================================
    // MÉTODOS DE MODALES (sin cambios)
    // ==============================================

    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    showExportModal: function() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },

    exportInventory: async function(format) {
        try {
            const response = await fetch('/api/dashboard/exportar-excel');
            
            if (!response.ok) {
                throw new Error('Error al exportar');
            }
            
            const blob = await response.blob();
            
            if (window.Utils && window.Utils.downloadFile) {
                window.Utils.downloadFile(blob, 'inventario.xlsx', 
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            } else {
                // Método alternativo de descarga
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'inventario.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
            
            this.closeModal('exportModal');
            this.showNotification('✅ Inventario exportado con éxito', 'success');
            
        } catch (error) {
            console.error('Error al exportar:', error);
            this.showNotification('❌ Error al exportar inventario', 'error');
        }
    },

    // ==============================================
    // MÉTODOS DE USUARIO (sin cambios)
    // ==============================================

    loadUserData: async function() {
        try {
            const response = await fetch('/api/usuarios/perfil', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.data;
                console.log('Datos de usuario cargados:', this.currentUser);
            } else {
                throw new Error(data.message || 'Error al obtener perfil');
            }
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
            this.showNotification('Error al cargar perfil', 'error');
        }
    },

    handleLogout: async function() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '/';
        }
    },

    // ==============================================
    // CONFIGURACIÓN DE EVENTOS (actualizada)
    // ==============================================

    setupEventListeners: function() {
        // Navegación
        const statsLink = document.getElementById('estadisticas-link');
        if (statsLink) {
            statsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('estadisticas-section');
                this.loadAllData();
            });
        }
        
        const inventariosLink = document.getElementById('inventarios-link');
        if (inventariosLink) {
            inventariosLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showExportModal();
            });
        }

        const insumosLink = document.getElementById('estadisticas-insumos-link');
        if (insumosLink) {
            insumosLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('estadisticas-insumos-section');
                this.loadSuppliesStats();
            });
        }

        // Botones de tipo de dispositivo
        Object.keys(this.deviceTypes).forEach(type => {
            const button = document.getElementById(`btn-${type}`);
            if (button) {
                button.addEventListener('click', () => {
                    this.switchDeviceTable(type);
                });
            }
        });
        
        // Botones de categoría de repuestos
        Object.keys(this.supplyCategories).forEach(category => {
            const button = document.getElementById(`btn-${category}`);
            if (button) {
                button.addEventListener('click', () => {
                    this.switchSupplyCategory(category);
                });
            }
        });

            // Botón de refrescar página - NUEVO
             const refreshPageBtn = document.getElementById('refreshPageBtn');
            if (refreshPageBtn) {
             refreshPageBtn.addEventListener('click', () => {
            console.log('🔄 Refrescando página completa...');
            this.showNotification('Refrescando página...', 'info');
            
            // Pequeño delay para que se vea la notificación
            setTimeout(() => {
                window.location.reload();
            }, 500);
        });
    }
        
        // Botones de actualización
        const refreshButtons = [
            { id: 'refresh-stats', action: () => this.loadAllData() },
            { id: 'refreshDashboard', action: () => this.loadDashboardStats() },
            { id: 'refresh-insumos-stats', action: () => this.loadSuppliesStats() }
        ];
        
        refreshButtons.forEach(btnConfig => {
            const button = document.getElementById(btnConfig.id);
            if (button) {
                button.addEventListener('click', btnConfig.action);
            }
        });
        
        // Manejo del cierre de sesión
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleLogout();
            });
        }
        
        // Menús desplegables
        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.nextElementSibling?.classList.contains('submenu')) {
                    e.preventDefault();
                    const arrow = this.querySelector('.arrow');
                    if (arrow) {
                        arrow.classList.toggle('rotate');
                    }
                    this.nextElementSibling.classList.toggle('active');
                }
            });
        });
        
        // Perfil de usuario
        const userProfile = document.getElementById('userProfile');
        if (userProfile) {
            userProfile.addEventListener('click', (e) => {
                e.stopPropagation();
                const userDropdown = document.getElementById('userDropdown');
                if (userDropdown) {
                    userDropdown.classList.toggle('show');
                }
            });
        }
        
        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }
            this.hideSearchResults();
        });

        // Botones para volver al dashboard
        document.querySelectorAll('.btn-back-dashboard').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showMainDashboard();
            });
        });
    },

    setupEditModal: function() {
        const editForm = document.getElementById('editForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                this.handleEditSubmit(e);
            });
        }

        const editModal = document.getElementById('editModal');
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    this.closeEditModal();
                }
            });
        }

        const closeBtn = editModal?.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeEditModal();
            });
        }
    },

    showSection: function(sectionId) {
        const sections = [
            'main-stats',
            'estadisticas-section',
            'estadisticas-insumos-section',
            'control-mantenimientos-section'
        ];
        
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.style.display = id === sectionId ? 'block' : 'none';
            }
        });
        
        const mainStats = document.getElementById('main-stats');
        if (mainStats) {
            mainStats.style.display = sectionId === 'main-stats' ? 'grid' : 'none';
        }
    }
};

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    InventoryApp.init();
    
    // Configurar evento del perfil en el dropdown
    const profileDropdownItem = document.querySelector('.dropdown-item[href="#"]');
    if (profileDropdownItem) {
        profileDropdownItem.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.ProfileManager) {
                window.ProfileManager.loadAndShowProfile();
            }
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }
        });
    }
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (event) => {
        const modals = ['profileModal', 'exportModal', 'deleteAccountModal', 'editModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
                if (modalId === 'editModal') {
                    InventoryApp.editingDevice = null;
                }
            }
        });
    });
});

// Hacer disponible globalmente
window.InventoryApp = InventoryApp;