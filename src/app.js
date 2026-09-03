const express = require('express');
const path = require('path');
const { initDB } = require('./config/database');
const { helmetMiddleware, corsMiddleware, apiLimiter } = require('./middlewares/security.middleware');
const { errorHandler } = require('./middlewares/errorHandler.middleware');
const apiRouter = require('./routes');

const app = express();

let dbInitialized = false;
let dbInitPromise = null;

async function ensureDB() {
    if (dbInitialized) return;
    if (!dbInitPromise) {
        dbInitPromise = initDB().then(() => {
            dbInitialized = true;
        }).catch(err => {
            dbInitPromise = null;
            throw err;
        });
    }
    await dbInitPromise;
}

// Security & Base Middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json());

// Database connection assurance for API routes
app.use(async (req, res, next) => {
    const isApi = req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/casas') || req.path.startsWith('/propiedades') || req.path.startsWith('/properties') || req.path.startsWith('/ajustes') || req.path.startsWith('/analizar') || req.path.startsWith('/calcular');
    if (isApi && req.path !== '/api/health' && req.path !== '/health') {
        try {
            await ensureDB();
        } catch (err) {
            console.error('Error al inicializar BD:', err);
            return res.status(500).json({ error: 'Error de conexión a la base de datos: ' + (err.message || String(err)) });
        }
    }
    next();
});

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount API with Rate Limiting (under /api and also / for direct route compatibility)
app.use('/api', apiLimiter, apiRouter);
app.use('/', apiLimiter, apiRouter);

// Static files (frontend) with cache bypass for development
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// SPA fallback for HTML5 history API navigation
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
        return next();
    }
    res.sendFile(path.join(rootDir, 'index.html'));
});

// Global Centralized Error Handler
app.use(errorHandler);

module.exports = {
    app,
    ensureDB
};
