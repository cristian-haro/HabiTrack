require('dotenv').config();
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_dev';

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

let db;
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

app.use(async (req, res, next) => {
    if (req.path.startsWith('/api') && req.path !== '/api/health') {
        try {
            await ensureDB();
        } catch (err) {
            console.error('Error al inicializar BD:', err);
            return res.status(500).json({ error: 'Error de conexión a la base de datos: ' + (err.message || String(err)) });
        }
    }
    next();
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// CCAA Default ITP Rates in Spain
const DEFAULT_CCAA_ITP = {
    'Andalucía': 7.0,
    'Aragón': 8.0,
    'Asturias': 8.0,
    'Baleares': 8.0,
    'Canarias': 6.5,
    'Cantabria': 9.0,
    'Castilla-La Mancha': 9.0,
    'Castilla y León': 8.0,
    'Cataluña': 10.0,
    'Comunidad Valenciana': 10.0,
    'Extremadura': 8.0,
    'Galicia': 9.0,
    'Madrid': 6.0,
    'Murcia': 8.0,
    'Navarra': 6.0,
    'País Vasco': 4.0,
    'La Rioja': 7.0,
    'Ceuta': 6.0,
    'Melilla': 6.0
};

const DEFAULT_SETTINGS = {
    downpaymentPct: 20,
    notaryRegistryPct: 1.5,
    appraisalCost: 400,
    newBuildAjd: 1.0,
    ccaaRates: DEFAULT_CCAA_ITP,
    mortgageInterestRate: 3.0,
    mortgageDurationYears: 30
};

// Initialize Database
async function initDB() {
    db = await getDB();

    if (db.isPostgres) {
        // Create table for users in Postgres
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                username VARCHAR(255),
                password VARCHAR(255),
                otp_code VARCHAR(10),
                otp_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        try { await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)"); } catch(e) {}
        try { await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)"); } catch(e) {}
        try { await db.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP"); } catch(e) {}

        // Create table for properties in Postgres
        await db.exec(`
            CREATE TABLE IF NOT EXISTS properties (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                m2 DOUBLE PRECISION,
                ccaa VARCHAR(100) NOT NULL,
                rooms INTEGER DEFAULT 0,
                baths INTEGER DEFAULT 0,
                estate_type VARCHAR(50) DEFAULT 'secondhand',
                garage VARCHAR(50) DEFAULT 'no',
                zone VARCHAR(255),
                url TEXT,
                photos TEXT,
                elevator VARCHAR(50) DEFAULT 'desconocido',
                comments TEXT,
                rating INTEGER DEFAULT 0,
                latitude DOUBLE PRECISION,
                longitude DOUBLE PRECISION,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create table for user_settings in Postgres
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER REFERENCES users(id),
                key VARCHAR(255) NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY (user_id, key)
            )
        `);
    } else {
        // Create table for users in SQLite
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                username TEXT,
                password TEXT,
                otp_code TEXT,
                otp_expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        try { await db.exec("ALTER TABLE users ADD COLUMN email TEXT"); } catch(e) {}
        try { await db.exec("ALTER TABLE users ADD COLUMN otp_code TEXT"); } catch(e) {}
        try { await db.exec("ALTER TABLE users ADD COLUMN otp_expires_at DATETIME"); } catch(e) {}

        // Create table for properties in SQLite
        await db.exec(`
            CREATE TABLE IF NOT EXISTS properties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                price REAL NOT NULL,
                m2 REAL,
                ccaa TEXT NOT NULL,
                rooms INTEGER DEFAULT 0,
                baths INTEGER DEFAULT 0,
                estate_type TEXT CHECK(estate_type IN ('secondhand', 'new')) DEFAULT 'secondhand',
                garage TEXT CHECK(garage IN ('si', 'no', 'opcional')) DEFAULT 'no',
                zone TEXT,
                url TEXT,
                photos TEXT,
                elevator TEXT CHECK(elevator IN ('si', 'no', 'desconocido')) DEFAULT 'desconocido',
                comments TEXT,
                rating INTEGER DEFAULT 0,
                latitude REAL,
                longitude REAL,
                user_id INTEGER REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Schema Migrations (silently fail if columns already exist)
        try { await db.exec("ALTER TABLE properties ADD COLUMN rating INTEGER DEFAULT 0"); } catch(e) {}
        try { await db.exec("ALTER TABLE properties ADD COLUMN latitude REAL"); } catch(e) {}
        try { await db.exec("ALTER TABLE properties ADD COLUMN longitude REAL"); } catch(e) {}
        try { await db.exec("ALTER TABLE properties ADD COLUMN user_id INTEGER"); } catch(e) {}

        // Create table for user_settings in SQLite
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER REFERENCES users(id),
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY (user_id, key)
            )
        `);
    }

    console.log("Base de datos inicializada correctamente.");
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        req.user = user;
        next();
    });
}

// REST API Endpoints

// Healthcheck & Diagnostic endpoint
app.get('/api/health', async (req, res) => {
    const diagnostics = {
        nodeVersion: process.version,
        envVercel: !!process.env.VERCEL,
        hasDATABASE_URL: !!process.env.DATABASE_URL,
        hasPOSTGRES_URL: !!process.env.POSTGRES_URL,
        hasPOSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
        hasPOSTGRES_HOST: !!process.env.POSTGRES_HOST,
        hasPOSTGRES_PASSWORD: !!process.env.POSTGRES_PASSWORD,
    };
    try {
        const { getDB } = require('./db');
        const database = await getDB();
        const testRes = await database.get('SELECT 1 as test');
        diagnostics.dbConnected = true;
        diagnostics.dbTest = testRes;
        res.json({ status: 'ok', diagnostics });
    } catch (err) {
        diagnostics.dbConnected = false;
        diagnostics.error = err.message;
        diagnostics.stack = err.stack;
        res.status(200).json({ status: 'error', diagnostics });
    }
});

// Helper function to send email via SMTP using Nodemailer
async function sendOTPEmail(toEmail, otpCode) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
    const smtpFrom = process.env.SMTP_FROM || `"HabiTrack" <${smtpUser || 'no-reply@habitrack.app'}>`;
    const isSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.log(`[SMTP NO CONFIGURADO] Código para ${toEmail}: ${otpCode}`);
        return { sent: false, reason: 'SMTP no configurado en variables de entorno.' };
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border-radius: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">🏠 HabiTrack</h1>
                <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Tu gestor de compraventa inmobiliaria</p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Tu código de acceso</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.5;">Introduce el siguiente código numérico de 6 dígitos para acceder a tu cuenta:</p>
                
                <div style="text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; background-color: #eeeffe; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otpCode}</span>
                </div>
                
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">Este código caducará en 15 minutos. Si no has solicitado este acceso, puedes ignorar este correo.</p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: smtpFrom,
            to: toEmail,
            subject: `${otpCode} es tu código de acceso a HabiTrack`,
            html: htmlContent,
            text: `Tu código de acceso a HabiTrack es: ${otpCode}`
        });
        console.log(`[EMAIL SMTP ENVIADO CON ÉXITO] A: ${toEmail}`);
        return { sent: true };
    } catch (err) {
        console.error('[SMTP ERROR]:', err);
        return { sent: false, error: err.message };
    }
}

