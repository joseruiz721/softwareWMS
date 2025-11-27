// ==============================================
// UTILIDAD: excelExport - Exportación de datos a Excel
// ==============================================

const ExcelJS = require('exceljs');
const { queryAsync } = require('./queryAsync'); // ✅ CORREGIDO

/**
 * ✅ FUNCIÓN: Exporta el inventario completo a Excel
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<Buffer>} Buffer del archivo Excel
 */
async function exportInventoryToExcel(options = {}) {
    const {
        includeDevices = true,
        includeSupplies = true,
        includeMaintenance = false,
        format = 'xlsx'
    } = options;

    try {
        console.log('📊 Iniciando exportación de inventario a Excel...');
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sistema WMS Mizooco';
        workbook.lastModifiedBy = 'Sistema WMS';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Estilos predefinidos
        const headerStyle = {
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2E86C1' }
            },
            font: {
                color: { argb: 'FFFFFFFF' },
                bold: true,
                size: 12
            },
            border: {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } }
            },
            alignment: {
                vertical: 'middle',
                horizontal: 'center'
            }
        };
        
        const cellStyle = {
            border: {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            },
            alignment: {
                vertical: 'middle',
                horizontal: 'left'
            }
        };

        // Exportar dispositivos si está habilitado
        if (includeDevices) {
            await exportDevicesToSheet(workbook, headerStyle, cellStyle);
        }
        
        // Exportar repuestos si está habilitado
        if (includeSupplies) {
            await exportSuppliesToSheet(workbook, headerStyle, cellStyle);
        }
        
        // Exportar mantenimientos si está habilitado
        if (includeMaintenance) {
            await exportMaintenanceToSheet(workbook, headerStyle, cellStyle);
        }
        
        // Hoja de resumen
        await createSummarySheet(workbook, headerStyle, cellStyle, {
            includeDevices,
            includeSupplies,
            includeMaintenance
        });

        console.log('✅ Exportación completada, generando archivo...');
        
        // Generar buffer según el formato solicitado
        let buffer;
        if (format === 'xlsx') {
            buffer = await workbook.xlsx.writeBuffer();
        } else if (format === 'csv') {
            // Nota: ExcelJS no soporta CSV directamente, se podría implementar
            buffer = await workbook.xlsx.writeBuffer();
        } else {
            throw new Error(`Formato no soportado: ${format}`);
        }
        
        console.log(`✅ Archivo Excel generado exitosamente (${Math.round(buffer.length / 1024)} KB)`);
        return buffer;
        
    } catch (error) {
        console.error('❌ Error en exportación Excel:', error);
        throw new Error(`Error al exportar inventario: ${error.message}`);
    }
}

/**
 * ✅ FUNCIÓN: Exporta dispositivos a hoja de Excel
 */
