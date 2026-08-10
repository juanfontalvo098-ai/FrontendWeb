// src/components/ui/Toast.jsx
import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const toasts = useUiStore(state => state.toasts);
  const removeToast = useUiStore(state => state.removeToast);

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  let Icon = Info;
  let color = 'var(--accent-secondary)';

  switch (toast.type) {
    case 'success': Icon = CheckCircle; color = 'var(--accent-primary)'; break;
    case 'warning': Icon = AlertTriangle; color = 'var(--accent-warning)'; break;
    case 'error': Icon = XCircle; color = 'var(--accent-danger)'; break;
    default: break;
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
      padding: '12px 16px', borderRadius: 'var(--radius-md)',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', minWidth: '300px',
      animation: 'slideUp 0.3s ease-out forwards',
      borderLeft: `4px solid ${color}`
    }}>
      <Icon color={color} size={20} />
      <span style={{ flex: 1, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>
  );
};
