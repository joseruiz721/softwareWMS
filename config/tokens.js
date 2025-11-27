// config/tokens.js - CÓDIGO COMPLETO
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secreto_muy_seguro_para_tokens_123456789_abcdef';

function generarToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verificarToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido o expirado');
    }
}

function decodificarToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        throw new Error('Token inválido');
    }
}

module.exports = {
    generarToken,
    verificarToken,
    decodificarToken,
    JWT_SECRET
};