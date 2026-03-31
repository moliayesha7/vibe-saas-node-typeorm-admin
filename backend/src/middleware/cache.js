const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 300,       // 5 minutes default TTL
  checkperiod: 60,   // Check for expired keys every 60s
  useClones: false,
});

// Cache middleware factory
const cacheMiddleware = (ttl = 300, keyPrefix = '') => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

    const key = `${keyPrefix}:${req.user?.tenant_id || 'global'}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      return res.json({ ...cached, _cached: true });
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
      }
      return originalJson(data);
    };
    next();
  };
};

// Invalidate cache by pattern
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const toDelete = keys.filter(key => key.includes(pattern));
  if (toDelete.length) cache.del(toDelete);
};

// Clear all cache for a tenant
const clearTenantCache = (tenantId) => {
  invalidateCache(`:${tenantId}:`);
};

module.exports = { cache, cacheMiddleware, invalidateCache, clearTenantCache };
