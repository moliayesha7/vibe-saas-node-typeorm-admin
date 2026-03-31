export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  viewer: 'Viewer',
};

export const ROLE_COLORS = {
  admin: 'badge-danger',
  manager: 'badge-warning',
  viewer: 'badge-info',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};

export const PAYMENT_STATUS_COLORS = {
  pending: 'badge-warning',
  completed: 'badge-success',
  failed: 'badge-danger',
  refunded: 'badge-info',
  cancelled: 'badge-danger',
};

export const TENANT_PLANS = ['free', 'starter', 'pro', 'enterprise'];

export const PLAN_COLORS = {
  free: 'badge-info',
  starter: 'badge-primary',
  pro: 'badge-warning',
  enterprise: 'badge-success',
};

export const CHART_COLORS = {
  primary: 'rgba(99, 102, 241, 1)',
  primaryAlpha: 'rgba(99, 102, 241, 0.2)',
  success: 'rgba(34, 197, 94, 1)',
  successAlpha: 'rgba(34, 197, 94, 0.2)',
  warning: 'rgba(245, 158, 11, 1)',
  danger: 'rgba(239, 68, 68, 1)',
  info: 'rgba(59, 130, 246, 1)',
  palette: [
    'rgba(99, 102, 241, 0.8)',
    'rgba(34, 197, 94, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(168, 85, 247, 0.8)',
  ],
};

export const SOCKET_EVENTS = {
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  PAYMENT_COMPLETED: 'payment:completed',
  PAYMENT_REFUNDED: 'payment:refunded',
  NOTIFICATION: 'notification',
};

export const PAGINATION_LIMITS = [10, 25, 50, 100];
