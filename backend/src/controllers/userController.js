const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { getPagination, getPaginationMeta, buildOrderBy } = require('../utils/pagination');
const { invalidateCache } = require('../middleware/cache');
const { emitToTenant, emitToAdmins } = require('../services/socketService');

const ALLOWED_SORT = ['created_at', 'email', 'first_name', 'last_name', 'role', 'last_login'];

exports.getUsers = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { search, role, isActive, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

  // Tenant isolation - non-admins only see their tenant's users
  const tenantFilter = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;

  let conditions = [];
  let params = [];
  let paramIdx = 1;

  if (tenantFilter) {
    conditions.push(`u.tenant_id = $${paramIdx++}`);
    params.push(tenantFilter);
  }
  if (search) {
    conditions.push(`(u.first_name ILIKE $${paramIdx} OR u.last_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (role) {
    conditions.push(`u.role = $${paramIdx++}`);
    params.push(role);
  }
  if (isActive !== undefined) {
    conditions.push(`u.is_active = $${paramIdx++}`);
    params.push(isActive === 'true');
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = buildOrderBy(sortBy, sortOrder, ALLOWED_SORT);

  const countResult = await query(
    `SELECT COUNT(*) FROM users u ${whereClause}`,
    params
  );

  const usersResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.avatar_url, u.last_login, u.created_at,
            t.name as tenant_name
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
     ${whereClause} ${orderBy} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  const total = parseInt(countResult.rows[0].count);
  res.json({
    success: true,
    data: usersResult.rows,
    pagination: getPaginationMeta(total, page, limit),
  });
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.avatar_url,
            u.last_login, u.created_at, u.tenant_id, t.name as tenant_name, t.plan as tenant_plan
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = $1`,
    [id]
  );
  const user = result.rows[0];
  if (!user) throw new AppError('User not found', 404);

  // Tenant isolation check
  if (req.user.role !== 'admin' && user.tenant_id !== req.user.tenant_id) {
    throw new AppError('Access denied', 403);
  }

  res.json({ success: true, data: user });
};

exports.createUser = async (req, res) => {
  const { firstName, lastName, email, password, role = 'viewer', tenantId } = req.body;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) throw new AppError('Email already exists', 409);

  const assignedTenantId = req.user.role === 'admin' ? (tenantId || req.user.tenant_id) : req.user.tenant_id;
  const assignedRole = req.user.role === 'admin' ? role : (role === 'admin' ? 'manager' : role);

  const passwordHash = await bcrypt.hash(password || uuidv4(), 12);
  const userId = uuidv4();

  const result = await query(
    `INSERT INTO users (id, first_name, last_name, email, password_hash, role, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, first_name, last_name, email, role, is_active, created_at`,
    [userId, firstName, lastName, email.toLowerCase(), passwordHash, assignedRole, assignedTenantId]
  );

  const newUser = result.rows[0];
  invalidateCache('users');
  emitToTenant(assignedTenantId, 'user:created', { user: newUser });
  emitToAdmins('user:created', { user: newUser, tenantId: assignedTenantId });

  res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const existing = await query('SELECT * FROM users WHERE id = $1', [id]);
  const user = existing.rows[0];
  if (!user) throw new AppError('User not found', 404);

  if (req.user.role !== 'admin' && user.tenant_id !== req.user.tenant_id) {
    throw new AppError('Access denied', 403);
  }
  if (req.user.role === 'manager' && updates.role === 'admin') {
    throw new AppError('Managers cannot assign admin role', 403);
  }

  const fields = [];
  const params = [];
  let idx = 1;

  if (updates.firstName !== undefined) { fields.push(`first_name = $${idx++}`); params.push(updates.firstName); }
  if (updates.lastName !== undefined) { fields.push(`last_name = $${idx++}`); params.push(updates.lastName); }
  if (updates.role !== undefined) { fields.push(`role = $${idx++}`); params.push(updates.role); }
  if (updates.isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(updates.isActive); }

  if (!fields.length) throw new AppError('No valid fields to update', 400);

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, first_name, last_name, email, role, is_active, updated_at`,
    params
  );

  invalidateCache('users');
  emitToTenant(user.tenant_id, 'user:updated', { userId: id, updates: result.rows[0] });

  res.json({ success: true, message: 'User updated successfully', data: result.rows[0] });
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) throw new AppError('You cannot delete your own account', 400);

  const result = await query('UPDATE users SET is_active = false WHERE id = $1 RETURNING tenant_id', [id]);
  if (!result.rows.length) throw new AppError('User not found', 404);

  invalidateCache('users');
  emitToAdmins('user:deleted', { userId: id });

  res.json({ success: true, message: 'User deactivated successfully' });
};

exports.updateProfile = async (req, res) => {
  const { firstName, lastName } = req.body;
  const result = await query(
    'UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3 RETURNING id, first_name, last_name, email, avatar_url',
    [firstName, lastName, req.user.id]
  );
  res.json({ success: true, message: 'Profile updated', data: result.rows[0] });
};

exports.updateAvatar = async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);
  const result = await query(
    'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING avatar_url',
    [req.file.path, req.user.id]
  );
  res.json({ success: true, data: { avatarUrl: result.rows[0].avatar_url } });
};
