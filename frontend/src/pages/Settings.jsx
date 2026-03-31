import React, { useState } from 'react';
import { Moon, Sun, Bell, Shield, Globe, Palette } from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const SettingRow = ({ icon, title, description, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
      <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'rgba(var(--primary-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1px' }}>{description}</div>
      </div>
    </div>
    <div>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      background: checked ? 'var(--primary)' : 'var(--bg-tertiary)',
      border: '1px solid var(--border)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s'
    }}
  >
    <div style={{
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'white',
      position: 'absolute',
      top: 2,
      left: checked ? 22 : 2,
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
    }} />
  </button>
);

const Settings = ({ theme, onThemeToggle }) => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState({ email: true, push: true, payments: true, security: true });

  const handleSave = () => toast.success('Settings saved!');

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manage your preferences</p>
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Appearance</h3>
        <SettingRow icon={<Palette size={16} />} title="Theme" description="Switch between dark and light mode">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant={theme === 'dark' ? 'primary' : 'secondary'} size="sm" icon={<Moon size={14} />} onClick={() => theme !== 'dark' && onThemeToggle()}>Dark</Button>
            <Button variant={theme === 'light' ? 'primary' : 'secondary'} size="sm" icon={<Sun size={14} />} onClick={() => theme !== 'light' && onThemeToggle()}>Light</Button>
          </div>
        </SettingRow>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Notifications</h3>
        <SettingRow icon={<Bell size={16} />} title="Email Notifications" description="Receive email alerts for important events">
          <Toggle checked={notifications.email} onChange={(v) => setNotifications(n => ({ ...n, email: v }))} />
        </SettingRow>
        <SettingRow icon={<Bell size={16} />} title="Push Notifications" description="Receive browser push notifications">
          <Toggle checked={notifications.push} onChange={(v) => setNotifications(n => ({ ...n, push: v }))} />
        </SettingRow>
        <SettingRow icon={<Bell size={16} />} title="Payment Alerts" description="Get notified about payment activities">
          <Toggle checked={notifications.payments} onChange={(v) => setNotifications(n => ({ ...n, payments: v }))} />
        </SettingRow>
        <SettingRow icon={<Shield size={16} />} title="Security Alerts" description="Be notified of suspicious activity">
          <Toggle checked={notifications.security} onChange={(v) => setNotifications(n => ({ ...n, security: v }))} />
        </SettingRow>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Account Info</h3>
        <SettingRow icon={<Globe size={16} />} title="Tenant" description="Your organization">
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0.3rem 0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>{user?.tenantName || 'Default'}</span>
        </SettingRow>
        <SettingRow icon={<Shield size={16} />} title="Plan" description="Your current subscription">
          <span className={`badge badge-primary`}>{user?.tenantPlan || 'free'}</span>
        </SettingRow>
      </div>

      <Button variant="primary" onClick={handleSave}>Save Settings</Button>
    </div>
  );
};

export default Settings;
