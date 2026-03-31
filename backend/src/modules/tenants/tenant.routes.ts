import { Router } from 'express';
import { tenantController } from './tenant.controller';
import { authenticate } from '@common/middleware/auth.middleware';
import { requireRole } from '@common/middleware/rbac.middleware';
import { validate } from '@common/middleware/validate.middleware';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Multi-tenancy management (admin only for create/delete)
 */

const router = Router();
router.use(authenticate);

router.get('/', requireRole('admin'), tenantController.getTenants.bind(tenantController));
router.get('/:id', tenantController.getTenantById.bind(tenantController));
router.get('/:id/stats', tenantController.getTenantStats.bind(tenantController));
router.post('/', requireRole('admin'), validate(CreateTenantDto), tenantController.createTenant.bind(tenantController));
router.put('/:id', validate(UpdateTenantDto), tenantController.updateTenant.bind(tenantController));
router.delete('/:id', requireRole('admin'), tenantController.deleteTenant.bind(tenantController));

export default router;
