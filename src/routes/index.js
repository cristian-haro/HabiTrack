const { Router } = require('express');
const authRoutes = require('./auth.routes');
const propertyRoutes = require('./property.routes');
const settingsRoutes = require('./settings.routes');

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Mount modular subrouters
router.use('/auth', authRoutes);
router.use('/', propertyRoutes);
router.use('/', settingsRoutes);

module.exports = router;
