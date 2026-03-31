import React, { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { useGetSalesTrendQuery } from '../../store/api/analyticsApi';
import { formatCurrency } from '../../utils/formatters';
import { CHART_COLORS } from '../../utils/constants';
import { SkeletonCard } from '../common/Loader';
import './Charts.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const PERIODS = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
];

const SalesChart = () => {
  const [period, setPeriod] = useState('30d');
  const [chartType, setChartType] = useState('line');
  const { data, isLoading } = useGetSalesTrendQuery({ period });

  if (isLoading) return <SkeletonCard />;

  const labels = (data || []).map(d => {
    const date = new Date(d.period);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const revenues = (data || []).map(d => parseFloat(d.revenue));
  const transactions = (data || []).map(d => parseInt(d.transactions));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue (BDT)',
        data: revenues,
        borderColor: CHART_COLORS.primary,
        backgroundColor: CHART_COLORS.primaryAlpha,
        fill: chartType === 'line',
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Transactions',
        data: transactions,
        borderColor: CHART_COLORS.success,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (context) => {
            const label = context.dataset.label;
            return label.includes('Revenue')
              ? ` ${label}: ${formatCurrency(context.parsed.y)}`
              : ` ${label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { color: '#1e293b' },
      },
      y: {
        position: 'left',
        ticks: { color: '#64748b', font: { size: 11 }, callback: (v) => `৳${v >= 1000 ? v/1000+'K' : v}` },
        grid: { color: '#1e293b' },
      },
      y1: {
        position: 'right',
        ticks: { color: '#64748b', font: { size: 11 } },
        grid: { drawOnChartArea: false },
      },
    },
  };

  const ChartComponent = chartType === 'line' ? Line : Bar;

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <h3 className="chart-card__title">Revenue Trend</h3>
          <p className="chart-card__subtitle">Sales performance over time</p>
        </div>
        <div className="chart-card__controls">
          <div className="chart-toggle">
            <button className={chartType === 'line' ? 'active' : ''} onClick={() => setChartType('line')}>Line</button>
            <button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')}>Bar</button>
          </div>
          <div className="period-tabs">
            {PERIODS.map(p => (
              <button key={p.value} className={period === p.value ? 'active' : ''} onClick={() => setPeriod(p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-container">
        <ChartComponent data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SalesChart;
