// ==============================================
// UTILIDAD: queryAsync - Manejo robusto de consultas PostgreSQL
// ==============================================

const { pool } = require('../config/database');

/**
 * ✅ FUNCIÓN MEJORADA: Ejecuta consultas SQL con manejo robusto de errores
 * @param {string} sql - Consulta SQL a ejecutar
 * @param {Array} params - Parámetros para la consulta (opcional)
 * @returns {Promise} Promesa que resuelve con los resultados
 */
function queryAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        // Validar parámetros de entrada
        if (typeof sql !== 'string' || sql.trim() === '') {
            return reject(new Error('SQL query must be a non-empty string'));
        }

        if (!Array.isArray(params)) {
            return reject(new Error('Params must be an array'));
        }

        console.log(`🔍 Ejecutando consulta SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`, params.length > 0 ? `Parámetros: [${params.join(', ')}]` : '');

        pool.query(sql, params, (error, results) => {
            if (error) {
                // Manejar diferentes tipos de errores sin detener la aplicación
                const errorHandler = getErrorHandler(error, sql);
                return errorHandler(resolve, reject, error);
            }
            
            // Log exitoso para debugging
            const rowCount = results.rows ? results.rows.length : 0;
            console.log(`✅ Consulta ejecutada exitosamente. Filas afectadas: ${rowCount}`);
            
            resolve(results.rows || results);
        });
    });
}

/**
 * ✅ FUNCIÓN: Maneja diferentes tipos de errores de PostgreSQL
 */
function getErrorHandler(error, sql) {
    const errorCode = error.code;
    
    switch (errorCode) {
        case '42P01': // tabla no existe
            return (resolve, reject, error) => {
                const tableName = extractTableName(sql);
                console.warn(`⚠️ Tabla no encontrada: ${tableName || 'tabla desconocida'}`);
                console.warn(`   Consulta: ${sql.substring(0, 200)}...`);
                resolve([]); // Retornar array vacío en lugar de error
            };
            
        case '42703': // columna no existe
            return (resolve, reject, error) => {
                console.warn(`⚠️ Columna no encontrada en consulta: ${sql.substring(0, 200)}...`);
                console.warn(`   Error: ${error.message}`);
                resolve([]); // Retornar array vacío
            };
            
        case '23505': // violación de unique constraint
            return (resolve, reject, error) => {
                console.warn(`⚠️ Violación de constraint único: ${error.detail}`);
                reject(new Error('El registro ya existe en la base de datos.'));
            };
            
        case '23503': // violación de foreign key
            return (resolve, reject, error) => {
                console.warn(`⚠️ Violación de llave foránea: ${error.detail}`);
                reject(new Error('No se puede realizar la operación debido a restricciones de integridad referencial.'));
            };
            
        case '23502': // violación de not null
            return (resolve, reject, error) => {
                console.warn(`⚠️ Violación de campo NOT NULL: ${error.message}`);
                reject(new Error('Campo requerido no puede estar vacío.'));
            };
            
        case '28P01': // error de autenticación
            return (resolve, reject, error) => {
                console.error('❌ Error de autenticación de base de datos');
                reject(new Error('Error de conexión a la base de datos. Contacte al administrador.'));
            };
            
        case '3D000': // base de datos no existe
            return (resolve, reject, error) => {
                console.error('❌ Base de datos no existe');
                reject(new Error('Error de configuración de base de datos.'));
            };
            
        case 'ECONNREFUSED': // conexión rechazada
            return (resolve, reject, error) => {
                console.error('❌ Conexión a base de datos rechazada');
                reject(new Error('No se puede conectar al servidor de base de datos.'));
            };
            
        default:
            return (resolve, reject, error) => {
                console.error('❌ Error en consulta SQL:', { 
                    sql: sql.substring(0, 100) + '...', 
                    error: error.message,
                    code: error.code,
                    detail: error.detail,
                    hint: error.hint
                });
                reject(error);
            };
    }
}

/**
 * ✅ FUNCIÓN: Extrae el nombre de la tabla de una consulta SQL
 */
function extractTableName(sql) {
    const lowerSql = sql.toLowerCase();
    
    // Patrones para extraer nombres de tablas
    const patterns = [
        /from\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
        /insert\s+into\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
        /update\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
        /delete\s+from\s+([a-zA-Z_][a-zA-Z0-9_]*)/
    ];
    
    for (const pattern of patterns) {
        const match = lowerSql.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

/**
 * ✅ FUNCIÓN: Ejecuta una consulta con reintentos automáticos
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros
 * @param {number} maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} delay - Delay entre reintentos en ms (default: 1000)
 */
async function queryAsyncWithRetry(sql, params = [], maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await queryAsync(sql, params);
        } catch (error) {
            lastError = error;
            
            // Solo reintentar en errores de conexión
            if (error.code === 'ECONNREFUSED' || error.code === 'CONNECTION_ERROR') {
                console.warn(`⚠️ Reintento ${attempt}/${maxRetries} por error de conexión...`);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                }
            } else {
                // No reintentar en otros tipos de errores
                throw error;
            }
        }
    }
    
    throw lastError;
}

/**
 * ✅ FUNCIÓN: Ejecuta múltiples consultas en una transacción
 * @param {Array} queries - Array de objetos {sql, params}
 */
async function executeTransaction(queries) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log('🔄 Iniciando transacción...');
        
        const results = [];
        for (const query of queries) {
            console.log(`   Ejecutando: ${query.sql.substring(0, 100)}...`);
            const result = await client.query(query.sql, query.params || []);
            results.push(result.rows || result);
        }
        
        await client.query('COMMIT');
        console.log('✅ Transacción completada exitosamente');
        
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Transacción revertida debido a error:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * ✅ FUNCIÓN: Valida si una consulta es de solo lectura
 */
function isReadOnlyQuery(sql) {
    const readOnlyPatterns = [
        /^SELECT\s+/i,
        /^WITH\s+/i,
        /^SHOW\s+/i,
        /^DESCRIBE\s+/i,
        /^EXPLAIN\s+/i
    ];
    
    const sqlTrimmed = sql.trim();
    return readOnlyPatterns.some(pattern => pattern.test(sqlTrimmed));
}

/**
 * ✅ FUNCIÓN: Sanitiza parámetros para prevenir SQL injection
 */
function sanitizeParams(params) {
    return params.map(param => {
        if (typeof param === 'string') {
            // Remover caracteres potencialmente peligrosos
            return param.replace(/['";\\]/g, '');
        }
        return param;
    });
}

module.exports = {
    queryAsync,
    queryAsyncWithRetry,
    executeTransaction,
    isReadOnlyQuery,
    sanitizeParams
};