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

// Property CRUD endpoints
router.get('/propiedades', authenticateToken, getAllProperties);
router.get('/propiedades/:id', authenticateToken, getPropertyById);
router.post('/propiedades', authenticateToken, validate(propertySchema), createProperty);
router.put('/propiedades/:id', authenticateToken, validate(propertySchema), updateProperty);
router.delete('/propiedades/:id', authenticateToken, deleteProperty);

// Legacy aliases for backwards compatibility (/casas)
router.get('/casas', authenticateToken, getAllProperties);
router.get('/casas/:id', authenticateToken, getPropertyById);
router.post('/casas', authenticateToken, validate(propertySchema), createProperty);
router.put('/casas/:id', authenticateToken, validate(propertySchema), updateProperty);
router.delete('/casas/:id', authenticateToken, deleteProperty);

module.exports = router;
