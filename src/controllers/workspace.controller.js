const crypto = require('crypto');
const { getDB } = require('../config/database');

/**
 * Generate human-friendly 8-character invite code (e.g. HABI-8F2A)
 */
function generateInviteCode() {
    const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `HABI-${hex}`;
}

/**
 * List all workspaces the authenticated user belongs to
 */
async function listWorkspaces(req, res, next) {
    try {
        const db = await getDB();
        const rows = await db.all(`
            SELECT w.id, w.name, w.invite_code, w.owner_id, w.created_at, wm.role,
                   (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
                   (SELECT COUNT(*) FROM properties WHERE workspace_id = w.id) as property_count
            FROM workspaces w
            INNER JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = ?
            ORDER BY w.created_at DESC
        `, [req.user.id]);

        res.json({ success: true, workspaces: rows });
    } catch (err) {
        next(err);
    }
}

/**
 * Create a new shared workspace
 */
async function createWorkspace(req, res, next) {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'El nombre del espacio compartido es obligatorio.' });
        }

        const db = await getDB();
        const inviteCode = generateInviteCode();

        const result = await db.run(`
            INSERT INTO workspaces (name, invite_code, owner_id)
            VALUES (?, ?, ?)
        `, [name.trim(), inviteCode, req.user.id]);

        const workspaceId = result.lastID;

        // Add creator as owner
        await db.run(`
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES (?, ?, 'owner')
        `, [workspaceId, req.user.id]);

        const workspace = await db.get(`
            SELECT w.*, 'owner' as role, 1 as member_count, 0 as property_count
            FROM workspaces w
            WHERE w.id = ?
        `, [workspaceId]);

        res.status(201).json({ success: true, workspace });
    } catch (err) {
        next(err);
    }
}

/**
 * Join a workspace via invite code
 */
async function joinWorkspace(req, res, next) {
    try {
        const { invite_code } = req.body;
        if (!invite_code || typeof invite_code !== 'string') {
            return res.status(400).json({ error: 'El código de invitación es obligatorio.' });
        }

        const cleanCode = invite_code.trim().toUpperCase();
        const db = await getDB();

        const workspace = await db.get(`
            SELECT * FROM workspaces WHERE invite_code = ?
        `, [cleanCode]);

        if (!workspace) {
            return res.status(404).json({ error: 'Código de invitación no encontrado o no válido.' });
        }

        const existingMember = await db.get(`
            SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?
        `, [workspace.id, req.user.id]);

        if (!existingMember) {
            await db.run(`
                INSERT INTO workspace_members (workspace_id, user_id, role)
                VALUES (?, ?, 'member')
            `, [workspace.id, req.user.id]);
        }

        const memberCountRow = await db.get(`
            SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ?
        `, [workspace.id]);

        res.json({
            success: true,
            message: `¡Te has unido con éxito al espacio "${workspace.name}"!`,
            workspace: {
                ...workspace,
                role: existingMember ? 'member' : 'member',
                member_count: memberCountRow ? memberCountRow.count : 1
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Get workspace details and members list
 */
async function getWorkspaceDetails(req, res, next) {
    try {
        const workspaceId = parseInt(req.params.id, 10);
        const db = await getDB();

        const membership = await db.get(`
            SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?
        `, [workspaceId, req.user.id]);

        if (!membership) {
            return res.status(403).json({ error: 'No tienes acceso a este espacio compartido.' });
        }

        const workspace = await db.get(`
            SELECT * FROM workspaces WHERE id = ?
        `, [workspaceId]);

        const members = await db.all(`
            SELECT u.id, u.email, u.username, wm.role, wm.joined_at
            FROM workspace_members wm
            INNER JOIN users u ON wm.user_id = u.id
            WHERE wm.workspace_id = ?
            ORDER BY wm.joined_at ASC
        `, [workspaceId]);

        res.json({
            success: true,
            workspace: {
                ...workspace,
                role: membership.role,
                members
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * Leave a workspace
 */
async function leaveWorkspace(req, res, next) {
    try {
        const workspaceId = parseInt(req.params.id, 10);
        const db = await getDB();

        const membership = await db.get(`
            SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?
        `, [workspaceId, req.user.id]);

        if (!membership) {
            return res.status(404).json({ error: 'No perteneces a este espacio compartido.' });
        }

        await db.run(`
            DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?
        `, [workspaceId, req.user.id]);

        // If no members left, delete workspace
        const remaining = await db.get(`
            SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ?
        `, [workspaceId]);

        if (remaining && remaining.count === 0) {
            await db.run(`DELETE FROM workspaces WHERE id = ?`, [workspaceId]);
        }

        res.json({ success: true, message: 'Has salido del espacio compartido.' });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    listWorkspaces,
    createWorkspace,
    joinWorkspace,
    getWorkspaceDetails,
    leaveWorkspace
};
