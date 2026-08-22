// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUiStore } from '../store/uiStore';
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
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  const isDark = theme !== 'light';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
      background: isDark
        ? 'radial-gradient(ellipse at top, #1E1B4B 0%, #111827 45%, #0B0F19 100%)'
        : 'radial-gradient(ellipse at top, #EEF2FF 0%, #F8FAFC 45%, #E2E8F0 100%)',
      padding: 'var(--space-4)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'background 0.35s ease'
    }}>
      {/* Botón flotante para alternar Modo Claro / Oscuro */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Cambiar Tema"
        title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '999px',
          background: isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(99, 102, 241, 0.25)',
          color: isDark ? '#F8FAFC' : '#1E293B',
          boxShadow: isDark ? '0 4px 15px rgba(0, 0, 0, 0.4)' : '0 4px 15px rgba(99, 102, 241, 0.12)',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all 0.25s ease'
        }}
      >
        {isDark ? (
          <>
            <Sun size={15} color="#FBBF24" />
            <span>Modo Claro</span>
          </>
        ) : (
          <>
            <Moon size={15} color="#6366F1" />
            <span>Modo Oscuro</span>
          </>
        )}
      </button>

      {/* Luces de Ambiente / Glows Eléctricos de Fondo */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '450px',
        height: '450px',
        background: isDark
          ? 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%)'
          : 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.06) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: isDark
          ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 70%)'
          : 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />

      <Card
        glass
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 32px',
          border: isDark
            ? '1px solid rgba(139, 92, 246, 0.25)'
            : '1px solid rgba(99, 102, 241, 0.18)',
          boxShadow: isDark
            ? '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.15)'
            : '0 20px 50px -10px rgba(99, 102, 241, 0.15), 0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          zIndex: 10,
          background: isDark
            ? 'rgba(17, 24, 39, 0.88)'
            : 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
        }}
      >
        {/* Cabecera con Logotipo Oficial KAMIA by JF */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <KamiaLogo variant="stacked" size="xl" showSlogan={true} />
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '12px',
            color: isDark ? 'var(--text-muted)' : '#64748B',
            fontSize: '11px',
            fontWeight: 500
          }}>
            <ShieldCheck size={14} color={isDark ? 'var(--accent-secondary)' : '#6366F1'} />
            <span>Acceso Seguro al Sistema Operativo</span>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '11.5px',
              fontWeight: 600,
              color: isDark ? 'var(--text-secondary)' : '#334155',
              marginBottom: '6px'
            }}>
              Usuario
            </label>
            <Input 
              icon={<User size={17} color={isDark ? 'var(--accent-primary)' : '#4F46E5'} />}
              placeholder="Ingresa tu usuario (ej. admin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '11.5px',
              fontWeight: 600,
              color: isDark ? 'var(--text-secondary)' : '#334155',
              marginBottom: '6px'
            }}>
              Contraseña
            </label>
            <Input 
              icon={<Lock size={17} color={isDark ? 'var(--accent-primary)' : '#4F46E5'} />}
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
              color: isDark ? '#F87171' : '#DC2626',
              fontSize: '12px',
              marginBottom: '16px',
              textAlign: 'center',
              background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(254, 242, 242, 0.95)',
              border: isDark ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
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
              boxShadow: isDark
                ? '0 4px 18px rgba(99, 102, 241, 0.4)'
                : '0 4px 16px rgba(99, 102, 241, 0.3)',
              color: '#FFFFFF'
            }}
          >
            Iniciar Sesión
          </Button>
        </form>

        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          borderTop: isDark ? '1px solid var(--border-color)' : '1px solid rgba(15, 23, 42, 0.08)',
          paddingTop: '16px'
        }}>
          <span style={{ fontSize: '10.5px', color: isDark ? 'var(--text-muted)' : '#64748B' }}>
            KAMIA Platform · Diseñado para operar con máxima precisión
          </span>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
