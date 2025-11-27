const express = require('express');
const { queryAsync } = require('../config/database');
const Logger = require('../config/logger'); // 🆕 NUEVO IMPORT

const router = express.Router();

// ==============================================
// FUNCIONES HELPER PARA PROCESAR IDs - CORREGIDA
// ==============================================

function procesarIdDispositivo(idUnico) {
    Logger.debug(`Procesando ID dispositivo: ${idUnico}`);
    
    if (!idUnico || idUnico === 'null' || idUnico === 'undefined') {
        Logger.warn('ID dispositivo es nulo o indefinido');
        return null;
    }
    
    // Si ya es un número, retornarlo directamente
    if (!isNaN(idUnico) && idUnico !== '') {
        const idNum = parseInt(idUnico);
        Logger.debug(`ID es número directo: ${idUnico} -> ${idNum}`);
        return idNum;
    }
    
    // Si es string con prefijo (ej: "etiquetadora_10")
    if (typeof idUnico === 'string' && idUnico.includes('_')) {
        const partes = idUnico.split('_');
        if (partes.length >= 2 && !isNaN(partes[1])) {
            const idNum = parseInt(partes[1]);
            Logger.debug(`ID extraído de prefijo: ${idUnico} -> ${idNum}`);
            return idNum;
        }
    }
    
    // Si llega aquí, hay un problema
    Logger.warn(`No se pudo procesar el ID: ${idUnico}`);
    return null;
}

// ==============================================
// RUTAS ESPECÍFICAS - SOLO ETIQUETADORAS Y READERS
// ==============================================

// Obtener técnicos para mantenimientos
router.get("/lista/tecnicos", async (req, res) => {
    try {
        Logger.info('Solicitando lista de técnicos para mantenimientos');
        
        const tecnicos = await queryAsync(`
            SELECT id, cedula, nombre, correo 
            FROM usuarios 
            ORDER BY nombre
        `);
        
        Logger.info('Lista de técnicos obtenida', { 
            cantidad: tecnicos.length 
        });
        
        return res.json(tecnicos);
    } catch (error) {
        Logger.error("Error al obtener técnicos", {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener técnicos." 
        });
    }
});

// Obtener dispositivos para mantenimientos - SOLO ETIQUETADORAS Y READERS
router.get("/lista/dispositivos", async (req, res) => {
    try {
        Logger.info('Solicitando dispositivos para mantenimientos');
        
        const dispositivos = await queryAsync(`
            SELECT 
                'etiquetadora_' || id::text as id_unico,
                id::text as id_original,
                ip, 
                serial, 
                ubicacion, 
                estado,
                activo_fijo,
                COALESCE(modelo, 'Etiquetadora') as nombre,
                'etiquetadoras' as tipo_tabla,
                'Etiquetadora' as tipo_display
            FROM etiquetadoras 
            WHERE estado = 'Activo'
            
            UNION ALL
            
            SELECT 
                'reader_' || id::text as id_unico,
                id::text as id_original,
                ip, 
                serial, 
                ubicacion, 
                estado,
                activo_fijo,
                'Reader' as nombre,
                'readers' as tipo_tabla,
                'Reader' as tipo_display
            FROM readers 
            WHERE estado = 'Activo'
            
            ORDER BY tipo_display, ubicacion, nombre
        `);
        
        Logger.info('Dispositivos para mantenimientos obtenidos', { 
            cantidad: dispositivos.length 
        });
        
        return res.json(dispositivos);
    } catch (error) {
        Logger.error("Error al obtener dispositivos para mantenimientos", {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener dispositivos." 
        });
    }
});

