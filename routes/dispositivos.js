const express = require('express');
const { queryAsync, tiposDispositivos } = require('../config/database');

const router = express.Router();

// ==============================================
// RUTAS GET
// ==============================================

// Obtener dispositivos por tipo
router.get("/:tipoDispositivo", async (req, res) => {
    const { tipoDispositivo } = req.params;
    
    console.log(`📱 Solicitando dispositivos de tipo: ${tipoDispositivo}`);
    
    if (!tiposDispositivos[tipoDispositivo]) {
        return res.status(400).json({ 
            success: false, 
            message: "Tipo de dispositivo no válido." 
        });
    }

    try {
        const tableConfig = tiposDispositivos[tipoDispositivo];
        const tableName = tableConfig.table;
        
        let orderField = 'fecha_ingreso';
        if (tipoDispositivo === 'mantenimientos') {
            orderField = 'fecha';
        }
        
        const sql = `SELECT * FROM ${tableName} ORDER BY ${orderField} DESC`;
        console.log(`🔍 Ejecutando consulta: ${sql}`);
        
        const dispositivos = await queryAsync(sql);
        
        console.log(`✅ Encontrados ${dispositivos.length} dispositivos de tipo ${tipoDispositivo}`);
        
        return res.json(dispositivos);
    } catch (error) {
        console.error(`❌ Error al obtener ${tipoDispositivo}:`, error.message);
        return res.json([]);
    }
});

// Obtener un dispositivo específico
router.get("/:tipo/:id", async (req, res) => {
    const { tipo, id } = req.params;
    
    console.log(`🔍 Solicitando dispositivo tipo: ${tipo}, ID: ${id}`);
    
    if (!tiposDispositivos[tipo]) {
        return res.status(400).json({
            success: false,
            message: "Tipo de dispositivo no válido."
        });
    }

    try {
        const tableName = tiposDispositivos[tipo].table;
        const rows = await queryAsync(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Dispositivo no encontrado."
            });
        }

        return res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error(`❌ Error al obtener ${tipo}:`, error);
        return res.status(500).json({
            success: false,
            message: `Error al obtener el ${tipo}.`,
            error: error.message
        });
    }
});

// ==============================================
// RUTAS POST - CREAR DISPOSITIVOS (FALTANTE)
// ==============================================

