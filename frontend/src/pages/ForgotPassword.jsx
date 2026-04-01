import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useForgotPasswordMutation } from '../store/api/authApi';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';
import '../components/auth/AuthForms.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await forgotPassword({ email }).unwrap();
      setSent(true);
      toast.success('Reset link sent! Check your email.');
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to send reset email');
    }
  };

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
          <h1>Forgot password</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        {sent ? (
          <div style={{
            padding: '1.25rem',
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: 'var(--radius)',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
          }}>
            Check <strong>{email}</strong> for a password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" variant="primary" loading={isLoading} style={{ width: '100%' }}>
              Send reset link
            </Button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
