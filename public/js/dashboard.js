// Objeto principal para encapsular la aplicación del dashboard
const DashboardApp = {
    // --------------------------
    // Variables de estado
    // --------------------------
    charts: {
        typeChart: null,
        statusChart: null,
        categoryChart: null,
        stockChart: null
    },
    currentData: {
        devices: {},
        supplies: []
    },
    currentTable: 'computadoras',
    currentUser: null,
    currentSupplyCategory: 'todos',
    searchTimeout: null,
    
    // Definición de tipos de dispositivos
    deviceTypes: {
        computadoras: {
            name: 'Computadoras',
            fields: ['nombre', 'modelo', 'serial', 'ip', 'ubicacion', 'estado', 'fecha_ingreso', 'observaciones']
        },
        routers: {
            name: 'Routers',
            fields: ['nombre', 'modelo', 'serial', 'ip', 'ubicacion', 'estado', 'version', 'arquitectura', 'fecha_ingreso']
        },
        readers: {
            name: 'Readers',
            fields: ['nombre', 'modelo', 'serial', 'ip', 'ubicacion', 'estado', 'observaciones', 'fecha_ingreso']
        },
        impresoras: {
            name: 'Etiquetadoras',
            fields: ['nombre', 'modelo', 'serial', 'ip', 'ubicacion', 'estado', 'observaciones', 'fecha_ingreso']
        },
        moviles: {
            name: 'Móviles',
            fields: ['nombre', 'modelo', 'serial', 'ip', 'imei', 'ubicacion', 'estado', 'fecha_ingreso']
        }
    },

    // Categorías de insumos
    supplyCategories: {
        todos: {
            name: 'Todos',
            filter: () => true
        },
        electronica: {
            name: 'Electrónica',
            filter: supply => supply.categoria === 'Electrónica'
        },
        electricos: {
            name: 'Eléctricos',
            filter: supply => supply.categoria === 'Eléctricos'
        },
        herramientas: {
            name: 'Herramientas',
            filter: supply => supply.categoria === 'Herramientas'
        },
        consumibles: {
            name: 'Consumibles',
            filter: supply => supply.categoria === 'Consumibles'
        }
    },

    // --------------------------
    // Inicialización
    // --------------------------
    init: function() {
        this.loadUserData();
        this.loadDashboardStats();
        this.setupEventListeners();
        this.setupSearch();
        this.hideAllSections();
        this.showMainDashboard();
    },

    // --------------------------
    // Funciones de navegación
    // --------------------------
    hideAllSections: function() {
        document.getElementById('main-stats').style.display = 'none';
        document.getElementById('estadisticas-section').style.display = 'none';
        document.getElementById('estadisticas-insumos-section').style.display = 'none';
    },

    showMainDashboard: function() {
        this.hideAllSections();
        document.getElementById('main-stats').style.display = 'grid';
        this.loadDashboardStats();
    },

    showDevicesStats: function() {
        this.hideAllSections();
        document.getElementById('estadisticas-section').style.display = 'block';
        this.loadAllData();
    },

    showSuppliesStats: function() {
        this.hideAllSections();
        document.getElementById('estadisticas-insumos-section').style.display = 'block';
        this.loadSuppliesStats();
    },

    // --------------------------
    // Funciones de carga de datos
    // --------------------------
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
            this.updateCharts(this.currentData.devices);
            
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
            this.showStatsError();
        }
    },

    loadSuppliesStats: async function() {
        try {
            this.showLoadingState('supplies');
            
            if (!this.currentData.supplies || this.currentData.supplies.length === 0) {
                this.currentData.supplies = await this.fetchSuppliesData();
            }
            
            this.updateSuppliesTable(this.currentData.supplies);
            this.updateSuppliesCharts(this.currentData.supplies);
            
        } catch (error) {
            console.error('Error loading supplies stats:', error);
            this.showError('supplies', 'Error al cargar estadísticas de insumos: ' + error.message);
        }
    },

    fetchDevicesData: async function() {
        const deviceTypes = Object.keys(this.deviceTypes);
        const requests = deviceTypes.map(type => 
            fetch(`/api/${type}`).then(res => res.json())
        );
        
        const results = await Promise.all(requests);
        return deviceTypes.reduce((acc, type, index) => {
            acc[type] = results[index];
            return acc;
        }, {});
    },
    
    fetchSuppliesData: async function() {
        try {
            const response = await fetch('/api/insumos');
            if (!response.ok) throw new Error('Error al cargar insumos');
            return await response.json();
        } catch (error) {
            console.error('Error fetching supplies:', error);
            this.showError('supplies', 'Error al cargar insumos');
            return [];
        }
    },

    // --------------------------
    // Funciones de interfaz de usuario
    // --------------------------
    updateStatsUI: function(stats) {
        document.getElementById('active-devices').textContent = stats.activeDevices;
        document.getElementById('devices-change').textContent = 
            stats.devicesChange > 0 ? `+${stats.devicesChange} desde ayer` : 'Sin cambios';
        
        document.getElementById('total-supplies').textContent = stats.totalSupplies;
        document.getElementById('supplies-change').textContent = 
            stats.suppliesChange > 0 ? `+${stats.suppliesChange} esta semana` : 'Sin cambios';
        
        document.getElementById('today-alerts').textContent = stats.todayAlerts;
        document.getElementById('alerts-status').textContent = 
            stats.criticalAlerts > 0 ? `${stats.criticalAlerts} requieren atención` : 'Todo en orden';
        
        document.getElementById('active-techs').textContent = stats.activeTechs;
        document.getElementById('techs-status').textContent = 
            stats.busyTechs > 0 ? `${stats.busyTechs} en servicio` : 'Todos disponibles';
    },

   // ✅ CÓDIGO CORREGIDO:
