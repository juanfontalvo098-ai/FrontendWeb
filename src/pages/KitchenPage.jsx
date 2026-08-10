// src/pages/KitchenPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowLeft, Utensils } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';
import { getSocket } from '../api/socket';
import { useUiStore } from '../store/uiStore';

export const KitchenPage = () => {
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);

  const [orders, setOrders] = useState([]);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      // Obtener órdenes en cocina
      const allOrders = await api.get('/orders');
      const kitchenOrders = allOrders.filter(o => ['enviado_cocina', 'en_preparacion'].includes(o.status));
      setOrders(kitchenOrders);
    } catch (err) {
      console.error('Error al cargar comandas de cocina:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Actualizar estado 'now' cada 1 segundo exacto para el cronómetro activo en vivo
    const timer = setInterval(() => setNow(new Date()), 1000);

    const socket = getSocket();
    if (socket) {
      const handleNewTicket = () => {
        addToast('¡Nueva comanda enviada a cocina!', 'info');
        fetchOrders();
      };
      const handleUpdate = () => fetchOrders();

      socket.on('kitchen:new-ticket', handleNewTicket);
      socket.on('order:updated', handleUpdate);

      return () => {
        socket.off('kitchen:new-ticket', handleNewTicket);
        socket.off('order:updated', handleUpdate);
      };
    }

    return () => clearInterval(timer);
  }, []);

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
      const socket = getSocket();
      if (socket) {
        socket.emit('kitchen:update-status', { orderId, status: newStatus });
        if (newStatus === 'lista') {
          socket.emit('kitchen:ticket-ready', { orderId });
        }
      }
      addToast(newStatus === 'lista' ? 'Comanda marcada como lista' : 'Comanda en preparación', 'success');
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 'var(--font-xl)', fontWeight: 800 }}>{order.table_number || `Mesa ${order.table_id}`}</h2>
                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Atendido por: {order.waiter_name || 'Mesero'}</span>
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
                    {(order.items || []).map((item, idx) => (
                      <li key={idx} style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-lg)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontWeight: 800, minWidth: '28px', color: 'var(--accent-primary)' }}>{item.quantity}x</span>
                          <span style={{ fontWeight: 700 }}>{item.name}</span>
                        </div>
                        {item.notes && (
                          <div style={{ marginTop: '4px', paddingLeft: '40px', color: 'var(--accent-warning)', fontSize: '13px', fontWeight: 600, fontStyle: 'italic' }}>
                            * NOTA: {item.notes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-2)' }}>
                  {order.status === 'enviado_cocina' ? (
                    <Button variant="primary" style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700 }} onClick={() => handleUpdateStatus(order.id, 'en_preparacion')}>
                      Iniciar Preparación
                    </Button>
                  ) : (
                    <Button variant="success" style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 700, background: 'var(--accent-primary)', color: 'white' }} onClick={() => handleUpdateStatus(order.id, 'lista')} icon={<CheckCircle size={20} />}>
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
