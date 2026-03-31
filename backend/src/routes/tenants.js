const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { cacheMiddleware } = require('../middleware/cache');

router.use(authenticate);

router.get('/', requireRole('admin'), cacheMiddleware(120, 'tenants'), tenantController.getTenants);
router.get('/:id', tenantController.getTenantById);
router.get('/:id/stats', tenantController.getTenantStats);
router.post('/', requireRole('admin'), tenantController.createTenant);
router.put('/:id', tenantController.updateTenant);
router.delete('/:id', requireRole('admin'), tenantController.deleteTenant);

module.exports = router;
