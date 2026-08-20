// src/components/common/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          maxWidth: '600px',
          margin: '40px auto',
          background: 'var(--bg-elevated, #161b26)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#ef4444'
          }}>
            <AlertTriangle size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #fff)', marginBottom: '8px' }}>
            Ocurrió un problema al cargar esta vista
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #94a3b8)', marginBottom: '20px', lineHeight: 1.5 }}>
            {this.state.error?.message || 'Error inesperado en el componente.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <Button
              variant="primary"
              onClick={this.handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={15} /> Recargar Vista
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
