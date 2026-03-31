import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatCurrency = (amount, currency = 'BDT') => {
  if (amount == null) return '৳0.00';
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num) => {
  if (num == null) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

export const formatDate = (dateString, fmt = 'MMM dd, yyyy') => {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), fmt);
  } catch {
    return '-';
  }
};

export const formatDateTime = (dateString) => formatDate(dateString, 'MMM dd, yyyy HH:mm');

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return '-';
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const truncate = (str, length = 30) => {
  if (!str) return '';
  return str.length > length ? `${str.slice(0, length)}...` : str;
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getInitials = (firstName, lastName) => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

export const calcGrowth = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(1);
};
