const { getDB } = require('../config/database');

/**
 * Vote on a property ('like', 'maybe', 'dislike')
 */
async function voteProperty(req, res, next) {
    try {
        const propertyId = parseInt(req.params.id, 10);
        const { vote, score } = req.body;

        const validVotes = ['like', 'maybe', 'dislike', 'clear'];
        if (!validVotes.includes(vote)) {
            return res.status(400).json({ error: 'Voto no válido. Debe ser "like", "maybe", "dislike" o "clear".' });
        }

        const db = await getDB();

        // Verify property exists
        const property = await db.get(`SELECT * FROM properties WHERE id = ?`, [propertyId]);
        if (!property) {
            return res.status(404).json({ error: 'Propiedad no encontrada.' });
        }

        if (vote === 'clear') {
            await db.run(`DELETE FROM property_votes WHERE property_id = ? AND user_id = ?`, [propertyId, req.user.id]);
        } else {
            const existingVote = await db.get(`SELECT * FROM property_votes WHERE property_id = ? AND user_id = ?`, [propertyId, req.user.id]);
            if (existingVote) {
                await db.run(`
                    UPDATE property_votes 
                    SET vote = ?, score = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE property_id = ? AND user_id = ?
                `, [vote, parseInt(score, 10) || 0, propertyId, req.user.id]);
            } else {
                await db.run(`
                    INSERT INTO property_votes (property_id, user_id, vote, score)
                    VALUES (?, ?, ?, ?)
                `, [propertyId, req.user.id, vote, parseInt(score, 10) || 0]);
            }
        }

        // Return updated votes summary for the property
        const votes = await db.all(`
            SELECT pv.user_id, pv.vote, pv.score, pv.updated_at, u.email, u.username
            FROM property_votes pv
            INNER JOIN users u ON pv.user_id = u.id
            WHERE pv.property_id = ?
            ORDER BY pv.updated_at DESC
        `, [propertyId]);

        res.json({ success: true, property_id: propertyId, votes });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all votes for a property
 */
async function getPropertyVotes(req, res, next) {
    try {
        const propertyId = parseInt(req.params.id, 10);
        const db = await getDB();

        const votes = await db.all(`
            SELECT pv.user_id, pv.vote, pv.score, pv.updated_at, u.email, u.username
            FROM property_votes pv
            INNER JOIN users u ON pv.user_id = u.id
            WHERE pv.property_id = ?
            ORDER BY pv.updated_at DESC
        `, [propertyId]);

        res.json({ success: true, property_id: propertyId, votes });
    } catch (err) {
        next(err);
    }
}

/**
 * Add a comment / visit note to a property
 */
async function addPropertyComment(req, res, next) {
    try {
        const propertyId = parseInt(req.params.id, 10);
        const { comment } = req.body;

        if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
            return res.status(400).json({ error: 'El comentario o nota no puede estar vacío.' });
        }

        const db = await getDB();

        const property = await db.get(`SELECT * FROM properties WHERE id = ?`, [propertyId]);
        if (!property) {
            return res.status(404).json({ error: 'Propiedad no encontrada.' });
        }

        const user = await db.get(`SELECT email, username FROM users WHERE id = ?`, [req.user.id]);
        const authorName = (user && user.username) ? user.username : ((user && user.email) ? user.email.split('@')[0] : 'Usuario');
        const authorEmail = user ? user.email : '';

        const result = await db.run(`
            INSERT INTO property_comments (property_id, user_id, author_name, author_email, comment)
            VALUES (?, ?, ?, ?, ?)
        `, [propertyId, req.user.id, authorName, authorEmail, comment.trim()]);

        const newComment = await db.get(`
            SELECT * FROM property_comments WHERE id = ?
        `, [result.lastID]);

        res.status(201).json({ success: true, comment: newComment });
    } catch (err) {
        next(err);
    }
}

/**
 * Get all comments for a property
 */
async function getPropertyComments(req, res, next) {
    try {
        const propertyId = parseInt(req.params.id, 10);
        const db = await getDB();

        const comments = await db.all(`
            SELECT pc.*
            FROM property_comments pc
            WHERE pc.property_id = ?
            ORDER BY pc.created_at ASC
        `, [propertyId]);

        res.json({ success: true, property_id: propertyId, comments });
    } catch (err) {
        next(err);
    }
}

/**
 * Delete a comment (author only or workspace owner)
 */
async function deletePropertyComment(req, res, next) {
    try {
        const commentId = parseInt(req.params.commentId, 10);
        const db = await getDB();

        const comment = await db.get(`SELECT * FROM property_comments WHERE id = ?`, [commentId]);
        if (!comment) {
            return res.status(404).json({ error: 'Comentario no encontrado.' });
        }

        if (comment.user_id !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario.' });
        }

        await db.run(`DELETE FROM property_comments WHERE id = ?`, [commentId]);
        res.json({ success: true, message: 'Comentario eliminado.' });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    voteProperty,
    getPropertyVotes,
    addPropertyComment,
    getPropertyComments,
    deletePropertyComment
};
