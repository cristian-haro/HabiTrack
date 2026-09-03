const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { JWT_SECRET } = require('../middlewares/auth.middleware');
const { JWT_EXPIRES_IN, OTP_EXPIRATION_MINUTES, DEFAULT_SETTINGS } = require('../config/constants');
const { sendOTPEmail } = require('../services/email.service');

/**
 * Request a 6-digit OTP login code sent by email
 */
async function sendOtp(req, res, next) {
    try {
        const { email } = req.body;
        const cleanEmail = email.trim().toLowerCase();
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString();

        const db = await getDB();
        let user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [cleanEmail, cleanEmail]);

        if (user) {
            await db.run(
                'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
                [otpCode, expiresAt, user.id]
            );
        } else {
            const insertResult = await db.run(
                'INSERT INTO users (username, email, password, otp_code, otp_expires_at) VALUES (?, ?, ?, ?, ?)',
                [cleanEmail, cleanEmail, '', otpCode, expiresAt]
            );
            const userId = insertResult.lastID;

            if (userId) {
                await db.run(
                    "INSERT INTO user_settings (user_id, key, value) VALUES (?, 'calculator_config', ?) ON CONFLICT(user_id, key) DO NOTHING",
                    [userId, JSON.stringify(DEFAULT_SETTINGS)]
                );
            }
        }

        console.log(`🔑 [OTP SOLICITADO] Para: ${cleanEmail}`);

        const emailResult = await sendOTPEmail(cleanEmail, otpCode);

        const responseData = {
            success: true,
            message: `Código de acceso enviado a tu correo (${cleanEmail}).`,
            email: cleanEmail
        };

        res.json(responseData);
    } catch (err) {
        next(err);
    }
}

/**
 * Verify OTP code and issue a JWT token
 */
async function verifyOtp(req, res, next) {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ error: 'Correo y código de verificación obligatorios.' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanCode = String(code).trim();

        const db = await getDB();
        const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [cleanEmail, cleanEmail]);

        if (!user) {
            return res.status(400).json({ error: 'Usuario no encontrado. Por favor, solicita un nuevo código.' });
        }

        const storedOtp = user.otp_code ? String(user.otp_code).trim() : '';

        if (!storedOtp || storedOtp !== cleanCode) {
            return res.status(400).json({ error: 'Código de verificación incorrecto.' });
        }

        // Expiry check with timezone resilience
        if (user.otp_expires_at) {
            let expiryMs = 0;
            if (user.otp_expires_at instanceof Date) {
                expiryMs = user.otp_expires_at.getTime();
            } else if (typeof user.otp_expires_at === 'number') {
                expiryMs = user.otp_expires_at;
            } else {
                const str = String(user.otp_expires_at).trim();
                expiryMs = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z').getTime();
                if (isNaN(expiryMs)) {
                    expiryMs = new Date(str).getTime();
                }
            }

            const now = Date.now();
            const tzOffsetMs = new Date().getTimezoneOffset() * 60 * 1000;
            const adjustedExpiryMs = expiryMs - tzOffsetMs;

            // The code is expired ONLY if it has expired under both standard and timezone-shifted interpretations
            const isExpired = (!isNaN(expiryMs) && (expiryMs + 60000) < now) &&
                              (!isNaN(adjustedExpiryMs) && (adjustedExpiryMs + 60000) < now);

            if (isExpired) {
                return res.status(400).json({ error: 'El código ha caducado. Solicita uno nuevo.' });
            }
        }

        await db.run('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [user.id]);

        const userEmail = user.email || user.username || cleanEmail;
        const token = jwt.sign(
            { id: user.id, username: userEmail, email: userEmail },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        console.log(`✅ [SESIÓN INICIADA] Usuario: ${userEmail}`);

        res.json({
            success: true,
            token,
            username: userEmail,
            email: userEmail,
            message: 'Inicio de sesión correcto.'
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Return authenticated user profile
 */
async function getMe(req, res) {
    res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email
    });
}

module.exports = {
    sendOtp,
    verifyOtp,
    getMe
};
