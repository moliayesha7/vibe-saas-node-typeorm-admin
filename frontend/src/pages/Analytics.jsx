import React from 'react';
import { Download, BarChart3 } from 'lucide-react';
import SalesChart from '../components/dashboard/SalesChart';
import UserActivityChart from '../components/dashboard/UserActivityChart';
import PaymentDistributionChart from '../components/dashboard/PaymentDistributionChart';
import { useGetTopMetricsQuery } from '../store/api/analyticsApi';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import { formatCurrency, getInitials } from '../utils/formatters';
import { SkeletonTable } from '../components/common/Loader';
import axiosInstance from '../utils/axiosInstance';
import toast from 'react-hot-toast';

const Analytics = () => {
  const { isAdmin } = useAuth();
  const { data: metrics, isLoading } = useGetTopMetricsQuery();

  const handleExport = async (type) => {
    try {
      const res = await axiosInstance.get(`/analytics/export?type=${type}&format=csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-export.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} exported successfully`);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="analytics-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Business intelligence and performance metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => handleExport('payments')} size="sm">
            Export Payments
          </Button>
          <Button variant="secondary" icon={<Download size={16} />} onClick={() => handleExport('users')} size="sm">
            Export Users
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <SalesChart />
        <PaymentDistributionChart />
      </div>

      <div className="charts-grid" style={{ marginTop: '1.25rem' }}>
        <UserActivityChart />

        {/* Top Users */}
        <div className="card">
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Top Customers</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>By total spending</p>
          </div>

          {isLoading ? <SkeletonTable rows={5} /> : (
            <div>
              {(metrics?.topUsers || []).slice(0, 8).map((user, i) => (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '20px', textAlign: 'center', fontWeight: 600 }}>
                    #{i + 1}
                  </span>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(user.first_name, user.last_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{user.first_name} {user.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.total_payments} payments</div>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: '0.875rem', flexShrink: 0 }}>
                    {formatCurrency(user.total_spent)}
                  </span>
                </div>
              ))}
              {(!metrics?.topUsers || metrics.topUsers.length === 0) && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.875rem' }}>
                  No data available
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Revenue by plan (admin only) */}
      {isAdmin && metrics?.revenueByPlan?.length > 0 && (
        <div className="card" style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Revenue by Plan</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Tenants</th>
                  <th>Users</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.revenueByPlan.map((plan) => (
                  <tr key={plan.plan}>
                    <td><span className={`badge badge-primary`}>{plan.plan}</span></td>
                    <td>{plan.tenant_count}</td>
                    <td>{plan.user_count}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(plan.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
