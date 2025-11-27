// config/logger.js - Sistema de logging organizado
const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const CURRENT_LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

class Logger {
    static shouldLog(level) {
        const levelValues = {
            'ERROR': LOG_LEVELS.ERROR,
            'WARN': LOG_LEVELS.WARN,
            'INFO': LOG_LEVELS.INFO,
            'DEBUG': LOG_LEVELS.DEBUG
        };
        return levelValues[level] <= levelValues[CURRENT_LOG_LEVEL];
    }

    static hideLegacyLogs() {
        // Silenciar console.log legacy temporalmente
        const originalConsoleLog = console.log;
        console.log = function(...args) {
            const message = args[0] || '';
            
            // Filtrar mensajes legacy que no queremos mostrar
            const legacyPatterns = [
                '🔐 Verificando autenticación para:',
                '📍 Session ID:',
                '👤 User en session:',
                '✅ Usuario autenticado:',
                '🔍 Ejecutando consulta SQL:',
                '✅ Consulta ejecutada exitosamente.',
                '🔧 Solicitando mantenimientos...',
                '✅ Encontrados',
                '🔍 Debug de registros',
                '   Registro',
                'Parámetros:',
                'Filas afectadas:'
            ];
            
            const shouldHide = legacyPatterns.some(pattern => 
                typeof message === 'string' && message.includes(pattern)
            );
            
            if (!shouldHide) {
                originalConsoleLog.apply(console, args);
            }
        };
    }

    static error(message, data = null) {
        if (this.shouldLog('ERROR')) {
            console.log(`❌ [${new Date().toLocaleTimeString()}] ERROR: ${message}`);
            if (data) console.log('   📋 Datos:', data);
        }
    }

    static warn(message, data = null) {
        if (this.shouldLog('WARN')) {
            console.log(`⚠️ [${new Date().toLocaleTimeString()}] WARN: ${message}`);
            if (data) console.log('   📋 Datos:', data);
        }
    }

    static info(message, data = null) {
        if (this.shouldLog('INFO')) {
            console.log(`ℹ️ [${new Date().toLocaleTimeString()}] INFO: ${message}`);
            if (data && CURRENT_LOG_LEVEL === 'DEBUG') console.log('   📋 Datos:', data);
        }
    }

    static debug(message, data = null) {
        if (this.shouldLog('DEBUG')) {
            console.log(`🔍 [${new Date().toLocaleTimeString()}] DEBUG: ${message}`);
            if (data) console.log('   📋 Datos:', data);
        }
    }

    static http(method, path, sessionId, user) {
        if (this.shouldLog('INFO')) {
            const userInfo = user ? user.nombre : 'No autenticado';
            console.log(`🌐 [${new Date().toLocaleTimeString()}] ${method} ${path}`);
            if (CURRENT_LOG_LEVEL === 'DEBUG') {
                console.log(`   📍 Session: ${sessionId}`);
                console.log(`   👤 User: ${userInfo}`);
            }
        }
    }

    static database(query, params = null) {
        if (this.shouldLog('DEBUG')) {
            console.log(`🗃️ [${new Date().toLocaleTimeString()}] SQL: ${query}`);
            if (params) console.log('   📋 Parámetros:', params);
        }
    }

    static auth(action, user, success = true) {
        if (this.shouldLog('INFO')) {
            const icon = success ? '🔐' : '🚫';
            const status = success ? 'exitosa' : 'fallida';
            console.log(`${icon} [${new Date().toLocaleTimeString()}] Autenticación ${status}: ${action} - ${user}`);
        }
    }

    static startup(port, environment) {
        console.log(`\n🚀 ========================================`);
        console.log(`🚀    SISTEMA WMS MIZOOCO INICIADO`);
        console.log(`🚀 ========================================`);
        console.log(`📡 Puerto: ${port}`);
        console.log(`🌍 Ambiente: ${environment}`);
        console.log(`📊 Nivel de Log: ${CURRENT_LOG_LEVEL}`);
        console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);
        console.log(`🚀 ========================================\n`);
    }
}

// 🆕 Aplicar filtro de logs legacy automáticamente
if (CURRENT_LOG_LEVEL !== 'DEBUG') {
    Logger.hideLegacyLogs();
}

module.exports = Logger;