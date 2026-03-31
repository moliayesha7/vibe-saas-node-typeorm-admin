import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useGetPaymentDistributionQuery } from '../../store/api/analyticsApi';
import { formatCurrency } from '../../utils/formatters';
import { CHART_COLORS } from '../../utils/constants';
import { SkeletonCard } from '../common/Loader';

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_COLORS = {
  completed: CHART_COLORS.success,
  pending: CHART_COLORS.warning,
  failed: CHART_COLORS.danger,
  refunded: CHART_COLORS.info,
  cancelled: '#64748b',
};

const PaymentDistributionChart = () => {
  const { data, isLoading } = useGetPaymentDistributionQuery();
  if (isLoading) return <SkeletonCard />;

  const chartData = {
    labels: (data || []).map(d => d.status.charAt(0).toUpperCase() + d.status.slice(1)),
    datasets: [{
      data: (data || []).map(d => parseInt(d.count)),
      backgroundColor: (data || []).map(d => STATUS_COLORS[d.status] || '#64748b'),
      borderWidth: 2,
      borderColor: 'var(--bg-card)',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed} payments`,
        },
      },
    },
  };

  const total = (data || []).reduce((sum, d) => sum + parseInt(d.count), 0);

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Payment Distribution</h3>
          <p className="chart-card__subtitle">{total} total transactions</p>
        </div>
      </div>
      <div className="donut-container">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="donut-legend">
        {(data || []).map((item) => (
          <div key={item.status} className="donut-legend__item">
            <div className="donut-legend__label">
              <div className="donut-legend__dot" style={{ background: STATUS_COLORS[item.status] }} />
              <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
            </div>
            <span className="donut-legend__value">
              {item.count} ({total > 0 ? Math.round(item.count / total * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentDistributionChart;
