import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '@common/errors/AppError';

export type UserRole = 'admin' | 'manager' | 'viewer';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  viewer: 1,
};

export const PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'tenants:read', 'tenants:write', 'tenants:delete',
    'payments:read', 'payments:write', 'payments:refund',
    'analytics:read', 'analytics:export',
    'files:read', 'files:write', 'files:delete',
    'settings:read', 'settings:write',
    'notifications:read', 'notifications:write',
    'roles:manage',
  ],
  manager: [
    'users:read', 'users:write',
    'tenants:read',
    'payments:read',
    'analytics:read', 'analytics:export',
    'files:read', 'files:write',
    'settings:read',
    'notifications:read',
  ],
  viewer: [
    'users:read',
    'payments:read',
    'analytics:read',
    'notifications:read',
    'files:read',
  ],
};

/**
 * Require at least one of the specified roles (or higher in hierarchy).
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const userLevel = ROLE_HIERARCHY[req.user.role as UserRole] ?? 0;
    const allowed = roles.some(
      (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 0)
    );
    if (!allowed) {
      next(
        new ForbiddenError(
          `Access denied. Required role: ${roles.join(' or ')}`
        )
      );
      return;
    }
    next();
  };
};

/**
 * Require a specific fine-grained permission.
 */
export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const userPerms = PERMISSIONS[req.user.role as UserRole] ?? [];
    if (!userPerms.includes(permission)) {
      next(
        new ForbiddenError(
          `Access denied. Required permission: ${permission}`
        )
      );
      return;
    }
    next();
  };
};

/**
 * Ensure the user can only access their own tenant's data.
 * Admins bypass this check.
 */
export const requireTenantAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  if (req.user.role === 'admin') return next(); // Admins bypass

  const requestedTenantId =
    (req.params.tenantId as string) ||
    (req.headers['x-tenant-id'] as string);

  if (
    requestedTenantId &&
    req.user.tenantId !== requestedTenantId
  ) {
    next(new ForbiddenError('You can only access your own tenant data'));
    return;
  }
  next();
};
