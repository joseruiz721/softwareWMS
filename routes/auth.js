const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const databaseConfig = require('../config/database');
const { enviarCorreoRecuperacion, enviarCorreoConfirmacion } = require('../config/email');
const path = require('path');
const { authenticateToken, requireAdmin, optionalToken, checkAuthStatus } = require('../middleware/auth');

const router = express.Router();

// ==============================================
// RUTAS DE PÁGINAS
// ==============================================

// Función auxiliar para verificar token y servir página
async function serveResetPage(req, res) {
    const { token } = req.params;
    console.log('📄 Verificando token para página de restablecimiento:', token);
    
    try {
        const rows = await databaseConfig.queryAsync(
            "SELECT id, nombre, correo FROM usuarios WHERE reset_token = $1 AND reset_token_expires > NOW()",
            [token]
        );

        if (rows.length === 0) {
            console.log('❌ Token inválido o expirado');
            return res.status(400).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Enlace Inválido</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        h2 { color: #e74c3c; }
                        a { color: #3498db; text-decoration: none; }
                    </style>
                </head>
                <body>
                    <h2>Enlace Inválido o Expirado</h2>
                    <p>El enlace de restablecimiento es inválido o ha expirado.</p>
                    <a href="/solicitar-reset">Solicitar nuevo enlace</a>
                </body>
                </html>
            `);
        }
        
        console.log('✅ Token válido, sirviendo página de restablecimiento para:', rows[0].nombre);
        res.sendFile(path.join(__dirname, '../public/reestablecer-contraseña.html'));
    } catch (error) {
        console.error("❌ Error verificando token:", error);
        return res.status(500).send("Error interno del servidor.");
    }
}

// Ruta para página de restablecimiento (sin codificar)
router.get("/reestablecer-contraseña/:token", async (req, res) => {
    await serveResetPage(req, res);
});

// Ruta para página de restablecimiento (codificada)
router.get("/reestablecer-contrase%C3%B1a/:token", async (req, res) => {
    await serveResetPage(req, res);
});

// Ruta para servir la página de solicitud de reset
router.get("/solicitar-reset", (req, res) => {
    console.log('📄 Sirviendo página de recuperación de contraseña');
    res.sendFile(path.join(__dirname, '../public/solicitar_reset.html'));
});

// ==============================================
// RUTAS DE AUTENTICACIÓN
// ==============================================

// Login de usuarios
router.post("/login", async (req, res) => {
    const { correo, pass } = req.body;
    
    console.log('🔐 Intento de login para:', correo);
    
    if (!correo || !pass) {
        console.log('❌ Campos faltantes');
        return res.status(400).json({ 
            success: false, 
            message: "Correo y contraseña son obligatorios." 
        });
    }
    
    try {
        const rows = await databaseConfig.queryAsync(
            "SELECT * FROM usuarios WHERE correo = $1", 
            [correo]
        );
        
        if (rows.length === 0) {
            console.log('❌ Usuario no encontrado:', correo);
            return res.status(404).json({ 
                success: false, 
                message: "Usuario no encontrado." 
            });
        }
        
        const usuario = rows[0];
        console.log('✅ Usuario encontrado:', usuario.nombre, '- Rol:', usuario.role);
        
        if (!usuario.contrasena) {
            console.error('❌ Usuario sin contraseña hash:', usuario.correo);
            return res.status(500).json({ 
                success: false, 
                message: "Error en la configuración del usuario." 
            });
        }
        
        const match = await bcrypt.compare(pass, usuario.contrasena);
        
        if (!match) {
            console.log('❌ Contraseña incorrecta para:', correo);
            return res.status(401).json({ 
                success: false, 
                message: "Contraseña incorrecta." 
            });
        }
        
        // Configurar sesión
        const userSessionData = {
            id: usuario.id,
            cedula: usuario.cedula,
            nombre: usuario.nombre,
            correo: usuario.correo,
            role: usuario.role,
            fecha_registro: usuario.fecha_registro
        };
        
        req.session.user = userSessionData;
        
        // Generar token JWT
        const token = jwt.sign(
            { userId: usuario.id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );
        
        console.log('✅ Credenciales correctas para:', usuario.nombre, '- Rol:', usuario.role);
        
        // Guardar sesión
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error al guardar sesión:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Error al iniciar sesión."
                });
            }
            
            console.log('✅ Sesión guardada exitosamente');
            
            return res.json({ 
                success: true, 
                message: "Login exitoso",
                redirect: "/dashboard",
                user: userSessionData,
                token: token
            });
        });
        
    } catch (error) {
        console.error("❌ Error en DB en /login:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error en la base de datos." 
        });
    }
});

// Cerrar sesión
router.post("/logout", (req, res) => {
    console.log('🚪 Solicitando logout para usuario:', req.session.user?.nombre || 'Usuario desconocido');
    
    const userName = req.session.user?.nombre || 'Usuario desconocido';
    
    res.clearCookie('connect.sid');
    
    req.session.destroy((err) => {
        if (err) {
            console.error("❌ Error al destruir sesión:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Error interno al cerrar sesión." 
            });
        }
        
        console.log('✅ Sesión cerrada para:', userName);
        
        res.json({ 
            success: true, 
            message: "Sesión cerrada exitosamente.",
            redirect: "/",
            clearToken: true
        });
    });
});

// Registro de usuarios
router.post("/registro", async (req, res) => {
    const { ced, nom, correo, pass, role = 'user' } = req.body;

    console.log('👤 Intento de registro para:', correo, '- Rol solicitado:', role);

    if (!ced || !nom || !correo || !pass) {
        return res.status(400).json({ 
            success: false, 
            message: "Todos los campos son obligatorios." 
        });
    }

    try {
        const rows = await databaseConfig.queryAsync(
            "SELECT * FROM usuarios WHERE cedula = $1 OR correo = $2", 
            [ced, correo]
        );
        
        if (rows.length > 0) {
            console.log('❌ Usuario ya existe:', correo);
            return res.status(409).json({ 
                success: false, 
                message: "El usuario ya existe." 
            });
        }

        let finalRole = 'user';
        if (role === 'admin') {
            const adminSecret = req.body.adminSecret || '';
            const validSecret = process.env.ADMIN_REGISTER_SECRET || 'clave-secreta-admin-2024';
            
            if (adminSecret === validSecret) {
                finalRole = 'admin';
                console.log('👑 Creando cuenta de administrador para:', correo);
            } else {
                console.log('❌ Clave secreta inválida para registro admin');
                return res.status(403).json({ 
                    success: false, 
                    message: "Clave secreta inválida para registro de administrador." 
                });
            }
        }

        const hashedPassword = await bcrypt.hash(pass, 10);
        
        const result = await databaseConfig.queryAsync(
            "INSERT INTO usuarios (cedula, nombre, correo, contrasena, role, fecha_registro) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, cedula, nombre, correo, role, fecha_registro",
            [ced, nom, correo, hashedPassword, finalRole]
        );

        const newUser = result[0];
        console.log('✅ Usuario registrado exitosamente, ID:', newUser.id, '- Rol:', newUser.role);

        return res.json({ 
            success: true, 
            message: `Usuario ${finalRole} registrado exitosamente`,
            user: {
                id: newUser.id,
                cedula: newUser.cedula,
                nombre: newUser.nombre,
                correo: newUser.correo,
                role: newUser.role,
                fecha_registro: newUser.fecha_registro
            },
            redirect: "/"
        });

    } catch (error) {
        console.error("❌ Error en registro:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al registrar usuario." 
        });
    }
});

// REGISTRO DE ADMINISTRADORES
router.post("/registro-admin", async (req, res) => {
    try {
        const { ced, nom, correo, pass, role = 'admin', adminSecret } = req.body;

        console.log('👑 Intento de registro de administrador para:', correo);

        const validSecret = process.env.ADMIN_REGISTER_SECRET || 'clave-secreta-admin-2024';
        if (adminSecret !== validSecret) {
            console.log('❌ Clave secreta inválida para registro admin');
            return res.json({
                success: false,
                message: 'Clave secreta inválida para registro de administradores'
            });
        }

        if (!ced || !nom || !correo || !pass) {
            return res.json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        if (pass.length < 6) {
            return res.json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        if (!['admin', 'superadmin'].includes(role)) {
            return res.json({
                success: false,
                message: 'Rol inválido para administrador'
            });
        }

        const existingUser = await databaseConfig.queryAsync(
            "SELECT id FROM usuarios WHERE correo = $1 OR cedula = $2",
            [correo, ced]
        );

        if (existingUser.length > 0) {
            return res.json({
                success: false,
                message: 'El correo o cédula ya están registrados'
            });
        }

        const hashedPassword = await bcrypt.hash(pass, 10);
        
        const result = await databaseConfig.queryAsync(
            "INSERT INTO usuarios (cedula, nombre, correo, contrasena, role, fecha_registro) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, cedula, nombre, correo, role, fecha_registro",
            [ced, nom, correo, hashedPassword, role]
        );

        const newAdmin = result[0];
        console.log('✅ Administrador registrado exitosamente:', newAdmin.nombre, '- Rol:', newAdmin.role);

        res.json({
            success: true,
            message: `Administrador ${role} registrado exitosamente`,
            user: {
                id: newAdmin.id,
                cedula: newAdmin.cedula,
                nombre: newAdmin.nombre,
                correo: newAdmin.correo,
                role: newAdmin.role,
                fecha_registro: newAdmin.fecha_registro
            }
        });

    } catch (error) {
        console.error('❌ Error en registro de administrador:', error);
        res.json({
            success: false,
            message: 'Error interno del servidor en el registro de administrador'
        });
    }
});

// ==============================================
// RECUPERACIÓN DE CONTRASEÑA
// ==============================================

// Solicitar reset de contraseña
router.post('/solicitar-reset', async (req, res) => {
    const { correo } = req.body;
    console.log('🔑 Solicitando reset para:', correo);
    
    try {
        if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            return res.status(400).json({ 
                success: false, 
                message: "Por favor, proporciona un correo electrónico válido." 
            });
        }

        const rows = await databaseConfig.queryAsync(
            "SELECT id, nombre, correo FROM usuarios WHERE correo = $1", 
            [correo]
        );
        
        if (rows.length === 0) {
            console.log('📧 Email no encontrado (por seguridad):', correo);
            return res.json({ 
                success: true, 
                message: "Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña." 
            });
        }
        
        const usuario = rows[0];
        
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000);

        await databaseConfig.queryAsync(
            "UPDATE usuarios SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
            [token, expires, usuario.id]
        );

        console.log('✅ Token generado para:', usuario.correo);

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reestablecer-contraseña/${token}`;
        console.log('🔗 Enlace de restablecimiento:', resetLink);

        try {
            const emailResult = await enviarCorreoRecuperacion(usuario.correo, usuario.nombre, resetLink);
            
            if (emailResult.success) {
                console.log('✅ Email de recuperación enviado a:', usuario.correo);
            } else {
                console.error('❌ Error enviando email:', emailResult.error);
            }
        } catch (emailError) {
            console.error('❌ Error en envío de email:', emailError);
        }
        
        return res.json({ 
            success: true, 
            message: "Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer la contraseña.",
            debug_link: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });

    } catch (error) {
        console.error("❌ Error en /solicitar-reset:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor. Por favor, intenta más tarde." 
        });
    }
});

// Reestablecer contraseña
router.post('/reestablecer-pass', async (req, res) => {
    const { token, password } = req.body;

    console.log('🔑 Restableciendo contraseña con token');

    if (!token) {
        return res.status(400).json({ 
            success: false, 
            message: "Token de restablecimiento requerido." 
        });
    }

    if (!password || password.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: "La contraseña debe tener al menos 8 caracteres." 
        });
    }

    const requirements = {
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    if (!requirements.uppercase || !requirements.lowercase || !requirements.number || !requirements.special) {
        return res.status(400).json({
            success: false,
            message: "La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales."
        });
    }

    try {
        const rows = await databaseConfig.queryAsync(
            "SELECT id, nombre, correo FROM usuarios WHERE reset_token = $1 AND reset_token_expires > NOW()",
            [token]
        );

        if (rows.length === 0) {
            console.log('❌ Token inválido o expirado:', token);
            return res.status(400).json({ 
                success: false, 
                message: "El enlace de restablecimiento es inválido o ha expirado." 
            });
        }

        const usuario = rows[0];
        
        const hashedPassword = await bcrypt.hash(password, 12);

        await databaseConfig.queryAsync(
            "UPDATE usuarios SET contrasena = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2",
            [hashedPassword, usuario.id]
        );

        console.log('✅ Contraseña actualizada para:', usuario.correo);

        try {
            await enviarCorreoConfirmacion(usuario.correo, usuario.nombre);
        } catch (emailError) {
            console.error('❌ Error enviando email de confirmación:', emailError);
        }

        return res.json({ 
            success: true, 
            message: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión." 
        });

    } catch (error) {
        console.error("❌ Error al guardar la nueva contraseña:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error interno del servidor. Por favor, intenta más tarde." 
        });
    }
});

