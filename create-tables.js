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
    
    console.log('📊 Creando tabla usuarios...');
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
    
    console.log('📊 Creando tabla session...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    
    console.log('👤 Insertando usuario administrador...');
    const result = await client.query(`
      INSERT INTO usuarios (cedula, nombre, correo, contrasena, role) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (correo) DO NOTHING
      RETURNING id, nombre, correo, role
    `, [
      '12345678',
      'Administrador', 
      'joseraulruizreal@gmail.com', 
      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'admin'
    ]);
    
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
    console.log('📧 Ahora puedes hacer login con:');
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