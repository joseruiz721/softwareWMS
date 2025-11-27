// dashboard-enhanced.js - Funcionalidad mejorada para el dashboard
class EnhancedDashboard {
    constructor() {
        this.calendar = null;
        this.statsData = {
            devices: 0,
            supplies: 0,
            alerts: 0,
            techs: 0
        };
        this.colombianHolidays = [];
        this.init();
    }

    init() {
        this.loadColombianHolidays();
        this.initCalendar();
        this.setupEventListeners();
        this.loadDashboardData();
    }

    // Función para calcular festivos de Colombia
    loadColombianHolidays() {
        const currentYear = new Date().getFullYear();
        this.colombianHolidays = this.calculateColombianHolidays(currentYear);
    }

    calculateColombianHolidays(year) {
        const holidays = [];

        // Festivos fijos
        const fixedHolidays = [
            { date: `${year}-01-01`, name: 'Año Nuevo', type: 'fixed' },
            { date: `${year}-01-06`, name: 'Día de los Reyes Magos', type: 'movable' },
            { date: `${year}-03-19`, name: 'Día de San José', type: 'fixed' },
            { date: `${year}-05-01`, name: 'Día del Trabajo', type: 'fixed' },
            { date: `${year}-07-20`, name: 'Día de la Independencia', type: 'fixed' },
            { date: `${year}-08-07`, name: 'Batalla de Boyacá', type: 'fixed' },
            { date: `${year}-12-08`, name: 'Día de la Inmaculada Concepción', type: 'fixed' },
            { date: `${year}-12-25`, name: 'Navidad', type: 'fixed' }
        ];

        // Festivos móviles (calculados)
        const easter = this.calculateEaster(year);
        const palmSunday = new Date(easter);
        palmSunday.setDate(easter.getDate() - 7);
        
        const holyThursday = new Date(easter);
        holyThursday.setDate(easter.getDate() - 3);
        
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        
        const ascension = new Date(easter);
        ascension.setDate(easter.getDate() + 43);
        
        const corpusChristi = new Date(easter);
        corpusChristi.setDate(easter.getDate() + 64);
        
        const sacredHeart = new Date(easter);
        sacredHeart.setDate(easter.getDate() + 71);

        const movableHolidays = [
            { date: this.formatDate(palmSunday), name: 'Domingo de Ramos', type: 'movable' },
            { date: this.formatDate(holyThursday), name: 'Jueves Santo', type: 'movable' },
            { date: this.formatDate(goodFriday), name: 'Viernes Santo', type: 'movable' },
            { date: this.formatDate(ascension), name: 'Ascensión del Señor', type: 'movable' },
            { date: this.formatDate(corpusChristi), name: 'Corpus Christi', type: 'movable' },
            { date: this.formatDate(sacredHeart), name: 'Sagrado Corazón de Jesús', type: 'movable' }
        ];

        // Festivos que siguen el "Ley de Emiliani"
        const emilianiHolidays = [
            { original: `${year}-01-06`, moved: this.getNextMonday(`${year}-01-06`), name: 'Reyes Magos', type: 'emiliani' },
            { original: `${year}-03-19`, moved: this.getNextMonday(`${year}-03-19`), name: 'San José', type: 'emiliani' },
            { original: `${year}-06-29`, moved: this.getNextMonday(`${year}-06-29`), name: 'San Pedro y San Pablo', type: 'emiliani' },
            { original: `${year}-08-15`, moved: this.getNextMonday(`${year}-08-15`), name: 'Asunción de la Virgen', type: 'emiliani' },
            { original: `${year}-10-12`, moved: this.getNextMonday(`${year}-10-12`), name: 'Día de la Raza', type: 'emiliani' },
        ];

        // Agregar todos los festivos
        fixedHolidays.forEach(holiday => {
            holidays.push({
                title: holiday.name,
                start: holiday.date,
                color: '#e74c3c',
                textColor: 'white',
                display: 'background',
                className: 'colombian-holiday',
                extendedProps: { type: 'holiday', holidayType: holiday.type }
            });
        });

        movableHolidays.forEach(holiday => {
            holidays.push({
                title: holiday.name,
                start: holiday.date,
                color: '#e74c3c',
                textColor: 'white',
                display: 'background',
                className: 'colombian-holiday',
                extendedProps: { type: 'holiday', holidayType: holiday.type }
            });
        });

        emilianiHolidays.forEach(holiday => {
            holidays.push({
                title: holiday.name,
                start: holiday.moved,
                color: '#e67e22',
                textColor: 'white',
                display: 'background',
                className: 'colombian-holiday emiliani',
                extendedProps: { type: 'holiday', holidayType: holiday.type }
            });
        });

        return holidays;
    }

