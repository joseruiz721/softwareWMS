const express = require('express');
const { queryAsync } = require('../utils/queryAsync');

const router = express.Router();

// ==============================================
// RUTAS ESPECÍFICAS - DEBEN IR ANTES DE /:id
// ==============================================

// Obtener repuestos para selectores (usado en mantenimientos)
router.get("/lista/select", async (req, res) => {
    try {
        console.log("🔧 Solicitando repuestos para selectores...");
        
        const repuestos = await queryAsync(`
            SELECT id, nombre, codigo, cantidad, stock_minimo, ubicacion 
            FROM repuestos 
            WHERE cantidad > 0
            ORDER BY nombre
        `);
        
        console.log(`✅ Encontrados ${repuestos.length} repuestos para selectores`);
        return res.json(repuestos);
    } catch (error) {
        console.error("❌ Error al obtener repuestos para selectores:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener repuestos." 
        });
    }
});

// ==============================================
// RUTAS PRINCIPALES
// ==============================================

// Obtener todos los repuestos
router.get("/", async (req, res) => {
    try {
        console.log("🔍 Solicitando repuestos...");
        const repuestos = await queryAsync(`
            SELECT * FROM repuestos 
            ORDER BY 
                CASE WHEN cantidad <= stock_minimo THEN 0 ELSE 1 END,
                fecha_ingreso DESC
        `);
        console.log(`✅ Encontrados ${repuestos.length} repuestos`);
        return res.json(repuestos);
    } catch (error) {
        console.error("❌ Error al obtener repuestos:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al obtener repuestos." 
        });
    }
});

// ==============================================
// RUTAS DINÁMICAS - DEBEN IR DESPUÉS DE LAS ESPECÍFICAS
// ==============================================

// Obtener un repuesto específico
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    
    console.log(`📥 GET - Solicitando repuesto ID: ${id}`);
    
    try {
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID de repuesto no válido."
            });
        }

        const repuestos = await queryAsync(`SELECT * FROM repuestos WHERE id = $1`, [id]);
        
        if (repuestos.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Repuesto no encontrado."
            });
        }

        console.log(`✅ GET - Repuesto encontrado:`, repuestos[0]);
        
        return res.json({ 
            success: true, 
            data: repuestos[0]
        });

    } catch (error) {
        console.error("❌ GET - Error al obtener repuesto:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor al obtener el repuesto.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Registrar nuevo repuesto
router.post("/", async (req, res) => {
    const { 
        nombre, proceso, descripcion, codigo, codigo_siesa,
        cantidad, rotacion, stock_minimo, fecha_ingreso, ubicacion
    } = req.body;

    console.log("📦 Registrando nuevo repuesto:", req.body);

    if (!nombre || !codigo || cantidad === undefined || !fecha_ingreso) {
        return res.status(400).json({
            success: false,
            message: "Los campos nombre, código, cantidad y fecha de ingreso son obligatorios.",
        });
    }

    try {
        const result = await queryAsync(
            `INSERT INTO repuestos 
(nombre, proceso, descripcion, codigo, codigo_siesa, cantidad, rotacion, stock_minimo, fecha_ingreso, ubicacion)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
[
    nombre, 
    proceso || null,
    descripcion || null,
    codigo,
    codigo_siesa || null, 
    parseInt(cantidad) || 0, 
    rotacion || 'Media',
    parseInt(stock_minimo) || 5, 
    fecha_ingreso, 
    ubicacion || null
]
        );

        console.log(`✅ Repuesto registrado con éxito, ID: ${result[0].id}`);

        return res.json({ 
            success: true, 
            message: "Repuesto registrado con éxito",
            repuestoId: result[0].id
        });

    } catch (error) {
        console.error("❌ Error al registrar repuesto:", error);
        return res.status(500).json({
            success: false,
            message: "Error al registrar el repuesto.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Actualizar repuesto
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    
    console.log(`✏️ Editando repuesto ID: ${id}`, req.body);
    
    try {
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "ID de repuesto no válido."
            });
        }

        const existingRecord = await queryAsync(`SELECT * FROM repuestos WHERE id = $1`, [id]);
        if (existingRecord.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Repuesto no encontrado."
            });
        }

        const updates = [];
        const values = [];
        
        const campos = ['nombre', 'proceso', 'descripcion', 'codigo', 'codigo_siesa', 'cantidad', 'rotacion', 'stock_minimo', 'ubicacion'];
        
        campos.forEach(campo => {
            if (req.body.hasOwnProperty(campo) && req.body[campo] !== undefined) {
                updates.push(`${campo} = $${updates.length + 1}`);
                values.push(req.body[campo]);
            }
        });

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron campos válidos para actualizar."
            });
        }

        updates.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
        
        const sql = `UPDATE repuestos SET ${updates.join(', ')} WHERE id = $${values.length + 1}`;
        console.log(`💾 Ejecutando UPDATE: ${sql}`, [...values, id]);
        
        await queryAsync(sql, [...values, id]);

        const updatedRecord = await queryAsync(`SELECT * FROM repuestos WHERE id = $1`, [id]);
        
        return res.json({ 
            success: true, 
            message: "Repuesto actualizado con éxito",
            data: updatedRecord[0]
        });

    } catch (error) {
        console.error("❌ Error al actualizar repuesto:", error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar el repuesto.",
            error: error.message
        });
    }
});

// Eliminar repuesto
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    
    console.log(`🗑️ Eliminando repuesto ID: ${id}`);
    
    try {
        const existingRecord = await queryAsync(`SELECT * FROM repuestos WHERE id = $1`, [id]);
        if (existingRecord.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Repuesto no encontrado."
            });
        }

        await queryAsync(`DELETE FROM repuestos WHERE id = $1`, [id]);
        
        return res.json({ 
            success: true, 
            message: "Repuesto eliminado con éxito"
        });

    } catch (error) {
        console.error("❌ Error al eliminar repuesto:", error);
        return res.status(500).json({
            success: false,
            message: "Error al eliminar el repuesto.",
            error: error.message
        });
    }
});

module.exports = router;