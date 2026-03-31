import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import RegisterForm from '../components/auth/RegisterForm';
import '../components/auth/AuthForms.css';

const Register = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon"><Shield size={24} /></div>
            <span className="auth-logo-text">SaaS Admin</span>
          </div>
          <h1>Create your account</h1>
          <p>Start managing your SaaS business today</p>
        </div>

        <RegisterForm onSuccess={() => navigate('/dashboard')} />

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
