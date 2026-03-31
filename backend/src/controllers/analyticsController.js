const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

exports.getDashboardStats = async (req, res) => {
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : null;
  const tenantFilter = tenantId ? 'AND tenant_id = $1' : '';
  const params = tenantId ? [tenantId] : [];

  const [usersStats, paymentStats, recentActivity] = await Promise.all([
    query(
      `SELECT
         COUNT(*) as total_users,
         COUNT(*) FILTER (WHERE is_active = true) as active_users,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_month,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_week
       FROM users WHERE 1=1 ${tenantFilter}`,
      params
    ),
    query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
         COUNT(*) FILTER (WHERE status = 'completed') as total_transactions,
         COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_this_month,
         COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) as revenue_this_week,
         COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days') as transactions_this_month
       FROM payments WHERE 1=1 ${tenantFilter}`,
      params
    ),
    query(
      `SELECT 'payment' as type, created_at, amount::text as detail FROM payments
       WHERE status = 'completed' ${tenantFilter} ORDER BY created_at DESC LIMIT 5`,
      params
    ),
  ]);

  res.json({
    success: true,
    data: {
      users: usersStats.rows[0],
      payments: paymentStats.rows[0],
      recentActivity: recentActivity.rows,
    },
  });
};

exports.getSalesTrend = async (req, res) => {
  const { period = '30d' } = req.query;
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;

  const intervals = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const days = intervals[period] || 30;
  const groupBy = days <= 30 ? 'day' : days <= 90 ? 'week' : 'month';

  const tenantFilter = tenantId ? 'AND tenant_id = $2' : '';
  const params = tenantId ? [days, tenantId] : [days];

  const result = await query(
    `SELECT
       DATE_TRUNC('${groupBy}', created_at) as period,
       COALESCE(SUM(amount), 0) as revenue,
       COUNT(*) as transactions
     FROM payments
     WHERE status = 'completed' AND created_at >= NOW() - ($1 || ' days')::interval ${tenantFilter}
     GROUP BY DATE_TRUNC('${groupBy}', created_at)
     ORDER BY period ASC`,
    params
  );

  res.json({ success: true, data: result.rows });
};

exports.getUserActivity = async (req, res) => {
  const { period = '30d' } = req.query;
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;
  const days = { '7d': 7, '30d': 30, '90d': 90 }[period] || 30;

  const tenantFilter = tenantId ? 'AND tenant_id = $2' : '';
  const params = tenantId ? [days, tenantId] : [days];

  const result = await query(
    `SELECT
       DATE_TRUNC('day', created_at) as date,
       COUNT(*) as new_users,
       COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '1 day') as active_users
     FROM users
     WHERE created_at >= NOW() - ($1 || ' days')::interval ${tenantFilter}
     GROUP BY DATE_TRUNC('day', created_at)
     ORDER BY date ASC`,
    params
  );

  res.json({ success: true, data: result.rows });
};

exports.getPaymentDistribution = async (req, res) => {
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;
  const tenantFilter = tenantId ? 'WHERE tenant_id = $1' : '';
  const params = tenantId ? [tenantId] : [];

  const result = await query(
    `SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
     FROM payments ${tenantFilter} GROUP BY status`,
    params
  );

  res.json({ success: true, data: result.rows });
};

exports.getTopMetrics = async (req, res) => {
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : null;
  const params = tenantId ? [tenantId] : [];

  const [topUsers, revenueByPlan] = await Promise.all([
    query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              COUNT(p.id) as total_payments,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) as total_spent
       FROM users u
       LEFT JOIN payments p ON p.user_id = u.id
       ${tenantId ? 'WHERE u.tenant_id = $1' : ''} GROUP BY u.id ORDER BY total_spent DESC LIMIT 10`,
      params
    ),
    !tenantId ? query(
      `SELECT t.plan, COUNT(DISTINCT t.id) as tenant_count, COUNT(DISTINCT u.id) as user_count,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) as total_revenue
       FROM tenants t
       LEFT JOIN users u ON u.tenant_id = t.id
       LEFT JOIN payments p ON p.tenant_id = t.id
       GROUP BY t.plan`
    ) : Promise.resolve({ rows: [] }),
  ]);

  res.json({ success: true, data: { topUsers: topUsers.rows, revenueByPlan: revenueByPlan.rows } });
};

exports.exportAnalytics = async (req, res) => {
  const { type = 'payments', format = 'json' } = req.query;
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;

  let data;
  if (type === 'payments') {
    const result = await query(
      `SELECT p.*, u.email, u.first_name, u.last_name
       FROM payments p JOIN users u ON u.id = p.user_id
       ${tenantId ? 'WHERE p.tenant_id = $1' : ''} ORDER BY p.created_at DESC LIMIT 1000`,
      tenantId ? [tenantId] : []
    );
    data = result.rows;
  } else {
    const result = await query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at, last_login
       FROM users ${tenantId ? 'WHERE tenant_id = $1' : ''} ORDER BY created_at DESC LIMIT 1000`,
      tenantId ? [tenantId] : []
    );
    data = result.rows;
  }

  if (format === 'csv') {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-export.csv`);
    return res.send([headers, ...rows].join('\n'));
  }

  res.json({ success: true, data });
};
