const { Router } = require('express');
const { sendOtp, verifyOtp, getMe } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { authLimiter } = require('../middlewares/security.middleware');
const { sendOtpSchema, verifyOtpSchema } = require('../schemas/auth.schema');

const router = Router();

// OTP Endpoints with Rate Limiting and Zod Validation
router.post('/send-otp', authLimiter, validate(sendOtpSchema), sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyOtp);

// User profile / token validation
router.get('/me', authenticateToken, getMe);

// Deprecated fallback endpoints for compatibility
router.post('/register', (req, res) => res.status(400).json({ error: 'El sistema usa autenticación por correo y OTP.' }));
router.post('/login', (req, res) => res.status(400).json({ error: 'El sistema usa autenticación por correo y OTP.' }));

module.exports = router;
