// ==============================================
// MIDDLEWARE: validation - Validación de datos de entrada
// ==============================================

/**
 * ✅ MIDDLEWARE: Valida los datos de registro de usuario
 */
const validateUserRegistration = (req, res, next) => {
    const { ced, nom, correo, pass } = req.body;
    const errors = [];

    // Validar cédula
    if (!ced || ced.trim() === '') {
        errors.push('La cédula es obligatoria');
    } else if (ced.length < 5 || ced.length > 20) {
        errors.push('La cédula debe tener entre 5 y 20 caracteres');
    } else if (!/^[a-zA-Z0-9]+$/.test(ced)) {
        errors.push('La cédula solo puede contener letras y números');
    }

    // Validar nombre
    if (!nom || nom.trim() === '') {
        errors.push('El nombre es obligatorio');
    } else if (nom.length < 2 || nom.length > 100) {
        errors.push('El nombre debe tener entre 2 y 100 caracteres');
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nom)) {
        errors.push('El nombre solo puede contener letras y espacios');
    }

    // Validar correo
    if (!correo || correo.trim() === '') {
        errors.push('El correo electrónico es obligatorio');
    } else if (!isValidEmail(correo)) {
        errors.push('El formato del correo electrónico no es válido');
    } else if (correo.length > 255) {
        errors.push('El correo electrónico es demasiado largo');
    }

    // Validar contraseña
    if (!pass || pass.trim() === '') {
        errors.push('La contraseña es obligatoria');
    } else if (pass.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    } else if (pass.length > 100) {
        errors.push('La contraseña es demasiado larga');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pass)) {
        errors.push('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida los datos de login
 */
const validateUserLogin = (req, res, next) => {
    const { correo, pass } = req.body;
    const errors = [];

    if (!correo || correo.trim() === '') {
        errors.push('El correo electrónico es obligatorio');
    } else if (!isValidEmail(correo)) {
        errors.push('El formato del correo electrónico no es válido');
    }

    if (!pass || pass.trim() === '') {
        errors.push('La contraseña es obligatoria');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida los datos de actualización de perfil
 */
const validateProfileUpdate = (req, res, next) => {
    const { nombre, cedula, correo, contrasena } = req.body;
    const errors = [];

    // Validar que al menos un campo esté presente
    if (!nombre && !cedula && !correo && !contrasena) {
        errors.push('Se debe proporcionar al menos un campo para actualizar');
    }

    // Validar nombre si está presente
    if (nombre && nombre.trim() !== '') {
        if (nombre.length < 2 || nombre.length > 100) {
            errors.push('El nombre debe tener entre 2 y 100 caracteres');
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
            errors.push('El nombre solo puede contener letras y espacios');
        }
    }

    // Validar cédula si está presente
    if (cedula && cedula.trim() !== '') {
        if (cedula.length < 5 || cedula.length > 20) {
            errors.push('La cédula debe tener entre 5 y 20 caracteres');
        } else if (!/^[a-zA-Z0-9]+$/.test(cedula)) {
            errors.push('La cédula solo puede contener letras y números');
        }
    }

    // Validar correo si está presente
    if (correo && correo.trim() !== '') {
        if (!isValidEmail(correo)) {
            errors.push('El formato del correo electrónico no es válido');
        } else if (correo.length > 255) {
            errors.push('El correo electrónico es demasiado largo');
        }
    }

    // Validar contraseña si está presente
    if (contrasena && contrasena.trim() !== '') {
        if (contrasena.length < 6) {
            errors.push('La contraseña debe tener al menos 6 caracteres');
        } else if (contrasena.length > 100) {
            errors.push('La contraseña es demasiado larga');
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(contrasena)) {
            errors.push('La contraseña debe contener al menos una mayúscula, una minúscula y un número');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación',
            errors: errors
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida los datos de registro de dispositivos
 */
const validateDeviceRegistration = (req, res, next) => {
    const { tipo } = req.params;
    const deviceData = req.body;
    const errors = [];

    // Validaciones comunes para todos los dispositivos
    if (deviceData.ip && !isValidIP(deviceData.ip)) {
        errors.push('La dirección IP no tiene un formato válido');
    }

    if (deviceData.serial && deviceData.serial.length > 100) {
        errors.push('El número de serie es demasiado largo');
    }

    if (deviceData.ubicacion && deviceData.ubicacion.length > 200) {
        errors.push('La ubicación es demasiado larga');
    }

    if (deviceData.activo_fijo && deviceData.activo_fijo.length > 50) {
        errors.push('El código de activo fijo es demasiado largo');
    }

    // Validaciones específicas por tipo de dispositivo
    switch (tipo) {
        case 'ordenadores':
            if (!deviceData.ubicacion) {
                errors.push('La ubicación es obligatoria para ordenadores');
            }
            if (!deviceData.serial) {
                errors.push('El número de serie es obligatorio para ordenadores');
            }
            break;
            
        case 'access_point':
            if (!deviceData.ubicacion) {
                errors.push('La ubicación es obligatoria para Access Point');
            }
            if (!deviceData.serial) {
                errors.push('El número de serie es obligatorio para Access Point');
            }
            break;
            
        case 'lectores_qr':
            if (!deviceData.ubicacion) {
                errors.push('La ubicación es obligatoria para lectores QR');
            }
            if (!deviceData.modelo) {
                errors.push('El modelo es obligatorio para lectores QR');
            }
            break;
            
        default:
            // Validaciones para otros tipos de dispositivos
            if (!deviceData.ubicacion) {
                errors.push('La ubicación es obligatoria');
            }
            if (!deviceData.serial && tipo !== 'lectores_qr') {
                errors.push('El número de serie es obligatorio');
            }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación en datos del dispositivo',
            errors: errors
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida los datos de registro de repuestos
 */
const validateSupplyRegistration = (req, res, next) => {
    const { nombre, codigo, cantidad, stock_minimo, fecha_ingreso } = req.body;
    const errors = [];

    if (!nombre || nombre.trim() === '') {
        errors.push('El nombre del repuesto es obligatorio');
    } else if (nombre.length > 200) {
        errors.push('El nombre del repuesto es demasiado largo');
    }

    if (!codigo || codigo.trim() === '') {
        errors.push('El código del repuesto es obligatorio');
    } else if (codigo.length > 50) {
        errors.push('El código del repuesto es demasiado largo');
    }

    if (cantidad === undefined || cantidad === null) {
        errors.push('La cantidad es obligatoria');
    } else if (!isValidNumber(cantidad) || cantidad < 0) {
        errors.push('La cantidad debe ser un número positivo');
    }

    if (stock_minimo !== undefined && stock_minimo !== null) {
        if (!isValidNumber(stock_minimo) || stock_minimo < 0) {
            errors.push('El stock mínimo debe ser un número positivo');
        }
    }

    if (!fecha_ingreso || fecha_ingreso.trim() === '') {
        errors.push('La fecha de ingreso es obligatoria');
    } else if (!isValidDate(fecha_ingreso)) {
        errors.push('La fecha de ingreso no es válida');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación en datos del repuesto',
            errors: errors
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida los datos de registro de mantenimientos
 */
const validateMaintenanceRegistration = (req, res, next) => {
    const { tipo, fecha, id_dispositivo, descripcion } = req.body;
    const errors = [];

    if (!tipo || tipo.trim() === '') {
        errors.push('El tipo de mantenimiento es obligatorio');
    } else if (!['Preventivo', 'Correctivo', 'Predictivo'].includes(tipo)) {
        errors.push('El tipo de mantenimiento debe ser Preventivo, Correctivo o Predictivo');
    }

    if (!fecha || fecha.trim() === '') {
        errors.push('La fecha del mantenimiento es obligatoria');
    } else if (!isValidDate(fecha)) {
        errors.push('La fecha del mantenimiento no es válida');
    } else if (new Date(fecha) > new Date()) {
        errors.push('La fecha del mantenimiento no puede ser futura');
    }

    if (!id_dispositivo || id_dispositivo.trim() === '') {
        errors.push('El dispositivo es obligatorio');
    }

    if (!descripcion || descripcion.trim() === '') {
        errors.push('La descripción del mantenimiento es obligatoria');
    } else if (descripcion.length > 500) {
        errors.push('La descripción es demasiado larga (máximo 500 caracteres)');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Errores de validación en datos del mantenimiento',
            errors: errors
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida parámetros de ID en URL
 */
const validateIdParam = (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
        return res.status(400).json({
            success: false,
            message: 'El ID debe ser un número válido mayor que 0'
        });
    }

    next();
};

/**
 * ✅ MIDDLEWARE: Valida parámetros de búsqueda
 */
const validateSearchParams = (req, res, next) => {
    const { q } = req.query;

    if (!q || q.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'El término de búsqueda es obligatorio'
        });
    }

    if (q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
    }

    if (q.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'El término de búsqueda es demasiado largo'
        });
    }

    // Prevenir inyección de código básica
    if (/[<>]/.test(q)) {
        return res.status(400).json({
            success: false,
            message: 'El término de búsqueda contiene caracteres no permitidos'
        });
    }

    next();
};

/**
 * ✅ FUNCIÓN: Valida formato de email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * ✅ FUNCIÓN: Valida formato de IP
 */
function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

/**
 * ✅ FUNCIÓN: Valida que sea un número válido
 */
function isValidNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * ✅ FUNCIÓN: Valida formato de fecha
 */
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * ✅ FUNCIÓN: Sanitiza entrada de texto
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * ✅ MIDDLEWARE: Sanitiza datos de entrada
 */
const sanitizeInput = (req, res, next) => {
    // Sanitizar body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeText(req.body[key]);
            }
        });
    }

    // Sanitizar query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeText(req.query[key]);
            }
        });
    }

    next();
};

module.exports = {
    validateUserRegistration,
    validateUserLogin,
    validateProfileUpdate,
    validateDeviceRegistration,
    validateSupplyRegistration,
    validateMaintenanceRegistration,
    validateIdParam,
    validateSearchParams,
    sanitizeInput,
    isValidEmail,
    isValidIP,
    isValidNumber,
    isValidDate,
    sanitizeText
};