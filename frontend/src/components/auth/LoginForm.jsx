import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useLoginMutation } from '../../store/api/authApi';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import './AuthForms.css';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

const LoginForm = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await login(data).unwrap();
      toast.success('Welcome back!');
      onSuccess?.();
    } catch (err) {
      toast.error(err?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input
          type="email"
          placeholder="admin@example.com"
          {...register('email')}
          className={errors.email ? 'input-error' : ''}
          autoComplete="email"
        />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="input-password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Your password"
            {...register('password')}
            className={errors.password ? 'input-error' : ''}
            autoComplete="current-password"
          />
          <button type="button" className="input-password-toggle" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <span className="form-error">{errors.password.message}</span>}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        icon={<LogIn size={16} />}
      >
        Sign In
      </Button>
    </form>
  );
};

export default LoginForm;
