const { getDB } = require('../config/database');
const { scrapePropertyUrl } = require('../services/scraper.service');
const { checkPropertyLink } = require('../services/link-checker.service');

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
 * Verify a single property's link status
 */
async function verifyPropertyLinkById(req, res, next) {
    try {
        const db = await getDB();
        const rawId = req.params.id;
        const numId = parseInt(rawId, 10);
        
        let property = null;
        if (!isNaN(numId)) {
            property = await db.get('SELECT * FROM properties WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [numId, req.user.id]);
        }
        if (!property) {
            property = await db.get('SELECT * FROM properties WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [rawId, req.user.id]);
        }
        if (!property) {
            property = await db.get('SELECT * FROM properties WHERE id = ?', [!isNaN(numId) ? numId : rawId]);
        }

        if (!property) {
            return res.status(404).json({ error: 'Propiedad no encontrada en la base de datos.' });
        }

        if (!property.url) {
            return res.status(400).json({ error: 'La propiedad no tiene un enlace URL asignado.' });
        }

        const checkResult = await checkPropertyLink(property.url);
        const newStatus = checkResult.status;
        const checkedAt = checkResult.checkedAt;

        await db.run(`
            UPDATE properties SET status = ?, last_checked_at = ?, user_id = COALESCE(user_id, ?)
            WHERE id = ?
        `, [newStatus, checkedAt, req.user.id, property.id]);

        const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ?', [property.id]);

        res.json({
            success: true,
            status: newStatus,
            message: checkResult.message,
            httpCode: checkResult.httpCode,
            last_checked_at: checkedAt,
            property: updatedProperty
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Verify all user's properties links concurrently
 */
async function verifyAllPropertiesLinks(req, res, next) {
    try {
        const db = await getDB();
        const properties = await db.all('SELECT * FROM properties WHERE (user_id = ? OR user_id IS NULL) AND url IS NOT NULL AND url != ""', [req.user.id]);

        const verificationPromises = properties.map(async (prop) => {
            const result = await checkPropertyLink(prop.url);
            await db.run(`
                UPDATE properties SET status = ?, last_checked_at = ?, user_id = COALESCE(user_id, ?)
                WHERE id = ?
            `, [result.status, result.checkedAt, req.user.id, prop.id]);

            return {
                id: prop.id,
                title: prop.title,
                url: prop.url,
                status: result.status,
                message: result.message,
                httpCode: result.httpCode
            };
        });

        const results = await Promise.allSettled(verificationPromises);
        const formattedResults = results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message });

        const updatedProperties = await db.all('SELECT * FROM properties WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC', [req.user.id]);

        res.json({
            success: true,
            totalChecked: properties.length,
            results: formattedResults,
            properties: updatedProperties
        });
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
    verifyPropertyLinkById,
    verifyAllPropertiesLinks,
    analyzeUrl
};