updateDeviceTable: function(devices) {
    const tableBody = document.getElementById('devices-table-body');
    
    if (!devices || devices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="no-data">No hay dispositivos registrados</td></tr>';
        return;
    }
    
    // ✅ CORRECCIÓN: Cambiar 'devienda.mop' por 'devices.map'
    tableBody.innerHTML = devices.map(device => {
        const statusClass = this.getStatusClass(device.estado);
        const fields = this.getDeviceFields(device);
        
        return `
            <tr>
                <td>${device.id || 'N/A'}</td>
                <td>${fields.nombre || 'No especificado'}</td>
                <td>${fields.modelo || 'No especificado'}</td>
                <td>${fields.serial || 'No especificado'}</td>
                <td>${fields.ip || 'N/A'}</td>
                <td>${fields.ubicacion || 'No especificada'}</td>
                <td class="${statusClass}">${device.estado || 'Desconocido'}</td>
                <td>${fields.fecha_ingreso || 'N/A'}</td>
                <td>${fields.observaciones || 'Ninguna'}</td>
                <td>
                    <button class="btn-edit" data-id="${device.id}" data-type="${this.currentTable}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    this.setupEditButtons();
},

    updateSuppliesTable: function(supplies) {
        const tableBody = document.getElementById('supplies-table-body');
        const filteredSupplies = this.applySupplyFilters(supplies);
        
        if (!filteredSupplies || filteredSupplies.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="10" class="no-data">No hay insumos registrados</td></tr>';
            return;
        }
        
        tableBody.innerHTML = filteredSupplies.map(supply => {
            const statusClass = this.getSupplyStatusClass(supply);
            
            return `
                <tr>
                    <td>${supply.id || 'N/A'}</td>
                    <td>${supply.nombre || 'No especificado'}</td>
                    <td>${supply.categoria || 'No especificada'}</td>
                    <td>${supply.cantidad || 0}</td>
                    <td>${supply.minimo || 0}</td>
                    <td>${supply.ubicacion || 'No especificada'}</td>
                    <td class="${statusClass}">${this.getSupplyStatusText(supply)}</td>
                    <td>${supply.proveedor || 'No especificado'}</td>
                    <td>${supply.fecha_ingreso ? 
                        new Date(supply.fecha_ingreso).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn-edit" data-id="${supply.id}" data-type="insumo">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        this.setupEditButtons();
    },

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

    showStatsError: function() {
        document.getElementById('main-stats').innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                Error al cargar las estadísticas. Intente nuevamente.
            </div>
        `;
    },

    // --------------------------
    // Funciones de gráficos
    // --------------------------
    updateCharts: function(devicesData) {
        const allDevices = Object.values(devicesData).flat();
        
        const typeData = this.countByProperty(allDevices, 'tipo');
        const statusData = this.countByProperty(allDevices, 'estado');
        
        this.charts.typeChart = this.createOrUpdateChart(
            'type-chart', 
            this.charts.typeChart, 
            'pie', 
            Object.keys(typeData), 
            Object.values(typeData),
            ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6'],
            'Distribución por Tipo'
        );
        
        this.charts.statusChart = this.createOrUpdateChart(
            'status-chart', 
            this.charts.statusChart, 
            'bar', 
            Object.keys(statusData), 
            Object.values(statusData),
            Object.keys(statusData).map(status => this.getStatusColor(status)),
            'Distribución por Estado'
        );
    },

    updateSuppliesCharts: function(supplies) {
        const categoryData = this.countByProperty(supplies, 'categoria');
        const stockData = this.analyzeStockLevels(supplies);
        
        this.charts.categoryChart = this.createOrUpdateChart(
            'category-chart', 
            this.charts.categoryChart, 
            'doughnut', 
            Object.keys(categoryData), 
            Object.values(categoryData),
            ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6'],
            'Distribución por Categoría'
        );
        
        this.charts.stockChart = this.createOrUpdateChart(
            'stock-chart', 
            this.charts.stockChart, 
            'bar', 
            ['Disponible', 'Bajo Stock', 'Agotado'], 
            [stockData.available, stockData.low, stockData.out],
            ['#2ecc71', '#f1c40f', '#e74c3c'],
            'Niveles de Stock'
        );
    },

    createOrUpdateChart: function(canvasId, chartInstance, type, labels, data, colors, title) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        const options = this.getChartOptions(type, title);
        
        return new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: options
        });
    },

    getChartOptions: function(type, title) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 12 } } },
                title: {
                    display: true,
                    text: title,
                    font: { size: 16, weight: 'bold' },
                    padding: { top: 10, bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = Math.round((context.raw / total) * 100);
                            return `${context.label}: ${context.raw} (${percent}%)`;
                        }
                    }
                }
            }
        };
        
        if (type === 'bar') {
            options.scales = {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
                x: { grid: { display: false } }
            };
        }
        
        return options;
    },

    // --------------------------
    // Funciones de navegación de datos
    // --------------------------
    switchDeviceTable: function(deviceType) {
        if (!this.deviceTypes[deviceType]) return;
        
        this.currentTable = deviceType;
        
        document.querySelectorAll('.device-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `btn-${deviceType}`);
        });
        
        if (this.currentData.devices[deviceType]) {
            this.updateDeviceTable(this.currentData.devices[deviceType]);
        }
    },

    switchSupplyCategory: function(category) {
        if (!this.supplyCategories[category]) return;
        
        this.currentSupplyCategory = category;
        
        document.querySelectorAll('.supply-category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `btn-${category}`);
        });
        
        if (this.currentData.supplies) {
            this.updateSuppliesTable(this.currentData.supplies);
        }
    },

    // --------------------------
    // Funciones de utilidad
    // --------------------------
    getDeviceFields: function(device) {
        const fields = {
            nombre: device.nombre,
            modelo: device.modelo,
            serial: device.serial,
            ip: device.ip,
            ubicacion: device.ubicacion,
            fecha_ingreso: device.fecha_ingreso ? 
                new Date(device.fecha_ingreso).toLocaleDateString() : 'N/A',
            observaciones: device.observaciones
        };
        
        if (this.currentTable === 'routers') {
            fields.version = device.version;
            fields.arquitectura = device.arquitectura;
        }
        
        return fields;
    },

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

    getStatusColor: function(status) {
        switch ((status || '').toLowerCase()) {
            case 'activo': return '#2ecc71';
            case 'en reparación': return '#f39c12';
            case 'dañado': return '#e74c3c';
            case 'retirado': return '#95a5a6';
            case 'standby': return '#3498db';
            default: return '#7f8c8d';
        }
    },

    getSupplyStatusClass: function(supply) {
        const cantidad = parseInt(supply.cantidad) || 0;
        const minimo = parseInt(supply.minimo) || 0;
        
        if (cantidad === 0) return 'status-error';
        if (cantidad <= minimo) return 'status-warning';
        return 'status-active';
    },

    getSupplyStatusText: function(supply) {
        const cantidad = parseInt(supply.cantidad) || 0;
        const minimo = parseInt(supply.minimo) || 0;
        
        if (cantidad === 0) return 'Agotado';
        if (cantidad <= minimo) return 'Bajo Stock';
        return 'Disponible';
    },

    countByProperty: function(items, property) {
        return items.reduce((count, item) => {
            const key = item[property] || 'Desconocido';
            count[key] = (count[key] || 0) + 1;
            return count;
        }, {});
    },

    analyzeStockLevels: function(supplies) {
        return supplies.reduce((acc, supply) => {
            const cantidad = parseInt(supply.cantidad) || 0;
            const minimo = parseInt(supply.minimo) || 0;
            
            if (cantidad === 0) acc.out++;
            else if (cantidad <= minimo) acc.low++;
            else acc.available++;
            
            return acc;
        }, { available: 0, low: 0, out: 0 });
    },

    applySupplyFilters: function(supplies) {
        const filterFn = this.supplyCategories[this.currentSupplyCategory].filter;
        return supplies.filter(filterFn);
    },

    // --------------------------
    // Funciones de búsqueda
    // --------------------------
    setupSearch: function() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length >= 2) {
                searchResults.classList.add('show');
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('show');
            }
        });
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const term = e.target.value.trim();
            
            if (term.length >= 2) {
                this.searchTimeout = setTimeout(() => {
                    this.searchItems(term);
                }, 300);
            } else {
                searchResults.classList.remove('show');
                searchResults.innerHTML = '';
            }
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim().length >= 2) {
                e.preventDefault();
                this.searchItems(searchInput.value.trim());
            }
        });
    },

    searchItems: async function(term) {
        try {
            const response = await fetch(`/api/buscar?q=${encodeURIComponent(term)}`);
            
            if (!response.ok) {
                throw new Error(response.status === 400 ? 
                    'El término debe tener al menos 2 caracteres' : 
                    'Error en la búsqueda');
            }
            
            const results = await response.json();
            this.displaySearchResults(results);
            
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            this.displaySearchError(error.message);
        }
    },

    displaySearchResults: function(results) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '';

        if (!results || results.length === 0) {
            container.innerHTML = '<div class="no-results">No se encontraron resultados</div>';
            container.classList.add('show');
            return;
        }

        container.innerHTML = results.map(item => {
            const isDevice = item.tipo !== 'Insumo';
            const icon = isDevice ? 'fa-video' : 'fa-box';
            const type = item.tipo;
            
            const details = isDevice ? 
                `${item.ip ? `IP: ${item.ip} | ` : ''}${item.serial ? `Serial: ${item.serial} | ` : ''}${item.estado ? `Estado: ${item.estado}` : ''}` :
                `Ubicación: ${item.ubicacion || 'N/A'}`;
            
            return `
                <div class="search-result-item" data-id="${item.id}" data-type="${isDevice ? 'device' : 'supply'}">
                    <div>
                        <i class="fas ${icon}"></i>
                        <span class="result-type">${type}</span>
                        <span class="result-name">${item.nombre || 'Sin nombre'}</span>
                    </div>
                    <div class="result-details">
                        ${details}
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                const type = item.getAttribute('data-type');
                
                if (type === 'device') {
                    window.location.href = `/dispositivos/${id}`;
                } else {
                    window.location.href = `/insumos/${id}`;
                }
            });
        });

        container.classList.add('show');
    },

    displaySearchError: function(message) {
        const container = document.getElementById('searchResults');
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
        container.classList.add('show');
    },

    // --------------------------
    // Funciones de usuario
    // --------------------------
    loadUserData: async function() {
        try {
            const response = await fetch('/api/usuarios/perfil', {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Error en la respuesta del servidor');
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.data;
                this.updateUserInterface();
            } else {
                throw new Error(data.message || 'Error al obtener perfil');
            }
        } catch (error) {
            console.error('Error al cargar datos del usuario:', error);
        }
    },

    updateUserInterface: function() {
        if (this.currentUser) {
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            const welcomeMessage = document.getElementById('welcome-message');
            
            if (userName) userName.textContent = this.currentUser.nombre || 'TECNICO';
            if (userAvatar) userAvatar.textContent = this.getInitials(this.currentUser.nombre);
            if (welcomeMessage) {
                welcomeMessage.textContent = `Bienvenido, ${this.currentUser.nombre || 'Usuario'}`;
            }
        }
    },

    getInitials: function(name) {
        if (!name) return 'GS';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    },

    loadAndShowProfile: async function() {
        try {
            if (!this.currentUser) {
                await this.loadUserData();
            }
            
            if (!this.currentUser) {
                throw new Error('No hay datos de usuario disponibles');
            }
            
            this.showUserProfile();
            
        } catch (error) {
            console.error('Error al mostrar perfil:', error);
            this.showNotification(error.message, 'error');
        }
    },

    showUserProfile: function() {
        const user = this.currentUser;
        if (!user) return;
        
        const formatDate = (dateString) => {
            if (!dateString) return 'No disponible';
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString('es-ES', options);
        };
        
        document.getElementById('profile-name').textContent = user.nombre || 'No especificado';
        document.getElementById('profile-cedula').textContent = user.cedula || 'No especificado';
        document.getElementById('profile-email').textContent = user.correo || 'No especificado';
        document.getElementById('profile-date').textContent = formatDate(user.fecha_registro);
        
        document.getElementById('profileModal').style.display = 'block';
    },

    // --------------------------
    // Funciones de modales
    // --------------------------
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    showExportModal: function() {
        document.getElementById('exportModal').style.display = 'block';
    },

    exportInventory: async function(format) {
        try {
            const statusDiv = document.getElementById('exportStatus');
            statusDiv.style.display = 'flex';
            statusDiv.querySelector('.status-message').textContent = 'Preparando exportación...';
            
            const endpoint = format === 'sql' ? 
                '/api/inventario/exportar-sql' : '/api/inventario/exportar-excel';
            
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || 'Error al exportar');
            }
            
            if (format === 'sql') {
               const data = await response.text();
               this.downloadFile(data, 'inventario.sql', 'application/sql');
            } else {
                const blob = await response.blob();
                this.downloadFile(blob, 'inventario.xlsx', 
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            }
            
            this.closeModal('exportModal');
            
        } catch (error) {
            console.error('Error al exportar:', error);
            const statusDiv = document.getElementById('exportStatus');
            statusDiv.querySelector('.status-message').textContent = error.message;
        }
    },

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

    // --------------------------
    // Configuración de eventos
    // --------------------------
    setupEventListeners: function() {
        // Navegación
        document.getElementById('estadisticas-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDevicesStats();
        });
        
        document.getElementById('estadisticas-insumos-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSuppliesStats();
        });

        document.getElementById('inventarios-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showExportModal();
        });
        
        // Botones de tipo de dispositivo
        Object.keys(this.deviceTypes).forEach(type => {
            document.getElementById(`btn-${type}`).addEventListener('click', () => {
                this.switchDeviceTable(type);
            });
        });
        
        // Botones de categoría de insumos
        Object.keys(this.supplyCategories).forEach(category => {
            document.getElementById(`btn-${category}`).addEventListener('click', () => {
                this.switchSupplyCategory(category);
            });
        });
        
        // Botones de actualización
        document.getElementById('refresh-stats').addEventListener('click', () => this.loadAllData());
        document.getElementById('refreshDashboard').addEventListener('click', () => this.loadDashboardStats());
        document.getElementById('refresh-insumos-stats').addEventListener('click', () => this.loadSuppliesStats());
        
        // Botones de volver
        document.querySelectorAll('.btn-back-dashboard').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showMainDashboard();
            });
        });
        
        // Menús desplegables
        document.querySelectorAll('.menu-link').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.nextElementSibling?.classList.contains('submenu')) {
                    e.preventDefault();
                    const arrow = this.querySelector('.arrow');
                    arrow.classList.toggle('rotate');
                    this.nextElementSibling.classList.toggle('active');
                }
            });
        });
        
        // Perfil de usuario
        document.getElementById('userProfile').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('userDropdown').classList.toggle('show');
        });
        
        // Cerrar menús al hacer clic fuera
        document.addEventListener('click', () => {
            document.getElementById('userDropdown').classList.remove('show');
            document.getElementById('searchResults').classList.remove('show');
        });
        
        // Cerrar sesión
        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handleLogout();
        });
    },

    setupEditButtons: function() {
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const type = e.currentTarget.getAttribute('data-type');
                
                if (type === 'insumo') {
                    this.showEditSupplyModal(id);
                } else {
                    this.showEditDeviceModal(id, type);
                }
            });
        });
    },

    handleLogout: async function() {
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                const data = await response.json();
                if (data.success && data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = '/login';
                }
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '/login';
        }
    },

    showNotification: function(message, type = 'info') {
        // Implementar sistema de notificaciones toast
        console.log(`${type.toUpperCase()}: ${message}`);
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    DashboardApp.init();
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});