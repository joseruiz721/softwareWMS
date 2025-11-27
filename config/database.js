const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Configuración de la base de datos
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'control_acceso',
    password: process.env.DB_PASSWORD || '09262405',
    port: process.env.DB_PORT || 5432,
});

// Store para sesiones
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
});

// Función para consultas asíncronas
const queryAsync = (text, params) => {
    return new Promise((resolve, reject) => {
        pool.query(text, params, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res.rows);
            }
        });
    });
};

// Tipos de dispositivos actualizados
const tiposDispositivos = {
    ordenadores: {
        name: 'Ordenadores',
        table: 'ordenadores',
        campos: ['ip', 'ubicacion', 'activo', 'serial', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuario_responsable', 'marca', 'activo_fijo']
    },
    access_point: {
        name: 'Access Point',
        table: 'access_point',
        campos: ['ip', 'ubicacion', 'serial', 'modelo', 'version', 'arquitectura', 'mac', 'estado', 'fecha_ingreso', 'observacion', 'id_usuarios_responsable', 'activo_fijo']
    },
    readers: {
        name: 'Readers',
        table: 'readers',
        campos: ['ip', 'ubicacion', 'no_maquina', 'serial', 'mac', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuario_responsable', 'activo_fijo']
    },
    etiquetadoras: {
        name: 'Etiquetadoras',
        table: 'etiquetadoras',
        campos: ['ip', 'ubicacion', 'activo', 'serial', 'modelo', 'serial_aplicador', 'mac', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuarios_responsable', 'activo_fijo']
    },
    tablets: {
        name: 'Tablets',
        table: 'tablets',
        campos: ['ip', 'ubicacion', 'no_maquina', 'activo', 'serial', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuario_responsable', 'activo_fijo']
    },
    lectores_qr: {
        name: 'Lectores QR',
        table: 'lectores_qr',
        campos: ['ubicacion', 'activo', 'modelo', 'estado', 'fecha_ingreso', 'observaciones', 'id_usuarios_responsable', 'activo_fijo']
    }
};

module.exports = {
    pool,
    sessionStore,
    queryAsync,
    tiposDispositivos
};