async function exportDevicesToSheet(workbook, headerStyle, cellStyle) {
    console.log('   📱 Exportando dispositivos...');
    
    const worksheet = workbook.addWorksheet('Dispositivos');
    
    // Obtener datos de todos los tipos de dispositivos
    const deviceTypes = [
        { name: 'Ordenadores', table: 'ordenadores', displayName: 'Ordenador' },
        { name: 'Access Point', table: 'access_point', displayName: 'Access Point' },
        { name: 'Readers', table: 'readers', displayName: 'Reader' },
        { name: 'Etiquetadoras', table: 'etiquetadoras', displayName: 'Etiquetadora' },
        { name: 'Tablets', table: 'tablets', displayName: 'Tablet' },
        { name: 'Lectores QR', table: 'lectores_qr', displayName: 'Lector QR' }
    ];
    
    let allDevices = [];
    
    for (const deviceType of deviceTypes) {
        try {
            const devices = await queryAsync(`SELECT * FROM ${deviceType.table}`);
            const devicesWithType = devices.map(device => ({
                ...device,
                tipo_dispositivo: deviceType.displayName
            }));
            allDevices = [...allDevices, ...devicesWithType];
        } catch (error) {
            console.warn(`⚠️ Error obteniendo ${deviceType.name}:`, error.message);
        }
    }
    
    if (allDevices.length === 0) {
        worksheet.addRow(['No hay dispositivos registrados']);
        return;
    }
    
    // Configurar columnas
    worksheet.columns = [
        { header: 'Tipo', key: 'tipo_dispositivo', width: 15 },
        { header: 'Nombre/Modelo', key: 'nombre_modelo', width: 20 },
        { header: 'IP', key: 'ip', width: 15 },
        { header: 'Serial', key: 'serial', width: 20 },
        { header: 'Activo Fijo', key: 'activo_fijo', width: 15 },
        { header: 'Ubicación', key: 'ubicacion', width: 20 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 12 },
        { header: 'Observaciones', key: 'observaciones', width: 30 }
    ];
    
    // Aplicar estilo al header
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        Object.assign(cell, headerStyle);
    });
    
    // Agregar datos
    allDevices.forEach(device => {
        const row = worksheet.addRow({
            tipo_dispositivo: device.tipo_dispositivo,
            nombre_modelo: device.marca || device.modelo || device.tipo_dispositivo,
            ip: device.ip || 'N/A',
            serial: device.serial || 'N/A',
            activo_fijo: device.activo_fijo || 'No asignado',
            ubicacion: device.ubicacion || 'No especificada',
            estado: device.estado || 'Desconocido',
            fecha_ingreso: device.fecha_ingreso ? 
                new Date(device.fecha_ingreso).toLocaleDateString('es-ES') : 'N/A',
            observaciones: device.observaciones || device.observacion || 'Ninguna'
        });
        
        // Aplicar estilo a las celdas
        row.eachCell((cell) => {
            Object.assign(cell, cellStyle);
        });
    });
    
    // Congelar la primera fila (header)
    worksheet.views = [
        { state: 'frozen', ySplit: 1 }
    ];
    
    console.log(`   ✅ ${allDevices.length} dispositivos exportados`);
}

/**
 * ✅ FUNCIÓN: Exporta repuestos a hoja de Excel
 */
async function exportSuppliesToSheet(workbook, headerStyle, cellStyle) {
    console.log('   📦 Exportando repuestos...');
    
    const worksheet = workbook.addWorksheet('Repuestos');
    
    let repuestos = [];
    try {
        repuestos = await queryAsync(`
            SELECT * FROM repuestos 
            ORDER BY nombre, codigo
        `);
    } catch (error) {
        console.warn('⚠️ Error obteniendo repuestos:', error.message);
    }
    
    if (repuestos.length === 0) {
        worksheet.addRow(['No hay repuestos registrados']);
        return;
    }
    
    // Configurar columnas
    worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 25 },
        { header: 'Código', key: 'codigo', width: 15 },
        { header: 'Código Siesa', key: 'codigo_siesa', width: 15 },
        { header: 'Proceso', key: 'proceso', width: 20 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'Stock Mínimo', key: 'stock_minimo', width: 12 },
        { header: 'Rotación', key: 'rotacion', width: 12 },
        { header: 'Ubicación', key: 'ubicacion', width: 20 },
        { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 12 },
        { header: 'Descripción', key: 'descripcion', width: 30 }
    ];
    
    // Aplicar estilo al header
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        Object.assign(cell, headerStyle);
    });
    
    // Agregar datos con formato condicional para stock
    repuestos.forEach(repuesto => {
        const row = worksheet.addRow({
            nombre: repuesto.nombre || 'Sin nombre',
            codigo: repuesto.codigo || 'N/A',
            codigo_siesa: repuesto.codigo_siesa || 'N/A',
            proceso: repuesto.proceso || 'No especificado',
            cantidad: repuesto.cantidad || 0,
            stock_minimo: repuesto.stock_minimo || 0,
            rotacion: repuesto.rotacion || 'Media',
            ubicacion: repuesto.ubicacion || 'No especificada',
            fecha_ingreso: repuesto.fecha_ingreso ? 
                new Date(repuesto.fecha_ingreso).toLocaleDateString('es-ES') : 'N/A',
            descripcion: repuesto.descripcion || 'Sin descripción'
        });
        
        // Aplicar estilo y formato condicional
        row.eachCell((cell, colNumber) => {
            Object.assign(cell, cellStyle);
            
            // Resaltar stock bajo o agotado
            if (colNumber === 5 || colNumber === 6) { // Columnas de cantidad y stock mínimo
                const cantidad = parseInt(repuesto.cantidad) || 0;
                const minimo = parseInt(repuesto.stock_minimo) || 0;
                
                if (cantidad === 0) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFCCCC' } // Rojo claro para agotado
                    };
                } else if (cantidad <= minimo) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFFFCC' } // Amarillo para bajo stock
                    };
                }
            }
        });
    });
    
    // Congelar la primera fila
    worksheet.views = [
        { state: 'frozen', ySplit: 1 }
    ];
    
    console.log(`   ✅ ${repuestos.length} repuestos exportados`);
}

