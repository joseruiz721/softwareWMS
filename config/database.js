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
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20,
    allowExitOnIdle: true
});

// 🔥 FUNCIÓN CRÍTICA: Crear tablas si no existen
const initializeDatabase = async () => {
    try {
        console.log('🔧 INICIALIZANDO BASE DE DATOS - Creando tablas...');
        
        // Crear tabla usuarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY,
                    cedula VARCHAR(20) UNIQUE NOT NULL,
                    nombre VARCHAR(100) NOT NULL,
                    correo VARCHAR(100) UNIQUE NOT NULL,
                    contrasena VARCHAR(255) NOT NULL,
                    role VARCHAR(20) DEFAULT 'user',
                    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reset_token VARCHAR(255),
                    reset_token_expires TIMESTAMP
                )
        `);
        console.log('✅ Tabla usuarios creada/verificada');
        
        // Crear tabla session
        await pool.query(`
            CREATE TABLE IF NOT EXISTS session (
                sid VARCHAR PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            )
        `);
        console.log('✅ Tabla session creada/verificada');
        // Crear tablas de dispositivos y datos auxiliares que la app espera
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ordenadores (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(45),
                ubicacion VARCHAR(100),
                activo VARCHAR(50),
                serial VARCHAR(100) UNIQUE,
                estado VARCHAR(50),
                fecha_ingreso DATE,
                observaciones TEXT,
                id_usuario_responsable INTEGER REFERENCES usuarios(id),
                marca VARCHAR(100),
                activo_fijo VARCHAR(100)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_point (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(45),
                ubicacion VARCHAR(100),
                serial VARCHAR(100) UNIQUE,
                modelo VARCHAR(100),
                version VARCHAR(100),
                arquitectura VARCHAR(100),
                mac VARCHAR(100),
                estado VARCHAR(50),
                fecha_ingreso DATE,
                observacion TEXT,
                id_usuarios_responsable INTEGER REFERENCES usuarios(id),
                activo_fijo VARCHAR(100)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS readers (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(45),
                ubicacion VARCHAR(100),
                no_maquina VARCHAR(100),
                serial VARCHAR(100) UNIQUE,
                mac VARCHAR(100),
                estado VARCHAR(50),
                fecha_ingreso DATE,
                observaciones TEXT,
                id_usuario_responsable INTEGER REFERENCES usuarios(id),
                activo_fijo VARCHAR(100)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS etiquetadoras (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(45),
                ubicacion VARCHAR(100),
                activo VARCHAR(50),
                serial VARCHAR(100) UNIQUE,
                modelo VARCHAR(100),
                serial_aplicador VARCHAR(100),
                mac VARCHAR(100),
                estado VARCHAR(50),
                fecha_ingreso DATE,
                observaciones TEXT,
                id_usuarios_responsable INTEGER REFERENCES usuarios(id),
                activo_fijo VARCHAR(100)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tablets (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(45),
                ubicacion VARCHAR(100),
                no_maquina VARCHAR(100),
                activo VARCHAR(50),
                serial VARCHAR(100) UNIQUE,
                estado VARCHAR(50),
                fecha_ingreso DATE,
                observaciones TEXT,
                id_usuario_responsable INTEGER REFERENCES usuarios(id),
                activo_fijo VARCHAR(100)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lectores_qr (
                id SERIAL PRIMARY KEY,
                ubicacion VARCHAR(100),
                activo VARCHAR(50),
                modelo VARCHAR(100),
                estado VARCHAR(50),
                fecha_ingreso DATE,
                observaciones TEXT,
                id_usuarios_responsable INTEGER REFERENCES usuarios(id),
                activo_fijo VARCHAR(100)
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS repuestos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                codigo VARCHAR(50) UNIQUE,
                cantidad INTEGER DEFAULT 0,
                stock_minimo INTEGER DEFAULT 5,
                ubicacion VARCHAR(100),
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS mantenimientos (
                id SERIAL PRIMARY KEY,
                descripcion TEXT NOT NULL,
                tipo VARCHAR(50),
                estado VARCHAR(50),
                fecha DATE,
                id_usuarios INTEGER REFERENCES usuarios(id),
                id_dispositivo INTEGER,
                tipo_dispositivo VARCHAR(50),
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insertar usuario administrador
        // Nota: algunas instalaciones antiguas podrían usar la columna `password` (en inglés).
        // Si la tabla existe pero no tiene `contrasena`, intentamos crearla y copiar valores desde `password`.
        let hasPassword = false;
        let hasContrasena = false;
        try {
            // Verificar columnas existentes
            const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name IN ('password','contrasena')`);
            const colNames = cols.rows.map(r => r.column_name);

            hasPassword = colNames.includes('password');
            hasContrasena = colNames.includes('contrasena');

            if (!hasContrasena) {
                console.log('ℹ️ Tabla usuarios existe pero falta columna `contrasena`. La crearé.');
                await pool.query(`ALTER TABLE usuarios ADD COLUMN contrasena VARCHAR(255);`);

                if (hasPassword) {
                    // Copiar valores desde password -> contrasena (sin eliminar password)
                    console.log('🔁 Copiando valores desde `password` a `contrasena`...');
                    const copyResult = await pool.query(`UPDATE usuarios SET contrasena = password WHERE contrasena IS NULL AND password IS NOT NULL RETURNING id, correo`);
                    console.log(`✅ Filas copiadas: ${copyResult.rowCount}`);

                    // Si la columna password existe y tiene NOT NULL constraint esto puede romper
                    // posteriores INSERTs que no incluyan 'password'. Hacemos la columna nullable para seguridad.
                    try {
                        const nullableCheck = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='usuarios' AND column_name='password'`);
                        if (nullableCheck.rows.length > 0 && nullableCheck.rows[0].is_nullable === 'NO') {
                            console.log('ℹ️ La columna `password` estaba NOT NULL — cambiando a NULLABLE para evitar violaciones de constraint');
                            await pool.query(`ALTER TABLE usuarios ALTER COLUMN password DROP NOT NULL`);
                            console.log('✅ Columna `password` ahora es NULLABLE');
                        }
                    } catch (colErr) {
                        console.error('❌ Error intentando hacer password NULLABLE:', colErr.message);
                    }
                }
            

            // Adicional: si existe la columna `password` -> asegurarnos que sea NULLABLE en cualquier caso
            if (hasPassword) {
                try {
                    const nullableCheck2 = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='usuarios' AND column_name='password'`);
                    if (nullableCheck2.rows.length > 0 && nullableCheck2.rows[0].is_nullable === 'NO') {
                        console.log('ℹ️ La columna `password` estaba NOT NULL — cambiando a NULLABLE para evitar violaciones de constraint');
                        await pool.query(`ALTER TABLE usuarios ALTER COLUMN password DROP NOT NULL`);
                        console.log('✅ Columna `password` ahora es NULLABLE');
                    }
                } catch (colErr2) {
                    console.error('❌ Error intentando hacer password NULLABLE (paso final):', colErr2.message);
                }
            }
            }
        } catch (mErr) {
            console.error('❌ Error comprobando/migrando columnas de usuarios:', mErr.message);
            // No abortamos: la inserción de admin intentará llevarse a cabo y fallará si la columna no existe
        }

        // Si la columna `password` también existe (probablemente creada por versiones antiguas),
        // guardamos el hash en ambas columnas para evitar errores NOT NULL en instalaciones legacy.
        let result;
        const adminHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

        if (hasPassword) {
            result = await pool.query(`
                INSERT INTO usuarios (cedula, nombre, correo, contrasena, password, role) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                ON CONFLICT (correo) DO NOTHING
                RETURNING id, nombre, correo, role
            `, [
                '12345678',
                'Administrador', 
                'joseraulruizreal@gmail.com', 
                adminHash,
                adminHash,
                'admin'
            ]);
        } else {
            result = await pool.query(`
                INSERT INTO usuarios (cedula, nombre, correo, contrasena, role) 
                VALUES ($1, $2, $3, $4, $5) 
                ON CONFLICT (correo) DO NOTHING
                RETURNING id, nombre, correo, role
            `, [
                '12345678',
                'Administrador', 
                'joseraulruizreal@gmail.com', 
                adminHash,
                'admin'
            ]);
        }
        
        if (result.rows.length > 0) {
            console.log('✅ USUARIO ADMIN CREADO:', result.rows[0]);
        } else {
            console.log('ℹ️ Usuario admin ya existía');
        }
        
        console.log('🎉 BASE DE DATOS INICIALIZADA CORRECTAMENTE');
        return true;
    } catch (error) {
        console.error('❌ ERROR INICIALIZANDO BD:', error.message);
        return false;
    }
};

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
        const result = await queryAsync('SELECT NOW() as current_time');
        console.log('✅ Conexión a BD verificada:', {
            time: result[0].current_time
        });
        
        // 🔥 INICIALIZAR TABLAS AUTOMÁTICAMENTE
        await initializeDatabase();
        
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
    testConnection,
    initializeDatabase
};