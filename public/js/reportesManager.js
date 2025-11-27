class ReportesManager {
    constructor() {
        this.currentData = null;
        this.charts = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeYearSelector();
    }

    setupEventListeners() {
        // Navegación
        const reportesLink = document.getElementById('reportes-mensuales-link');
        if (reportesLink) {
            reportesLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showReportesSection();
            });
        }

        // Filtros
        const aplicarFiltrosBtn = document.getElementById('aplicar-filtros');
        if (aplicarFiltrosBtn) {
            aplicarFiltrosBtn.addEventListener('click', () => {
                this.loadReportData();
            });
        }

        // Exportación
        const generarPdfBtn = document.getElementById('generar-reporte-btn');
        if (generarPdfBtn) {
            generarPdfBtn.addEventListener('click', () => {
                this.generatePDFReport();
            });
        }

        const exportarExcelBtn = document.getElementById('exportar-excel');
        if (exportarExcelBtn) {
            exportarExcelBtn.addEventListener('click', () => {
                this.exportToExcel();
            });
        }

        // Botón volver
        document.querySelectorAll('.btn-back-dashboard').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideReportesSection();
            });
        });
    }

    initializeYearSelector() {
        const yearSelect = document.getElementById('anio-reporte');
        if (!yearSelect) return;

        const currentYear = new Date().getFullYear();
        yearSelect.innerHTML = '';
        
        for (let year = 2020; year <= currentYear + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    showReportesSection() {
        try {
            console.log('📊 Mostrando sección de reportes...');
            
            const seccionesAOcultar = [
                'dashboard-section',
                'estadisticas-section', 
                'estadisticas-insumos-section',
                'control-mantenimientos-section'
            ];
            
            seccionesAOcultar.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'none';
                }
            });
            
            const reportesSection = document.getElementById('reportes-mensuales-section');
            if (reportesSection) {
                reportesSection.style.display = 'block';
                this.loadCurrentMonthReport();
            } else {
                console.error('No se encontró la sección de reportes mensuales');
                if (window.Utils) {
                    Utils.showNotification('Error: No se puede mostrar la sección de reportes', 'error');
                }
            }
        } catch (error) {
            console.error('Error al mostrar sección de reportes:', error);
            if (window.Utils) {
                Utils.showNotification('Error al cargar los reportes', 'error');
            }
        }
    }

    hideReportesSection() {
        try {
            console.log('📊 Ocultando sección de reportes...');
            
            const reportesSection = document.getElementById('reportes-mensuales-section');
            const dashboardSection = document.getElementById('dashboard-section');
            
            if (reportesSection) reportesSection.style.display = 'none';
            if (dashboardSection) dashboardSection.style.display = 'block';
            
            this.destroyCharts();
        } catch (error) {
            console.error('Error ocultando sección de reportes:', error);
        }
    }

    async loadCurrentMonthReport() {
        try {
            const currentDate = new Date();
            const mes = currentDate.getMonth() + 1;
            const anio = currentDate.getFullYear();
            
            const mesSelect = document.getElementById('mes-reporte');
            const anioSelect = document.getElementById('anio-reporte');
            
            if (mesSelect) mesSelect.value = mes;
            if (anioSelect) anioSelect.value = anio;
            
            await this.loadReportData();
        } catch (error) {
            console.error('Error cargando reporte del mes actual:', error);
            this.showError('Error al cargar el reporte del mes actual');
        }
    }

    async loadReportData() {
        try {
            const mes = document.getElementById('mes-reporte')?.value;
            const anio = document.getElementById('anio-reporte')?.value;
            const tipo = document.getElementById('tipo-reporte')?.value;

            if (!mes || !anio) {
                throw new Error('Faltan parámetros para cargar el reporte');
            }

            this.showLoading();

            const mantenimientos = await this.obtenerMantenimientosDelMes(mes, anio, tipo);
            this.currentData = mantenimientos;

            this.updateResumenEstadisticas(mantenimientos);
            this.updateTablaDetallada(mantenimientos);
            await this.updateGraficas(mantenimientos);

            if (window.Utils && mantenimientos.length > 0) {
                Utils.showNotification(`Reporte de ${this.getNombreMes(mes)} ${anio} cargado - ${mantenimientos.length} mantenimientos`, 'success');
            }

        } catch (error) {
            console.error('Error cargando reporte:', error);
            this.showError('Error al cargar los datos del reporte: ' + error.message);
        }
    }

    async obtenerMantenimientosDelMes(mes, anio, tipo) {
        try {
            console.log(`📅 Solicitando mantenimientos para ${mes}/${anio} - Tipo: ${tipo}`);
            
            // ESTRATEGIA 1: Obtener todos los mantenimientos y filtrar
            try {
                console.log('🔍 Buscando mantenimientos en datos generales...');
                const todosMantenimientos = await ApiService.getMaintenances();
                console.log(`✅ Mantenimientos obtenidos: ${todosMantenimientos.length} en total`);
                
                const mantenimientosFiltrados = this.filtrarMantenimientosPorMes(todosMantenimientos, mes, anio, tipo);
                console.log(`📊 Mantenimientos filtrados: ${mantenimientosFiltrados.length} para ${mes}/${anio}`);
                
                if (mantenimientosFiltrados.length > 0) {
                    const mantenimientosNormalizados = this.normalizarDatosMantenimientos(mantenimientosFiltrados);
                    return mantenimientosNormalizados;
                }
            } catch (apiError) {
                console.error('❌ Error con mantenimientos generales:', apiError);
            }
            
            // ESTRATEGIA 2: Endpoint específico de reportes
            try {
                console.log('🔍 Intentando con endpoint de reportes...');
                if (ApiService.getMaintenancesByMonth) {
                    const mantenimientos = await ApiService.getMaintenancesByMonth(mes, anio, tipo);
                    console.log(`✅ Datos de reporte específico: ${mantenimientos.length} mantenimientos`);
                    if (mantenimientos.length > 0) {
                        return mantenimientos;
                    }
                }
            } catch (reportesError) {
                console.warn('⚠️ Endpoint de reportes no disponible:', reportesError);
            }
            
            console.warn('📭 No se encontraron mantenimientos para el período');
            if (window.Utils) {
                Utils.showNotification(
                    `No hay mantenimientos registrados para ${this.getNombreMes(mes)} ${anio}. ` +
                    `Registra mantenimientos para ver los reportes.`, 
                    'info'
                );
            }
            return [];
            
        } catch (error) {
            console.error('❌ Error crítico obteniendo mantenimientos:', error);
            if (window.Utils) {
                Utils.showNotification('Error al conectar con el servidor', 'error');
            }
            return [];
        }
    }

    filtrarMantenimientosPorMes(mantenimientos, mes, anio, tipo) {
        return mantenimientos.filter(mantenimiento => {
            try {
                if (!mantenimiento.fecha) return false;
                
                const fechaMantenimiento = new Date(mantenimiento.fecha);
                const mesMantenimiento = fechaMantenimiento.getMonth() + 1;
                const anioMantenimiento = fechaMantenimiento.getFullYear();
                
                const coincideMesAnio = mesMantenimiento === parseInt(mes) && anioMantenimiento === parseInt(anio);
                
                if (!coincideMesAnio) return false;
                
                if (tipo !== 'completo') {
                    const tipoMantenimiento = mantenimiento.tipo ? mantenimiento.tipo.toLowerCase() : '';
                    return tipoMantenimiento === tipo.toLowerCase();
                }
                
                return true;
                
            } catch (error) {
                console.warn('⚠️ Error procesando mantenimiento:', mantenimiento, error);
                return false;
            }
        });
    }

    /**
     * ✅ MÉTODO CORREGIDO: Normalizar datos con búsqueda exhaustiva del tipo
     */
    normalizarDatosMantenimientos(mantenimientos) {
        return mantenimientos.map((m, index) => {
            console.log('🔍 Procesando mantenimiento para reporte - ID:', m.id, m);
            
            // ✅ OBTENER TIPO - Búsqueda exhaustiva
            let tipo = this.obtenerTipoMantenimiento(m);
            
            // ✅ OBTENER UBICACIÓN
            let ubicacion = 'Ubicación no especificada';
            if (m.ubicacion_dispositivo) {
                ubicacion = m.ubicacion_dispositivo;
            } else if (m.ubicacion) {
                ubicacion = m.ubicacion;
            } else if (m.departamento) {
                ubicacion = m.departamento;
            } else if (m.nombre_dispositivo && m.nombre_dispositivo !== 'Dispositivo no encontrado') {
                ubicacion = m.nombre_dispositivo;
            }
            
            // ✅ OBTENER TÉCNICO
            let tecnico = 'Técnico no asignado';
            if (m.tecnico) {
                tecnico = m.tecnico;
            } else if (m.nombre_tecnico) {
                tecnico = m.nombre_tecnico;
            } else if (m.id_usuarios) {
                tecnico = `Técnico ${m.id_usuarios}`;
            }
            
            // ✅ OBTENER REPUESTOS
            let repuestos = 'Ninguno';
            if (m.repuestos) {
                repuestos = m.repuestos;
            } else if (m.repuesto_utilizado) {
                repuestos = m.repuesto_utilizado;
            } else if (m.id_repuesto) {
                repuestos = `Repuesto ${m.id_repuesto}`;
            }
            
            // ✅ OBTENER ESTADO
            let estado = m.estado || 'Completado';
            // Corregir estados mal escritos
            if (estado.includes('Entreprise')) estado = 'En Progreso';
            if (estado.includes('Inclusive')) estado = 'Pendiente';
            
            const mantenimientoNormalizado = {
                id: m.id || index + 1,
                fecha: m.fecha || new Date().toISOString(),
                tecnico: tecnico,
                tipo: tipo, // ✅ AHORA SÍ INCLUYE EL TIPO CORRECTAMENTE
                ubicacion: ubicacion,
                estado: estado,
                descripcion: m.descripcion || 'Mantenimiento realizado',
                repuestos: repuestos
            };
            
            console.log('✅ Mantenimiento normalizado:', {
                id: mantenimientoNormalizado.id,
                tipo: mantenimientoNormalizado.tipo,
                tecnico: mantenimientoNormalizado.tecnico,
                ubicacion: mantenimientoNormalizado.ubicacion,
                estado: mantenimientoNormalizado.estado
            });
            
            return mantenimientoNormalizado;
        });
    }

    /**
     * ✅ MÉTODO MEJORADO: Búsqueda exhaustiva del tipo de mantenimiento
     */
    obtenerTipoMantenimiento(mantenimiento) {
        if (!mantenimiento) return 'Preventivo';
        
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
        
        // Si no se encuentra en campos específicos, buscar en datos extendidos
        if (mantenimiento.extendedProps && mantenimiento.extendedProps.tipo) {
            console.log(`✅ Tipo encontrado en extendedProps:`, mantenimiento.extendedProps.tipo);
            return this.normalizarTipo(mantenimiento.extendedProps.tipo);
        }
        
        console.warn('⚠️ No se pudo determinar el tipo del mantenimiento ID:', mantenimiento.id);
        console.log('📋 Campos disponibles:', Object.keys(mantenimiento));
        return 'Preventivo';
    }

    /**
     * ✅ MÉTODO: Normalizar el tipo a valores estándar
     */
    normalizarTipo(tipo) {
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
    }

    updateResumenEstadisticas(mantenimientos) {
        try {
            const total = mantenimientos.length;
            const preventivos = mantenimientos.filter(m => m.tipo === 'Preventivo').length;
            const correctivos = mantenimientos.filter(m => m.tipo === 'Correctivo').length;
            const predictivos = mantenimientos.filter(m => m.tipo === 'Predictivo').length;
            const completados = mantenimientos.filter(m => m.estado === 'Completado').length;
            const eficiencia = total > 0 ? Math.round((completados / total) * 100) : 0;

            this.setElementText('total-mantenimientos', total);
            this.setElementText('total-preventivos', preventivos);
            this.setElementText('total-correctivos', correctivos);
            this.setElementText('eficiencia', `${eficiencia}%`);

            console.log(`📊 Resumen: Total: ${total}, Preventivos: ${preventivos}, Correctivos: ${correctivos}, Predictivos: ${predictivos}, Eficiencia: ${eficiencia}%`);
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    /**
     * ✅ MÉTODO CORREGIDO: Actualizar tabla detallada SIN COLUMNA DURACIÓN
     */
    updateTablaDetallada(mantenimientos) {
        try {
            const tbody = document.getElementById('tabla-reporte-body');
            if (!tbody) {
                console.error('❌ No se encontró el tbody de la tabla de reportes');
                return;
            }

            tbody.innerHTML = '';

            if (mantenimientos.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: #6c757d;">
                            <i class="fas fa-inbox"></i> No hay mantenimientos para el período seleccionado
                        </td>
                    </tr>
                `;
                return;
            }

            mantenimientos.forEach(mantenimiento => {
                const row = document.createElement('tr');
                
                const estadoClass = `estado-${mantenimiento.estado.toLowerCase().replace(' ', '-')}`;

                row.innerHTML = `
                    <td>${this.formatearFecha(mantenimiento.fecha)}</td>
                    <td>${mantenimiento.tecnico}</td>
                    <td>
                        <span class="tipo-badge ${this.getTipoClass(mantenimiento.tipo)}">
                            ${mantenimiento.tipo}
                        </span>
                    </td>
                    <td>${mantenimiento.ubicacion}</td>
                    <td><span class="estado-badge ${estadoClass}">${mantenimiento.estado}</span></td>
                    <td>${mantenimiento.repuestos}</td>
                `;
                
                tbody.appendChild(row);
            });

            console.log(`✅ Tabla actualizada con ${mantenimientos.length} mantenimientos`);

        } catch (error) {
            console.error('Error actualizando tabla:', error);
        }
    }

    /**
     * ✅ MÉTODO: Obtener clase CSS para el tipo de mantenimiento
     */
    getTipoClass(tipo) {
        const tipoLower = tipo.toLowerCase();
        if (tipoLower.includes('preventivo')) return 'tipo-preventivo';
        if (tipoLower.includes('correctivo')) return 'tipo-correctivo';
        if (tipoLower.includes('predictivo')) return 'tipo-predictivo';
        return 'tipo-default';
    }

    async updateGraficas(mantenimientos) {
        try {
            this.destroyCharts();
            this.crearGraficaTipoMantenimiento(mantenimientos);
            this.crearGraficaTecnicos(mantenimientos);
            this.crearGraficaEvolucion(mantenimientos);
            this.crearGraficaUbicaciones(mantenimientos);

        } catch (error) {
            console.error('Error actualizando gráficas:', error);
            this.showError('Error al generar las gráficas: ' + error.message);
        }
    }

    crearGraficaTipoMantenimiento(mantenimientos) {
        try {
            const ctx = document.getElementById('tipo-mantenimiento-chart');
            if (!ctx) return;

            const tipos = ['Preventivo', 'Correctivo', 'Predictivo'];
            const datos = tipos.map(tipo => 
                mantenimientos.filter(m => m.tipo === tipo).length
            );

            if (this.charts.tipoMantenimiento) {
                this.charts.tipoMantenimiento.destroy();
            }

            this.charts.tipoMantenimiento = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: tipos,
                    datasets: [{
                        data: datos,
                        backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfica de tipos:', error);
        }
    }

    crearGraficaTecnicos(mantenimientos) {
        try {
            const ctx = document.getElementById('tecnico-chart');
            if (!ctx) return;

            const tecnicosMap = {};
            mantenimientos.forEach(m => {
                const tecnico = m.tecnico || 'Sin asignar';
                tecnicosMap[tecnico] = (tecnicosMap[tecnico] || 0) + 1;
            });

            const tecnicos = Object.keys(tecnicosMap);
            const datos = Object.values(tecnicosMap);

            if (this.charts.tecnico) {
                this.charts.tecnico.destroy();
            }

            this.charts.tecnico = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: tecnicos,
                    datasets: [{
                        label: 'Mantenimientos',
                        data: datos,
                        backgroundColor: '#03213f',
                        borderColor: '#021e3a',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cantidad de Mantenimientos'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Técnicos'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfica de técnicos:', error);
        }
    }

    crearGraficaEvolucion(mantenimientos) {
        try {
            const ctx = document.getElementById('evolucion-chart');
            if (!ctx) return;

            const semanas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
            const datos = semanas.map((semana, index) => 
                mantenimientos.filter(m => this.getSemanaDelMes(m.fecha) === index + 1).length
            );

            if (this.charts.evolucion) {
                this.charts.evolucion.destroy();
            }

            this.charts.evolucion = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: semanas,
                    datasets: [{
                        label: 'Mantenimientos',
                        data: datos,
                        borderColor: '#03213f',
                        backgroundColor: 'rgba(3, 33, 63, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cantidad de Mantenimientos'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfica de evolución:', error);
        }
    }

    crearGraficaUbicaciones(mantenimientos) {
        try {
            const ctx = document.getElementById('dispositivos-chart');
            if (!ctx) return;

            const ubicacionesCount = {};
            mantenimientos.forEach(m => {
                const ubicacion = m.ubicacion || 'Sin identificar';
                ubicacionesCount[ubicacion] = (ubicacionesCount[ubicacion] || 0) + 1;
            });

            const topUbicaciones = Object.entries(ubicacionesCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            if (this.charts.ubicaciones) {
                this.charts.ubicaciones.destroy();
            }

            this.charts.ubicaciones = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: topUbicaciones.map(d => d[0]),
                    datasets: [{
                        label: 'Mantenimientos por Ubicación',
                        data: topUbicaciones.map(d => d[1]),
                        backgroundColor: '#17a2b8'
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Cantidad de Mantenimientos'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Ubicaciones Más Atendidas'
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfica de ubicaciones:', error);
        }
    }

    // Métodos utilitarios
    formatearFecha(fecha) {
        try {
            return new Date(fecha).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    getSemanaDelMes(fecha) {
        try {
            const date = new Date(fecha);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
            const offset = firstDay > 0 ? firstDay - 1 : 6;
            return Math.ceil((date.getDate() + offset) / 7);
        } catch (error) {
            return 1;
        }
    }

    getNombreMes(mes) {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return meses[parseInt(mes) - 1] || 'Mes inválido';
    }

    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    showLoading() {
        const tbody = document.getElementById('tabla-reporte-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        <div class="loading-spinner" style="margin: 0 auto 15px auto;"></div>
                        <div style="color: #6c757d;">Cargando datos del reporte...</div>
                    </td>
                </tr>
            `;
        }
    }

    showError(mensaje) {
        const tbody = document.getElementById('tabla-reporte-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2em; margin-bottom: 10px;"></i>
                        <div>${mensaje}</div>
                    </td>
                </tr>
            `;
        }
        
        if (window.Utils) {
            Utils.showNotification(mensaje, 'error');
        }
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    /**
     * ✅ MÉTODO COMPLETO: Generar reporte PDF
     */
    async generatePDFReport() {
        try {
            const mes = document.getElementById('mes-reporte')?.value;
            const anio = document.getElementById('anio-reporte')?.value;
            const tipo = document.getElementById('tipo-reporte')?.value;

            if (!mes || !anio) {
                if (window.Utils) {
                    Utils.showNotification('Seleccione mes y año para generar el reporte', 'warning');
                }
                return;
            }

            if (!this.currentData || this.currentData.length === 0) {
                if (window.Utils) {
                    Utils.showNotification('No hay datos para generar el reporte PDF', 'warning');
                }
                return;
            }

            if (window.Utils) {
                Utils.showNotification('Generando reporte PDF...', 'info');
            }

            console.log(`📊 Generando PDF para ${mes}/${anio} - Tipo: ${tipo}`);

            // Crear contenido del PDF
            const pdfContent = this.generarContenidoPDF(mes, anio, tipo);

            // Usar jsPDF para generar el PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Configuración del documento
            doc.setFont('helvetica');
            doc.setFontSize(16);

            // Título
            doc.text('REPORTE DE MANTENIMIENTOS', 105, 20, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Período: ${this.getNombreMes(mes)} ${anio}`, 105, 30, { align: 'center' });
            
            if (tipo !== 'completo') {
                doc.text(`Tipo: ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`, 105, 37, { align: 'center' });
            }

            // Estadísticas resumen
            doc.setFontSize(10);
            let yPosition = 50;
            
            doc.setFillColor(240, 240, 240);
            doc.rect(20, yPosition - 5, 170, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.text('RESUMEN ESTADÍSTICO', 105, yPosition, { align: 'center' });
            
            yPosition += 15;
            doc.setFont(undefined, 'normal');
            
            const total = this.currentData.length;
            const preventivos = this.currentData.filter(m => m.tipo === 'Preventivo').length;
            const correctivos = this.currentData.filter(m => m.tipo === 'Correctivo').length;
            const predictivos = this.currentData.filter(m => m.tipo === 'Predictivo').length;
            const completados = this.currentData.filter(m => m.estado === 'Completado').length;
            const eficiencia = total > 0 ? Math.round((completados / total) * 100) : 0;

            doc.text(`Total de Mantenimientos: ${total}`, 30, yPosition);
            doc.text(`Preventivos: ${preventivos}`, 100, yPosition);
            doc.text(`Correctivos: ${correctivos}`, 150, yPosition);
            
            yPosition += 7;
            doc.text(`Predictivos: ${predictivos}`, 30, yPosition);
            doc.text(`Eficiencia: ${eficiencia}%`, 100, yPosition);

            yPosition += 15;

            // Tabla de mantenimientos
            doc.setFillColor(240, 240, 240);
            doc.rect(20, yPosition - 5, 170, 8, 'F');
            doc.setFont(undefined, 'bold');
            doc.text('DETALLE DE MANTENIMIENTOS', 105, yPosition, { align: 'center' });
            
            yPosition += 10;

            // Encabezados de tabla
            const headers = ['Fecha', 'Técnico', 'Tipo', 'Ubicación', 'Estado', 'Repuestos'];
            const columnWidths = [25, 35, 25, 40, 25, 20];
            let xPosition = 20;

            doc.setFillColor(200, 200, 200);
            doc.rect(20, yPosition, 170, 8, 'F');
            
            headers.forEach((header, index) => {
                doc.text(header, xPosition + 2, yPosition + 6);
                xPosition += columnWidths[index];
            });

            yPosition += 10;

            // Datos de la tabla
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            this.currentData.forEach((mantenimiento, index) => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }

                xPosition = 20;
                const rowData = [
                    mantenimiento.fecha ? this.formatearFecha(mantenimiento.fecha) : 'N/A',
                    mantenimiento.tecnico || 'N/A',
                    mantenimiento.tipo || 'N/A',
                    mantenimiento.ubicacion || 'N/A',
                    mantenimiento.estado || 'N/A',
                    mantenimiento.repuestos || 'N/A'
                ];

                rowData.forEach((data, colIndex) => {
                    // Truncar texto largo
                    const maxLength = colIndex === 3 ? 25 : 15; // Ubicación permite más caracteres
                    const displayText = data.length > maxLength ? data.substring(0, maxLength - 3) + '...' : data;
                    
                    doc.text(displayText, xPosition + 2, yPosition + 4);
                    xPosition += columnWidths[colIndex];
                });

                yPosition += 8;
            });

            // Pie de página
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Página ${i} de ${totalPages}`, 105, 285, { align: 'center' });
                doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 105, 290, { align: 'center' });
            }

            // Descargar el PDF
            const fileName = `Reporte_Mantenimientos_${this.getNombreMes(mes)}_${anio}.pdf`;
            doc.save(fileName);

            if (window.Utils) {
                Utils.showNotification(`Reporte PDF "${fileName}" generado correctamente`, 'success');
            }

        } catch (error) {
            console.error('Error generando PDF:', error);
            if (window.Utils) {
                Utils.showNotification('Error al generar el reporte PDF: ' + error.message, 'error');
            }
        }
    }

    /**
     * ✅ MÉTODO COMPLETO: Exportar a Excel
     */
    async exportToExcel() {
        try {
            const mes = document.getElementById('mes-reporte')?.value;
            const anio = document.getElementById('anio-reporte')?.value;
            const tipo = document.getElementById('tipo-reporte')?.value;

            if (!mes || !anio) {
                if (window.Utils) {
                    Utils.showNotification('Seleccione mes y año para exportar', 'warning');
                }
                return;
            }

            if (!this.currentData || this.currentData.length === 0) {
                if (window.Utils) {
                    Utils.showNotification('No hay datos para exportar a Excel', 'warning');
                }
                return;
            }

            if (window.Utils) {
                Utils.showNotification('Exportando a Excel...', 'info');
            }

            console.log(`📊 Exportando Excel para ${mes}/${anio} - Tipo: ${tipo}`);

            // Crear libro de trabajo
            const wb = XLSX.utils.book_new();

            // Hoja de datos principales
            const datosExcel = this.prepararDatosParaExcel();
            const ws = XLSX.utils.json_to_sheet(datosExcel);

            // Estilos básicos para encabezados
            if (!ws['!cols']) ws['!cols'] = [];
            const columnWidths = [
                { wch: 12 }, // Fecha
                { wch: 20 }, // Técnico
                { wch: 12 }, // Tipo
                { wch: 25 }, // Ubicación
                { wch: 12 }, // Estado
                { wch: 20 }  // Repuestos
            ];
            ws['!cols'] = columnWidths;

            // Agregar hoja al libro
            XLSX.utils.book_append_sheet(wb, ws, 'Mantenimientos');

            // Hoja de resumen estadístico
            const resumenData = this.generarDatosResumenExcel(mes, anio, tipo);
            const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
            
            // Ajustar anchos de columna para resumen
            if (!wsResumen['!cols']) wsResumen['!cols'] = [];
            wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }];
            
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

            // Generar archivo Excel
            const fileName = `Reporte_Mantenimientos_${this.getNombreMes(mes)}_${anio}.xlsx`;
            XLSX.writeFile(wb, fileName);

            if (window.Utils) {
                Utils.showNotification(`Reporte Excel "${fileName}" exportado correctamente`, 'success');
            }

        } catch (error) {
            console.error('Error exportando a Excel:', error);
            if (window.Utils) {
                Utils.showNotification('Error al exportar a Excel: ' + error.message, 'error');
            }
        }
    }

    /**
     * ✅ MÉTODO AUXILIAR: Preparar datos para Excel
     */
    prepararDatosParaExcel() {
        return this.currentData.map(mantenimiento => ({
            'Fecha': mantenimiento.fecha ? this.formatearFecha(mantenimiento.fecha) : 'N/A',
            'Técnico': mantenimiento.tecnico || 'N/A',
            'Tipo': mantenimiento.tipo || 'N/A',
            'Ubicación': mantenimiento.ubicacion || 'N/A',
            'Estado': mantenimiento.estado || 'N/A',
            'Repuestos Utilizados': mantenimiento.repuestos || 'N/A'
        }));
    }

    /**
     * ✅ MÉTODO AUXILIAR: Generar datos de resumen para Excel
     */
    generarDatosResumenExcel(mes, anio, tipo) {
        const total = this.currentData.length;
        const preventivos = this.currentData.filter(m => m.tipo === 'Preventivo').length;
        const correctivos = this.currentData.filter(m => m.tipo === 'Correctivo').length;
        const predictivos = this.currentData.filter(m => m.tipo === 'Predictivo').length;
        const completados = this.currentData.filter(m => m.estado === 'Completado').length;
        const eficiencia = total > 0 ? Math.round((completados / total) * 100) : 0;

        return [
            ['REPORTE DE MANTENIMIENTOS', ''],
            ['Período', `${this.getNombreMes(mes)} ${anio}`],
            ['Tipo de Reporte', tipo !== 'completo' ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : 'Completo'],
            ['', ''],
            ['ESTADÍSTICAS', ''],
            ['Total de Mantenimientos', total],
            ['Mantenimientos Preventivos', preventivos],
            ['Mantenimientos Correctivos', correctivos],
            ['Mantenimientos Predictivos', predictivos],
            ['Mantenimientos Completados', completados],
            ['Eficiencia General', `${eficiencia}%`],
            ['', ''],
            ['Generado el', new Date().toLocaleDateString('es-ES')]
        ];
    }

    /**
     * ✅ MÉTODO AUXILIAR: Generar contenido para PDF
     */
    generarContenidoPDF(mes, anio, tipo) {
        // Este método ahora está integrado en generatePDFReport
        return null;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.ReportesManager = new ReportesManager();
        console.log('✅ ReportesManager inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando ReportesManager:', error);
    }
});