/**
 * ✅ FUNCIÓN: Exporta mantenimientos a hoja de Excel
 */
async function exportMaintenanceToSheet(workbook, headerStyle, cellStyle) {
    console.log('   🔧 Exportando mantenimientos...');
    
    const worksheet = workbook.addWorksheet('Mantenimientos');
    
    let mantenimientos = [];
    try {
        mantenimientos = await queryAsync(`
            SELECT 
                m.*, 
                u.nombre as tecnico,
                COALESCE(r.nombre, 'Sin repuesto') as repuesto_nombre,
                COALESCE(d.nombre_dispositivo, 'Dispositivo no especificado') as dispositivo_nombre
            FROM mantenimientos m
            LEFT JOIN usuarios u ON m.id_usuarios = u.id
            LEFT JOIN repuestos r ON m.id_repuesto = r.id
            LEFT JOIN (
                SELECT id::text, COALESCE(marca, 'Ordenador') as nombre_dispositivo FROM ordenadores
                UNION ALL SELECT id::text, COALESCE(modelo, 'Access Point') as nombre_dispositivo FROM access_point
                UNION ALL SELECT id::text, 'Reader' as nombre_dispositivo FROM readers
                UNION ALL SELECT id::text, COALESCE(modelo, 'Etiquetadora') as nombre_dispositivo FROM etiquetadoras
                UNION ALL SELECT id::text, 'Tablet' as nombre_dispositivo FROM tablets
                UNION ALL SELECT id::text, COALESCE(modelo, 'Lector QR') as nombre_dispositivo FROM lectores_qr
            ) d ON m.id_dispositivo::text = d.id
            ORDER BY m.fecha DESC
        `);
    } catch (error) {
        console.warn('⚠️ Error obteniendo mantenimientos:', error.message);
    }
    
    if (mantenimientos.length === 0) {
        worksheet.addRow(['No hay mantenimientos registrados']);
        return;
    }
    
    // Configurar columnas
    worksheet.columns = [
        { header: 'Técnico', key: 'tecnico', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 15 },
        { header: 'Dispositivo', key: 'dispositivo_nombre', width: 25 },
        { header: 'Repuesto', key: 'repuesto_nombre', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 12 },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Descripción', key: 'descripcion', width: 30 },
        { header: 'Observaciones', key: 'observaciones', width: 30 }
    ];
    
    // Aplicar estilo al header
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        Object.assign(cell, headerStyle);
    });
    
    // Agregar datos
    mantenimientos.forEach(mantenimiento => {
        const row = worksheet.addRow({
            tecnico: mantenimiento.tecnico || 'Técnico no especificado',
            tipo: mantenimiento.tipo || 'No especificado',
            dispositivo_nombre: mantenimiento.dispositivo_nombre,
            repuesto_nombre: mantenimiento.repuesto_nombre,
            fecha: mantenimiento.fecha ? 
                new Date(mantenimiento.fecha).toLocaleDateString('es-ES') : 'N/A',
            estado: mantenimiento.estado || 'Pendiente',
            descripcion: mantenimiento.descripcion || 'Sin descripción',
            observaciones: mantenimiento.observaciones || 'Ninguna'
        });
        
        // Aplicar estilo a las celdas
        row.eachCell((cell) => {
            Object.assign(cell, cellStyle);
        });
    });
    
    // Congelar la primera fila
    worksheet.views = [
        { state: 'frozen', ySplit: 1 }
    ];
    
    console.log(`   ✅ ${mantenimientos.length} mantenimientos exportados`);
}

/**
 * ✅ FUNCIÓN: Crea hoja de resumen
 */
