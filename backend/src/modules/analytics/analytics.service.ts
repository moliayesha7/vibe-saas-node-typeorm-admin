import { AppDataSource } from '@config/database';

export class AnalyticsService {
  // Dashboard summary stats
  async getDashboardStats(role: string, tenantId: string | null): Promise<Record<string, unknown>> {
    const tenantFilter = role !== 'admin' && tenantId ? `AND p.tenant_id = $1` : '';
    const userTenantFilter = role !== 'admin' && tenantId ? `AND u.tenant_id = $1` : '';
    const params = role !== 'admin' && tenantId ? [tenantId] : [];

    const [paymentStats] = await AppDataSource.query(
      `SELECT
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::float           AS total_revenue,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'
          AND p.created_at >= NOW() - INTERVAL '30 days'), 0)::float                      AS revenue_this_month,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'
          AND p.created_at >= NOW() - INTERVAL '7 days'), 0)::float                       AS revenue_this_week,
        COUNT(*)::int                                                                      AS total_transactions,
        COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '30 days')::int           AS transactions_this_month
       FROM payments p WHERE 1=1 ${tenantFilter}`,
      params
    );

    const [userStats] = await AppDataSource.query(
      `SELECT
        COUNT(*)::int                                                                      AS total_users,
        COUNT(*) FILTER (WHERE u.is_active = true)::int                                   AS active_users,
        COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int           AS new_users_month,
        COUNT(*) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int            AS new_users_week
       FROM users u WHERE 1=1 ${userTenantFilter}`,
      params
    );

    return { payments: paymentStats, users: userStats };
  }

  // Revenue + transaction count per day
  async getSalesTrend(period: string, role: string, tenantId: string | null): Promise<unknown[]> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const params: unknown[] = [days];
    const tenantFilter = role !== 'admin' && tenantId ? `AND p.tenant_id = $2` : '';
    if (role !== 'admin' && tenantId) params.push(tenantId);

    return AppDataSource.query(
      `WITH dates AS (
         SELECT generate_series(
           (NOW() - ($1::int - 1) * INTERVAL '1 day')::DATE,
           NOW()::DATE,
           INTERVAL '1 day'
         )::DATE AS period
       )
       SELECT
         d.period,
         COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::float AS revenue,
         COUNT(p.id)::int                                                          AS transactions
       FROM dates d
       LEFT JOIN payments p ON p.created_at::DATE = d.period ${tenantFilter}
       GROUP BY d.period
       ORDER BY d.period ASC`,
      params
    );
  }

  // New registrations + logins per day
  async getUserActivity(period: string, role: string, tenantId: string | null): Promise<unknown[]> {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const params: unknown[] = [days];
    const tenantFilter = role !== 'admin' && tenantId ? `AND u.tenant_id = $2` : '';
    if (role !== 'admin' && tenantId) params.push(tenantId);

    return AppDataSource.query(
      `WITH dates AS (
         SELECT generate_series(
           (NOW() - ($1::int - 1) * INTERVAL '1 day')::DATE,
           NOW()::DATE,
           INTERVAL '1 day'
         )::DATE AS date
       )
       SELECT
         d.date,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at::DATE = d.date)::int                            AS new_users,
         COUNT(DISTINCT u.id) FILTER (WHERE u.last_login::DATE = d.date AND u.is_active = true)::int    AS active_users
       FROM dates d
       LEFT JOIN users u ON 1=1 ${tenantFilter}
       GROUP BY d.date
       ORDER BY d.date ASC`,
      params
    );
  }

  // Payment counts by status
  async getPaymentDistribution(role: string, tenantId: string | null): Promise<unknown[]> {
    const params: unknown[] = [];
    const tenantFilter = role !== 'admin' && tenantId ? `WHERE p.tenant_id = $1` : '';
    if (role !== 'admin' && tenantId) params.push(tenantId);

    return AppDataSource.query(
      `SELECT p.status, COUNT(*)::int AS count
       FROM payments p ${tenantFilter}
       GROUP BY p.status
       ORDER BY count DESC`,
      params
    );
  }

  // Top spenders + revenue by plan
  async getTopMetrics(role: string, tenantId: string | null): Promise<Record<string, unknown>> {
    const params: unknown[] = [];
    const tenantFilter = role !== 'admin' && tenantId ? `AND u.tenant_id = $1` : '';
    if (role !== 'admin' && tenantId) params.push(tenantId);

    const topUsers = await AppDataSource.query(
      `SELECT
         u.id,
         u.first_name,
         u.last_name,
         u.email,
         COUNT(p.id)::int                                                                   AS total_payments,
         COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::float           AS total_spent
       FROM users u
       LEFT JOIN payments p ON p.user_id = u.id
       WHERE 1=1 ${tenantFilter}
       GROUP BY u.id, u.first_name, u.last_name, u.email
       ORDER BY total_spent DESC
       LIMIT 10`,
      params
    );

    let revenueByPlan: unknown[] = [];
    if (role === 'admin') {
      revenueByPlan = await AppDataSource.query(
        `SELECT
           t.plan,
           COUNT(DISTINCT t.id)::int                                                          AS tenant_count,
           COUNT(DISTINCT u.id)::int                                                          AS user_count,
           COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::float           AS total_revenue
         FROM tenants t
         LEFT JOIN users u ON u.tenant_id = t.id
         LEFT JOIN payments p ON p.tenant_id = t.id
         WHERE t.is_active = true
         GROUP BY t.plan
         ORDER BY total_revenue DESC`
      );
    }

    return { topUsers, revenueByPlan };
  }

  // CSV export
  async exportData(type: string, role: string, tenantId: string | null): Promise<string> {
    const params: unknown[] = [];
    const tenantFilterPayments = role !== 'admin' && tenantId ? `AND p.tenant_id = $1` : '';
    const tenantFilterUsers   = role !== 'admin' && tenantId ? `AND u.tenant_id = $1` : '';
    if (role !== 'admin' && tenantId) params.push(tenantId);

    if (type === 'payments') {
      const rows = await AppDataSource.query(
        `SELECT p.id, p.amount, p.currency, p.status, p.order_id, p.transaction_id,
                p.created_at, u.first_name, u.last_name, u.email
         FROM payments p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE 1=1 ${tenantFilterPayments}
         ORDER BY p.created_at DESC LIMIT 5000`,
        params
      );
      const header = 'ID,Amount,Currency,Status,Order ID,Transaction ID,Date,First Name,Last Name,Email\n';
      const body = rows
        .map((r: Record<string, unknown>) =>
          `${r.id},${r.amount},${r.currency},${r.status},${r.order_id ?? ''},${r.transaction_id ?? ''},${r.created_at},${r.first_name ?? ''},${r.last_name ?? ''},${r.email ?? ''}`
        )
        .join('\n');
      return header + body;
    }

    if (type === 'users') {
      const rows = await AppDataSource.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.is_active, u.created_at
         FROM users u
         WHERE 1=1 ${tenantFilterUsers}
         ORDER BY u.created_at DESC LIMIT 5000`,
        params
      );
      const header = 'ID,First Name,Last Name,Email,Role,Active,Created At\n';
      const body = rows
        .map((r: Record<string, unknown>) =>
          `${r.id},${r.first_name ?? ''},${r.last_name ?? ''},${r.email ?? ''},${r.role},${r.is_active},${r.created_at}`
        )
        .join('\n');
      return header + body;
    }

    return '';
  }
}
