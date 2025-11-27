const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { queryAsync } = require('../utils/queryAsync');
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');

const router = express.Router();

// Registro de usuarios - MODIFICADO para incluir roles
router.post("/registro", async (req, res) => {
    const { ced, nom, correo, pass, role = 'user' } = req.body;

    if (!ced || !nom || !correo || !pass) {
        return res.status(400).json({ 
            success: false, 
            message: "Todos los campos son obligatorios." 
        });
    }

    try {
        // Verificar si el usuario ya existe
        const rows = await queryAsync(
            "SELECT * FROM usuarios WHERE cedula = $1 OR correo = $2", 
            [ced, correo]
        );
        
        if (rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: "El usuario ya existe." 
            });
        }

        // ⭐ NUEVO: Validar rol de administrador
        let finalRole = 'user';
        if (role === 'admin') {
            // Verificar clave secreta para crear administradores
            if (req.body.adminSecret === process.env.ADMIN_SECRET) {
                finalRole = 'admin';
                console.log('👑 Creando cuenta de administrador para:', correo);
            } else {
                return res.status(403).json({ 
                    success: false, 
                    message: "No autorizado para crear cuenta de administrador." 
                });
            }
        }

        const hashedPassword = await bcrypt.hash(pass, 10);

        // Compatibilidad con columna legacy 'password'
        const cols = await queryAsync("SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'password'");
        const hasPasswordCol = cols.length > 0;

        let insertSql, insertParams;
        if (hasPasswordCol) {
            insertSql = "INSERT INTO usuarios (cedula, nombre, correo, contrasena, password, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, cedula, nombre, correo, role";
            insertParams = [ced, nom, correo, hashedPassword, hashedPassword, finalRole];
        } else {
            insertSql = "INSERT INTO usuarios (cedula, nombre, correo, contrasena, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, cedula, nombre, correo, role";
            insertParams = [ced, nom, correo, hashedPassword, finalRole];
        }

        // ⭐ MODIFICADO: Incluir campo role en el INSERT
        const result = await queryAsync(insertSql, insertParams);

        const newUser = result[0];

        return res.json({ 
            success: true, 
            message: `Usuario ${finalRole} registrado exitosamente`,
            user: {
                id: newUser.id,
                cedula: newUser.cedula,
                nombre: newUser.nombre,
                correo: newUser.correo,
                role: newUser.role
            },
            redirect: "/index.html" 
        });

    } catch (error) {
        console.error("Error en registro:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al registrar usuario." 
        });
    }
});

// 🔐 NUEVO: Endpoint de login que devuelve JWT y datos de sesión
router.post("/login", async (req, res) => {
    const { correo, pass } = req.body;

    if (!correo || !pass) {
        return res.status(400).json({ 
            success: false, 
            message: "Correo y contraseña son obligatorios." 
        });
    }

    try {
        // Buscar usuario incluyendo el rol
        const rows = await queryAsync(
            "SELECT * FROM usuarios WHERE correo = $1", 
            [correo]
        );
        
        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: "Credenciales inválidas." 
            });
        }

        const usuario = rows[0];
        
        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(pass, usuario.contrasena);
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: "Credenciales inválidas." 
            });
        }

        // ⭐ NUEVO: Generar token JWT
        const token = jwt.sign(
            { userId: usuario.id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        // Configurar sesión (código existente)
        req.session.user = {
            id: usuario.id,
            cedula: usuario.cedula,
            nombre: usuario.nombre,
            correo: usuario.correo,
            role: usuario.role // ⭐ AGREGADO: Incluir rol en sesión
        };

        console.log(`✅ Login exitoso: ${usuario.nombre} (${usuario.role})`);

        return res.json({
            success: true,
            message: "Login exitoso",
            user: {
                id: usuario.id,
                cedula: usuario.cedula,
                nombre: usuario.nombre,
                correo: usuario.correo,
                role: usuario.role // ⭐ AGREGADO: Incluir rol en respuesta
            },
            token: token, // ⭐ NUEVO: Incluir token JWT
            redirect: "/paginaPrincipal.html"
        });

    } catch (error) {
        console.error("Error en login:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al iniciar sesión." 
        });
    }
});