// Crear nuevo dispositivo - RUTA CORREGIDA
router.post("/:tipo", async (req, res) => {
    const { tipo } = req.params;
    
    console.log(`📝 Registrando dispositivo tipo: ${tipo}`, req.body);
    
    if (!tiposDispositivos[tipo]) {
        return res.status(400).json({
            success: false,
            message: "Tipo de dispositivo no válido."
        });
    }

    try {
        const tableName = tiposDispositivos[tipo].table;
        const campos = [];
        const valores = [];
        const placeholders = [];
        
        // ✅ CORRECCIÓN: Validar campos requeridos específicos
        const camposRequeridos = {
            'ordenadores': ['ubicacion', 'fecha_ingreso', 'serial'],
            'access_point': ['ubicacion', 'serial', 'fecha_ingreso'],
            'readers': ['ubicacion', 'fecha_ingreso', 'serial'],
            'etiquetadoras': ['ubicacion', 'fecha_ingreso', 'serial'],
            'tablets': ['ubicacion', 'fecha_ingreso', 'serial'],
            'lectores_qr': ['ubicacion', 'fecha_ingreso', 'modelo']
        }[tipo] || ['ubicacion', 'fecha_ingreso'];

        // Validar campos requeridos
        for (const campo of camposRequeridos) {
            if (!req.body[campo]) {
                return res.status(400).json({
                    success: false,
                    message: `El campo ${campo} es obligatorio para ${tiposDispositivos[tipo].name}.`
                });
            }
        }

        // Procesar campos específicos del tipo de dispositivo
        tiposDispositivos[tipo].campos.forEach((campo) => {
            if (req.body[campo] !== undefined && req.body[campo] !== null && req.body[campo] !== '') {
                campos.push(campo);
                
                // Convertir valores booleanos
                if (campo === 'activo') {
                    valores.push(req.body[campo] === 'true' || req.body[campo] === true);
                } else {
                    valores.push(req.body[campo]);
                }
            }
        });

        // ✅ CORRECCIÓN: Manejar activo_fijo vacío
        if (req.body.activo_fijo === '' || req.body.activo_fijo === null) {
            const activoFijoIndex = campos.indexOf('activo_fijo');
            if (activoFijoIndex !== -1) {
                campos.splice(activoFijoIndex, 1);
                valores.splice(activoFijoIndex, 1);
            }
        }

        // ✅ CORRECCIÓN: Validar que tenemos campos para insertar
        if (campos.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron datos válidos para registrar."
            });
        }

        // ✅ CORRECCIÓN: Verificar duplicados para etiquetadoras
        if (tipo === 'etiquetadoras' && req.body.serial) {
            const serialExistente = await queryAsync(
                `SELECT id FROM etiquetadoras WHERE serial = $1`,
                [req.body.serial]
            );
            
            if (serialExistente.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Ya existe una etiquetadora con este número de serie."
                });
            }
        }

        // Agregar campos comunes para dispositivos
        if (tipo !== 'mantenimientos' && tipo !== 'repuestos') {
            const idUsuarioField = tableName === 'access_point' || tableName === 'etiquetadoras' || tableName === 'lectores_qr' 
                ? 'id_usuarios_responsable' 
                : 'id_usuario_responsable';
            
            campos.push(idUsuarioField);
            valores.push(req.session.user.id);
        }

        // Crear placeholders después de tener todos los valores
        for (let i = 1; i <= valores.length; i++) {
            placeholders.push(`$${i}`);
        }

        const sql = `INSERT INTO ${tableName} (${campos.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
        console.log(`💾 Ejecutando SQL: ${sql}`, valores);
        
        const result = await queryAsync(sql, valores);

        console.log(`✅ ${tableName} registrado con éxito, ID: ${result[0].id}`);

        return res.json({ 
            success: true, 
            message: `${tiposDispositivos[tipo].name || tableName} registrado con éxito`,
            dispositivoId: result[0].id
        });

    } catch (error) {
        console.error(`❌ Error al registrar ${tipo}:`, error);
        
        // ✅ CORRECCIÓN: Manejar errores específicos de duplicados
        if (error.code === '23505') { // Violación de unique constraint
            return res.status(400).json({
                success: false,
                message: "Ya existe un dispositivo con estos datos (serial o activo fijo duplicado)."
            });
        }
        
        return res.status(500).json({
            success: false,
            message: `Error al registrar el ${tipo}.`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==============================================
// RUTAS PUT - ACTUALIZAR DISPOSITIVOS
// ==============================================

// Actualizar dispositivo
router.put("/:tipo/:id", async (req, res) => {
    const { tipo, id } = req.params;
    
    console.log(`✏️ Actualizando dispositivo tipo: ${tipo}, ID: ${id}`, req.body);
    
    if (!tiposDispositivos[tipo]) {
        return res.status(400).json({
            success: false,
            message: "Tipo de dispositivo no válido."
        });
    }

    try {
        const tableName = tiposDispositivos[tipo].table;
        const rows = await queryAsync(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Dispositivo no encontrado."
            });
        }

        const updates = [];
        const values = [];
        let paramCount = 1;
        
        // Usar los campos definidos en tiposDispositivos
        tiposDispositivos[tipo].campos.forEach(campo => {
            if (req.body.hasOwnProperty(campo) && campo !== 'id') {
                updates.push(`${campo} = $${paramCount}`);
                
                // Manejar diferentes tipos de datos
                if (campo === 'activo') {
                    values.push(req.body[campo] === 'true' || req.body[campo] === true);
                } else if (campo === 'activo_fijo' && (req.body[campo] === '' || req.body[campo] === null)) {
                    values.push(null);
                } else {
                    values.push(req.body[campo] !== null ? req.body[campo] : null);
                }
                
                paramCount++;
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron campos válidos para actualizar."
            });
        }

        // Agregar fecha de actualización si el campo existe
        if (tiposDispositivos[tipo].campos.includes('fecha_actualizacion')) {
            updates.push('fecha_actualizacion = CURRENT_TIMESTAMP');
        }
        
        values.push(id);
        
        const sql = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = $${paramCount}`;
        console.log(`💾 Ejecutando SQL: ${sql}`, values);
        
        await queryAsync(sql, values);

        // Obtener el dispositivo actualizado
        const updatedRows = await queryAsync(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
        
        console.log(`✅ ${tableName} actualizado con éxito`);
        
        return res.json({ 
            success: true, 
            message: `${tiposDispositivos[tipo].name} actualizado con éxito`,
            data: updatedRows[0]
        });

    } catch (error) {
        console.error(`❌ Error al actualizar ${tipo}:`, error);
        return res.status(500).json({
            success: false,
            message: `Error al actualizar el ${tipo}.`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==============================================
// RUTAS DELETE - ELIMINAR DISPOSITIVOS
// ==============================================

// Eliminar dispositivo
router.delete("/:tipo/:id", async (req, res) => {
    const { tipo, id } = req.params;
    
    console.log(`🗑️ Eliminando dispositivo tipo: ${tipo}, ID: ${id}`);
    
    if (!tiposDispositivos[tipo]) {
        return res.status(400).json({
            success: false,
            message: "Tipo de dispositivo no válido."
        });
    }

    try {
        const tableName = tiposDispositivos[tipo].table;
        
        // Verificar que el dispositivo existe
        const existingRecord = await queryAsync(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
        if (existingRecord.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Registro no encontrado."
            });
        }

        const sql = `DELETE FROM ${tableName} WHERE id = $1`;
        await queryAsync(sql, [id]);
        
        return res.json({ 
            success: true, 
            message: `${tableName} eliminado con éxito`
        });

    } catch (error) {
        console.error(`❌ Error al eliminar ${tipo}:`, error);
        return res.status(500).json({
            success: false,
            message: `Error al eliminar el ${tipo}.`,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;