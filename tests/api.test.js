const { app, ensureDB } = require('../src/app');
const { getDB } = require('../src/config/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/middlewares/auth.middleware');

describe('API Integration Tests', () => {
    let server;
    let baseUrl;
    let authToken;
    let testUserId;
    const testUserEmail = 'tester@habitrack.app';

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';
        await ensureDB();
        const db = await getDB();

        server = app.listen(0);
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;

        // Create test user in db
        const userRes = await db.run(
            'INSERT INTO users (username, email) VALUES (?, ?)',
            [testUserEmail, testUserEmail]
        );
        testUserId = userRes.lastID || 1;

        authToken = jwt.sign(
            { id: testUserId, username: testUserEmail, email: testUserEmail },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        if (server && server.close) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    describe('GET /api/health', () => {
        it('returns status ok and timestamp', async () => {
            const res = await fetch(`${baseUrl}/api/health`);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.status).toBe('ok');
            expect(data.timestamp).toBeDefined();
        });
    });

    describe('POST /api/calcular', () => {
        it('calculates taxes and expenses without auth needed', async () => {
            const res = await fetch(`${baseUrl}/api/calcular`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    price: 150000,
                    ccaa: 'Madrid',
                    estateType: 'secondhand'
                })
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.tax.ratePct).toBe(6.0);
            expect(data.tax.amount).toBe(9000);
            expect(data.totalExpenses).toBeGreaterThan(9000);
        });
    });

    describe('Properties Endpoint Security & Validation', () => {
        let createdPropertyId;

        it('rejects unauthenticated requests to /api/propiedades with 401', async () => {
            const res = await fetch(`${baseUrl}/api/propiedades`);
            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBeDefined();
        });

        it('creates a new property when authenticated', async () => {
            const propertyPayload = {
                title: 'Ático con terraza y piscina',
                price: 220000,
                m2: 85,
                ccaa: 'Andalucía',
                rooms: 2,
                baths: 1,
                estate_type: 'secondhand',
                garage: 'si'
            };

            const res = await fetch(`${baseUrl}/api/propiedades`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(propertyPayload)
            });

            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data.id).toBeDefined();
            expect(data.title).toBe(propertyPayload.title);
            createdPropertyId = data.id;
        });

        it('lists properties including created one', async () => {
            const res = await fetch(`${baseUrl}/api/propiedades`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data.some(p => p.id === createdPropertyId)).toBe(true);
        });

        it('deletes the property successfully', async () => {
            const res = await fetch(`${baseUrl}/api/propiedades/${createdPropertyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.message).toBeDefined();
        });
    });

    describe('Settings Endpoint', () => {
        it('saves and retrieves calculator settings', async () => {
            const settingsPayload = {
                downpaymentPct: 25,
                notaryRegistryPct: 1.5,
                appraisalCost: 350,
                newBuildAjd: 1.0,
                mortgageInterestRate: 2.8,
                mortgageDurationYears: 25
            };

            const saveRes = await fetch(`${baseUrl}/api/ajustes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(settingsPayload)
            });

            expect(saveRes.status).toBe(200);

            const getRes = await fetch(`${baseUrl}/api/ajustes`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            expect(getRes.status).toBe(200);
            const data = await getRes.json();
            expect(data.downpaymentPct).toBe(25);
            expect(data.appraisalCost).toBe(350);
        });
    });
});
