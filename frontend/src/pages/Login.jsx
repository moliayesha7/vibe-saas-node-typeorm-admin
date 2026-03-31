import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';
import '../components/auth/AuthForms.css';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <Shield size={24} />
            </div>
            <span className="auth-logo-text">SaaS Admin</span>
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to your admin dashboard</p>
        </div>

        <LoginForm onSuccess={() => navigate('/dashboard')} />

        <div className="auth-forgot-link">
          <Link to="/forgot-password">Forgot your password?</Link>
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>

        {/* Demo credentials */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.875rem',
          background: 'rgba(var(--primary-rgb), 0.08)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--primary)' }}>Demo:</strong>{' '}
          admin@saas.com / Admin@123
        </div>
      </div>
    </div>
  );
};

export default Login;
