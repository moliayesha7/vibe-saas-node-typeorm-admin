// Role hierarchy: admin > manager > viewer
const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  viewer: 1,
};

const PERMISSIONS = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'tenants:read', 'tenants:write', 'tenants:delete',
    'payments:read', 'payments:write', 'payments:refund',
    'analytics:read', 'analytics:export',
    'files:read', 'files:write', 'files:delete',
    'settings:read', 'settings:write',
    'roles:manage',
  ],
  manager: [
    'users:read', 'users:write',
    'tenants:read',
    'payments:read',
    'analytics:read', 'analytics:export',
    'files:read', 'files:write',
    'settings:read',
  ],
  viewer: [
    'users:read',
    'payments:read',
    'analytics:read',
    'files:read',
  ],
};

// Check if user has required role (or higher)
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const hasRole = roles.some(role => {
      const requiredLevel = ROLE_HIERARCHY[role] || 0;
      return userRoleLevel >= requiredLevel;
    });
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };
};

// Check specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userPermissions = PERMISSIONS[req.user.role] || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`,
      });
    }
    next();
  };
};

// Check tenant ownership - users can only access their own tenant's data
const requireTenantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const requestedTenantId = req.params.tenantId || req.headers['x-tenant-id'];
  if (req.user.role === 'admin') return next(); // Admins bypass tenant check
  if (requestedTenantId && req.user.tenant_id !== requestedTenantId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own tenant data.',
    });
  }
  next();
};

module.exports = { requireRole, requirePermission, requireTenantAccess, PERMISSIONS };
