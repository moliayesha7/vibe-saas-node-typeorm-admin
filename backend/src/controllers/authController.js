const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, withTransaction } = require('../config/database');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const generateTokens = (user) => {
  const payload = { userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, tenantName } = req.body;

  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) throw new AppError('Email already registered', 409);

  await withTransaction(async (client) => {
    // Create tenant if tenantName provided (first user becomes admin of new tenant)
    let tenantId = null;
    if (tenantName) {
      const slug = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuidv4().slice(0, 8);
      const tenantResult = await client.query(
        'INSERT INTO tenants (id, name, slug, plan) VALUES ($1, $2, $3, $4) RETURNING id',
        [uuidv4(), tenantName, slug, 'free']
      );
      tenantId = tenantResult.rows[0].id;
    } else {
      // Assign to default tenant
      const defaultTenant = await client.query('SELECT id FROM tenants WHERE slug = $1', ['default']);
      if (defaultTenant.rows.length) tenantId = defaultTenant.rows[0].id;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const role = tenantName ? 'admin' : 'viewer'; // First user of new tenant is admin

    const userResult = await client.query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, first_name, last_name, email, role, tenant_id`,
      [userId, firstName, lastName, email.toLowerCase(), passwordHash, role, tenantId]
    );

    const user = userResult.rows[0];
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await client.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user).catch(err => logger.error('Welcome email failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email.toLowerCase()]
  );
  const user = result.rows[0];
  if (!user) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  const { accessToken, refreshToken } = generateTokens(user);

  await query('UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2', [refreshToken, user.id]);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
        avatarUrl: user.avatar_url,
      },
      accessToken,
      refreshToken,
    },
  });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const result = await query(
    'SELECT * FROM users WHERE id = $1 AND refresh_token = $2 AND is_active = true',
    [decoded.userId, refreshToken]
  );
  const user = result.rows[0];
  if (!user) throw new AppError('Invalid refresh token', 401);

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [newRefreshToken, user.id]);

  res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
};

exports.logout = async (req, res) => {
  await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.avatar_url, u.tenant_id, u.last_login,
            t.name as tenant_name, t.plan as tenant_plan
     FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = $1`,
    [req.user.id]
  );
  const user = result.rows[0];
  if (!user) throw new AppError('User not found', 404);

  res.json({
    success: true,
    data: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      tenantPlan: user.tenant_plan,
      lastLogin: user.last_login,
    },
  });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = result.rows[0];

  // Always return success to prevent email enumeration
  if (user) {
    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [resetToken, resetExpiry, user.id]);
    sendPasswordResetEmail(user, resetToken).catch(err => logger.error('Reset email failed:', err.message));
  }

  res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const result = await query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
    [token]
  );
  const user = result.rows[0];
  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, refresh_token = NULL WHERE id = $2',
    [passwordHash, user.id]
  );

  res.json({ success: true, message: 'Password reset successfully. Please login.' });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const result = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

  res.json({ success: true, message: 'Password changed successfully' });
};
