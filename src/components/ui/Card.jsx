// src/components/ui/Card.jsx
import React from 'react';

export const Card = ({ children, glass = false, className = '', header, footer, ...props }) => {
  const baseClasses = glass ? 'card-glass' : '';
  const defaultStyles = glass ? {} : {
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  return (
    <div className={`${baseClasses} ${className}`} style={{ ...defaultStyles, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} {...props}>
      {header && (
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border-color)', fontWeight: 600, flexShrink: 0 }}>
          {header}
        </div>
      )}
      <div style={{ padding: 'var(--space-4) var(--space-6)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
      {footer && (
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {footer}
        </div>
      )}
    </div>
  );
};
