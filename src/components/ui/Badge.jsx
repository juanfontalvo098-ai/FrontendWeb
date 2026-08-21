// src/components/ui/Badge.jsx
import React from 'react';

export const Badge = ({ children, variant = 'info', className = '', style = {} }) => {
  let colorStyle = {};
  switch (variant) {
    case 'success':
      colorStyle = {
        backgroundColor: 'var(--badge-success-bg, rgba(16, 185, 129, 0.15))',
        color: 'var(--badge-success-text, var(--accent-success))',
        border: '1px solid var(--badge-success-border, rgba(16, 185, 129, 0.3))'
      };
      break;
    case 'warning':
      colorStyle = {
        backgroundColor: 'var(--badge-warning-bg, rgba(245, 158, 11, 0.15))',
        color: 'var(--badge-warning-text, var(--accent-warning))',
        border: '1px solid var(--badge-warning-border, rgba(245, 158, 11, 0.3))'
      };
      break;
    case 'danger':
      colorStyle = {
        backgroundColor: 'var(--badge-danger-bg, rgba(239, 68, 68, 0.15))',
        color: 'var(--badge-danger-text, var(--accent-danger))',
        border: '1px solid var(--badge-danger-border, rgba(239, 68, 68, 0.3))'
      };
      break;
    default: // info / primary
      colorStyle = {
        backgroundColor: 'var(--badge-info-bg, rgba(99, 102, 241, 0.15))',
        color: 'var(--badge-info-text, var(--accent-primary))',
        border: '1px solid var(--badge-info-border, rgba(99, 102, 241, 0.3))'
      };
  }

  return (
    <span 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        ...colorStyle,
        ...style
      }}
      className={className}
    >
      {children}
    </span>
  );
};
