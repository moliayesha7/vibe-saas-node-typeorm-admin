import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '@config/database';
import { TenantEntity } from '@modules/tenants/tenant.entity';
import { ForbiddenError } from '@common/errors/AppError';

/**
 * Attaches the tenant to req.tenant from the authenticated user's tenantId.
 * Must run after authenticate middleware.
 */
export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId =
      req.user?.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      undefined;

    if (!tenantId) return next();

    const tenantRepo = AppDataSource.getRepository(TenantEntity);
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });

    if (!tenant || !tenant.isActive) {
      next(new ForbiddenError('Tenant not found or inactive'));
      return;
    }

    (req as Request & { tenant?: TenantEntity }).tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

// Augment Express Request to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: import('@modules/tenants/tenant.entity').TenantEntity;
    }
  }
}
