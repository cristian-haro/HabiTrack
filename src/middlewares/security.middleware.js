const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Rate limiter estricto para rutas de autenticación (OTP)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Máximo 10 intentos cada 15 minutos
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test',
    message: { error: 'Demasiadas solicitudes de código de acceso. Por seguridad, inténtalo de nuevo en 15 minutos.' }
});

// Rate limiter general para la API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'test' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
    message: { error: 'Límite de peticiones excedido. Por favor, reduce la frecuencia de consultas.' }
});

// Configuración de Helmet adaptada para servir frontend estático e imágenes externas (OpenGraph / Fotocasa / Idealista)
const helmetMiddleware = helmet({
    contentSecurityPolicy: false, // Permitir carga flexible de recursos en la SPA actual
    crossOriginEmbedderPolicy: false
});

const corsMiddleware = cors({
    origin: true,
    credentials: true
});

module.exports = {
    authLimiter,
    apiLimiter,
    helmetMiddleware,
    corsMiddleware
};