// ==============================================
// 🔐 RUTAS PARA GESTIÓN DE USUARIOS (SOLO ADMIN)
// ==============================================

// Endpoint para verificar token y obtener datos de usuario
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

// Endpoint para verificar estado de autenticación
router.get("/auth-status", checkAuthStatus, async (req, res) => {
    try {
        return res.json({
            success: true,
            authenticated: req.authStatus.authenticated,
            user: req.authStatus.user,
            method: req.authStatus.method
        });
    } catch (error) {
        console.error("Error verificando estado de autenticación:", error);
        return res.json({
            success: false,
            authenticated: false,
            user: null,
            method: 'none'
        });
    }
});

// Endpoint para obtener todos los usuarios (solo admin)
router.get("/usuarios", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await databaseConfig.queryAsync(
            "SELECT id, cedula, nombre, correo, role, fecha_registro FROM usuarios ORDER BY fecha_registro DESC"
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

// Endpoint para cambiar rol de usuario (solo admin)
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

        if (parseInt(id) === req.user.id) {
            return res.status(403).json({
                success: false,
                message: "No puedes cambiar tu propio rol."
            });
        }

        const userExists = await databaseConfig.queryAsync(
            "SELECT id, nombre FROM usuarios WHERE id = $1", 
            [id]
        );
        
        if (userExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado."
            });
        }

        await databaseConfig.queryAsync(
            "UPDATE usuarios SET role = $1 WHERE id = $2", 
            [role, id]
        );

        console.log(`👑 Rol actualizado: Usuario ${userExists[0].nombre} (${id}) ahora es ${role}`);

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

