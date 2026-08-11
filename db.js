const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno si estamos en desarrollo local
dotenv.config();

let dbInstance = null;
let isPostgres = false;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL) {
    isPostgres = true;
    console.log("Controlador de Base de Datos: PostgreSQL (Vercel/Neon/Supabase)");
} else {
    console.log("Controlador de Base de Datos: SQLite (Archivo local casas.db)");
}

async function getDB() {
    if (dbInstance) return dbInstance;

    if (isPostgres) {
        const { Pool } = require('pg');
        let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

        if (connectionString) {
            // Clean up custom query params like supa=base-pooler.x that can break node-postgres URL parser
            connectionString = connectionString.replace(/&supa=[^&]*/gi, '');
        }

        const pool = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false // Evita fallos por certificados autofirmados en entornos serverless
            }
        });

        // Probar conexión
        await pool.query('SELECT 1');

        dbInstance = {
            isPostgres: true,
            // Consulta para obtener múltiples filas (SELECT)
            all: async (sql, params = []) => {
                const pSql = translateQuery(sql);
                const res = await pool.query(pSql, params);
                return res.rows;
            },
            // Consulta para obtener una sola fila
            get: async (sql, params = []) => {
                const pSql = translateQuery(sql);
                const res = await pool.query(pSql, params);
                return res.rows[0] || null;
            },
            // Consulta para insertar, actualizar o eliminar
            run: async (sql, params = []) => {
                let pSql = translateQuery(sql);
                const upperSql = pSql.toUpperCase();
                
                // Añadir RETURNING id a las inserciones que lo requieren para obtener el ID generado en Postgres
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
            // Ejecutar sentencias SQL arbitrarias (sin parámetros)
            exec: async (sql) => {
                await pool.query(sql);
            }
        };
    } else {
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');
        const DB_PATH = path.join(__dirname, 'casas.db');

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
            }
        };
    }

    return dbInstance;
}

// Convierte marcadores de posición "?" de SQLite en "$1, $2, ..." de Postgres
function translateQuery(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

module.exports = {
    getDB,
    isPostgres: () => isPostgres
};
