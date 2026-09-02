const { getDB } = require('../config/database');
const { DEFAULT_SETTINGS } = require('../config/constants');
const { calculatePurchaseExpenses } = require('../services/calculator.service');

/**
 * Get user calculator settings
 */
async function getSettings(req, res, next) {
    try {
        const db = await getDB();
        const row = await db.get(
            "SELECT value FROM user_settings WHERE user_id = ? AND key = 'calculator_config'",
            [req.user.id]
        );

        if (!row) {
            return res.json(DEFAULT_SETTINGS);
        }

        res.json(JSON.parse(row.value));
    } catch (err) {
        next(err);
    }
}

/**
 * Save user calculator settings
 */
async function saveSettings(req, res, next) {
    try {
        const config = req.body;
        const db = await getDB();

        await db.run(
            "INSERT INTO user_settings (user_id, key, value) VALUES (?, 'calculator_config', ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
            [req.user.id, JSON.stringify(config)]
        );

        res.json({ message: 'Configuración guardada correctamente.', config });
    } catch (err) {
        next(err);
    }
}

/**
 * Standalone calculation endpoint (allows testing / client calculations without local code)
 */
async function calculate(req, res, next) {
    try {
        const result = calculatePurchaseExpenses(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getSettings,
    saveSettings,
    calculate
};
