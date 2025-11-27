// create-tables.js
const { Pool } = require('pg');

console.log('🚀 INICIANDO CREACIÓN DE TABLAS...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  let client;
  try {
    console.log('🔗 Conectando a la base de datos...');
    client = await pool.connect();
    
    console.log('📊 Creando tabla usuarios si no existe...');
    await client.query(`
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

    // Si la columna contrasena no existe (tabla existente con antigua columna 'password'), crear y copiar
    try {
      const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name IN ('password','contrasena')`);
      const present = cols.rows.map(r => r.column_name);
      const hasPassword = present.includes('password');
      const hasContrasena = present.includes('contrasena');

      if (!hasContrasena) {
        console.log('ℹ️ Añadiendo columna `contrasena` a tabla usuarios...');
        await client.query(`ALTER TABLE usuarios ADD COLUMN contrasena VARCHAR(255);`);

        if (hasPassword) {
          console.log('🔁 Copiando valores desde `password` a `contrasena`...');
          const copyRes = await client.query(`UPDATE usuarios SET contrasena = password WHERE contrasena IS NULL AND password IS NOT NULL RETURNING id, correo`);
          console.log(`✅ Filas copiadas: ${copyRes.rowCount}`);

          // Si la columna password es NOT NULL, hacerla NULLABLE para evitar errores en la inserción de admin
          try {
            const nullableCheck = await client.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name='usuarios' AND column_name='password'`);
            if (nullableCheck.rows.length > 0 && nullableCheck.rows[0].is_nullable === 'NO') {
              console.log('ℹ️ La columna `password` estaba NOT NULL — cambiando a NULLABLE para evitar violaciones de constraint');
              await client.query(`ALTER TABLE usuarios ALTER COLUMN password DROP NOT NULL`);
              console.log('✅ Columna `password` ahora es NULLABLE');
            }
          } catch (merr) {
            console.error('❌ Error cambiando password a NULLABLE:', merr.message);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error al comprobar/migrar columnas usuarios:', err.message);
    }
    
    console.log('📊 Creando tabla session...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    
    console.log('👤 Insertando usuario administrador...');

    // Aseguramos que si existe la columna `password` (legacy) también la llenamos para evitar NOT NULL errors
    try {
      const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name IN ('password','contrasena')`);
      const present = cols.rows.map(r => r.column_name);
      const hasPassword = present.includes('password');

      const adminHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

      let result;
      if (hasPassword) {
        result = await client.query(`
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
        result = await client.query(`
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
    } catch (adminErr) {
      console.error('❌ Error insertando usuario admin:', adminErr.message);
      // Fallback: ensure result exists so downstream logic doesn't crash
      var result = { rows: [] };
    }

    if (result.rows.length > 0) {
      console.log('✅ USUARIO ADMIN CREADO:');
      console.log('   ID:', result.rows[0].id);
      console.log('   Nombre:', result.rows[0].nombre);
      console.log('   Email:', result.rows[0].correo);
      console.log('   Rol:', result.rows[0].role);
    } else {
      console.log('ℹ️ Usuario administrador ya existía');
    }
    
    console.log('\n🎉 ¡TABLAS CREADAS EXITOSAMENTE!');
    // Asegurar las tablas auxiliares que la app usa
    console.log('📊 Creando tablas auxiliares...');
    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    console.log('\n🎉 ¡TABLAS CREADAS EXITOSAMENTE!');
    console.log('   Email: joseraulruizreal@gmail.com');
    console.log('   Contraseña: password');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('🔚 Conexión cerrada');
  }
}

createTables();