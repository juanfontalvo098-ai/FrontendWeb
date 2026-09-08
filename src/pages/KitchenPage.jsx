// src/pages/KitchenPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const [tickets, setTickets] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const lastTicketIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchTickets = useCallback(async (silent = false) => {
    try {
      // Obtener tickets activos de comanda (filtrados por ronda/comanda individual)
      const activeTickets = await api.get('/orders/kitchen-tickets');
      const list = Array.isArray(activeTickets) ? activeTickets : [];

      // Detectar si hay nuevas comandas para sonar el timbre
      if (!isFirstLoadRef.current && !silent) {
        const currentIds = new Set(list.map(t => t.id));
        let hasNew = false;
        for (const t of list) {
          if (!lastTicketIdsRef.current.has(t.id)) {
            hasNew = true;
            break;
          }
        }
        if (hasNew) {
          playBellSound();
          addToast('¡Nueva comanda recibida en cocina!', 'info', 5000);
        }
        lastTicketIdsRef.current = currentIds;
      } else {
        lastTicketIdsRef.current = new Set(list.map(t => t.id));
        isFirstLoadRef.current = false;
      }

      setTickets(list);
    } catch (err) {
      console.error('Error al cargar comandas de cocina:', err);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTickets(true);

    // Actualizar estado 'now' cada 1 segundo exacto para el cronómetro activo en vivo
    const timer = setInterval(() => setNow(new Date()), 1000);

    // Auto-polling cada 4 segundos para actualización autónoma en cocina (compatible con Serverless)
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchTickets(false);
      }
    }, 4000);

    if (socket && typeof socket.on === 'function') {
      const handleNewTicket = () => {
        addToast('¡Nueva comanda enviada a cocina!', 'info');
        playBellSound();
        fetchTickets(false);
      };
      const handleUpdate = () => fetchTickets(true);

      const handleTicketReady = (data) => {
        const table = data.table_number || `Comanda #${data.ticketId || data.orderId}`;
        const summary = data.summary || '';
        addToast(`🔔 ¡Comanda Lista! — ${table}${summary ? ': ' + summary : ''}`, 'success', 8000);
        playBellSound();
        fetchTickets(false);
      };

      socket.on('kitchen:new-ticket', handleNewTicket);
      socket.on('kitchen:update-status', handleUpdate);
      socket.on('order:updated', handleUpdate);
      socket.on('kitchen:ticket-ready', handleTicketReady);

      return () => {
        clearInterval(timer);
        clearInterval(pollInterval);
        socket.off('kitchen:new-ticket', handleNewTicket);
        socket.off('kitchen:update-status', handleUpdate);
        socket.off('order:updated', handleUpdate);
        socket.off('kitchen:ticket-ready', handleTicketReady);
      };
    }

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [fetchTickets, addToast, socket]);

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

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      await api.put(`/orders/kitchen-tickets/${ticketId}/status`, { status: newStatus });
      if (newStatus === 'en_preparacion') {
        addToast('Comanda en preparación', 'success');
      } else if (newStatus === 'lista') {
        addToast('¡Comanda lista!', 'success');
      }
      await fetchTickets(true);
    } catch (err) {
      addToast(err.message || 'Error al actualizar comanda', 'danger');
    }
  };

  const handlePrintTicket = (ticket) => {
    const tableClean = ticket.table_number || (ticket.order_type === 'delivery' ? 'Domicilio' : 'Para Llevar');
    const orderObj = {
      id: ticket.order_id,
      ticket_id: ticket.id,
      table_number: tableClean,
      order_type: ticket.order_type || 'mesa',
      waiter_name: ticket.waiter_name || 'Personal',
      customer_name: ticket.customer_name || '',
      delivery_address: ticket.delivery_address || '',
      delivery_phone: ticket.delivery_phone || '',
      notes: ticket.order_notes || ticket.notes || '',
      created_at: ticket.created_at
    };
    printKitchenTicket(orderObj, ticket.items || [], orderObj.notes, orderObj.waiter_name, {}, '80mm');
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

      {tickets.length === 0 ? (
        <Card glass style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
          <h2>No hay comandas pendientes en cocina</h2>
          <p>Las órdenes y nuevas rondas enviadas por los meseros aparecerán aquí automáticamente en tiempo real con su cronómetro de preparación.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
          {tickets.map(ticket => {
            const color = getTimeColor(ticket.created_at);
            const formattedTime = getElapsedFormatted(ticket.created_at);
            const tableDisplay = ticket.table_number || (ticket.order_table_number ? `Mesa ${ticket.order_table_number}` : `Orden #${ticket.order_id}`);

            return (
              <Card key={ticket.id} style={{ borderTop: `6px solid ${color}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--accent-primary)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 900,
                        border: '1px solid var(--border-color)'
                      }}>
                        Comanda #{ticket.id}
                      </span>
                      {ticket.order_type === 'delivery' ? (
                        <span style={{ background: '#06b6d4', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 900 }}>
                          DOMICILIO
                        </span>
                      ) : ticket.order_type === 'para_llevar' ? (
                        <span style={{ background: '#8b5cf6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 900 }}>
                          PARA LLEVAR
                        </span>
                      ) : null}
                    </div>

                    <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 900, color: 'var(--text-primary)' }}>
                      {tableDisplay}
                    </h2>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Atendido por: <strong style={{ color: 'var(--text-primary)' }}>{ticket.waiter_name || 'Personal'}</strong>
                      {ticket.order_id && ` • Orden #${ticket.order_id}`}
                      {ticket.customer_name && ` (${ticket.customer_name})`}
                    </div>
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
                    {(ticket.items || []).map((item, idx) => {
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
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, minWidth: '28px', color: 'var(--accent-primary)', fontSize: '18px' }}>
                              {item.quantity}x
                            </span>
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
                                  🍨 {m.name || m} {m.quantity > 1 ? `(x${m.quantity})` : ''}
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

                  {(ticket.order_notes || ticket.notes) && (
                    <div style={{
                      marginTop: 'var(--space-3)',
                      padding: '8px 12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderLeft: '3px solid var(--accent-warning)',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: 'var(--text-primary)'
                    }}>
                      <strong style={{ color: 'var(--accent-warning)' }}>Nota general comanda:</strong> {ticket.order_notes || ticket.notes}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Printer size={15} />}
                    onClick={() => handlePrintTicket(ticket)}
                    style={{ flexShrink: 0 }}
                    title="Imprimir Comanda Térmica"
                  >
                    Imprimir
                  </Button>
                  {ticket.status === 'pendiente' ? (
                    <Button
                      variant="primary"
                      style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 700 }}
                      onClick={() => handleUpdateTicketStatus(ticket.id, 'en_preparacion')}
                    >
                      Iniciar Preparación
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      style={{ width: '100%', padding: '10px', fontSize: '14px', fontWeight: 700, background: 'var(--accent-primary)', color: 'white' }}
                      onClick={() => handleUpdateTicketStatus(ticket.id, 'lista')}
                      icon={<CheckCircle size={18} />}
                    >
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