// 0. Auth Endpoints (Email + OTP)

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Introduce un correo electrónico válido.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        let user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [cleanEmail, cleanEmail]);

        if (!user) {
            const result = await db.run(
                'INSERT INTO users (email, username, password, otp_code, otp_expires_at) VALUES (?, ?, ?, ?, ?)',
                [cleanEmail, cleanEmail, '', otpCode, expiresAt]
            );
            const userId = result.lastID;

            const userCount = await db.get('SELECT COUNT(*) as count FROM users');
            const totalUsers = userCount ? (userCount.count || userCount.COUNT || 1) : 1;
            if (parseInt(totalUsers) === 1) {
                await db.run('UPDATE properties SET user_id = ? WHERE user_id IS NULL', [userId]);
            }

            await db.run(
                "INSERT INTO user_settings (user_id, key, value) VALUES (?, 'calculator_config', ?) ON CONFLICT(user_id, key) DO NOTHING",
                [userId, JSON.stringify(DEFAULT_SETTINGS)]
            );
        } else {
            await db.run(
                'UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?',
                [otpCode, expiresAt, user.id]
            );
        }

        console.log(`[OTP GENERATED] Email: ${cleanEmail} | Code: ${otpCode}`);

        const emailResult = await sendOTPEmail(cleanEmail, otpCode);

        res.json({
            success: true,
            message: emailResult.sent ? 'Código de acceso enviado a tu correo.' : 'Código de acceso generado.',
            email: cleanEmail,
            devOtp: emailResult.sent ? undefined : otpCode
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al generar el código de acceso: ' + (err.message || String(err)) });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'Correo y código de verificación obligatorios.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [cleanEmail, cleanEmail]);

        if (!user) {
            return res.status(400).json({ error: 'Usuario no encontrado. Por favor, solicita un nuevo código.' });
        }

        if (!user.otp_code || user.otp_code !== cleanCode) {
            return res.status(400).json({ error: 'Código de verificación incorrecto.' });
        }

        if (user.otp_expires_at && new Date(user.otp_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ error: 'El código ha caducado. Solicita uno nuevo.' });
        }

        await db.run('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?', [user.id]);

        const userEmail = user.email || user.username || cleanEmail;
        const token = jwt.sign({ id: user.id, username: userEmail, email: userEmail }, JWT_SECRET, { expiresIn: '30d' });

        res.json({
            token,
            username: userEmail,
            email: userEmail,
            message: 'Inicio de sesión correcto.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al verificar el código: ' + (err.message || String(err)) });
    }
});

