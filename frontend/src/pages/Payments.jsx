import React, { useState } from 'react';
import { CreditCard, DollarSign, TrendingUp, RefreshCw, Plus, RotateCcw } from 'lucide-react';
import { useGetPaymentsQuery, useGetPaymentStatsQuery, useRefundPaymentMutation } from '../store/api/paymentsApi';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import StatsCard from '../components/dashboard/StatsCard';
import { SkeletonTable } from '../components/common/Loader';
import { formatCurrency, formatDateTime, formatRelativeTime, getInitials } from '../utils/formatters';
import { PAYMENT_STATUS_COLORS } from '../utils/constants';
import toast from 'react-hot-toast';
import './Payments.css';

const Payments = () => {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch } = useGetPaymentsQuery({ page, limit: 10, status: statusFilter });
  const { data: stats } = useGetPaymentStatsQuery();
  const [refundPayment, { isLoading: refunding }] = useRefundPaymentMutation();

  const payments = data?.data || [];
  const pagination = data?.pagination;

  const handleRefund = async (id) => {
    if (!window.confirm('Are you sure you want to refund this payment?')) return;
    try {
      await refundPayment({ id, reason: 'Admin initiated refund' }).unwrap();
      toast.success('Refund processed successfully');
    } catch (err) {
      toast.error(err?.data?.message || 'Refund failed');
    }
  };

  return (
    <div className="payments-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Transaction history and payment management
          </p>
        </div>
        <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={refetch}>Refresh</Button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.total_revenue)}
          icon={<DollarSign size={22} />}
          color="primary"
        />
        <StatsCard
          title="Completed"
          value={stats?.completed_count || 0}
          subtitle="Successful transactions"
          icon={<CreditCard size={22} />}
          color="success"
        />
        <StatsCard
          title="Pending"
          value={stats?.pending_count || 0}
          subtitle="Awaiting completion"
          icon={<RefreshCw size={22} />}
          color="warning"
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.revenue_this_month)}
          subtitle="This month"
          icon={<TrendingUp size={22} />}
          color="info"
        />
      </div>

      {/* Filter */}
      <div className="filters-bar card" style={{ marginBottom: '1.25rem' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: '150px' }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="card table-container">
        {isLoading ? <SkeletonTable rows={8} /> : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Order ID</th>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No payments found</td></tr>
                ) : payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-cell__avatar" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                          {getInitials(payment.first_name, payment.last_name)}
                        </div>
                        <div>
                          <span className="user-cell__name">{payment.first_name} {payment.last_name}</span>
                          <span className="user-cell__email">{payment.user_email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: payment.status === 'refunded' ? 'var(--danger)' : 'var(--success)' }}>
                      {payment.status === 'refunded' ? '-' : '+'}{formatCurrency(payment.amount)}
                    </td>
                    <td><span className={`badge ${PAYMENT_STATUS_COLORS[payment.status]}`}>{payment.status}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{payment.order_id || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{payment.transaction_id || '-'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDateTime(payment.created_at)}</td>
                    {isAdmin && (
                      <td>
                        {payment.status === 'completed' && (
                          <button className="action-btn" onClick={() => handleRefund(payment.id)} title="Refund" disabled={refunding}>
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <span className="pagination__info">Page {pagination.page} of {pagination.totalPages}</span>
                <div className="pagination__controls">
                  <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Payments;
