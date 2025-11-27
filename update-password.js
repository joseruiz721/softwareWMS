// update-password.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updatePassword() {
  try {
    console.log('🔑 Actualizando contraseña del usuario administrador...');
    
    // Hashear la contraseña "password"
    const hashedPassword = await bcrypt.hash('password', 10);
    
    // Actualizar el usuario en la base de datos
    const result = await pool.query(`
      UPDATE usuarios 
      SET password = $1 
      WHERE correo = $2 
      RETURNING id, nombre, correo
    `, [hashedPassword, 'joseraulruizreal@gmail.com']);
    
    if (result.rows.length > 0) {
      console.log('✅ CONTRASEÑA ACTUALIZADA:');
      console.log('   Usuario:', result.rows[0].nombre);
      console.log('   Email:', result.rows[0].correo);
      console.log('   Contraseña nueva: password (hasheada)');
    } else {
      console.log('❌ Usuario no encontrado');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

updatePassword();