// 🔐 NUEVO: Endpoint para verificar token y obtener datos de usuario
router.get("/verify", authenticateToken, async (req, res) => {
    try {
        return res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error("Error verificando token:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al verificar autenticación." 
        });
    }
});

// Obtener perfil de usuario - MEJORADO para incluir rol
router.get("/perfil", async (req, res) => {
    try {
        if (!req.session?.user?.id) {
            return res.status(401).json({ 
                success: false, 
                message: "No autorizado. Inicie sesión nuevamente." 
            });
        }

        // ⭐ MODIFICADO: Incluir campo role en la consulta
        const rows = await queryAsync(
            "SELECT id, cedula, nombre, correo, role, fecha_registro FROM usuarios WHERE id = $1", 
            [req.session.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Usuario no encontrado." 
            });
        }
        
        const usuario = rows[0];
        
        return res.json({
            success: true,
            data: {
                ...usuario,
                fecha_registro: new Date(usuario.fecha_registro).toISOString()
            }
        });

    } catch (error) {
        console.error("Error al obtener perfil:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor",
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Actualizar perfil de usuario - MEJORADO para validar roles
router.put("/perfil", async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { nombre, cedula, correo, contrasena, role } = req.body;

        console.log(`✏️ Actualizando perfil del usuario ID: ${userId}`, req.body);

        if (!nombre && !cedula && !correo && !contrasena && !role) {
            return res.status(400).json({
                success: false,
                message: "No se proporcionaron datos para actualizar."
            });
        }

        // ⭐ NUEVO: Verificar permisos para cambiar rol
        if (role) {
            const currentUser = await queryAsync(
                "SELECT role FROM usuarios WHERE id = $1",
                [userId]
            );
            
            // Solo administradores pueden cambiar roles
            if (currentUser[0].role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "Solo los administradores pueden cambiar roles de usuario."
                });
            }
            
            // No permitir que un admin se quite sus propios privilegios
            if (role !== 'admin' && userId === req.session.user.id) {
                return res.status(403).json({
                    success: false,
                    message: "No puedes quitarte tus propios privilegios de administrador."
                });
            }
        }

        const updates = [];
        const values = [];
        let paramCount = 1;

        if (nombre) {
            updates.push(`nombre = $${paramCount}`);
            values.push(nombre);
            paramCount++;
        }

        if (cedula) {
            const cedulaExists = await queryAsync(
                "SELECT id FROM usuarios WHERE cedula = $1 AND id != $2",
                [cedula, userId]
            );
            if (cedulaExists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "La cédula ya está en uso por otro usuario."
                });
            }
            updates.push(`cedula = $${paramCount}`);
            values.push(cedula);
            paramCount++;
        }

        if (correo) {
            const correoExists = await queryAsync(
                "SELECT id FROM usuarios WHERE correo = $1 AND id != $2",
                [correo, userId]
            );
            if (correoExists.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "El correo electrónico ya está en uso por otro usuario."
                });
            }
            updates.push(`correo = $${paramCount}`);
            values.push(correo);
            paramCount++;
        }

        // Check legacy column `password` once
        const colCheck = await queryAsync("SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'password'");
        const hasPasswordCol = colCheck.length > 0;

        if (contrasena) {
            if (contrasena.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "La contraseña debe tener al menos 6 caracteres."
                });
            }
            const hashedPassword = await bcrypt.hash(contrasena, 10);
            // Always update contrasena
            updates.push(`contrasena = $${paramCount}`);
            values.push(hashedPassword);
            paramCount++;

            // If legacy password column exists, update it too
            if (hasPasswordCol) {
                updates.push(`password = $${paramCount}`);
                values.push(hashedPassword);
                paramCount++;
            }
            paramCount++;
        }

        // ⭐ NUEVO: Actualizar rol si se proporciona y tiene permisos
        if (role) {
            updates.push(`role = $${paramCount}`);
            values.push(role);
            paramCount++;
        }

        values.push(userId);

        const sql = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramCount}`;
        console.log(`💾 Ejecutando UPDATE perfil: ${sql}`, values);

        await queryAsync(sql, values);

        // ⭐ MODIFICADO: Incluir campo role en la consulta de actualización
        const updatedUser = await queryAsync(
            "SELECT id, cedula, nombre, correo, role, fecha_registro FROM usuarios WHERE id = $1",
            [userId]
        );

        if (updatedUser.length > 0) {
            // Actualizar sesión con nuevos datos
            req.session.user = {
                ...req.session.user,
                ...updatedUser[0]
            };
        }

        return res.json({
            success: true,
            message: "Perfil actualizado correctamente",
            data: updatedUser[0]
        });

    } catch (error) {
        console.error("❌ Error al actualizar perfil:", error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar el perfil.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Eliminar cuenta de usuario - MEJORADO con validación de roles
router.delete("/perfil", async (req, res) => {
    try {
        const userId = req.session.user.id;

        console.log(`🗑️ Eliminando cuenta del usuario ID: ${userId}`);

        const userExists = await queryAsync("SELECT id, role FROM usuarios WHERE id = $1", [userId]);
        if (userExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado."
            });
        }

        // ⭐ NUEVO: Verificar si es el último administrador
        if (userExists[0].role === 'admin') {
            const adminCount = await queryAsync(
                "SELECT COUNT(*) as count FROM usuarios WHERE role = 'admin'",
                []
            );
            
            if (parseInt(adminCount[0].count) <= 1) {
                return res.status(403).json({
                    success: false,
                    message: "No puedes eliminar la única cuenta de administrador del sistema."
                });
            }
        }

        await queryAsync("DELETE FROM usuarios WHERE id = $1", [userId]);

        req.session.destroy((err) => {
            if (err) {
                console.error("Error al destruir sesión:", err);
            }
        });

        return res.json({
            success: true,
            message: "Cuenta eliminada correctamente. Lamentamos verte ir."
        });

    } catch (error) {
        console.error("❌ Error al eliminar cuenta:", error);
        return res.status(500).json({
            success: false,
            message: "Error al eliminar la cuenta.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔐 NUEVO: Endpoint para obtener todos los usuarios (solo admin)
router.get("/usuarios", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await queryAsync(
            "SELECT id, cedula, nombre, correo, role, fecha_registro FROM usuarios ORDER BY id"
        );
        
        return res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error("❌ Error obteniendo usuarios:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener usuarios.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔐 NUEVO: Endpoint para cambiar rol de usuario (solo admin)
router.put("/usuarios/:id/role", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!role || !['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Rol inválido. Debe ser 'user' o 'admin'."
            });
        }

        // No permitir cambiar el propio rol
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({
                success: false,
                message: "No puedes cambiar tu propio rol."
            });
        }

        const userExists = await queryAsync("SELECT id FROM usuarios WHERE id = $1", [id]);
        if (userExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado."
            });
        }

        await queryAsync("UPDATE usuarios SET role = $1 WHERE id = $2", [role, id]);

        console.log(`👑 Rol actualizado: Usuario ${id} ahora es ${role}`);

        return res.json({
            success: true,
            message: `Rol actualizado a ${role} correctamente.`
        });

    } catch (error) {
        console.error("❌ Error actualizando rol:", error);
        return res.status(500).json({
            success: false,
            message: "Error al actualizar rol.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// 🔐 NUEVO: Endpoint para eliminar usuario (solo admin)
router.delete("/usuarios/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // No permitir eliminarse a sí mismo
        if (parseInt(id) === req.user.id) {
            return res.status(403).json({
                success: false,
                message: "No puedes eliminar tu propia cuenta."
            });
        }

        const userExists = await queryAsync("SELECT id, role FROM usuarios WHERE id = $1", [id]);
        if (userExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado."
            });
        }

        // Verificar si es el último administrador
        if (userExists[0].role === 'admin') {
            const adminCount = await queryAsync(
                "SELECT COUNT(*) as count FROM usuarios WHERE role = 'admin'",
                []
            );
            
            if (parseInt(adminCount[0].count) <= 1) {
                return res.status(403).json({
                    success: false,
                    message: "No puedes eliminar la única cuenta de administrador del sistema."
                });
            }
        }

        await queryAsync("DELETE FROM usuarios WHERE id = $1", [id]);

        console.log(`🗑️ Usuario ${id} eliminado por administrador ${req.user.nombre}`);

        return res.json({
            success: true,
            message: "Usuario eliminado correctamente."
        });

    } catch (error) {
        console.error("❌ Error eliminando usuario:", error);
        return res.status(500).json({
            success: false,
            message: "Error al eliminar usuario.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;