// Deprecated fallback endpoints for compatibility
app.post('/api/auth/register', (req, res) => res.status(400).json({ error: 'El sistema usa autenticación por correo y OTP.' }));
app.post('/api/auth/login', (req, res) => res.status(400).json({ error: 'El sistema usa autenticación por correo y OTP.' }));

// Endpoint de validación de sesión
app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ id: req.user.id, username: req.user.username });
});

// 1. Analyze property from URL
app.get('/api/analizar', authenticateToken, async (req, res) => {
    const urlStr = req.query.url;
    if (!urlStr) {
        return res.status(400).json({ error: 'La URL es obligatoria.' });
    }

    try {
        const url = new URL(urlStr);
        
        // Headers mimicking a real browser
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3'
        };

        // If it is Idealista, return a structured response indicating the block
        if (url.hostname.includes('idealista.com')) {
            return res.json({
                success: false,
                source: 'idealista',
                error: 'Idealista bloquea las peticiones automáticas desde el servidor (error 403 de Cloudflare). Por favor, utiliza el Bookmarklet para extraer todos los datos y fotos en 1 click.'
            });
        }

        // If it is Facebook, return a structured response indicating the block
        if (url.hostname.includes('facebook.com')) {
            return res.json({
                success: false,
                source: 'facebook',
                error: 'Facebook bloquea las peticiones automáticas desde el servidor (requiere inicio de sesión). Por favor, utiliza el Bookmarklet para extraer todos los datos y fotos en 1 click.'
            });
        }

        const response = await fetch(urlStr, { headers });
        if (!response.ok) {
            return res.status(response.status).json({ error: `El servidor respondió con código ${response.status}` });
        }

        const html = await response.text();

        // 1. Structured Fotocasa Parser
        if (url.hostname.includes('fotocasa.es')) {
            const match = html.match(/<script type="application\/json" id="__initial_props__">([\s\S]*?)<\/script>/i);
            if (match && match[1]) {
                const data = JSON.parse(match[1]);
                const entity = data.realEstateAdDetailEntityV2 || data.realEstate || {};
                const features = data.realEstate?.features || {};
                
                // Extract photo URLs
                const photoList = [];
                if (entity.multimedias && Array.isArray(entity.multimedias)) {
                    entity.multimedias.forEach(item => {
                        if (item.url && (item.type === 'image' || !item.type)) {
                            photoList.push(item.url);
                        }
                    });
                }

                // Check garage & elevator from features list
                let garage = 'no';
                let elevator = 'desconocido';
                if (Array.isArray(entity.features)) {
                    const parkingFeat = entity.features.find(f => f.type === 'PARKING');
                    if (parkingFeat && parkingFeat.value !== 'NO') {
                        garage = 'si';
                    }
                    const elevatorFeat = entity.features.find(f => f.type === 'ELEVATOR');
                    if (elevatorFeat) {
                        elevator = elevatorFeat.value === 'YES' ? 'si' : 'no';
                    }
                }

                // Construct neighborhood zone
                let zone = '';
                if (entity.address) {
                    const parts = [];
                    if (entity.address.locality) parts.push(entity.address.locality);
                    if (entity.address.province) parts.push(entity.address.province);
                    zone = parts.join(', ');
                }

                // Detect CCAA if possible
                const ccaa = entity.address?.autonomousCommunity || 'Andalucía';
                
                // Real Estate Typology/BuildType
                let estate_type = 'secondhand';
                if (entity.constructionType === 'new') estate_type = 'new';

                const extracted = {
                    success: true,
                    source: 'fotocasa',
                    data: {
                        title: data.propertyTitle || entity.description || 'Piso en Fotocasa',
                        price: entity.price?.amount || data.realEstate?.price || 0,
                        m2: features.surface || null,
                        rooms: features.rooms || 0,
                        baths: features.bathrooms || 0,
                        estate_type,
                        garage,
                        elevator,
                        zone,
                        ccaa,
                        photos: photoList.join(', '),
                        latitude: entity.address?.coordinates?.lat || null,
                        longitude: entity.address?.coordinates?.lng || null,
                        comments: entity.description || '',
                        url: urlStr
                    }
                };
                return res.json(extracted);
            }
        }

        // 2. Generic OpenGraph + Regex fallback Parser
        const extractedData = {
            title: '',
            price: 0,
            m2: null,
            rooms: 0,
            baths: 0,
            estate_type: 'secondhand',
            garage: 'no',
            elevator: 'desconocido',
            zone: '',
            ccaa: 'Andalucía',
            photos: '',
            latitude: null,
            longitude: null,
            comments: '',
            url: urlStr
        };

        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i);
        if (titleMatch && titleMatch[1]) {
            extractedData.title = titleMatch[1];
        } else {
            const pageTitle = html.match(/<title>([^<]+)<\/title>/i);
            if (pageTitle && pageTitle[1]) extractedData.title = pageTitle[1].trim();
        }

        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (imageMatch && imageMatch[1]) {
            extractedData.photos = imageMatch[1];
        }

        const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) {
            extractedData.comments = descMatch[1];
        }

        const priceMeta = html.match(/<meta\s+property=["']og:price:amount["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+name=["']price["']\s+content=["']([^"']+)["']/i);
        if (priceMeta && priceMeta[1]) {
            extractedData.price = parseFloat(priceMeta[1].replace(/[^\d.]/g, '')) || 0;
        } else {
            const priceRegex = /(\d{1,3}(?:\.\d{3})+)\s*(?:€|euros)/i;
            const priceMatch = (extractedData.title + " " + extractedData.comments).match(priceRegex);
            if (priceMatch && priceMatch[1]) {
                extractedData.price = parseFloat(priceMatch[1].replace(/\./g, '')) || 0;
            }
        }

        const roomsRegex = /(\d+)\s*(?:hab|dormitorio|habitac)/i;
        const roomsMatch = (extractedData.title + " " + extractedData.comments).match(roomsRegex);
        if (roomsMatch && roomsMatch[1]) {
            extractedData.rooms = parseInt(roomsMatch[1]) || 0;
        }

        const bathsRegex = /(\d+)\s*(?:baño|aseo|wc)/i;
        const bathsMatch = (extractedData.title + " " + extractedData.comments).match(bathsRegex);
        if (bathsMatch && bathsMatch[1]) {
            extractedData.baths = parseInt(bathsMatch[1]) || 0;
        }

        const m2Regex = /(\d+)\s*(?:m²|m2|metros\s+cuadrados)/i;
        const m2Match = (extractedData.title + " " + extractedData.comments).match(m2Regex);
        if (m2Match && m2Match[1]) {
            extractedData.m2 = parseFloat(m2Match[1]) || null;
        }

        return res.json({
            success: true,
            source: 'generic',
            data: extractedData
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error interno en el analizador de enlaces.' });
    }
});

// 2. Get all properties for authenticated user
app.get('/api/propiedades', authenticateToken, async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener las propiedades.' });
    }
});

// 3. Get single property
app.get('/api/propiedades/:id', authenticateToken, async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!row) {
            return res.status(404).json({ error: 'Propiedad no encontrada.' });
        }
        res.json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener la propiedad.' });
    }
});

