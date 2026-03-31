import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Menu, Sun, Moon, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUnreadCount } from '../../store/slices/notificationSlice';
import { useAuth } from '../../hooks/useAuth';
import { getInitials } from '../../utils/formatters';
import clsx from 'clsx';
import './Navbar.css';

const Navbar = ({ onMenuToggle, theme, onThemeToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useSelector(selectUnreadCount);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar__left">
        <button className="navbar__menu-btn" onClick={onMenuToggle} aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>
        <div className="navbar__search">
          <Search size={16} className="navbar__search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="navbar__search-input"
          />
          {searchQuery && (
            <kbd className="navbar__search-kbd">ESC</kbd>
          )}
        </div>
      </div>

      <div className="navbar__right">
        {/* Theme toggle */}
        <button className="navbar__icon-btn" onClick={onThemeToggle} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          className={clsx('navbar__icon-btn', 'notification-dot', { 'ping': unreadCount > 0 })}
          onClick={() => navigate('/notifications')}
          aria-label={`${unreadCount} unread notifications`}
          style={{ position: 'relative' }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="navbar__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {/* User menu */}
        <div className="navbar__user-menu">
          <button
            className="navbar__user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            <div className="navbar__avatar">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.firstName} />
                : <span>{getInitials(user?.firstName, user?.lastName)}</span>
              }
            </div>
            <div className="navbar__user-info">
              <span className="navbar__user-name">{user?.firstName} {user?.lastName}</span>
              <span className="navbar__user-role">{user?.role}</span>
            </div>
          </button>

          {showUserMenu && (
            <div className="navbar__dropdown animate-slide-down">
              <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                <User size={14} /> Profile
              </button>
              <button onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
