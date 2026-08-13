// src/components/layout/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Check, Trash2, Store, MapPin, ChevronDown } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import { getSocket } from '../../api/socket';
import { useAuth } from '../../hooks/useAuth';

export const Header = ({ title = '' }) => {
  const toggleSidebar = useUiStore(state => state.toggleSidebar);
  const addToast = useUiStore(state => state.addToast);
  const { user, branches, activeBranchId, activeBranch, switchBranch, isGlobalAdmin } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [cashOpen, setCashOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // Sistema de Notificaciones
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Estado del Turno', message: 'Sistema listo para operar', time: 'Ahora', type: 'info', read: false },
  ]);

  const popoverRef = useRef(null);
  const branchRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSettingsAndStatus = () => {
    api.get('/settings')
      .then(res => {
        if (res?.business_name) {
          setBusinessName(res.business_name);
        }
      })
      .catch(() => {});

    api.get('/cash/current')
      .then(res => setCashOpen(!!res))
      .catch(() => setCashOpen(false));
  };

  const playBellSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const frequencies = [830, 1050, 830];
      const duration = 0.15;
      const gap = 0.08;

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = ctx.currentTime + i * (duration + gap);
        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      });
    } catch (e) {}
  };

  useEffect(() => {
    fetchSettingsAndStatus();

    const socket = getSocket();
    if (socket) {
      const handleTicket = (data) => {
        addNotification({
          title: 'Comanda en Cocina',
          message: `Nuevo ticket enviado para Mesa ${data.table_number || ''}`,
          type: 'info'
        });
      };

      const handleTableChange = (data) => {
        if (data.status === 'pendiente_pago') {
          addNotification({
            title: 'Mesa Solicitó Cuenta',
            message: `La Mesa #${data.table_id} requiere cobro en caja`,
            type: 'warning'
          });
        }
      };

      const handleTicketReady = (data) => {
        const table = data.table_number || `Orden #${data.orderId}`;
        const summary = data.summary || '';
        addNotification({
          title: `🔔 ¡Comanda Lista! — ${table}`,
          message: summary ? `Pedido: ${summary}` : 'La comanda está lista para servir',
          type: 'success'
        });
        addToast(`🔔 ¡Comanda Lista! — ${table}${summary ? ': ' + summary : ''}`, 'success', 8000);
        playBellSound();
      };

      socket.on('kitchen:new-ticket', handleTicket);
      socket.on('table:status-changed', handleTableChange);
      socket.on('kitchen:ticket-ready', handleTicketReady);

      return () => {
        socket.off('kitchen:new-ticket', handleTicket);
        socket.off('table:status-changed', handleTableChange);
        socket.off('kitchen:ticket-ready', handleTicketReady);
      };
    }
  }, [activeBranchId]);

  // Cerrar emergentes al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addNotification = (notif) => {
    const timeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [
      { id: Date.now(), time: timeStr, read: false, ...notif },
      ...prev.slice(0, 15)
    ]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const displayName = businessName || user?.businessName || 'GastrosPOS Enterprise';
  const showBranchSelector = branches.length > 1 || isGlobalAdmin();

  return (
    <header className="header" style={{ position: 'relative', minHeight: '64px', height: 'auto', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px' }}>
      {/* Bloque Izquierdo: Hamburguesa + Nombre + Selector de Sucursal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button 
          onClick={toggleSidebar}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', flexShrink: 0 }}
        >
          <Menu size={24} />
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', margin: 0, fontWeight: 800, lineHeight: '1.2', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={18} color="var(--accent-secondary)" /> {displayName}
          </h2>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap' }}>
            {formatDate(currentTime)} {title ? ` • ${title}` : ''}
          </div>
        </div>
      </div>

      {/* Bloque Centro / Derecho: Selector de Sucursal + Estado de Caja + Notificaciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        
        {/* SELECTOR DE SUCURSAL MULTI-TENANT */}
        {showBranchSelector && (
          <div style={{ position: 'relative' }} ref={branchRef}>
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              <MapPin size={14} color="var(--accent-primary)" />
              <span>{activeBranch ? activeBranch.name : 'Todas las sucursales'}</span>
              <ChevronDown size={14} />
            </button>

            {branchDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '38px',
                right: 0,
                minWidth: '200px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                zIndex: 9999,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  SUCURSALES DISPONIBLES
                </div>
                {branches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setBranchDropdownOpen(false);
                      switchBranch(b.id);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      background: b.id === activeBranchId ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: b.id === activeBranchId ? 'var(--accent-primary)' : 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: b.id === activeBranchId ? 700 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{b.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{b.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Caja:</span>
          <Badge variant={cashOpen ? 'success' : 'danger'}>{cashOpen ? 'Abierta' : 'Cerrada'}</Badge>
        </div>

        {/* NOTIFICACIONES */}
        <div style={{ position: 'relative' }} ref={popoverRef}>
          <button 
            onClick={() => setPopoverOpen(!popoverOpen)}
            style={{ 
              position: 'relative', 
              background: 'var(--bg-elevated)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '50%', 
              width: '38px', 
              height: '38px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--text-primary)', 
              cursor: 'pointer'
            }}
            title="Centro de Notificaciones"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-2px', 
                right: '-2px', 
                background: 'var(--accent-danger)', 
                color: 'white', 
                fontSize: '10px', 
                fontWeight: 800, 
                borderRadius: '999px', 
                padding: '2px 5px',
                lineHeight: 1
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {popoverOpen && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: '320px',
              maxHeight: '400px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={15} color="var(--accent-primary)" /> Notificaciones ({notifications.length})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <Check size={16} />
                  </button>
                  <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay notificaciones recientes
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      style={{
                        padding: '10px 12px',
                        marginBottom: '6px',
                        borderRadius: 'var(--radius-md)',
                        background: n.read ? 'var(--bg-secondary)' : n.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                        borderLeft: `4px solid ${n.type === 'warning' ? 'var(--accent-warning)' : n.type === 'success' ? '#22c55e' : 'var(--accent-primary)'}`,
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2px' }}>
                        <span>{n.title}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{n.time}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