// Obtener repuestos para mantenimientos
router.get("/lista/repuestos", async (req, res) => {
    try {
        Logger.info('Solicitando repuestos para mantenimientos');
        
        const repuestos = await queryAsync(`
            SELECT id, nombre, codigo, cantidad, stock_minimo, ubicacion 
            FROM repuestos 
            WHERE cantidad > 0
            ORDER BY nombre
        `);
        
        Logger.info('Repuestos para mantenimientos obtenidos', { 
            cantidad: repuestos.length 
        });
        
        return res.json(repuestos);
    } catch (error) {
        Logger.error("Error al obtener repuestos para mantenimientos", {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener repuestos." 
        });
    }
});

// ==============================================
// RUTAS PRINCIPALES - CONSULTA COMPLETAMENTE CORREGIDA
// ==============================================

// Obtener todos los mantenimientos - CONSULTA DEFINITIVAMENTE CORREGIDA
router.get("/", async (req, res) => {
    try {
        Logger.info('Solicitando lista de mantenimientos', {
            usuario: req.session.user.nombre
        });
        
        const mantenimientos = await queryAsync(`
            SELECT 
                m.*,
                COALESCE(u.nombre, 'Técnico no especificado') as tecnico,
                COALESCE(r.nombre, 'Sin repuesto') as repuesto,
                
                -- ✅ USAR EL TIPO GUARDADO EN LA TABLA PARA DETERMINAR EL DISPOSITIVO
                CASE 
                    WHEN m.dispositivo_tipo = 'readers' THEN 'Reader'
                    WHEN m.dispositivo_tipo = 'etiquetadoras' THEN 'Etiquetadora'
                    ELSE 'Desconocido'
                END as tipo_dispositivo,
                
                CASE 
                    WHEN m.dispositivo_tipo = 'readers' THEN 
                        'Reader ' || COALESCE(rd.no_maquina, '')
                    WHEN m.dispositivo_tipo = 'etiquetadoras' THEN 
                        COALESCE(e.modelo, 'Etiquetadora')
                    ELSE 'Dispositivo no encontrado'
                END as nombre_dispositivo,
                
                CASE 
                    WHEN m.dispositivo_tipo = 'readers' THEN rd.ubicacion
                    WHEN m.dispositivo_tipo = 'etiquetadoras' THEN e.ubicacion
                    ELSE 'Ubicación no especificada'
                END as ubicacion_dispositivo,
                
                -- Información adicional para debugging
                m.dispositivo_tipo as debug_tipo_guardado,
                CASE 
                    WHEN m.dispositivo_tipo = 'readers' AND rd.id IS NOT NULL THEN 'READER_ENCONTRADO'
                    WHEN m.dispositivo_tipo = 'etiquetadoras' AND e.id IS NOT NULL THEN 'ETIQUETADORA_ENCONTRADA'
                    WHEN m.dispositivo_tipo IS NULL THEN 'SIN_TIPO_GUARDADO'
                    ELSE 'TIPO_NO_COINCIDE'
                END as debug_estado

            FROM mantenimientos m
            LEFT JOIN usuarios u ON m.id_usuarios = u.id
            LEFT JOIN repuestos r ON m.id_repuesto = r.id
            LEFT JOIN etiquetadoras e ON m.id_dispositivo = e.id AND m.dispositivo_tipo = 'etiquetadoras'
            LEFT JOIN readers rd ON m.id_dispositivo = rd.id AND m.dispositivo_tipo = 'readers'
            ORDER BY m.fecha DESC, m.id DESC
        `);
        
        Logger.info('Mantenimientos obtenidos exitosamente', { 
            cantidad: mantenimientos.length,
            usuario: req.session.user.nombre 
        });
        
        return res.json(mantenimientos);
    } catch (error) {
        Logger.error("Error al obtener mantenimientos", {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener mantenimientos." 
        });
    }
});

