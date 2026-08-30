// src/pages/KitchenPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowLeft, Utensils, Printer } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { useSocket } from '../hooks/useSocket';
import { useUiStore } from '../store/uiStore';
import { printKitchenTicket } from '../utils/printUtils';

// Sonido de timbre usando Web Audio API (no requiere archivo externo)
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
  } catch (e) {
    // Audio no disponible
  }
};

export const KitchenPage = () => {
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);
  const { socket } = useSocket();

  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const lastOrderIdsRef = React.useRef(new Set());
  const isFirstLoadRef = React.useRef(true);

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      // Obtener órdenes en cocina
      const allOrders = await api.get('/orders');
      const kitchenOrders = allOrders.filter(o => ['enviado_cocina', 'en_preparacion'].includes(o.status));
      
      // Detectar si hay nuevas comandas para sonar el timbre
      if (!isFirstLoadRef.current && !silent) {
        const currentIds = new Set(kitchenOrders.map(o => o.id));
        let hasNew = false;
        for (const o of kitchenOrders) {
          if (!lastOrderIdsRef.current.has(o.id)) {
            hasNew = true;
            break;
          }
        }
        if (hasNew) {
          playBellSound();
          addToast('¡Nueva comanda recibida en cocina!', 'info', 5000);
        }
        lastOrderIdsRef.current = currentIds;
      } else {
        lastOrderIdsRef.current = new Set(kitchenOrders.map(o => o.id));
        isFirstLoadRef.current = false;
      }

      setOrders(kitchenOrders);
    } catch (err) {
      console.error('Error al cargar comandas de cocina:', err);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders(true);

    // Actualizar estado 'now' cada 1 segundo exacto para el cronómetro activo en vivo
    const timer = setInterval(() => setNow(new Date()), 1000);

    // Auto-polling cada 5 segundos para actualización autónoma en cocina (compatible con Serverless)
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchOrders(false);
      }
    }, 5000);

    if (socket && typeof socket.on === 'function') {
      const handleNewTicket = () => {
        addToast('¡Nueva comanda enviada a cocina!', 'info');
        playBellSound();
        fetchOrders(false);
      };
      const handleUpdate = () => fetchOrders(true);

      const handleTicketReady = (data) => {
        const table = data.table_number || `Orden #${data.orderId}`;
        const summary = data.summary || '';
        addToast(`🔔 ¡Comanda Lista! — ${table}${summary ? ': ' + summary : ''}`, 'success', 8000);
        playBellSound();
        fetchOrders(false);
      };

      socket.on('kitchen:new-ticket', handleNewTicket);
      socket.on('order:updated', handleUpdate);
      socket.on('kitchen:ticket-ready', handleTicketReady);

      return () => {
        clearInterval(timer);
        clearInterval(pollInterval);
        socket.off('kitchen:new-ticket', handleNewTicket);
        socket.off('order:updated', handleUpdate);
        socket.off('kitchen:ticket-ready', handleTicketReady);
      };
    }

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [fetchOrders, addToast, socket]);

  // Formatear el tiempo transcurrido en vivo (Minutos y Segundos)
  const getElapsedFormatted = (createdAtStr) => {
    if (!createdAtStr) return '00m 00s';
    const isoStr = createdAtStr.includes('T') ? createdAtStr : createdAtStr.replace(' ', 'T') + 'Z';
    const created = new Date(isoStr).getTime();
    const current = now.getTime();
    const diffSec = Math.max(0, Math.floor((current - created) / 1000));

    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Determinar color de alerta según minutos de demora
  const getTimeColor = (createdAtStr) => {
    if (!createdAtStr) return 'var(--accent-primary)';
    const isoStr = createdAtStr.includes('T') ? createdAtStr : createdAtStr.replace(' ', 'T') + 'Z';
    const created = new Date(isoStr).getTime();
    const minutes = Math.floor((now.getTime() - created) / 60000);

    if (minutes < 10) return 'var(--accent-primary)';
    if (minutes < 20) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      // El backend se encarga de emitir kitchen:ticket-ready con datos enriquecidos
      if (newStatus !== 'lista') {
        addToast('Comanda en preparación', 'success');
      }
      await fetchOrders();
    } catch (err) {
      addToast('Error al actualizar comanda', 'danger');
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando comandas en cocina...</div>;
  }

  return (
    <div style={{ padding: 'var(--space-6)', height: '100vh', overflowY: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button variant="ghost" icon={<ArrowLeft size={20} />} onClick={() => navigate('/')}>
            Volver al Menú
          </Button>
          <h1 style={{ margin: 0, fontSize: 'var(--font-2xl)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Utensils size={28} color="var(--accent-primary)" /> Cocina (Comandas en Vivo)
          </h1>
        </div>

        <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>
          {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </header>

      {orders.length === 0 ? (
        <Card glass style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
          <h2>No hay comandas pendientes en cocina</h2>
          <p>Las órdenes enviadas por los meseros aparecerán aquí automáticamente en tiempo real con su cronómetro de preparación.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
          {orders.map(order => {
            const color = getTimeColor(order.created_at);
            const formattedTime = getElapsedFormatted(order.created_at);
            
            return (
              <Card key={order.id} style={{ borderTop: `6px solid ${color}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                  <div>
                    {order.order_type === 'delivery' ? (
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#06b6d4', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 900, marginBottom: '4px' }}>
                          DOMICILIO
                        </div>
                        <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--text-primary)' }}>
                          Orden #{order.id} {order.customer_name ? `— ${order.customer_name}` : ''}
                        </h2>
                      </div>
                    ) : order.order_type === 'para_llevar' ? (
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 900, marginBottom: '4px' }}>
                          PARA LLEVAR
                        </div>
                        <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--text-primary)' }}>
                          Orden #{order.id} {order.customer_name ? `— ${order.customer_name}` : ''}
                        </h2>
                      </div>
                    ) : (
                      <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 900 }}>
                        Mesa {order.table_number || order.table_id || `#${order.id}`}
                      </h2>
                    )}
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Atendido por: {order.waiter_name || 'Personal'}</span>
                  </div>
                  
                  {/* Cronómetro en Tiempo Real Segundo a Segundo */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'var(--bg-secondary)', 
                    padding: '6px 12px', 
                    borderRadius: '8px',
                    color: color, 
                    fontWeight: 900, 
                    fontSize: '15px',
                    border: `1px solid ${color}`
                  }}>
                    <Clock size={18} />
                    <span>{formattedTime}</span>
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 0, listStyle: 'none' }}>
                    {(order.items || []).map((item, idx) => {
                      const rawMods = item.modifiers || item.modifiers_json;
                      let parsedMods = [];
                      if (rawMods) {
                        try {
                          parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                        } catch (e) {
                          parsedMods = Array.isArray(rawMods) ? rawMods : [];
                        }
                      }
                      return (
                        <li key={idx} style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-lg)' }}>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <span style={{ fontWeight: 800, minWidth: '28px', color: 'var(--accent-primary)' }}>{item.quantity}x</span>
                            <span style={{ fontWeight: 700 }}>{item.name}</span>
                          </div>
                          {Array.isArray(parsedMods) && parsedMods.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', paddingLeft: '40px' }}>
                              {parsedMods.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  🍨 {m.name} {m.quantity > 1 ? `(x${m.quantity})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <div style={{ marginTop: '4px', paddingLeft: '40px', color: 'var(--accent-warning)', fontSize: '13px', fontWeight: 600, fontStyle: 'italic' }}>
                              * NOTA: {item.notes}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Printer size={15} />}
                    onClick={() => printKitchenTicket(order, order.items || [], {}, '80mm')}
                    style={{ flexShrink: 0 }}
                    title="Imprimir Comanda Térmica"
                  >
                    Imprimir
                  </Button>
                  {order.status === 'enviado_cocina' ? (
                    <Button variant="primary" style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 700 }} onClick={() => handleUpdateStatus(order.id, 'en_preparacion')}>
                      Iniciar Preparación
                    </Button>
                  ) : (
                    <Button variant="success" style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 700, background: 'var(--accent-primary)', color: 'white' }} onClick={() => handleUpdateStatus(order.id, 'lista')} icon={<CheckCircle size={18} />}>
                      Marcar Como Listo
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