// Endpoint para eliminar usuario (solo admin)
router.delete("/usuarios/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(403).json({
                success: false,
                message: "No puedes eliminar tu propia cuenta."
            });
        }

        const userExists = await databaseConfig.queryAsync(
            "SELECT id, nombre, role FROM usuarios WHERE id = $1", 
            [id]
        );
        
        if (userExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Usuario no encontrado."
            });
        }

        const usuario = userExists[0];

        if (usuario.role === 'admin') {
            const adminCount = await databaseConfig.queryAsync(
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

        await databaseConfig.queryAsync("DELETE FROM usuarios WHERE id = $1", [id]);

        console.log(`🗑️ Usuario ${usuario.nombre} (${id}) eliminado por administrador ${req.user.nombre}`);

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

// Endpoint para obtener estadísticas de usuarios (solo admin)
router.get("/estadisticas", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await databaseConfig.queryAsync(`
            SELECT 
                COUNT(*) as total_usuarios,
                COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
                COUNT(CASE WHEN role = 'user' THEN 1 END) as total_users,
                MIN(fecha_registro) as primer_registro,
                MAX(fecha_registro) as ultimo_registro
            FROM usuarios
        `);
        
        return res.json({
            success: true,
            data: stats[0]
        });
    } catch (error) {
        console.error("❌ Error obteniendo estadísticas:", error);
        return res.status(500).json({
            success: false,
            message: "Error al obtener estadísticas.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;