// src/components/ui/Badge.jsx
import React from 'react';

export const Badge = ({ children, variant = 'info', className = '' }) => {
  let colorStyle = {};
  switch (variant) {
    case 'success':
      colorStyle = { backgroundColor: 'hsla(142, 71%, 45%, 0.15)', color: 'hsl(142, 71%, 55%)', border: '1px solid hsla(142, 71%, 45%, 0.3)' };
      break;
    case 'warning':
      colorStyle = { backgroundColor: 'hsla(38, 92%, 50%, 0.15)', color: 'hsl(38, 92%, 60%)', border: '1px solid hsla(38, 92%, 50%, 0.3)' };
      break;
    case 'danger':
      colorStyle = { backgroundColor: 'hsla(0, 84%, 60%, 0.15)', color: 'hsl(0, 84%, 70%)', border: '1px solid hsla(0, 84%, 60%, 0.3)' };
      break;
    default: // info
      colorStyle = { backgroundColor: 'hsla(199, 89%, 48%, 0.15)', color: 'hsl(199, 89%, 60%)', border: '1px solid hsla(199, 89%, 48%, 0.3)' };
  }

  return (
    <span 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        ...colorStyle
      }}
      className={className}
    >
      {children}
    </span>
  );
};