// Obtener un mantenimiento específico - CONSULTA CORREGIDA
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    
    Logger.info('Solicitando mantenimiento específico', { 
        id: id,
        usuario: req.session.user.nombre 
    });
    
    try {
        const mantenimiento = await queryAsync(`
            SELECT 
                m.*,
                COALESCE(u.nombre, 'Técnico no especificado') as tecnico,
                COALESCE(r.nombre, 'Sin repuesto') as repuesto,
                
                -- Información del dispositivo
                CASE 
                    WHEN e.id IS NOT NULL THEN COALESCE(e.modelo, 'Etiquetadora')
                    WHEN rd.id IS NOT NULL THEN 'Reader'
                    ELSE 'Dispositivo no encontrado'
                END as nombre_dispositivo,
                
                CASE 
                    WHEN e.id IS NOT NULL THEN e.ubicacion
                    WHEN rd.id IS NOT NULL THEN rd.ubicacion
                    ELSE 'Ubicación no especificada'
                END as ubicacion_dispositivo,
                
                -- Determinar el tipo de dispositivo para el formulario de edición
                CASE 
                    WHEN e.id IS NOT NULL THEN 'etiquetadoras'
                    WHEN rd.id IS NOT NULL THEN 'readers'
                    ELSE 'desconocido'
                END as dispositivo_tipo,
                
                -- Debug info
                e.id as etiquetadora_id,
                rd.id as reader_id

            FROM mantenimientos m
            LEFT JOIN usuarios u ON m.id_usuarios = u.id
            LEFT JOIN repuestos r ON m.id_repuesto = r.id
            LEFT JOIN etiquetadoras e ON m.id_dispositivo = e.id
            LEFT JOIN readers rd ON m.id_dispositivo = rd.id
            WHERE m.id = $1
        `, [id]);

        if (mantenimiento.length === 0) {
            Logger.warn('Mantenimiento no encontrado', { id: id });
            return res.status(404).json({ 
                success: false, 
                message: "Mantenimiento no encontrado." 
            });
        }
        
        Logger.info('Mantenimiento encontrado', { 
            id: id,
            dispositivo: mantenimiento[0].nombre_dispositivo
        });
        
        return res.json({
            success: true,
            data: mantenimiento[0]
        });
    } catch (error) {
        Logger.error("Error al obtener mantenimiento para edición", {
            error: error.message,
            id: id,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener mantenimiento."
        });
    }
});

