import React from 'react';
import { Users, DollarSign, CreditCard, TrendingUp, Activity, Building2 } from 'lucide-react';
import { useGetDashboardStatsQuery } from '../store/api/analyticsApi';
import { useAuth } from '../hooks/useAuth';
import StatsCard from '../components/dashboard/StatsCard';
import SalesChart from '../components/dashboard/SalesChart';
import UserActivityChart from '../components/dashboard/UserActivityChart';
import PaymentDistributionChart from '../components/dashboard/PaymentDistributionChart';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import { formatCurrency, formatNumber, formatRelativeTime } from '../utils/formatters';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard animate-fade-in">
      {/* Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">
            {greeting()}, {user?.firstName}! 👋
          </h1>
          <p className="dashboard__subtitle">
            Here's what's happening with your platform today.
          </p>
        </div>
        <div className="dashboard__date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger-children">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(stats?.payments?.total_revenue)}
          subtitle={`${formatCurrency(stats?.payments?.revenue_this_month)} this month`}
          icon={<DollarSign size={22} />}
          color="primary"
          trendValue={12.5}
          loading={isLoading}
        />
        <StatsCard
          title="Total Users"
          value={formatNumber(stats?.users?.total_users)}
          subtitle={`${stats?.users?.new_users_month || 0} new this month`}
          icon={<Users size={22} />}
          color="success"
          trendValue={8.2}
          loading={isLoading}
        />
        <StatsCard
          title="Transactions"
          value={formatNumber(stats?.payments?.total_transactions)}
          subtitle={`${stats?.payments?.transactions_this_month || 0} this month`}
          icon={<CreditCard size={22} />}
          color="warning"
          trendValue={5.1}
          loading={isLoading}
        />
        <StatsCard
          title="Active Users"
          value={formatNumber(stats?.users?.active_users)}
          subtitle={`${stats?.users?.new_users_week || 0} new this week`}
          icon={<Activity size={22} />}
          color="info"
          trendValue={-2.3}
          loading={isLoading}
        />
        <StatsCard
          title="Weekly Revenue"
          value={formatCurrency(stats?.payments?.revenue_this_week)}
          subtitle="Last 7 days"
          icon={<TrendingUp size={22} />}
          color="danger"
          loading={isLoading}
        />
        {isAdmin && (
          <StatsCard
            title="New Users (Week)"
            value={formatNumber(stats?.users?.new_users_week)}
            subtitle="Registered this week"
            icon={<Building2 size={22} />}
            color="primary"
            loading={isLoading}
          />
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <SalesChart />
        <PaymentDistributionChart />
      </div>

      <div className="charts-grid" style={{ marginTop: '1.25rem' }}>
        <UserActivityChart />
        <RecentTransactions />
      </div>
    </div>
  );
};

export default Dashboard;
