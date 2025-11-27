// sync-password-columns.js
// Script seguro para sincronizar datos entre las columnas `password` y `contrasena`.
// Uso: node sync-password-columns.js

const { Pool } = require('pg');

console.log('🔁 Sincronizando columnas password -> contrasena (si corresponde)...');

const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'control_acceso',
      password: process.env.DB_PASSWORD || '09262405',
      port: process.env.DB_PORT || 5432,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool(connectionConfig);

async function sync() {
  let client;
  try {
    client = await pool.connect();

    // Comprobar columnas existentes
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name IN ('password', 'contrasena')
    `);

    const hasPassword = cols.rows.some(r => r.column_name === 'password');
    const hasContrasena = cols.rows.some(r => r.column_name === 'contrasena');

    console.log('🔍 Columnas detectadas - password:', hasPassword, 'contrasena:', hasContrasena);

    // Si no existe contrasena, crearla
    if (!hasContrasena) {
      console.log('➕ Creando columna contrasena');
      await client.query(`ALTER TABLE usuarios ADD COLUMN contrasena VARCHAR(255);`);
    }

    // Si existe password, copiar a contrasena cuando contrasena sea NULL
    if (hasPassword) {
      const updateResult = await client.query(`
        UPDATE usuarios
        SET contrasena = password
        WHERE contrasena IS NULL AND password IS NOT NULL
        RETURNING id, correo
      `);

      console.log(`✅ Filas actualizadas: ${updateResult.rowCount}`);
      if (updateResult.rowCount > 0) {
        console.log('✅ Ejemplo de cuentas sincronizadas:', updateResult.rows.slice(0,3));
      }

      console.log('🔒 Nota: No eliminamos la columna `password` automáticamente para seguridad. Revísalo manualmente si quieres limpiar.' );
    } else {
      console.log('ℹ️ No se detectó columna `password` — ninguna acción de copia necesaria.');
    }

    console.log('🎉 Sincronización finalizada.');

  } catch (error) {
    console.error('❌ Error durante sincronización:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

sync();
