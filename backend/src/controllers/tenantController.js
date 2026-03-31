const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { getPagination, getPaginationMeta } = require('../utils/pagination');
const { invalidateCache } = require('../middleware/cache');

exports.getTenants = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { search, plan } = req.query;

  let conditions = [];
  let params = [];
  let idx = 1;

  if (search) { conditions.push(`(name ILIKE $${idx} OR slug ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (plan) { conditions.push(`plan = $${idx++}`); params.push(plan); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM tenants ${where}`, params);
  const tenantsResult = await query(
    `SELECT t.*, COUNT(u.id) as user_count
     FROM tenants t LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
     ${where} GROUP BY t.id ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: tenantsResult.rows,
    pagination: getPaginationMeta(parseInt(countResult.rows[0].count), page, limit),
  });
};

exports.getTenantById = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin' && req.user.tenant_id !== id) {
    throw new AppError('Access denied', 403);
  }

  const result = await query(
    `SELECT t.*, COUNT(u.id) as user_count,
            SUM(p.amount) FILTER (WHERE p.status = 'completed') as total_revenue
     FROM tenants t
     LEFT JOIN users u ON u.tenant_id = t.id AND u.is_active = true
     LEFT JOIN payments p ON p.tenant_id = t.id
     WHERE t.id = $1 GROUP BY t.id`,
    [id]
  );
  if (!result.rows[0]) throw new AppError('Tenant not found', 404);

  res.json({ success: true, data: result.rows[0] });
};

exports.createTenant = async (req, res) => {
  const { name, plan = 'free', settings = {} } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuidv4().slice(0, 8);

  const result = await query(
    'INSERT INTO tenants (id, name, slug, plan, settings) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [uuidv4(), name, slug, plan, JSON.stringify(settings)]
  );

  invalidateCache('tenants');
  res.status(201).json({ success: true, message: 'Tenant created', data: result.rows[0] });
};

exports.updateTenant = async (req, res) => {
  const { id } = req.params;
  const { name, plan, isActive, settings } = req.body;

  if (req.user.role !== 'admin' && req.user.tenant_id !== id) {
    throw new AppError('Access denied', 403);
  }

  const fields = [];
  const params = [];
  let idx = 1;

  if (name) { fields.push(`name = $${idx++}`); params.push(name); }
  if (plan) { fields.push(`plan = $${idx++}`); params.push(plan); }
  if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(isActive); }
  if (settings) { fields.push(`settings = $${idx++}`); params.push(JSON.stringify(settings)); }
  if (!fields.length) throw new AppError('No fields to update', 400);

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (!result.rows[0]) throw new AppError('Tenant not found', 404);

  invalidateCache('tenants');
  res.json({ success: true, data: result.rows[0] });
};

exports.deleteTenant = async (req, res) => {
  const { id } = req.params;
  await query('UPDATE tenants SET is_active = false WHERE id = $1', [id]);
  await query('UPDATE users SET is_active = false WHERE tenant_id = $1', [id]);
  invalidateCache('tenants');
  res.json({ success: true, message: 'Tenant deactivated' });
};

exports.getTenantStats = async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== 'admin' && req.user.tenant_id !== id) throw new AppError('Access denied', 403);

  const stats = await query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND is_active = true) as active_users,
       (SELECT COUNT(*) FROM payments WHERE tenant_id = $1 AND status = 'completed') as completed_payments,
       (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE tenant_id = $1 AND status = 'completed') as total_revenue,
       (SELECT COUNT(*) FROM payments WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days') as payments_this_month`,
    [id]
  );

  res.json({ success: true, data: stats.rows[0] });
};
