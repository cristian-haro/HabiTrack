const { Router } = require('express');
const {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    verifyPropertyLinkById,
    verifyAllPropertiesLinks,
    analyzeUrl
} = require('../controllers/property.controller');
const {
    voteProperty,
    getPropertyVotes,
    addPropertyComment,
    getPropertyComments,
    deletePropertyComment
} = require('../controllers/collaboration.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { propertySchema, queryUrlSchema } = require('../schemas/property.schema');

const router = Router();

// URL analyzer
router.get('/analizar', authenticateToken, validate(queryUrlSchema, 'query'), analyzeUrl);

// Property link verification (and aliases)
router.post('/propiedades/verificar-todos', authenticateToken, verifyAllPropertiesLinks);
router.post('/propiedades/verify-all', authenticateToken, verifyAllPropertiesLinks);
router.post('/propiedades/:id/verificar', authenticateToken, verifyPropertyLinkById);
router.post('/propiedades/:id/verify', authenticateToken, verifyPropertyLinkById);

router.post('/casas/verificar-todos', authenticateToken, verifyAllPropertiesLinks);
router.post('/casas/verify-all', authenticateToken, verifyAllPropertiesLinks);
router.post('/casas/:id/verificar', authenticateToken, verifyPropertyLinkById);
router.post('/casas/:id/verify', authenticateToken, verifyPropertyLinkById);

// Collaboration: Votes
router.post('/propiedades/:id/votes', authenticateToken, voteProperty);
router.get('/propiedades/:id/votes', authenticateToken, getPropertyVotes);
router.post('/properties/:id/votes', authenticateToken, voteProperty);
router.get('/properties/:id/votes', authenticateToken, getPropertyVotes);

// Collaboration: Comments & Notes
router.post('/propiedades/:id/comments', authenticateToken, addPropertyComment);
router.get('/propiedades/:id/comments', authenticateToken, getPropertyComments);
router.delete('/propiedades/:id/comments/:commentId', authenticateToken, deletePropertyComment);
router.post('/properties/:id/comments', authenticateToken, addPropertyComment);
router.get('/properties/:id/comments', authenticateToken, getPropertyComments);
router.delete('/properties/:id/comments/:commentId', authenticateToken, deletePropertyComment);

// Property CRUD endpoints
router.get('/propiedades', authenticateToken, getAllProperties);
router.get('/propiedades/:id', authenticateToken, getPropertyById);
router.post('/propiedades', authenticateToken, validate(propertySchema), createProperty);
router.put('/propiedades/:id', authenticateToken, validate(propertySchema), updateProperty);
router.delete('/propiedades/:id', authenticateToken, deleteProperty);

// English aliases (/properties)
router.get('/properties', authenticateToken, getAllProperties);
router.get('/properties/:id', authenticateToken, getPropertyById);
router.post('/properties', authenticateToken, validate(propertySchema), createProperty);
router.put('/properties/:id', authenticateToken, validate(propertySchema), updateProperty);
router.delete('/properties/:id', authenticateToken, deleteProperty);

// Legacy aliases (/casas)
router.get('/casas', authenticateToken, getAllProperties);
router.get('/casas/:id', authenticateToken, getPropertyById);
router.post('/casas', authenticateToken, validate(propertySchema), createProperty);
router.put('/casas/:id', authenticateToken, validate(propertySchema), updateProperty);
router.delete('/casas/:id', authenticateToken, deleteProperty);

module.exports = router;
