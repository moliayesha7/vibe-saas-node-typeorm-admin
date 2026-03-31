import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import './StatsCard.css';

const StatsCard = ({ title, value, subtitle, icon, trend, trendValue, color = 'primary', loading = false }) => {
  if (loading) {
    return (
      <div className="stats-card stats-card--loading">
        <div className="skeleton" style={{ height: '60px' }} />
        <div className="skeleton" style={{ height: '32px', marginTop: '0.5rem' }} />
        <div className="skeleton" style={{ height: '14px', marginTop: '0.5rem', width: '60%' }} />
      </div>
    );
  }

  const isPositive = trend === 'up' || (trendValue !== undefined && trendValue >= 0);

  return (
    <div className={clsx('stats-card', `stats-card--${color}`, 'hover-lift', 'animate-fade-in')}>
      <div className="stats-card__header">
        <div className={clsx('stats-card__icon', `stats-card__icon--${color}`)}>
          {icon}
        </div>
        {trendValue !== undefined && (
          <div className={clsx('stats-card__trend', { 'trend-up': isPositive, 'trend-down': !isPositive })}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trendValue)}%</span>
          </div>
        )}
      </div>
      <div className="stats-card__body">
        <div className="stats-card__value animate-count">{value}</div>
        <div className="stats-card__title">{title}</div>
        {subtitle && <div className="stats-card__subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatsCard;
