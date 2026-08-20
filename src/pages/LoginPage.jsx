// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { KamiaLogo } from '../components/common/KamiaLogo';
import { getFirstAllowedPath } from '../utils/navigationUtils';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const loggedUser = await login(username, password);
      const destination = getFirstAllowedPath(loggedUser);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #111827 45%, #0B0F19 100%)',
      padding: 'var(--space-4)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Luces de Ambiente / Glows Eléctricos de Fondo */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />

      <Card
        glass
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 32px',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.15)',
          position: 'relative',
          zIndex: 10,
          background: 'rgba(17, 24, 39, 0.88)'
        }}
      >
        {/* Cabecera con Logotipo Oficial KAMIA by JF */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <KamiaLogo variant="stacked" size="xl" showSlogan={true} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '12px', color: 'var(--text-muted)', fontSize: '11px' }}>
            <ShieldCheck size={14} color="var(--accent-secondary)" />
            <span>Acceso Seguro al Sistema Operativo</span>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Usuario
            </label>
            <Input 
              icon={<User size={17} color="var(--accent-primary)" />}
              placeholder="Ingresa tu usuario (ej. admin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Contraseña
            </label>
            <Input 
              icon={<Lock size={17} color="var(--accent-primary)" />}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
          </div>
          
          {error && (
            <div style={{
              color: '#F87171',
              fontSize: '12px',
              marginBottom: '16px',
              textAlign: 'center',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            icon={<ArrowRight size={16} />}
            style={{
              width: '100%',
              padding: '11px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.4)'
            }}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
            KAMIA Platform · Diseñado para operar con máxima precisión
          </span>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