async function createSummarySheet(workbook, headerStyle, cellStyle, options) {
    console.log('   📈 Creando hoja de resumen...');
    
    const worksheet = workbook.addWorksheet('Resumen');
    
    // Estadísticas generales
    let totalDispositivos = 0;
    let totalRepuestos = 0;
    let totalMantenimientos = 0;
    
    try {
        if (options.includeDevices) {
            const deviceCounts = await queryAsync(`
                SELECT 
                    (SELECT COUNT(*) FROM ordenadores WHERE estado = 'Activo') as ordenadores,
                    (SELECT COUNT(*) FROM access_point WHERE estado = 'Activo') as access_point,
                    (SELECT COUNT(*) FROM readers WHERE estado = 'Activo') as readers,
                    (SELECT COUNT(*) FROM etiquetadoras WHERE estado = 'Activo') as etiquetadoras,
                    (SELECT COUNT(*) FROM tablets WHERE estado = 'Activo') as tablets,
                    (SELECT COUNT(*) FROM lectores_qr WHERE estado = 'Activo') as lectores_qr
            `);
            
            if (deviceCounts.length > 0) {
                totalDispositivos = Object.values(deviceCounts[0]).reduce((sum, count) => sum + parseInt(count || 0), 0);
            }
        }
        
        if (options.includeSupplies) {
            const suppliesCount = await queryAsync(`SELECT COUNT(*) as total FROM repuestos`);
            totalRepuestos = suppliesCount[0]?.total || 0;
        }
        
        if (options.includeMaintenance) {
            const maintenanceCount = await queryAsync(`SELECT COUNT(*) as total FROM mantenimientos`);
            totalMantenimientos = maintenanceCount[0]?.total || 0;
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo estadísticas:', error.message);
    }
    
    // Información del reporte
    worksheet.addRow(['REPORTE DE INVENTARIO - SISTEMA WMS MIZOOCO']);
    worksheet.addRow(['Fecha de generación:', new Date().toLocaleDateString('es-ES')]);
    worksheet.addRow(['Hora de generación:', new Date().toLocaleTimeString('es-ES')]);
    worksheet.addRow([]); // Línea en blanco
    
    // Estadísticas
    worksheet.addRow(['ESTADÍSTICAS GENERALES']);
    worksheet.addRow(['Total de dispositivos activos:', totalDispositivos]);
    worksheet.addRow(['Total de repuestos:', totalRepuestos]);
    worksheet.addRow(['Total de mantenimientos:', totalMantenimientos]);
    worksheet.addRow([]);
    
    // Información del sistema
    worksheet.addRow(['INFORMACIÓN DEL SISTEMA']);
    worksheet.addRow(['Sistema:', 'Gestión WMS Mizooco']);
    worksheet.addRow(['Versión:', '2.1']);
    worksheet.addRow(['Generado por:', 'Sistema Automático']);
    
    // Aplicar estilos
    worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF2E86C1' } };
    worksheet.getRow(5).font = { bold: true, size: 14 };
    worksheet.getRow(10).font = { bold: true, size: 14 };
    
    // Autoajustar columnas
    worksheet.columns = [
        { width: 30 },
        { width: 25 }
    ];
    
    console.log('   ✅ Hoja de resumen creada');
}

/**
 * ✅ FUNCIÓN: Exporta datos específicos a Excel
 * @param {string} entityType - Tipo de entidad a exportar
 * @param {Array} data - Datos a exportar
 * @param {Object} options - Opciones de exportación
 */
async function exportSpecificData(entityType, data, options = {}) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(entityType);
    
    if (!data || data.length === 0) {
        worksheet.addRow(['No hay datos para exportar']);
        return await workbook.xlsx.writeBuffer();
    }
    
    // Configurar columnas basadas en las keys del primer objeto
    const firstItem = data[0];
    const columns = Object.keys(firstItem).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        key: key,
        width: 15
    }));
    
    worksheet.columns = columns;
    
    // Agregar datos
    data.forEach(item => {
        worksheet.addRow(item);
    });
    
    return await workbook.xlsx.writeBuffer();
}

module.exports = {
    exportInventoryToExcel,
    exportSpecificData
};