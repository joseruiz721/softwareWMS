// middleware/auth.js - PERMISOS CORREGIDOS
const jwt = require('jsonwebtoken');
const databaseConfig = require('../config/database');

// Middleware de autenticación por sesión
function requireAuth(req, res, next) {
    console.log('🔐 Verificando autenticación para:', req.path);
    
    if (req.session && req.session.user) {
        console.log('✅ Usuario autenticado:', req.session.user.nombre);
        next();
    } else {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        
        // Si es una petición API, devolver error JSON
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                message: "No autorizado. Por favor, inicia sesión."
            });
        }
        
        // Si es una ruta de página, redirigir al login
        res.redirect('/');
    }
}

function optionalAuth(req, res, next) {
    if (req.session && req.session.user) {
        console.log('✅ Usuario autenticado (opcional):', req.session.user.nombre);
        req.isAuthenticated = true;
    } else {
        req.isAuthenticated = false;
    }
    next();
}

// Middleware de autenticación por JWT (para APIs)
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('❌ Token no proporcionado para ruta:', req.path);
        
        if (isOptionalRoute(req.path)) {
            console.log('🟡 Ruta opcional, continuando sin token...');
            return next();
        }
        
        return res.status(401).json({ 
            success: false,
            message: 'Token de acceso requerido',
            error: 'MISSING_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        
        const userQuery = await databaseConfig.queryAsync(
            'SELECT id, cedula, nombre, correo, role FROM usuarios WHERE id = $1',
            [decoded.userId]
        );

        if (userQuery.length === 0) {
            console.log('❌ Usuario no encontrado en BD para token');
            return res.status(401).json({ 
                success: false,
                message: 'Usuario no encontrado',
                error: 'USER_NOT_FOUND'
            });
        }

        req.user = userQuery[0];
        console.log('✅ Usuario autenticado (JWT):', req.user.nombre, '- Rol:', req.user.role, '- Ruta:', req.path);
        next();
    } catch (error) {
        console.error('❌ Error en autenticación JWT:', error.message);
        
        if (isOptionalRoute(req.path)) {
            console.log('🟡 Ruta opcional, continuando sin autenticación...');
            return next();
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expirado',
                error: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token inválido',
                error: 'INVALID_TOKEN'
            });
        }
        
        return res.status(403).json({ 
            success: false,
            message: 'Error de autenticación',
            error: 'AUTH_ERROR'
        });
    }
};

// Verificar si una ruta puede funcionar sin autenticación
function isOptionalRoute(path) {
    const optionalRoutes = [
        '/api/health',
        '/api/auth-status'
    ];
    return optionalRoutes.some(route => path.includes(route));
}

// Middleware opcional para JWT (no falla si no hay token)
const optionalToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        
        const userQuery = await databaseConfig.queryAsync(
            'SELECT id, cedula, nombre, correo, role FROM usuarios WHERE id = $1',
            [decoded.userId]
        );

        if (userQuery.length > 0) {
            req.user = userQuery[0];
            console.log('✅ Usuario verificado (opcional):', req.user.nombre);
        }
    } catch (error) {
        console.log('🟡 Token inválido en verificación opcional:', error.message);
    }
    
    next();
};

// 🔥 CORREGIDO: Middleware para requerir rol de administrador - SOLO PARA GESTIÓN DE USUARIOS
function requireAdmin(req, res, next) {
    // Solo requerir admin para rutas específicas de gestión de usuarios
    const adminOnlyRoutes = [
        '/usuarios',
        '/admin-register',
        '/auth/usuarios',
        '/api/admin/'
    ];
    
    const requiresAdmin = adminOnlyRoutes.some(route => req.path.includes(route));
    
    if (!requiresAdmin) {
        // Para rutas que no son de gestión de usuarios, cualquier usuario autenticado puede acceder
        if (req.session && req.session.user) {
            console.log('✅ Acceso permitido para usuario regular:', req.session.user.nombre);
            return next();
        } else if (req.user) {
            console.log('✅ Acceso permitido para usuario regular (JWT):', req.user.nombre);
            return next();
        } else {
            return res.status(401).json({ 
                success: false,
                message: 'No autenticado',
                error: 'NOT_AUTHENTICATED'
            });
        }
    }
    
    // Para rutas de gestión de usuarios, requerir admin
    if (req.session && req.session.user) {
        if (req.session.user.role !== 'admin') {
            console.log('❌ Intento de acceso no autorizado - Sesión:', req.session.user.nombre, 'Rol:', req.session.user.role);
            
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Se requieren privilegios de administrador para esta acción',
                    error: 'ADMIN_REQUIRED'
                });
            }
            
            req.session.error = 'No tienes permisos de administrador para acceder a esta página';
            return res.redirect('/dashboard');
        }
        console.log('✅ Acceso admin autorizado - Sesión:', req.session.user.nombre);
        next();
    }
    else if (req.user) {
        if (req.user.role !== 'admin') {
            console.log('❌ Intento de acceso no autorizado - JWT:', req.user.nombre, 'Rol:', req.user.role);
            return res.status(403).json({ 
                success: false,
                message: 'Se requieren privilegios de administrador para esta acción',
                error: 'ADMIN_REQUIRED'
            });
        }
        console.log('✅ Acceso admin autorizado - JWT:', req.user.nombre);
        next();
    }
    else {
        console.log('❌ Usuario no autenticado en requireAdmin');
        return res.status(401).json({ 
            success: false,
            message: 'No autenticado',
            error: 'NOT_AUTHENTICATED'
        });
    }
}

