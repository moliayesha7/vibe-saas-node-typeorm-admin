import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, CreditCard,
  BarChart3, FileUp, Bell, Settings, ChevronLeft,
  ChevronRight, LogOut, Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import clsx from 'clsx';
import './Sidebar.css';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'viewer'] },
  { path: '/users', icon: Users, label: 'Users', roles: ['admin', 'manager'] },
  { path: '/tenants', icon: Building2, label: 'Tenants', roles: ['admin'] },
  { path: '/payments', icon: CreditCard, label: 'Payments', roles: ['admin', 'manager', 'viewer'] },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'manager', 'viewer'] },
  { path: '/files', icon: FileUp, label: 'Files', roles: ['admin', 'manager'] },
  { path: '/notifications', icon: Bell, label: 'Notifications', roles: ['admin', 'manager', 'viewer'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'manager', 'viewer'] },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const { user, role, handleLogout } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className={clsx('sidebar', { 'sidebar--collapsed': collapsed })}>
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Shield size={20} />
        </div>
        {!collapsed && <span className="sidebar__logo-text">SaaS Admin</span>}
      </div>

      {/* Toggle button */}
      <button className="sidebar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Navigation */}
      <nav className="sidebar__nav">
        {visibleItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => clsx('sidebar__link', { 'sidebar__link--active': isActive })}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="sidebar__link-icon" />
            {!collapsed && <span className="sidebar__link-label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="sidebar__footer">
        <div className={clsx('sidebar__user', { 'sidebar__user--collapsed': collapsed })}>
          <div className="sidebar__avatar">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.firstName} />
              : <span>{getInitials(user?.firstName, user?.lastName)}</span>
            }
          </div>
          {!collapsed && (
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.firstName} {user?.lastName}</span>
              <span className="sidebar__user-role">{role}</span>
            </div>
          )}
        </div>
        <button className="sidebar__logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
