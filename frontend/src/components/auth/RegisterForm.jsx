import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useRegisterMutation } from '../../store/api/authApi';
import Button from '../common/Button';
import toast from 'react-hot-toast';

const schema = yup.object({
  firstName: yup.string().min(2).max(50).required('First name is required'),
  lastName: yup.string().min(2).max(50).required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string()
    .min(8, 'Min 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number')
    .required('Password is required'),
  tenantName: yup.string().min(2).max(100).optional(),
});

const RegisterForm = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();

  const { register: reg, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    try {
      await register(data).unwrap();
      toast.success('Account created successfully!');
      onSuccess?.();
    } catch (err) {
      toast.error(err?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">First Name</label>
          <input type="text" placeholder="John" {...reg('firstName')} className={errors.firstName ? 'input-error' : ''} />
          {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Last Name</label>
          <input type="text" placeholder="Doe" {...reg('lastName')} className={errors.lastName ? 'input-error' : ''} />
          {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input type="email" placeholder="john@company.com" {...reg('email')} className={errors.email ? 'input-error' : ''} />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="input-password-wrapper">
          <input type={showPassword ? 'text' : 'password'} placeholder="Create a strong password" {...reg('password')} className={errors.password ? 'input-error' : ''} />
          <button type="button" className="input-password-toggle" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="form-error">{errors.password.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Company / Organization <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
        <input type="text" placeholder="Acme Corp" {...reg('tenantName')} />
      </div>

      <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading} icon={<UserPlus size={16} />}>
        Create Account
      </Button>
    </form>
  );
};

export default RegisterForm;
