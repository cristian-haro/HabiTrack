const { Router } = require('express');
const { getDB } = require('../config/database');
const authRoutes = require('./auth.routes');
const propertyRoutes = require('./property.routes');
const settingsRoutes = require('./settings.routes');
const workspaceRoutes = require('./workspace.routes');

const router = Router();

// Health check endpoint (rápido en memoria)
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Endpoint keep-alive para cron-job.org / uptime monitors:
// Ejecuta una consulta SQL real (SELECT 1) para que Supabase / Postgres nunca se suspenda por inactividad
router.get('/keep-alive', async (req, res) => {
    try {
        const startTime = Date.now();
        const db = await getDB();
        await db.get('SELECT 1 as ping');
        const latencyMs = Date.now() - startTime;

        res.json({
            status: 'ok',
            message: 'Database keep-alive ping successful. Supabase/PostgreSQL is active.',
            database: db.isPostgres ? 'postgresql' : 'sqlite',
            latencyMs,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Keep-alive database ping failed:', err);
        res.status(500).json({
            status: 'error',
            message: 'Database keep-alive ping failed',
            error: err.message || String(err),
            timestamp: new Date().toISOString()
        });
    }
});

// Mount modular subrouters
router.use('/auth', authRoutes);
router.use('/', propertyRoutes);
router.use('/', settingsRoutes);
router.use('/', workspaceRoutes);

module.exports = router;
