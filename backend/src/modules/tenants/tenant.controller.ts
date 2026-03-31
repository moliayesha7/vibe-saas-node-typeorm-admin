import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service';
import { TenantQueryDto } from './dto/tenant.dto';
import { sendSuccess, sendCreated, sendPaginated } from '@common/utils/response.util';

const tenantService = new TenantService();

export class TenantController {
  /**
   * @swagger
   * /api/tenants:
   *   get:
   *     tags: [Tenants]
   *     summary: List all tenants (admin only)
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: plan
   *         schema: { type: string, enum: [free, starter, pro, enterprise] }
   *     responses:
   *       200:
   *         description: Paginated tenants list
   *       403:
   *         description: Admin only
   */
  async getTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = TenantQueryDto.parse(req.query);
      const { tenants, pagination } = await tenantService.findAll(filters);
      sendPaginated(res, tenants, pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/tenants/{id}:
   *   get:
   *     tags: [Tenants]
   *     summary: Get tenant by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Tenant details
   *       404:
   *         description: Not found
   */
  async getTenantById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = await tenantService.findById(req.params.id, req.user!);
      sendSuccess(res, tenant);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/tenants/{id}/stats:
   *   get:
   *     tags: [Tenants]
   *     summary: Get tenant statistics
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Tenant stats (users count, revenue, etc.)
   */
  async getTenantStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await tenantService.getStats(req.params.id, req.user!);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/tenants:
   *   post:
   *     tags: [Tenants]
   *     summary: Create a new tenant (admin only)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateTenantRequest'
   *     responses:
   *       201:
   *         description: Tenant created
   */
  async createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = await tenantService.create(req.body);
      sendCreated(res, tenant, 'Tenant created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/tenants/{id}:
   *   put:
   *     tags: [Tenants]
   *     summary: Update a tenant
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Tenant updated
   */
  async updateTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = await tenantService.update(req.params.id, req.body, req.user!);
      sendSuccess(res, tenant, 'Tenant updated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/tenants/{id}:
   *   delete:
   *     tags: [Tenants]
   *     summary: Deactivate a tenant and all its users (admin only)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: Tenant deactivated
   */
  async deleteTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await tenantService.softDelete(req.params.id);
      sendSuccess(res, undefined, 'Tenant deactivated');
    } catch (err) {
      next(err);
    }
  }
}

export const tenantController = new TenantController();
