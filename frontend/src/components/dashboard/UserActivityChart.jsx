import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useGetUserActivityQuery } from '../../store/api/analyticsApi';
import { CHART_COLORS } from '../../utils/constants';
import { SkeletonCard } from '../common/Loader';

const UserActivityChart = () => {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading } = useGetUserActivityQuery({ period });

  if (isLoading) return <SkeletonCard />;

  const labels = (data || []).map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'New Users',
        data: (data || []).map(d => parseInt(d.new_users)),
        backgroundColor: CHART_COLORS.primaryAlpha,
        borderColor: CHART_COLORS.primary,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Active Users',
        data: (data || []).map(d => parseInt(d.active_users)),
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: CHART_COLORS.success,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
      },
    },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: '#1e293b' } },
    },
  };

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">User Activity</h3>
          <p className="chart-card__subtitle">New registrations and active users</p>
        </div>
        <div className="period-tabs">
          {['7d', '30d', '90d'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default UserActivityChart;
