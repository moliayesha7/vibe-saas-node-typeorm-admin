const { query } = require('../config/database');

// Attach tenant info to request from JWT user or X-Tenant-ID header
const tenantMiddleware = async (req, res, next) => {
  try {
    let tenantId = null;

    if (req.user?.tenant_id) {
      tenantId = req.user.tenant_id;
    } else if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    }

    if (tenantId) {
      const result = await query(
        'SELECT id, name, slug, plan, is_active, settings FROM tenants WHERE id = $1',
        [tenantId]
      );
      const tenant = result.rows[0];
      if (!tenant || !tenant.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tenant not found or inactive',
        });
      }
      req.tenant = tenant;
    }
    next();
  } catch (error) {
    next(error);
  }
};

// Scope DB queries to tenant - append tenant_id filter automatically
const scopeToTenant = (tenantId) => ({
  condition: 'tenant_id = $',
  value: tenantId,
});

module.exports = { tenantMiddleware, scopeToTenant };
