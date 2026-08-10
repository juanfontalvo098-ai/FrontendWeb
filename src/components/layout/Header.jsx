// src/components/layout/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Clock, Store } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import { getSocket } from '../../api/socket';

export const Header = ({ title = '' }) => {
  const toggleSidebar = useUiStore(state => state.toggleSidebar);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cashOpen, setCashOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  
  // Sistema de Notificaciones
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Estado del Turno', message: 'Sistema listo para operar', time: 'Ahora', type: 'info', read: false },
  ]);

  const popoverRef = useRef(null);

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

      socket.on('kitchen:new-ticket', handleTicket);
      socket.on('table:status-changed', handleTableChange);

      return () => {
        socket.off('kitchen:new-ticket', handleTicket);
        socket.off('table:status-changed', handleTableChange);
      };
    }
  }, []);

  // Cerrar emergente si se hace clic afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  const addNotification = (notif) => {
    const timeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => [
      { id: Date.now(), time: timeStr, read: false, ...notif },
      ...prev.slice(0, 15)
    ]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const displayName = businessName || 'JF POS Enterprise';

  return (
    <header className="header" style={{ position: 'relative', minHeight: '64px', height: 'auto', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px' }}>
      {/* Bloque Izquierdo: Menú Hamburguesa + Nombre del Negocio + Módulo y Hora en Segunda Línea */}
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

      {/* Bloque Derecho: Estado de Caja + Notificaciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Caja:</span>
          <Badge variant={cashOpen ? 'success' : 'danger'}>{cashOpen ? 'Abierta' : 'Cerrada'}</Badge>
        </div>

        {/* BOTÓN E INTERFAZ DE NOTIFICACIONES */}
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
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
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
                lineHeight: 1,
                boxShadow: '0 0 6px rgba(225, 29, 72, 0.5)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* POPOVER PANEL DE NOTIFICACIONES */}
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
                  <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }} title="Marcar leídas">
                    <Check size={16} />
                  </button>
                  <button onClick={handleClearNotifications} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '12px' }} title="Limpiar">
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
                        background: n.read ? 'var(--bg-secondary)' : 'rgba(99, 102, 241, 0.12)',
                        borderLeft: `4px solid ${n.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-primary)'}`,
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: '2px' }}>
                        <span>{n.title}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{n.time}</span>
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
