const { app, ensureDB } = require('../src/app');
const { getDB } = require('../src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middlewares/auth.middleware');

describe('Auth & OTP Cross-Platform Integration Tests', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        await ensureDB();

        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        if (server && server.close) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    describe('POST /api/auth/send-otp', () => {
        it('rejects invalid email formats', async () => {
            const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'not-an-email' })
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBeDefined();
        });

        it('generates OTP and creates user if not exists', async () => {
            const testEmail = 'newuser@habitrack.app';
            const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail })
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.email).toBe(testEmail);
            expect(data.devOtp).toBeUndefined();

            const db = await getDB();
            const user = await db.get('SELECT * FROM users WHERE email = ?', [testEmail]);
            expect(user).toBeDefined();
            expect(user.otp_code).toMatch(/^\d{6}$/);
        });
    });

    describe('POST /api/auth/verify-otp', () => {
        const verifyEmail = 'verifytest@habitrack.app';
        let generatedOtp;

        beforeAll(async () => {
            const res = await fetch(`${baseUrl}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail })
            });
            const data = await res.json();
            expect(data.devOtp).toBeUndefined();

            const db = await getDB();
            const user = await db.get('SELECT otp_code FROM users WHERE email = ?', [verifyEmail]);
            generatedOtp = user.otp_code;
        });

        it('rejects invalid or wrong OTP code', async () => {
            const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail, code: '000000' })
            });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toContain('incorrecto');
        });

        it('successfully verifies correct OTP and returns valid JWT', async () => {
            const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail, code: generatedOtp })
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.token).toBeDefined();
            expect(data.email).toBe(verifyEmail);

            const decoded = jwt.verify(data.token, JWT_SECRET);
            expect(decoded.email).toBe(verifyEmail);
        });

        it('fails if reusing the already consumed OTP', async () => {
            const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail, code: generatedOtp })
            });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/auth/me', () => {
        let validToken;
        const meEmail = 'meuser@habitrack.app';

        beforeAll(async () => {
            const sendRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: meEmail })
            });
            const sendData = await sendRes.json();
            expect(sendData.devOtp).toBeUndefined();

            const db = await getDB();
            const user = await db.get('SELECT otp_code FROM users WHERE email = ?', [meEmail]);

            const verifyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: meEmail, code: user.otp_code })
            });
            const verifyData = await verifyRes.json();
            validToken = verifyData.token;
        });

        it('returns profile for valid authorization header', async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${validToken}` }
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.email).toBe(meEmail);
        });

        it('rejects unauthorized request with 401', async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`);
            expect(res.status).toBe(401);
        });
    });
});
