// update-password.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

console.log('🔑 ACTUALIZANDO CONTRASEÑA DEL USUARIO...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updatePassword() {
  try {
    // Hashear la contraseña "password"
    const hashedPassword = await bcrypt.hash('password', 10);
    console.log('🔐 Contraseña hasheada creada');
    
    // Actualizar el usuario en la base de datos
    // Si existe la columna legacy `password`, actualizamos ambas columnas para mantener sincronía
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'password'`);
    const hasPassword = cols.rows.length > 0;

    let result;
    if (hasPassword) {
      result = await pool.query(`
        UPDATE usuarios 
        SET contrasena = $1, password = $1
        WHERE correo = $2 
        RETURNING id, nombre, correo, role
      `, [hashedPassword, 'joseraulruizreal@gmail.com']);
    } else {
      result = await pool.query(`
        UPDATE usuarios 
        SET contrasena = $1 
        WHERE correo = $2 
        RETURNING id, nombre, correo, role
      `, [hashedPassword, 'joseraulruizreal@gmail.com']);
    }
    
    if (result.rows.length > 0) {
      console.log('✅ CONTRASEÑA ACTUALIZADA EXITOSAMENTE:');
      console.log('   Usuario:', result.rows[0].nombre);
      console.log('   Email:', result.rows[0].correo);
      console.log('   Rol:', result.rows[0].role);
      console.log('   Contraseña nueva: password (hasheada correctamente)');
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await pool.end();
    console.log('🔚 Conexión cerrada');
  }
}

updatePassword();