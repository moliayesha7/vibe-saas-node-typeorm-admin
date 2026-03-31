import React from 'react';
import './Loader.css';

export const Spinner = ({ size = 'md', color = 'primary' }) => (
  <div className={`spinner spinner--${size} spinner--${color}`} role="status" aria-label="Loading">
    <div className="spinner__inner" />
  </div>
);

export const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader__content">
      <Spinner size="lg" />
      <p>Loading...</p>
    </div>
  </div>
);

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="skeleton-table">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton-table__row">
        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
        <div className="skeleton-table__cells">
          <div className="skeleton" style={{ width: '60%', height: '14px' }} />
          <div className="skeleton" style={{ width: '40%', height: '12px' }} />
        </div>
        <div className="skeleton" style={{ width: '80px', height: '24px' }} />
      </div>
    ))}
  </div>
);

export default Spinner;