// Middleware para requerir roles específicos
function requireRole(roles) {
    return (req, res, next) => {
        const userRole = (req.session && req.session.user) ? req.session.user.role : 
                        (req.user) ? req.user.role : null;
        
        if (!userRole || !roles.includes(userRole)) {
            console.log('❌ Intento de acceso con rol insuficiente:', userRole, 'Requiere:', roles);
            
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ 
                    success: false,
                    message: `No tienes permisos para esta acción. Roles permitidos: ${roles.join(', ')}`,
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            
            req.session.error = 'No tienes permisos suficientes para acceder a esta página';
            return res.redirect('/dashboard');
        }
        
        console.log('✅ Acceso autorizado - Rol:', userRole, 'para ruta:', req.path);
        next();
    };
}

// 🔥 CORREGIDO: Middleware para verificar permisos en operaciones críticas
function checkPermission(operation) {
    return (req, res, next) => {
        const userRole = (req.session && req.session.user) ? req.session.user.role : 
                        (req.user) ? req.user.role : null;
        
        // 🔥 MODIFICADO: Solo operaciones que realmente requieren admin
        const adminOnlyOperations = [
            'delete_user',
            'update_user_role', 
            'view_all_users',
            'manage_users',
            'system_config'
        ];
        
        // Operaciones que pueden hacer todos los usuarios autenticados
        const userAllowedOperations = [
            'view_repuestos',
            'manage_repuestos', 
            'view_mantenimientos',
            'manage_mantenimientos',
            'view_dispositivos',
            'manage_dispositivos'
        ];
        
        if (adminOnlyOperations.includes(operation) && userRole !== 'admin') {
            console.log('❌ Intento de operación no autorizada:', operation, 'por usuario con rol:', userRole);
            
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Operación restringida a administradores',
                    error: 'OPERATION_RESTRICTED'
                });
            }
            
            return res.status(403).send('Operación no permitida');
        }
        
        console.log('✅ Permiso concedido para operación:', operation, '- Rol:', userRole);
        next();
    };
}

// Función para enriquecer la sesión con datos del usuario desde BD
async function enrichSessionWithUserData(req, res, next) {
    if (req.session && req.session.user && req.session.user.id) {
        try {
            console.log('🔄 Enriqueciendo sesión con datos de BD para usuario:', req.session.user.id);
            
            const userQuery = await databaseConfig.queryAsync(
                'SELECT id, cedula, nombre, correo, role FROM usuarios WHERE id = $1',
                [req.session.user.id]
            );
            
            if (userQuery.length > 0) {
                req.session.user.role = userQuery[0].role;
                req.session.user.correo = userQuery[0].correo;
                req.session.user.nombre = userQuery[0].nombre;
                req.session.user.cedula = userQuery[0].cedula;
                console.log('✅ Sesión enriquecida con datos de BD - Rol:', req.session.user.role);
            } else {
                console.warn('⚠️ Usuario no encontrado en BD para enriquecer sesión');
                req.session.destroy((err) => {
                    if (err) {
                        console.error('❌ Error destruyendo sesión inválida:', err);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error enriqueciendo sesión:', error.message);
        }
    }
    next();
}

// Middleware para logging de autenticación
function authLogger(req, res, next) {
    const user = req.session?.user || req.user;
    const authType = req.session?.user ? 'SESSION' : (req.user ? 'JWT' : 'NONE');
    
    console.log(`🔐 [${authType}] ${req.method} ${req.path} - User: ${user?.nombre || 'Anonymous'} - Role: ${user?.role || 'None'}`);
    next();
}

// Middleware para verificar estado de autenticación sin requerirla
const checkAuthStatus = async (req, res, next) => {
    // Primero verificar si hay sesión
    if (req.session && req.session.user) {
        req.authStatus = {
            authenticated: true,
            user: req.session.user,
            method: 'session'
        };
        return next();
    }
    
    // Luego verificar si hay token JWT
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
            const userQuery = await databaseConfig.queryAsync(
                'SELECT id, cedula, nombre, correo, role FROM usuarios WHERE id = $1',
                [decoded.userId]
            );
            
            if (userQuery.length > 0) {
                req.authStatus = {
                    authenticated: true,
                    user: userQuery[0],
                    method: 'jwt'
                };
                return next();
            }
        } catch (error) {
            console.log('🟡 Token JWT inválido en checkAuthStatus');
        }
    }
    
    // No hay autenticación válida
    req.authStatus = {
        authenticated: false,
        user: null,
        method: 'none'
    };
    next();
};

module.exports = {
    requireAuth,
    optionalAuth,
    authenticateToken,
    optionalToken,
    requireAdmin,
    requireRole,
    checkPermission,
    enrichSessionWithUserData,
    authLogger,
    checkAuthStatus
};