    // Algoritmo para calcular Domingo de Pascua
    calculateEaster(year) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31);
        const day = ((h + l - 7 * m + 114) % 31) + 1;

        return new Date(year, month - 1, day);
    }

    getNextMonday(dateString) {
        const date = new Date(dateString);
        // Si ya es lunes, mantener la fecha
        if (date.getDay() === 1) return this.formatDate(date);
        
        // Encontrar el siguiente lunes
        const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
        date.setDate(date.getDate() + daysUntilMonday);
        return this.formatDate(date);
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    initCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            locale: 'es',
            buttonText: {
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día'
            },
            events: (fetchInfo, successCallback, failureCallback) => {
                this.loadCalendarEvents(fetchInfo, successCallback, failureCallback);
            },
            eventClick: this.handleEventClick.bind(this),
            eventDidMount: this.styleEvent.bind(this),
            height: 'auto',
            firstDay: 1, // Lunes como primer día de la semana
            businessHours: {
                daysOfWeek: [1, 2, 3, 4, 5], // Lunes a viernes
                startTime: '08:00',
                endTime: '17:00',
            },
            dayHeaderContent: (args) => {
                // Personalizar encabezados de días en español
                const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
                return days[args.dow];
            }
        });

        this.calendar.render();

        // Botón "Hoy"
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                this.calendar.today();
            });
        }
    }

    async loadCalendarEvents(fetchInfo, successCallback, failureCallback) {
        try {
            const [mantenimientos, holidays] = await Promise.all([
                this.loadMaintenanceEvents(fetchInfo),
                this.loadHolidaysForPeriod(fetchInfo.start, fetchInfo.end)
            ]);

            const allEvents = [...holidays, ...mantenimientos];
            successCallback(allEvents);
        } catch (error) {
            console.error('Error cargando eventos del calendario:', error);
            // En caso de error, mostrar eventos de ejemplo
            const sampleEvents = [
                ...this.colombianHolidays.filter(holiday => 
                    new Date(holiday.start) >= fetchInfo.start && 
                    new Date(holiday.start) <= fetchInfo.end
                ),
                {
                    id: 1,
                    title: 'Linea #2 - ZE500',
                    start: new Date(),
                    extendedProps: {
                        tecnico: 'Técnico 1',
                        estado: 'Completado',
                        tipo: 'Preventivo',
                        ubicacion: 'Linea #2',
                        dispositivo: 'ZE500'
                    },
                    color: '#3498db'
                }
            ];
            successCallback(sampleEvents);
        }
    }

    async loadMaintenanceEvents(fetchInfo) {
        try {
            const mantenimientos = await ApiService.getMaintenances();
            console.log('📋 Datos de mantenimientos recibidos para calendario:', mantenimientos);
            
            return mantenimientos.map(mantenimiento => {
                // CORRECCIÓN PRINCIPAL: Usar los campos correctos de la base de datos
                const ubicacion = mantenimiento.ubicacion_dispositivo || 
                                mantenimiento.ubicacion || 
                                'Ubicación no especificada';
                
                const dispositivo = mantenimiento.nombre_dispositivo || 
                                  'Dispositivo no especificado';
                
                const tecnico = mantenimiento.tecnico || 
                              'Técnico no asignado';

                const estado = mantenimiento.estado || 'No especificado';
                const tipo = mantenimiento.tipo || 'No especificado';

                console.log(`📅 Mapeando mantenimiento ${mantenimiento.id}:`, {
                    ubicacion,
                    dispositivo,
                    tecnico,
                    estado,
                    tipo,
                    fecha: mantenimiento.fecha
                });

                return {
                    id: mantenimiento.id,
                    // MOSTRAR SOLO UBICACIÓN Y DISPOSITIVO
                    title: `${ubicacion} - ${dispositivo}`,
                    start: mantenimiento.fecha,
                    extendedProps: {
                        tecnico: tecnico,
                        estado: estado,
                        tipo: tipo,
                        ubicacion: ubicacion,
                        dispositivo: dispositivo,
                        // Información completa para debug
                        rawData: mantenimiento
                    },
                    color: this.getEventColor(estado, tipo),
                    className: 'maintenance-event'
                };
            });
        } catch (error) {
            console.error('Error cargando mantenimientos:', error);
            return [];
        }
    }

    loadHolidaysForPeriod(start, end) {
        return this.colombianHolidays.filter(holiday => {
            const holidayDate = new Date(holiday.start);
            return holidayDate >= start && holidayDate <= end;
        });
    }

    getEventColor(estado, tipo) {
        const colors = {
            'Pendiente': '#f39c12',
            'En Progreso': '#3498db',
            'Completado': '#27ae60',
            'Correctivo': '#e74c3c',
            'Preventivo': '#3498db',
            'Predictivo': '#9b59b6'
        };

        return colors[estado] || colors[tipo] || '#95a5a6';
    }

    styleEvent(info) {
        const { event } = info;
        
        // Estilos para festivos
        if (event.extendedProps.type === 'holiday') {
            info.el.style.opacity = '0.7';
            info.el.style.border = '2px dashed #fff';
            info.el.title = `🎉 ${event.title} - Festivo`;
        }
        
        // Estilos para mantenimientos
        if (event.classNames.includes('maintenance-event')) {
            const { estado } = event.extendedProps;
            
            if (estado === 'Pendiente') {
                info.el.style.borderLeft = '4px solid #f39c12';
            } else if (estado === 'En Progreso') {
                info.el.style.borderLeft = '4px solid #3498db';
            } else if (estado === 'Completado') {
                info.el.style.borderLeft = '4px solid #27ae60';
            }
            
            // Agregar tooltip con más información
            const tooltipText = `
                ${event.title}
                Técnico: ${event.extendedProps.tecnico}
                Estado: ${event.extendedProps.estado}
                Tipo: ${event.extendedProps.tipo}
            `;
            info.el.title = tooltipText;
        }
    }

    handleEventClick(info) {
        const { event } = info;
        
        if (event.extendedProps.type === 'holiday') {
            this.showHolidayInfo(event);
        } else {
            this.showMaintenanceInfo(event);
        }
        
        info.jsEvent.preventDefault();
    }

    showHolidayInfo(event) {
        const holidayType = event.extendedProps.holidayType;
        let typeText = '';
        
        switch(holidayType) {
            case 'fixed':
                typeText = 'Festivo Fijo';
                break;
            case 'movable':
                typeText = 'Festivo Móvil';
                break;
            case 'emiliani':
                typeText = 'Festivo (Ley Emiliani)';
                break;
            default:
                typeText = 'Festivo';
        }
        
        const message = `
            🎉 ${event.title}
            Tipo: ${typeText}
            Fecha: ${new Date(event.start).toLocaleDateString('es-CO')}
        `;
        
        this.showNotification(message, 'info');
    }

    showMaintenanceInfo(event) {
        const { extendedProps } = event;
        
        // INFORMACIÓN CORRECTA usando los campos mapeados
        const message = `
            🔧 Mantenimiento
            Ubicación: ${extendedProps.ubicacion}
            Dispositivo: ${extendedProps.dispositivo}
            Técnico: ${extendedProps.tecnico}
            Estado: ${extendedProps.estado}
            Tipo: ${extendedProps.tipo}
            Fecha: ${new Date(event.start).toLocaleDateString('es-CO')}
        `;
        
        this.showNotification(message, 'maintenance');
        
        // Debug: mostrar datos completos en consola
        console.log('🔍 Datos completos del evento de mantenimiento:', extendedProps);
    }

    showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `calendar-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'info' ? 'fa-info-circle' : 'fa-tools'}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Estilos para la notificación
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 15px;
            max-width: 400px;
            z-index: 10000;
            border-left: 4px solid ${type === 'info' ? '#3498db' : '#f39c12'};
        `;
        
        document.body.appendChild(notification);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Cerrar manualmente
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
                if (this.calendar) {
                    this.calendar.refetchEvents();
                }
            });
        }

        const exportBtn = document.getElementById('export-inventory-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof InventoryApp !== 'undefined' && InventoryApp.showExportModal) {
                    InventoryApp.showExportModal();
                }
            });
        }
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadStatsFromAPI(),
                this.loadRecentAlerts()
            ]);
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
            this.showErrorState();
        }
    }

    async loadStatsFromAPI() {
        try {
            const stats = await ApiService.getDashboardStats();
            
            this.updateStatCard('active-devices', stats.activeDevices);
            this.updateStatCard('total-supplies', stats.totalSupplies);
            this.updateStatCard('today-alerts', stats.todayAlerts);
            this.updateStatCard('active-techs', stats.activeTechs);

            this.updateTrend('devices-trend', stats.devicesChange, 'dispositivos');
            this.updateTrend('supplies-trend', stats.suppliesChange, 'repuestos');
            this.updateAlertStatus(stats.todayAlerts, stats.criticalAlerts);
            this.updateTechStatus(stats.activeTechs, stats.busyTechs);

        } catch (error) {
            console.error('Error cargando estadísticas:', error);
            this.showSampleData();
        }
    }

    showSampleData() {
        this.updateStatCard('active-devices', 45);
        this.updateStatCard('total-supplies', 128);
        this.updateStatCard('today-alerts', 3);
        this.updateStatCard('active-techs', 5);
        
        this.updateTrend('devices-trend', 2, 'dispositivos');
        this.updateTrend('supplies-trend', 5, 'repuestos');
        this.updateAlertStatus(3, 1);
        this.updateTechStatus(5, 2);
    }

    async loadRecentAlerts() {
        try {
            const mantenimientos = await ApiService.getMaintenances();
            const recentAlerts = mantenimientos
                .filter(m => m.estado === 'Pendiente')
                .slice(0, 5)
                .map(m => {
                    // CORRECCIÓN: Usar ubicacion_dispositivo en lugar de ubicacion
                    const ubicacion = m.ubicacion_dispositivo || m.ubicacion || 'Sin ubicación';
                    const dispositivo = m.nombre_dispositivo || 'Sin dispositivo';
                    
                    return {
                        message: `${ubicacion} - ${dispositivo}`,
                        type: this.getAlertType(m.tipo, m.prioridad)
                    };
                });
            
            this.renderRecentAlerts(recentAlerts);
        } catch (error) {
            console.error('Error cargando alertas recientes:', error);
            this.renderRecentAlerts([
                {
                    message: 'Linea #2 - ZE500',
                    type: 'info'
                },
                {
                    message: 'Repuesto Bajo Stock - Cable Ethernet',
                    type: 'warning'
                }
            ]);
        }
    }

    getAlertType(tipo, prioridad) {
        if (tipo === 'Correctivo') return 'danger';
        if (prioridad === 'Alta') return 'warning';
        return 'info';
    }

    renderRecentAlerts(alerts) {
        const container = document.getElementById('recent-alerts');
        if (!container) return;
        
        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="alert-item success">
                    <i class="fas fa-check-circle alert-success"></i>
                    <span>No hay alertas pendientes</span>
                </div>
            `;
            return;
        }

        container.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <i class="fas ${this.getAlertIcon(alert.type)} alert-${alert.type}"></i>
                <span>${alert.message}</span>
            </div>
        `).join('');
    }

    getAlertIcon(type) {
        const icons = {
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle',
            'success': 'check-circle'
        };
        return icons[type] || 'info-circle';
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            this.animateValue(element, parseInt(element.textContent) || 0, value, 1000);
        }
    }

    animateValue(element, start, end, duration) {
        if (isNaN(start) || isNaN(end)) {
            element.textContent = end;
            return;
        }

        const range = end - start;
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.floor(start + (range * progress));
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = end.toLocaleString();
            }
        };
        
        requestAnimationFrame(update);
    }

    updateTrend(elementId, change, label) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const trendIcon = change >= 0 ? 'fa-arrow-up trend-up' : 'fa-arrow-down trend-down';
        const trendText = change >= 0 ? `+${change}` : `${change}`;
        
        element.innerHTML = `
            <i class="fas ${trendIcon}"></i>
            <span class="trend-text">${trendText} ${label}</span>
        `;
    }

    updateAlertStatus(count, critical = 0) {
        const element = document.getElementById('alerts-trend');
        if (!element) return;

        let statusText = 'Sin alertas';
        let statusClass = 'trend-text';
        
        if (count > 0) {
            statusText = `${count} pendientes`;
            if (critical > 0) {
                statusText += ` (${critical} críticas)`;
                statusClass = 'trend-down';
            }
        }
        
        element.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
    }

    updateTechStatus(active, busy) {
        const element = document.getElementById('techs-trend');
        if (!element) return;

        const available = active - busy;
        element.innerHTML = `
            <span class="trend-text">${available} disponibles de ${active}</span>
        `;
    }

    showErrorState() {
        const statCards = ['active-devices', 'total-supplies', 'today-alerts', 'active-techs'];
        statCards.forEach(card => {
            const element = document.getElementById(card);
            if (element) element.textContent = 'Error';
        });
    }

    refresh() {
        this.loadDashboardData();
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
    }
}

// Inicializar dashboard mejorado cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedDashboard = new EnhancedDashboard();
    
    if (typeof InventoryApp !== 'undefined') {
        const originalRefresh = InventoryApp.refreshDashboard;
        if (originalRefresh) {
            InventoryApp.refreshDashboard = function() {
                originalRefresh();
                if (window.enhancedDashboard) {
                    window.enhancedDashboard.refresh();
                }
            };
        }
    }
});