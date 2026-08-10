// src/components/ui/Input.jsx
import React from 'react';

export const Input = ({ label, error, icon, className = '', style: customStyle, ...props }) => {
  return (
    <div style={{ marginBottom: 'var(--space-4)', ...customStyle }} className={className}>
      {label && (
        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', zIndex: 2, pointerEvents: 'none' }}>
            {icon}
          </div>
        )}
        <input 
          className="input" 
          style={{ 
            paddingLeft: icon ? '44px' : '16px', 
            borderColor: error ? 'var(--accent-danger)' : undefined 
          }}
          {...props} 
        />
      </div>
      {error && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--font-xs)', marginTop: 'var(--space-1)', display: 'block' }}>{error}</span>}
    </div>
  );
};

export const Select = ({ label, error, options = [], className = '', style: customStyle, ...props }) => {
  return (
    <div style={{ marginBottom: 'var(--space-4)', ...customStyle }} className={className}>
      {label && (
        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <select className="select" style={{ borderColor: error ? 'var(--accent-danger)' : undefined }} {...props}>
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--font-xs)', marginTop: 'var(--space-1)', display: 'block' }}>{error}</span>}
    </div>
  );
};

export const Textarea = ({ label, error, className = '', style: customStyle, ...props }) => {
  return (
    <div style={{ marginBottom: 'var(--space-4)', ...customStyle }} className={className}>
      {label && (
        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea className="textarea" style={{ borderColor: error ? 'var(--accent-danger)' : undefined, minHeight: '100px', resize: 'vertical' }} {...props} />
      {error && <span style={{ color: 'var(--accent-danger)', fontSize: 'var(--font-xs)', marginTop: 'var(--space-1)', display: 'block' }}>{error}</span>}
    </div>
  );
};
