const { Pool } = require('pg');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

// Configuración de la base de datos PARA RAILWAY CON DATABASE_URL
const connectionConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'control_acceso',
        password: process.env.DB_PASSWORD || '09262405',
        port: process.env.DB_PORT || 5432,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };

const pool = new Pool({
    ...connectionConfig,
    // Configuración de conexión más robusta
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
    // Manejo de errores mejorado
    allowExitOnIdle: true
});

// Verificar conexión a la base de datos al iniciar
pool.on('connect', () => {
    console.log('✅ Conectado a la base de datos PostgreSQL');
    console.log('🔍 Usando DATABASE_URL:', process.env.DATABASE_URL ? 'Sí' : 'No');
});

pool.on('error', (err) => {
    console.error('❌ Error en la conexión a la base de datos:', err.message);
});

// Store para sesiones
const sessionStore = new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
});

// Función para consultas asíncronas MEJORADA
const queryAsync = async (text, params) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(text, params);
        return result.rows;
    } catch (error) {
        console.error('❌ Error en consulta SQL:', {
            query: text.substring(0, 100) + '...',
            params: params,
            error: error.message
        });
        throw error;
    } finally {
        if (client) client.release();
    }
};

// Función para verificar la conexión a la base de datos
const testConnection = async () => {
    try {
        const result = await queryAsync('SELECT NOW() as current_time, version() as version');
        console.log('✅ Conexión a BD verificada:', {
            time: result[0].current_time,
            version: result[0].version.split(' ').slice(0, 4).join(' ')
        });
        return true;
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error.message);
        console.log('🔧 Variables de entorno disponibles:', {
            DATABASE_URL: process.env.DATABASE_URL ? 'Configurada' : 'No configurada',
            NODE_ENV: process.env.NODE_ENV
        });
        return false;
    }
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
    tiposDispositivos,
    testConnection
};