// 4. Create a property
app.post('/api/propiedades', authenticateToken, async (req, res) => {
    const {
        title, price, m2, ccaa, rooms, baths,
        estate_type, garage, zone, url, photos,
        elevator, comments, rating, latitude, longitude
    } = req.body;

    if (!title || price === undefined || !ccaa) {
        return res.status(400).json({ error: 'Los campos title, price y ccaa son obligatorios.' });
    }

    try {
        let existingProperty = null;
        if (url) {
            existingProperty = await db.get('SELECT * FROM properties WHERE url = ? AND user_id = ?', [url, req.user.id]);
        }

        if (existingProperty) {
            // Actualizar propiedad existente
            await db.run(`
                UPDATE properties SET
                    title = ?, price = ?, m2 = ?, ccaa = ?, rooms = ?, baths = ?,
                    estate_type = ?, garage = ?, zone = ?, photos = ?,
                    elevator = ?, comments = ?, rating = ?, latitude = ?, longitude = ?
                WHERE id = ? AND user_id = ?
            `, [
                title, price, m2 || null, ccaa, rooms || 0, baths || 0,
                estate_type || 'secondhand', garage || 'no', zone || null,
                photos || null, elevator || 'desconocido', comments || null,
                rating || 0, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
                existingProperty.id, req.user.id
            ]);

            const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [existingProperty.id, req.user.id]);
            res.status(200).json(updatedProperty);
        } else {
            // Crear nueva propiedad
            const result = await db.run(`
                INSERT INTO properties (
                    title, price, m2, ccaa, rooms, baths,
                    estate_type, garage, zone, url, photos,
                    elevator, comments, rating, latitude, longitude, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                title, price, m2 || null, ccaa, rooms || 0, baths || 0,
                estate_type || 'secondhand', garage || 'no', zone || null,
                url || null, photos || null, elevator || 'desconocido', comments || null,
                rating || 0, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
                req.user.id
            ]);

            const newProperty = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [result.lastID, req.user.id]);
            res.status(201).json(newProperty);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la propiedad.' });
    }
});

// 5. Update a property
app.put('/api/propiedades/:id', authenticateToken, async (req, res) => {
    const {
        title, price, m2, ccaa, rooms, baths,
        estate_type, garage, zone, url, photos,
        elevator, comments, rating, latitude, longitude
    } = req.body;

    if (!title || price === undefined || !ccaa) {
        return res.status(400).json({ error: 'Los campos title, price y ccaa son obligatorios.' });
    }

    try {
        const exists = await db.get('SELECT 1 FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!exists) {
            return res.status(404).json({ error: 'Propiedad no encontrada o no autorizada.' });
        }

        await db.run(`
            UPDATE properties SET
                title = ?, price = ?, m2 = ?, ccaa = ?, rooms = ?, baths = ?,
                estate_type = ?, garage = ?, zone = ?, url = ?, photos = ?,
                elevator = ?, comments = ?, rating = ?, latitude = ?, longitude = ?
            WHERE id = ? AND user_id = ?
        `, [
            title, price, m2 || null, ccaa, rooms || 0, baths || 0,
            estate_type, garage, zone || null, url || null, photos || null,
            elevator, comments || null, rating || 0,
            latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
            req.params.id, req.user.id
        ]);

        const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json(updatedProperty);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar la propiedad.' });
    }
});

// 6. Delete a property
app.delete('/api/propiedades/:id', authenticateToken, async (req, res) => {
    try {
        const exists = await db.get('SELECT 1 FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!exists) {
            return res.status(404).json({ error: 'Propiedad no encontrada o no autorizada.' });
        }

        await db.run('DELETE FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Propiedad eliminada correctamente.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar la propiedad.' });
    }
});

// 7. Get calculator settings
app.get('/api/ajustes', authenticateToken, async (req, res) => {
    try {
        const row = await db.get("SELECT value FROM user_settings WHERE user_id = ? AND key = 'calculator_config'", [req.user.id]);
        if (!row) {
            return res.json(DEFAULT_SETTINGS);
        }
        res.json(JSON.parse(row.value));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener la configuración.' });
    }
});

// 8. Save calculator settings
app.post('/api/ajustes', authenticateToken, async (req, res) => {
    const config = req.body;
    if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'La configuración es inválida.' });
    }

    try {
        await db.run(
            "INSERT INTO user_settings (user_id, key, value) VALUES (?, 'calculator_config', ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
            [req.user.id, JSON.stringify(config)]
        );
        res.json({ message: 'Configuración guardada correctamente.', config });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar la configuración.' });
    }
});

// Serve index.html on default path
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server en desarrollo local
if (!process.env.VERCEL) {
    initDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor activo en: http://localhost:${PORT}`);
        });
    }).catch(err => {
        console.error('Error al inicializar la base de datos:', err);
    });
}

module.exports = app;
