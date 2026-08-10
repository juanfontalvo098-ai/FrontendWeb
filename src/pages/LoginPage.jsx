// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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
      await login(username, password);
      navigate('/');
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
      background: 'radial-gradient(circle at top right, var(--bg-elevated), var(--bg-primary))',
      padding: 'var(--space-4)'
    }}>
      <Card glass style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--accent-primary)', width: '64px', height: '64px',
            borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)',
            boxShadow: '0 8px 16px hsla(142, 71%, 45%, 0.3)'
          }}>
            <UtensilsCrossed size={32} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
            JF <span style={{ color: 'var(--accent-secondary)' }}>POS</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '13px', fontStyle: 'italic' }}>
            Control total. Operación impecable.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <Input 
            icon={<User size={18} />}
            placeholder="Usuario (ej. admin)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Input 
            icon={<Lock size={18} />}
            type="password"
            placeholder="Contraseña (ej. admin)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && (
            <div style={{ color: 'var(--accent-danger)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-4)', textAlign: 'center', background: 'hsla(0, 84%, 60%, 0.1)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            Iniciar Sesión
          </Button>
        </form>
      </Card>
    </div>
  );
};
