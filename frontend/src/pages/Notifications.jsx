import React from 'react';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectNotifications, markAsRead, markAllAsRead } from '../store/slices/notificationSlice';
import Button from '../components/common/Button';
import { formatRelativeTime } from '../utils/formatters';
import axiosInstance from '../utils/axiosInstance';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TYPE_ICONS = {
  info:    <Info size={16} style={{ color: 'var(--info)' }} />,
  success: <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
  warning: <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />,
  error:   <XCircle size={16} style={{ color: 'var(--danger)' }} />,
};

const Notifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);

  const handleMarkRead = async (id) => {
    dispatch(markAsRead(id));
    await axiosInstance.patch(`/notifications/${id}/read`).catch(() => {});
  };

  const handleMarkAllRead = async () => {
    dispatch(markAllAsRead());
    await axiosInstance.patch('/notifications/read-all').catch(() => {});
    toast.success('All notifications marked as read');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {notifications.filter(n => !n.isRead).length} unread
          </p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="secondary" size="sm" icon={<CheckCheck size={16} />} onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Bell size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={clsx('notification-item', { unread: !notification.isRead })}
              onClick={() => !notification.isRead && handleMarkRead(notification.id)}
              style={{
                display: 'flex',
                gap: '0.875rem',
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                cursor: !notification.isRead ? 'pointer' : 'default',
                background: !notification.isRead ? 'rgba(var(--primary-rgb), 0.04)' : 'transparent',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {TYPE_ICONS[notification.type] || TYPE_ICONS.info}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: !notification.isRead ? 600 : 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {notification.title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>
                {notification.message && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {notification.message}
                  </p>
                )}
              </div>
              {!notification.isRead && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
