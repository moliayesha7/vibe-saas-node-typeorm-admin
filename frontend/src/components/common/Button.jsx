import React from 'react';
import clsx from 'clsx';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  onClick,
  type = 'button',
  className,
  ...rest
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx('btn', `btn-${variant}`, `btn-${size}`, { 'btn-full': fullWidth, 'btn-loading': loading }, className)}
      {...rest}
    >
      {loading && <span className="btn-spinner animate-spin" />}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="btn-icon">{iconRight}</span>}
    </button>
  );
};

export default Button;
