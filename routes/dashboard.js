const express = require('express');
const ExcelJS = require('exceljs');
const { queryAsync } = require('../config/database');
const Logger = require('../config/logger'); // 🆕 NUEVO IMPORT

const router = express.Router();

// Obtener estadísticas del dashboard
router.get("/stats", async (req, res) => {
    try {
        Logger.info('Solicitando estadísticas del dashboard', { 
            usuario: req.session.user.nombre 
        });

        const queries = [
            { name: 'ordenadores', sql: `SELECT COUNT(*) as count FROM ordenadores WHERE estado = 'Activo'` },
            { name: 'access_point', sql: `SELECT COUNT(*) as count FROM access_point WHERE estado = 'Activo'` },
            { name: 'readers', sql: `SELECT COUNT(*) as count FROM readers WHERE estado = 'Activo'` },
            { name: 'etiquetadoras', sql: `SELECT COUNT(*) as count FROM etiquetadoras WHERE estado = 'Activo'` },
            { name: 'tablets', sql: `SELECT COUNT(*) as count FROM tablets WHERE estado = 'Activo'` },
            { name: 'lectores_qr', sql: `SELECT COUNT(*) as count FROM lectores_qr WHERE estado = 'Activo'` },
            { name: 'repuestos', sql: `SELECT COUNT(*) as totalSupplies FROM repuestos` }
        ];

        const results = [];
        for (const query of queries) {
            try {
                Logger.database(`Consultando ${query.name} activos`);
                const result = await queryAsync(query.sql);
                results.push(result);
            } catch (error) {
                Logger.warn(`Error en consulta de ${query.name}`, { 
                    error: error.message 
                });
                results.push([{ count: 0, totalsupplies: 0 }]);
            }
        }

        const totalDispositivosActivos = results.slice(0, 6).reduce((sum, result, index) => {
            return sum + (result[0] ? parseInt(result[0].count || 0) : 0);
        }, 0);

        const totalSupplies = results[6][0] ? parseInt(results[6][0].totalsupplies || 0) : 0;

        const todayAlerts = Math.floor(Math.random() * 5);
        const criticalAlerts = todayAlerts > 0 ? Math.floor(Math.random() * todayAlerts) : 0;
        const activeTechs = 3 + Math.floor(Math.random() * 2);
        const busyTechs = Math.floor(Math.random() * activeTechs);

        Logger.info('Estadísticas del dashboard calculadas', {
            dispositivos: totalDispositivosActivos,
            repuestos: totalSupplies,
            alertas: todayAlerts,
            tecnicos: activeTechs,
            usuario: req.session.user.nombre
        });

        return res.json({
            activeDevices: totalDispositivosActivos,
            devicesChange: Math.floor(Math.random() * 5),
            totalSupplies: totalSupplies,
            suppliesChange: Math.floor(Math.random() * 3),
            todayAlerts,
            criticalAlerts,
            activeTechs,
            busyTechs
        });

    } catch (error) {
        Logger.error('Error al obtener estadísticas del dashboard', {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.json({
            activeDevices: 0,
            devicesChange: 0,
            totalSupplies: 0,
            suppliesChange: 0,
            todayAlerts: 0,
            criticalAlerts: 0,
            activeTechs: 3,
            busyTechs: 1
        });
    }
});

// Búsqueda de dispositivos y repuestos
router.get("/buscar", async (req, res) => {
    const { q } = req.query;
    
    Logger.info('Búsqueda simple solicitada', {
        termino: q,
        usuario: req.session.user.nombre
    });
    
    if (!q || q.length < 2) {
        Logger.warn('Término de búsqueda muy corto', { termino: q });
        return res.status(400).json({ 
            success: false, 
            message: "El término de búsqueda debe tener al menos 2 caracteres." 
        });
    }

    try {
        const query = `
            (SELECT id, ip, serial, estado, 'Ordenador' as tipo, ubicacion, activo_fijo,
                    COALESCE(marca, 'Ordenador') as nombre
             FROM ordenadores
             WHERE ip ILIKE $1 OR serial ILIKE $1 OR ubicacion ILIKE $1 OR marca ILIKE $1 OR activo_fijo ILIKE $1
             LIMIT 5)
            
            UNION ALL
            
            (SELECT id, ip, serial, estado, 'Access Point' as tipo, ubicacion, activo_fijo,
                    COALESCE(modelo, 'Access Point') as nombre
             FROM access_point
             WHERE ip ILIKE $1 OR serial ILIKE $1 OR ubicacion ILIKE $1 OR modelo ILIKE $1 OR activo_fijo ILIKE $1
             LIMIT 5)
            
            UNION ALL
            
            (SELECT id, ip, serial, estado, 'Reader' as tipo, ubicacion, activo_fijo,
                    'Reader' as nombre
             FROM readers
             WHERE ip ILIKE $1 OR serial ILIKE $1 OR ubicacion ILIKE $1 OR activo_fijo ILIKE $1
             LIMIT 5)
            
            UNION ALL
            
            (SELECT id, ip, serial, estado, 'Etiquetadora' as tipo, ubicacion, activo_fijo,
                    COALESCE(modelo, 'Etiquetadora') as nombre
             FROM etiquetadoras
             WHERE ip ILIKE $1 OR serial ILIKE $1 OR ubicacion ILIKE $1 OR modelo ILIKE $1 OR activo_fijo ILIKE $1
             LIMIT 5)
            
            UNION ALL
            
            (SELECT id, ip, serial, estado, 'Tablet' as tipo, ubicacion, activo_fijo,
                    'Tablet' as nombre
             FROM tablets
             WHERE ip ILIKE $1 OR serial ILIKE $1 OR ubicacion ILIKE $1 OR activo_fijo ILIKE $1
             LIMIT 5)
            
            UNION ALL
            
            (SELECT id, NULL as ip, modelo as serial, estado, 'Lector QR' as tipo, ubicacion, activo_fijo,
                    COALESCE(modelo, 'Lector QR') as nombre
             FROM lectores_qr
             WHERE ubicacion ILIKE $1 OR modelo ILIKE $1 OR activo_fijo ILIKE $1
             LIMIT 5)
            
            UNION ALL
            
            (SELECT id, NULL as ip, codigo as serial, 
                    CONCAT('Cantidad: ', cantidad) as estado, 
                    'Repuesto' as tipo, ubicacion,
                    NULL as activo_fijo,
                    nombre
             FROM repuestos
             WHERE nombre ILIKE $1 OR codigo ILIKE $1 OR descripcion ILIKE $1 OR ubicacion ILIKE $1
             LIMIT 5)
        `;

        const searchParam = `%${q}%`;
        
        Logger.database('Ejecutando búsqueda unificada', { termino: q });
        const results = await queryAsync(query, [searchParam]);

        // Ordenar resultados por coincidencia exacta
        results.sort((a, b) => {
            const exactMatchA = a.nombre.toLowerCase() === q.toLowerCase() || 
                              (a.serial && a.serial.toLowerCase() === q.toLowerCase()) ||
                              (a.activo_fijo && a.activo_fijo.toLowerCase() === q.toLowerCase());
            const exactMatchB = b.nombre.toLowerCase() === q.toLowerCase() || 
                              (b.serial && b.serial.toLowerCase() === q.toLowerCase()) ||
                              (b.activo_fijo && b.activo_fijo.toLowerCase() === q.toLowerCase());
            
            if (exactMatchA && !exactMatchB) return -1;
            if (!exactMatchA && exactMatchB) return 1;
            return 0;
        });

        Logger.info('Búsqueda simple completada', {
            termino: q,
            resultados: results.length,
            usuario: req.session.user.nombre
        });

        return res.json(results);

    } catch (error) {
        Logger.error("Error en la búsqueda simple", {
            error: error.message,
            termino: q,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: "Error al realizar la búsqueda." 
        });
    }
});

// Exportar inventario a Excel
router.get("/exportar-excel", async (req, res) => {
    try {
        Logger.info('Solicitando exportación de inventario a Excel', {
            usuario: req.session.user.nombre
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');

        let ordenadores = [], access_point = [], readers = [], etiquetadoras = [], 
            tablets = [], lectores_qr = [], mantenimientos = [], repuestos = [];
        
        try {
            Logger.info('Recopilando datos para exportación');
            
            [
                ordenadores, access_point, readers, etiquetadoras, 
                tablets, lectores_qr, mantenimientos, repuestos
            ] = await Promise.all([
                queryAsync(`SELECT * FROM ordenadores`),
                queryAsync(`SELECT * FROM access_point`),
                queryAsync(`SELECT * FROM readers`),
                queryAsync(`SELECT * FROM etiquetadoras`),
                queryAsync(`SELECT * FROM tablets`),
                queryAsync(`SELECT * FROM lectores_qr`),
                queryAsync(`SELECT * FROM mantenimientos`),
                queryAsync(`SELECT * FROM repuestos`)
            ]);

            Logger.debug('Datos recopilados para exportación', {
                ordenadores: ordenadores.length,
                access_point: access_point.length,
                readers: readers.length,
                etiquetadoras: etiquetadoras.length,
                tablets: tablets.length,
                lectores_qr: lectores_qr.length,
                mantenimientos: mantenimientos.length,
                repuestos: repuestos.length
            });

        } catch (queryError) {
            Logger.error("Error en consultas SQL para exportación", {
                error: queryError.message,
                usuario: req.session.user.nombre
            });
            throw new Error("Error al obtener datos de la base de datos");
        }

        if (!ordenadores.length && !access_point.length && !readers.length && 
            !etiquetadoras.length && !tablets.length && !lectores_qr.length && 
            !mantenimientos.length && !repuestos.length) {
            Logger.warn('No hay datos para exportar', {
                usuario: req.session.user.nombre
            });
            return res.status(404).json({ 
                success: false, 
                message: "No hay datos para exportar." 
            });
        }

        worksheet.columns = [
            { header: 'Tipo', key: 'tipo', width: 15 },
            { header: 'Nombre', key: 'nombre', width: 20 },
            { header: 'IP', key: 'ip', width: 15 },
            { header: 'Serial', key: 'serial', width: 20 },
            { header: 'Activo Fijo', key: 'activo_fijo', width: 15 },
            { header: 'Ubicación', key: 'ubicacion', width: 20 },
            { header: 'Estado', key: 'estado', width: 15 },
            { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 15 }
        ];

        const addDataToSheet = (data, tipo) => {
            data.forEach(d => {
                worksheet.addRow({
                    tipo: tipo,
                    nombre: d.marca || d.modelo || tipo,
                    ip: d.ip || '',
                    serial: d.serial || '',
                    activo_fijo: d.activo_fijo || '',
                    ubicacion: d.ubicacion || '',
                    estado: d.estado || '',
                    fecha_ingreso: d.fecha_ingreso || null
                });
            });
        };

        addDataToSheet(ordenadores, 'Ordenador');
        addDataToSheet(access_point, 'Access Point');
        addDataToSheet(readers, 'Reader');
        addDataToSheet(etiquetadoras, 'Etiquetadora');
        addDataToSheet(tablets, 'Tablet');
        addDataToSheet(lectores_qr, 'Lector QR');

        if (repuestos.length > 0) {
            const repuestosSheet = workbook.addWorksheet('Repuestos');
            repuestosSheet.columns = [
                { header: 'Nombre', key: 'nombre', width: 20 },
                { header: 'Código', key: 'codigo', width: 15 },
                { header: 'Cantidad', key: 'cantidad', width: 10 },
                { header: 'Ubicación', key: 'ubicacion', width: 20 },
                { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 15 }
            ];
            
            repuestos.forEach(i => {
                repuestosSheet.addRow({
                    nombre: i.nombre || '',
                    codigo: i.codigo || '',
                    cantidad: i.cantidad || 0,
                    ubicacion: i.ubicacion || '',
                    fecha_ingreso: i.fecha_ingreso || null
                });
            });
        }

        res.setHeader('Content-Type', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 
            'attachment; filename=inventario.xlsx');

        Logger.info('Generando archivo Excel para descarga', {
            usuario: req.session.user.nombre
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.end(Buffer.from(buffer));

        Logger.info('Exportación a Excel completada exitosamente', {
            usuario: req.session.user.nombre
        });

    } catch (error) {
        Logger.error("Error al exportar inventario a Excel", {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: error.message || "Error al exportar inventario." 
        });
    }
});

module.exports = router;