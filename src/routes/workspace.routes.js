const { Router } = require('express');
const {
    listWorkspaces,
    createWorkspace,
    joinWorkspace,
    getWorkspaceDetails,
    leaveWorkspace
} = require('../controllers/workspace.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

const router = Router();

router.get('/workspaces', authenticateToken, listWorkspaces);
router.post('/workspaces', authenticateToken, createWorkspace);
router.post('/workspaces/join', authenticateToken, joinWorkspace);
router.get('/workspaces/:id', authenticateToken, getWorkspaceDetails);
router.delete('/workspaces/:id/leave', authenticateToken, leaveWorkspace);

module.exports = router;
