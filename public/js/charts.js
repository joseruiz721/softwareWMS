// ==============================================
// MÓDULO: Charts - Gestión de gráficos
// ==============================================

const ChartsManager = {
    /**
     * ✅ OBJETO: Almacenamiento de instancias de gráficos
     */
    charts: {
        typeChart: null,
        statusChart: null,
        categoryChart: null,
        stockChart: null
    },

    /**
     * ✅ MÉTODO: Actualiza o crea los gráficos con nuevos datos
     */
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

    /**
     * ✅ MÉTODO: Actualiza los gráficos de estadísticas de repuestos
     */
    updateSuppliesCharts: function(supplies) {
        const categoryData = this.countByProperty(supplies, 'proceso');
        const stockData = this.analyzeStockLevels(supplies);
        
        this.charts.categoryChart = this.createOrUpdateChart(
            'category-chart', 
            this.charts.categoryChart, 
            'doughnut', 
            Object.keys(categoryData), 
            Object.values(categoryData),
            ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6'],
            'Distribución por Proceso'
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

    /**
     * ✅ MÉTODO: Crea o actualiza un gráfico de Chart.js
     */
    createOrUpdateChart: function(canvasId, chartInstance, type, labels, data, colors, title) {
        const ctx = document.getElementById(canvasId);
        
        if (!ctx) {
            console.warn(`⚠️ Canvas no encontrado: ${canvasId}`);
            return null;
        }
        
        const context = ctx.getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        const options = this.getChartOptions(type, title);
        
        return new Chart(context, {
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

    /**
     * ✅ MÉTODO: Configuración común para gráficos
     */
    getChartOptions: function(type, title) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right', 
                    labels: { 
                        font: { 
                            size: 12 
                        } 
                    } 
                },
                title: {
                    display: true,
                    text: title,
                    font: { 
                        size: 16, 
                        weight: 'bold' 
                    },
                    padding: { 
                        top: 10, 
                        bottom: 20 
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                            return `${context.label}: ${context.raw} (${percent}%)`;
                        }
                    }
                }
            }
        };
        
        if (type === 'bar') {
            options.scales = {
                y: { 
                    beginAtZero: true, 
                    ticks: { 
                        stepSize: 1, 
                        precision: 0 
                    } 
                },
                x: { 
                    grid: { 
                        display: false 
                    } 
                }
            };
        }
        
        return options;
    },

    /**
     * ✅ MÉTODO: Cuenta dispositivos por una propiedad específica
     */
    countByProperty: function(items, property) {
        return items.reduce((count, item) => {
            const key = item[property] || 'Desconocido';
            count[key] = (count[key] || 0) + 1;
            return count;
        }, {});
    },

    /**
     * ✅ MÉTODO: Analiza los niveles de stock
     */
    analyzeStockLevels: function(supplies) {
        return supplies.reduce((acc, supply) => {
            const cantidad = parseInt(supply.cantidad) || 0;
            const minimo = parseInt(supply.stock_minimo) || 0;
            
            if (cantidad === 0) acc.out++;
            else if (cantidad <= minimo) acc.low++;
            else acc.available++;
            
            return acc;
        }, { available: 0, low: 0, out: 0 });
    },

    /**
     * ✅ MÉTODO: Obtiene el color para un estado en los gráficos
     */
    getStatusColor: function(status) {
        if (!status) return '#7f8c8d';
        
        const statusLower = status.toLowerCase();
        if (statusLower.includes('activo')) return '#2ecc71';
        if (statusLower.includes('reparación') || statusLower.includes('mantenimiento')) return '#f39c12';
        if (statusLower.includes('dañado') || statusLower.includes('error')) return '#e74c3c';
        if (statusLower.includes('retirado')) return '#95a5a6';
        if (statusLower.includes('standby')) return '#3498db';
        return '#7f8c8d';
    },

    /**
     * ✅ MÉTODO: Destruye todos los gráficos
     */
    destroyAllCharts: function() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {
            typeChart: null,
            statusChart: null,
            categoryChart: null,
            stockChart: null
        };
    }
};

// Hacer disponible globalmente
window.ChartsManager = ChartsManager;