const { Router } = require('express');
const { getSettings, saveSettings, calculate } = require('../controllers/settings.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { calculatorSettingsSchema } = require('../schemas/settings.schema');

const router = Router();

// Calculator settings
router.get('/ajustes', authenticateToken, getSettings);
router.post('/ajustes', authenticateToken, validate(calculatorSettingsSchema), saveSettings);

// Standalone calculation endpoint
router.post('/calcular', calculate);

module.exports = router;
