const { getDB } = require('../config/database');
const { scrapePropertyUrl } = require('../services/scraper.service');
const { checkPropertyLink } = require('../services/link-checker.service');

/**
 * Get all properties belonging to the authenticated user
 */
/**
 * Get all properties belonging to the authenticated user or their active workspace
 */
async function getAllProperties(req, res, next) {
    try {
        const db = await getDB();
        const workspaceIdParam = req.query.workspace_id;
        let rows = [];

        if (workspaceIdParam && workspaceIdParam !== 'all' && workspaceIdParam !== 'personal') {
            const wid = parseInt(workspaceIdParam, 10);
            // Verify user belongs to workspace
            const member = await db.get('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [wid, req.user.id]);
            if (member) {
                rows = await db.all('SELECT * FROM properties WHERE workspace_id = ? ORDER BY created_at DESC', [wid]);
            }
        } else if (workspaceIdParam === 'personal') {
            rows = await db.all('SELECT * FROM properties WHERE user_id = ? AND (workspace_id IS NULL OR workspace_id = 0) ORDER BY created_at DESC', [req.user.id]);
        } else {
            // Default or 'all': get properties created by user or in user's workspaces
            rows = await db.all(`
                SELECT p.* FROM properties p
                WHERE p.user_id = ?
                   OR p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)
                ORDER BY p.created_at DESC
            `, [req.user.id, req.user.id]);
        }

        // Attach votes and comments count to each property
        for (const prop of rows) {
            const votes = await db.all(`
                SELECT pv.user_id, pv.vote, pv.score, u.email, u.username
                FROM property_votes pv
                INNER JOIN users u ON pv.user_id = u.id
                WHERE pv.property_id = ?
            `, [prop.id]);

            const commentsCount = await db.get(`
                SELECT COUNT(*) as count FROM property_comments WHERE property_id = ?
            `, [prop.id]);

            prop.votes = votes || [];
            prop.comments_count = commentsCount ? commentsCount.count : 0;
        }

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
        const row = await db.get(`
            SELECT p.* FROM properties p
            WHERE p.id = ? 
              AND (
                  p.user_id = ? 
                  OR p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)
              )
        `, [req.params.id, req.user.id, req.user.id]);

        if (!row) {
            return res.status(404).json({ error: 'Propiedad no encontrada o no autorizada.' });
        }

        // Attach votes and comments
        const votes = await db.all(`
            SELECT pv.user_id, pv.vote, pv.score, pv.updated_at, u.email, u.username
            FROM property_votes pv
            INNER JOIN users u ON pv.user_id = u.id
            WHERE pv.property_id = ?
        `, [row.id]);

        const comments = await db.all(`
            SELECT pc.* FROM property_comments pc
            WHERE pc.property_id = ?
            ORDER BY pc.created_at ASC
        `, [row.id]);

        row.votes = votes || [];
        row.comments = comments || [];

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
            elevator, comments, rating, latitude, longitude,
            workspace_id
        } = req.body;

        const db = await getDB();
        let targetWorkspaceId = null;

        if (workspace_id) {
            const wid = parseInt(workspace_id, 10);
            const isMember = await db.get('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [wid, req.user.id]);
            if (isMember) {
                targetWorkspaceId = wid;
            }
        }

        let existingProperty = null;

        if (url) {
            if (targetWorkspaceId) {
                existingProperty = await db.get('SELECT * FROM properties WHERE url = ? AND workspace_id = ?', [url, targetWorkspaceId]);
            } else {
                existingProperty = await db.get('SELECT * FROM properties WHERE url = ? AND user_id = ? AND (workspace_id IS NULL OR workspace_id = 0)', [url, req.user.id]);
            }
        }

        if (existingProperty) {
            await db.run(`
                UPDATE properties SET
                    title = ?, price = ?, m2 = ?, ccaa = ?, rooms = ?, baths = ?,
                    estate_type = ?, garage = ?, zone = ?, photos = ?,
                    elevator = ?, comments = ?, rating = ?, latitude = ?, longitude = ?,
                    workspace_id = ?
                WHERE id = ?
            `, [
                title, price, m2 ?? null, ccaa, rooms ?? 0, baths ?? 0,
                estate_type ?? 'secondhand', garage ?? 'no', zone ?? null,
                photos ?? null, elevator ?? 'desconocido', comments ?? null,
                rating ?? 0, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
                targetWorkspaceId, existingProperty.id
            ]);

            const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ?', [existingProperty.id]);
            return res.status(200).json(updatedProperty);
        }

        const result = await db.run(`
            INSERT INTO properties (
                title, price, m2, ccaa, rooms, baths,
                estate_type, garage, zone, url, photos,
                elevator, comments, rating, latitude, longitude, workspace_id, user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title, price, m2 ?? null, ccaa, rooms ?? 0, baths ?? 0,
            estate_type ?? 'secondhand', garage ?? 'no', zone ?? null,
            url ?? null, photos ?? null, elevator ?? 'desconocido', comments ?? null,
            rating ?? 0, latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
            targetWorkspaceId, req.user.id
        ]);

        const newProperty = await db.get('SELECT * FROM properties WHERE id = ?', [result.lastID]);
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
            elevator, comments, rating, latitude, longitude,
            workspace_id
        } = req.body;

        const db = await getDB();
        const property = await db.get(`
            SELECT * FROM properties WHERE id = ? 
              AND (
                  user_id = ? 
                  OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)
              )
        `, [req.params.id, req.user.id, req.user.id]);

        if (!property) {
            return res.status(404).json({ error: 'Propiedad no encontrada o no autorizada.' });
        }

        let targetWid = property.workspace_id;
        if (workspace_id !== undefined) {
            if (workspace_id) {
                const wid = parseInt(workspace_id, 10);
                const isMember = await db.get('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?', [wid, req.user.id]);
                if (isMember) targetWid = wid;
            } else {
                targetWid = null;
            }
        }

        await db.run(`
            UPDATE properties SET
                title = ?, price = ?, m2 = ?, ccaa = ?, rooms = ?, baths = ?,
                estate_type = ?, garage = ?, zone = ?, url = ?, photos = ?,
                elevator = ?, comments = ?, rating = ?, latitude = ?, longitude = ?,
                workspace_id = ?
            WHERE id = ?
        `, [
            title, price, m2 ?? null, ccaa, rooms ?? 0, baths ?? 0,
            estate_type ?? 'secondhand', garage ?? 'no', zone ?? null, url ?? null, photos ?? null,
            elevator ?? 'desconocido', comments ?? null, rating ?? 0,
            latitude !== undefined ? latitude : null, longitude !== undefined ? longitude : null,
            targetWid, req.params.id
        ]);

        const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ?', [req.params.id]);
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
        const property = await db.get(`
            SELECT * FROM properties WHERE id = ? 
              AND (
                  user_id = ? 
                  OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ? AND role = 'owner')
              )
        `, [req.params.id, req.user.id, req.user.id]);

        if (!property) {
            return res.status(404).json({ error: 'Propiedad no encontrada o no autorizada.' });
        }

        await db.run('DELETE FROM properties WHERE id = ?', [req.params.id]);
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

