const { getDB } = require('../config/database');
const { scrapePropertyUrl } = require('../services/scraper.service');

/**
 * Get all properties belonging to the authenticated user
 */
async function getAllProperties(req, res, next) {
    try {
        const db = await getDB();
        const rows = await db.all('SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        next(err);
    }
}

/**
 * Get a single property by ID
 */
async function getPropertyById(req, res, next) {
    try {
        const db = await getDB();
        const row = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!row) {
            return res.status(404).json({ error: 'Propiedad no encontrada.' });
        }
        res.json(row);
    } catch (err) {
        next(err);
    }
}

/**
 * Create or update (if same URL exists) a property for authenticated user
 */
async function createProperty(req, res, next) {
    try {
        const {
            title, price, m2, ccaa, rooms, baths,
            estate_type, garage, zone, url, photos,
            elevator, comments, rating, latitude, longitude
        } = req.body;

        const db = await getDB();
        let existingProperty = null;

        if (url) {
            existingProperty = await db.get('SELECT * FROM properties WHERE url = ? AND user_id = ?', [url, req.user.id]);
        }

        if (existingProperty) {
            await db.run(`
                UPDATE properties SET
                    title = ?, price = ?, m2 = ?, ccaa = ?, rooms = ?, baths = ?,
                    estate_type = ?, garage = ?, zone = ?, photos = ?,
                    elevator = ?, comments = ?, rating = ?, latitude = ?, longitude = ?
                WHERE id = ? AND user_id = ?
            `, [
                title, price, m2 ?? null, ccaa, rooms ?? 0, baths ?? 0,
                estate_type ?? 'secondhand', garage ?? 'no', zone ?? null,
                photos ?? null, elevator ?? 'desconocido', comments ?? null,
                rating ?? 0, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
                existingProperty.id, req.user.id
            ]);

            const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [existingProperty.id, req.user.id]);
            return res.status(200).json(updatedProperty);
        }

        const result = await db.run(`
            INSERT INTO properties (
                title, price, m2, ccaa, rooms, baths,
                estate_type, garage, zone, url, photos,
                elevator, comments, rating, latitude, longitude, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, price, m2 ?? null, ccaa, rooms ?? 0, baths ?? 0,
            estate_type ?? 'secondhand', garage ?? 'no', zone ?? null,
            url ?? null, photos ?? null, elevator ?? 'desconocido', comments ?? null,
            rating ?? 0, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
            req.user.id
        ]);

        const newProperty = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [result.lastID, req.user.id]);
        res.status(201).json(newProperty);
    } catch (err) {
        next(err);
    }
}

/**
 * Update an existing property by ID
 */
async function updateProperty(req, res, next) {
    try {
        const {
            title, price, m2, ccaa, rooms, baths,
            estate_type, garage, zone, url, photos,
            elevator, comments, rating, latitude, longitude
        } = req.body;

        const db = await getDB();
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
            title, price, m2 ?? null, ccaa, rooms ?? 0, baths ?? 0,
            estate_type ?? 'secondhand', garage ?? 'no', zone ?? null, url ?? null, photos ?? null,
            elevator ?? 'desconocido', comments ?? null, rating ?? 0,
            latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
            req.params.id, req.user.id
        ]);

        const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json(updatedProperty);
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a property by ID
 */
async function deleteProperty(req, res, next) {
    try {
        const db = await getDB();
        const exists = await db.get('SELECT 1 FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        if (!exists) {
            return res.status(404).json({ error: 'Propiedad no encontrada o no autorizada.' });
        }

        await db.run('DELETE FROM properties WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Propiedad eliminada correctamente.' });
    } catch (err) {
        next(err);
    }
}

/**
 * Scrape and analyze real estate URL
 */
async function analyzeUrl(req, res, next) {
    try {
        const urlStr = req.query.url;
        const result = await scrapePropertyUrl(urlStr);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    analyzeUrl
};