// Registrar nuevo mantenimiento - CORREGIDA CON TIPO DE DISPOSITIVO
router.post("/", async (req, res) => {
    const { 
        tipo, fecha, id_dispositivo, id_repuesto, descripcion, observaciones, estado, id_usuarios, dispositivo_tipo
    } = req.body;

    Logger.info('Registrando nuevo mantenimiento', {
        tipo: tipo,
        dispositivo_tipo: dispositivo_tipo,
        usuario: req.session.user.nombre
    });

    if (!tipo || !fecha || !descripcion) {
        Logger.warn('Campos obligatorios faltantes en mantenimiento', {
            tipo: tipo,
            fecha: fecha,
            descripcion: descripcion
        });
        return res.status(400).json({
            success: false,
            message: "Los campos tipo, fecha y descripción son obligatorios."
        });
    }

    try {
        // Procesar ID del dispositivo
        let idDispositivoNum;
        
        Logger.debug(`ID dispositivo recibido: ${id_dispositivo}`);
        
        if (id_dispositivo && id_dispositivo !== 'undefined' && id_dispositivo !== '') {
            idDispositivoNum = procesarIdDispositivo(id_dispositivo);
            
            if (!idDispositivoNum) {
                Logger.warn('ID del dispositivo no válido', { id_dispositivo: id_dispositivo });
                return res.status(400).json({
                    success: false,
                    message: "El ID del dispositivo no es válido."
                });
            }
        } else {
            Logger.warn('Dispositivo no especificado en mantenimiento');
            return res.status(400).json({
                success: false,
                message: "El dispositivo es obligatorio."
            });
        }

        Logger.debug(`ID dispositivo procesado: ${id_dispositivo} -> ${idDispositivoNum}`);

        // Validar que el dispositivo existe según el tipo especificado
        let dispositivoValido = false;
        
        if (dispositivo_tipo === 'etiquetadoras') {
            const etiquetadoraExiste = await queryAsync(
                'SELECT id FROM etiquetadoras WHERE id = $1 AND estado = $2',
                [idDispositivoNum, 'Activo']
            );
            dispositivoValido = etiquetadoraExiste.length > 0;
        } else if (dispositivo_tipo === 'readers') {
            const readerExiste = await queryAsync(
                'SELECT id FROM readers WHERE id = $1 AND estado = $2',
                [idDispositivoNum, 'Activo']
            );
            dispositivoValido = readerExiste.length > 0;
        }

        if (!dispositivoValido) {
            Logger.warn('Dispositivo no existe o no está activo', {
                tipo: dispositivo_tipo,
                id: idDispositivoNum
            });
            return res.status(400).json({
                success: false,
                message: `El dispositivo seleccionado no existe o no está activo en ${dispositivo_tipo}.`
            });
        }

        Logger.debug(`Dispositivo validado: ${dispositivo_tipo} (ID: ${idDispositivoNum})`);

        const datosMantenimiento = {
            id_usuarios: id_usuarios ? parseInt(id_usuarios) : req.session.user?.id || 1,
            tipo: tipo,
            fecha: fecha,
            id_dispositivo: idDispositivoNum,
            id_repuesto: id_repuesto ? parseInt(id_repuesto) : null,
            descripcion: descripcion,
            observaciones: observaciones || '',
            estado: estado || 'Pendiente',
            dispositivo_tipo: dispositivo_tipo // ✅ GUARDAR EL TIPO DE DISPOSITIVO
        };

        Logger.debug('Datos para inserción de mantenimiento', datosMantenimiento);

        const campos = Object.keys(datosMantenimiento);
        const valores = Object.values(datosMantenimiento);
        const placeholders = campos.map((_, index) => `$${index + 1}`);

        const sql = `INSERT INTO mantenimientos (${campos.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        
        Logger.database('Insertando nuevo mantenimiento', { sql: sql });
        
        const result = await queryAsync(sql, valores);

        Logger.info('Mantenimiento registrado con éxito', { 
            id: result[0].id,
            usuario: req.session.user.nombre
        });

        return res.json({ 
            success: true, 
            message: "Mantenimiento registrado con éxito",
            data: result[0],
            mantenimientoId: result[0].id
        });

    } catch (error) {
        Logger.error("Error al registrar mantenimiento", {
            error: error.message,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({
            success: false,
            message: "Error al registrar el mantenimiento."
        });
    }
});

// Actualizar mantenimiento - CORREGIDA CON TIPO DE DISPOSITIVO
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    
    Logger.info('Actualizando mantenimiento', {
        id: id,
        usuario: req.session.user.nombre
    });
    
    try {
        // Verificar que el mantenimiento existe
        const existingRecord = await queryAsync(
            "SELECT * FROM mantenimientos WHERE id = $1", 
            [id]
        );
        
        if (existingRecord.length === 0) {
            Logger.warn('Mantenimiento no encontrado para actualizar', { id: id });
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado."
            });
        }

        // Preparar campos para actualizar
        const updates = [];
        const values = [];
        let paramCount = 1;
        
        const camposPermitidos = [
            'tipo', 'fecha', 'id_dispositivo', 'id_repuesto', 
            'descripcion', 'observaciones', 'estado', 'id_usuarios', 'dispositivo_tipo'
        ];
        
        camposPermitidos.forEach(campo => {
            if (req.body.hasOwnProperty(campo) && req.body[campo] !== undefined) {
                updates.push(`${campo} = $${paramCount}`);
                
                // Procesar IDs con prefijos si es necesario
                if (campo === 'id_dispositivo' && typeof req.body[campo] === 'string' && req.body[campo].includes('_')) {
                    const idProcesado = procesarIdDispositivo(req.body[campo]);
                    values.push(idProcesado);
                    Logger.debug(`ID dispositivo procesado en update: ${req.body[campo]} -> ${idProcesado}`);
                } else if (campo.includes('id_') && req.body[campo] !== null && req.body[campo] !== '') {
                    values.push(parseInt(req.body[campo]));
                } else if (campo.includes('id_') && (req.body[campo] === null || req.body[campo] === '')) {
                    values.push(null);
                } else {
                    values.push(req.body[campo]);
                }
                
                paramCount++;
            }
        });

        if (updates.length === 0) {
            Logger.warn('No hay campos válidos para actualizar', { id: id });
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron campos válidos para actualizar."
            });
        }

        // Validar que el dispositivo existe si se está actualizando
        if (req.body.id_dispositivo && req.body.dispositivo_tipo) {
            let dispositivoId;
            
            if (typeof req.body.id_dispositivo === 'string' && req.body.id_dispositivo.includes('_')) {
                dispositivoId = procesarIdDispositivo(req.body.id_dispositivo);
            } else {
                dispositivoId = parseInt(req.body.id_dispositivo);
            }
            
            let dispositivoValido = false;
            
            if (req.body.dispositivo_tipo === 'etiquetadoras') {
                const etiquetadoraExiste = await queryAsync(
                    'SELECT id FROM etiquetadoras WHERE id = $1 AND estado = $2',
                    [dispositivoId, 'Activo']
                );
                dispositivoValido = etiquetadoraExiste.length > 0;
            } else if (req.body.dispositivo_tipo === 'readers') {
                const readerExiste = await queryAsync(
                    'SELECT id FROM readers WHERE id = $1 AND estado = $2',
                    [dispositivoId, 'Activo']
                );
                dispositivoValido = readerExiste.length > 0;
            }
            
            if (!dispositivoValido) {
                Logger.warn('Dispositivo no existe en el sistema', {
                    tipo: req.body.dispositivo_tipo,
                    id: dispositivoId
                });
                return res.status(400).json({
                    success: false,
                    message: "El dispositivo seleccionado no existe en el sistema."
                });
            }
        }

        // Agregar ID al final para el WHERE
        values.push(parseInt(id));
        
        const sql = `UPDATE mantenimientos SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        Logger.database('Actualizando mantenimiento', { sql: sql });
        
        const result = await queryAsync(sql, values);

        Logger.info('Mantenimiento actualizado con éxito', { 
            id: id,
            usuario: req.session.user.nombre
        });
        
        return res.json({ 
            success: true, 
            message: "Mantenimiento actualizado con éxito",
            data: result[0]
        });

    } catch (error) {
        Logger.error("Error al actualizar mantenimiento", {
            error: error.message,
            id: id,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({
            success: false,
            message: "Error al actualizar el mantenimiento."
        });
    }
});

// Eliminar mantenimiento
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    
    Logger.info('Eliminando mantenimiento', {
        id: id,
        usuario: req.session.user.nombre
    });
    
    try {
        const existingRecord = await queryAsync(
            "SELECT * FROM mantenimientos WHERE id = $1", 
            [id]
        );
        if (existingRecord.length === 0) {
            Logger.warn('Mantenimiento no encontrado para eliminar', { id: id });
            return res.status(404).json({
                success: false,
                message: "Mantenimiento no encontrado."
            });
        }

        await queryAsync("DELETE FROM mantenimientos WHERE id = $1", [id]);
        
        Logger.info('Mantenimiento eliminado con éxito', { 
            id: id,
            usuario: req.session.user.nombre
        });
        
        return res.json({ 
            success: true, 
            message: "Mantenimiento eliminado con éxito"
        });

    } catch (error) {
        Logger.error("Error al eliminar mantenimiento", {
            error: error.message,
            id: id,
            usuario: req.session.user.nombre
        });
        return res.status(500).json({
            success: false,
            message: "Error al eliminar el mantenimiento."
        });
    }
});

module.exports = router;