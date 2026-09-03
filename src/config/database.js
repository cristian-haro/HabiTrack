const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let dbInstance = null;
let isPostgres = false;

const hasPostgresConfig = !!(process.env.VERCEL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.SUPABASE_DATABASE_URL);

if (hasPostgresConfig && process.env.NODE_ENV !== 'test') {
    isPostgres = true;
    console.log("Controlador de Base de Datos: PostgreSQL (Vercel/Neon/Supabase)");
} else {
    isPostgres = false;
    console.log(process.env.NODE_ENV === 'test' 
        ? "Controlador de Base de Datos: SQLite (:memory: para Tests)" 
        : "Controlador de Base de Datos: SQLite (Archivo local casas.db)");
}

// Convierte marcadores de posición "?" de SQLite en "$1, $2, ..." de Postgres
function translateQuery(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

async function getDB() {
    if (dbInstance) return dbInstance;

    if (isPostgres) {
        let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.SUPABASE_DATABASE_URL;

        if (!connectionString && process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
            const host = process.env.POSTGRES_HOST;
            const user = process.env.POSTGRES_USER;
            const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD);
            const dbName = process.env.POSTGRES_DATABASE || 'postgres';
            const port = process.env.POSTGRES_PORT || 5432;
            connectionString = `postgres://${user}:${pass}@${host}:${port}/${dbName}?sslmode=require`;
        }

        if (!connectionString) {
            throw new Error("No se ha encontrado la variable de entorno de base de datos en Vercel/PostgreSQL.");
        }

        connectionString = connectionString.replace(/&supa=[^&]*/gi, '');
        connectionString = connectionString.replace(/[?&]sslmode=[^&]*/gi, '');

        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });

        try {
            await pool.query('SELECT 1');
        } catch (err) {
            console.error("Error al conectar con PostgreSQL:", err);
            throw new Error("Fallo de conexión a PostgreSQL: " + (err.message || String(err)), { cause: err });
        }

        dbInstance = {
            isPostgres: true,
            all: async (sql, params = []) => {
                const pSql = translateQuery(sql);
                const res = await pool.query(pSql, params);
                return res.rows;
            },
            get: async (sql, params = []) => {
                const pSql = translateQuery(sql);
                const res = await pool.query(pSql, params);
                return res.rows[0] || null;
            },
            run: async (sql, params = []) => {
                let pSql = translateQuery(sql);
                const upperSql = pSql.toUpperCase();
                
                if (upperSql.trim().startsWith('INSERT') && !upperSql.includes('RETURNING')) {
                    if (upperSql.includes('INTO PROPERTIES') || upperSql.includes('INTO USERS')) {
                        pSql += ' RETURNING id';
                    }
                }

                const res = await pool.query(pSql, params);
                let lastID = null;
                if (res.rows && res.rows.length > 0 && res.rows[0].id !== undefined) {
                    lastID = res.rows[0].id;
                }

                return {
                    lastID: lastID,
                    changes: res.rowCount
                };
            },
            exec: async (sql) => {
                await pool.query(sql);
            },
            close: async () => {
                await pool.end();
                dbInstance = null;
            }
        };
    } else {
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');
        const DB_PATH = process.env.NODE_ENV === 'test' 
            ? ':memory:' 
            : path.join(__dirname, '..', '..', 'casas.db');

        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        dbInstance = {
            isPostgres: false,
            all: async (sql, params = []) => {
                return await db.all(sql, params);
            },
            get: async (sql, params = []) => {
                return await db.get(sql, params);
            },
            run: async (sql, params = []) => {
                const res = await db.run(sql, params);
                return {
                    lastID: res.lastID,
                    changes: res.changes
                };
            },
            exec: async (sql) => {
                await db.exec(sql);
            },
            close: async () => {
                await db.close();
                dbInstance = null;
            }
        };
    }

    return dbInstance;
}

// Ejecuta sentencias ALTER TABLE de forma segura e idempotente
async function safeAlter(db, sql) {
    try {
        await db.exec(sql);
    } catch {
        // Ignorar si la columna ya existe en la tabla
    }
}

// Inicialización de esquemas y migraciones automáticas
async function initDB() {
    const db = await getDB();

    if (db.isPostgres) {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE,
                username VARCHAR(255),
                password VARCHAR(255),
                otp_code VARCHAR(10),
                otp_expires_at TIMESTAMPTZ,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

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
            );

            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER REFERENCES users(id),
                key VARCHAR(255) NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY (user_id, key)
            );
        `);

        await safeAlter(db, "ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)");
        await safeAlter(db, "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10)");
        await safeAlter(db, "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ");
        await safeAlter(db, "ALTER TABLE users ALTER COLUMN otp_expires_at TYPE TIMESTAMPTZ");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ");
    } else {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                username TEXT,
                password TEXT,
                otp_code TEXT,
                otp_expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

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
                status TEXT DEFAULT 'active',
                last_checked_at DATETIME,
                user_id INTEGER REFERENCES users(id),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER REFERENCES users(id),
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                PRIMARY KEY (user_id, key)
            );
        `);

        await safeAlter(db, "ALTER TABLE users ADD COLUMN email TEXT");
        await safeAlter(db, "ALTER TABLE users ADD COLUMN otp_code TEXT");
        await safeAlter(db, "ALTER TABLE users ADD COLUMN otp_expires_at DATETIME");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN rating INTEGER DEFAULT 0");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN latitude REAL");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN longitude REAL");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN user_id INTEGER");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN status TEXT DEFAULT 'active'");
        await safeAlter(db, "ALTER TABLE properties ADD COLUMN last_checked_at DATETIME");
    }

    console.log("Base de datos inicializada correctamente.");
    return db;
}

module.exports = {
    getDB,
    initDB,
    isPostgres: () => isPostgres
};
