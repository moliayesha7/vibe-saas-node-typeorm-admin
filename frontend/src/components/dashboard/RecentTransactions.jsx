import React from 'react';
import { useGetPaymentsQuery } from '../../store/api/paymentsApi';
import { formatCurrency, formatRelativeTime, getInitials } from '../../utils/formatters';
import { PAYMENT_STATUS_COLORS } from '../../utils/constants';
import { SkeletonTable } from '../common/Loader';
import './RecentTransactions.css';

const RecentTransactions = () => {
  const { data, isLoading } = useGetPaymentsQuery({ limit: 8 });
  const payments = data?.data || [];

  return (
    <div className="recent-transactions chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Recent Transactions</h3>
          <p className="chart-card__subtitle">Latest payment activity</p>
        </div>
      </div>

      {isLoading ? <SkeletonTable rows={5} /> : (
        <div className="transactions-list">
          {payments.length === 0 ? (
            <div className="empty-state">No transactions yet</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="transaction-item">
                <div className="transaction-avatar">
                  {getInitials(payment.user?.firstName, payment.user?.lastName)}
                </div>
                <div className="transaction-info">
                  <span className="transaction-name">
                    {payment.user ? `${payment.user.firstName} ${payment.user.lastName}` : 'Unknown'}
                  </span>
                  <span className="transaction-desc">{payment.description || payment.orderId}</span>
                </div>
                <div className="transaction-right">
                  <span className="transaction-amount">
                    {payment.status === 'refunded' ? '-' : '+'}{formatCurrency(payment.amount)}
                  </span>
                  <span className={`badge ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                    {payment.status}
                  </span>
                  <span className="transaction-time">{formatRelativeTime(payment.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;
