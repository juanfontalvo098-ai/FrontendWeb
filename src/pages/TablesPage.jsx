// src/pages/TablesPage.jsx — Simplificada (Sólo Nombre / Número de Mesa)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { api } from '../api/client';
import { getSocket } from '../api/socket';
import { useUiStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';

export const TablesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToast = useUiStore((state) => state.addToast);

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Admin Mesa CRUD Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableNumber, setTableNumber] = useState('');
  const [status, setStatus] = useState('libre');

  const [submitting, setSubmitting] = useState(false);

  // Intervalo de 1 segundo para el cronómetro activo en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calcular tiempo transcurrido desde la apertura de la orden
  const calculateElapsed = (createdAt) => {
    if (!createdAt) return '00m 00s';
    const isoStr = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T') + 'Z';
    const start = new Date(isoStr).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - start) / 1000));

    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;

    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  const fetchTables = async () => {
    try {
      const data = await api.get('/tables');
      setTables(data);
    } catch (err) {
      console.error('Error al cargar mesas:', err);
      addToast('Error al cargar las mesas', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const socket = getSocket();
    if (socket) {
      const handleStatusChange = () => fetchTables();
      socket.on('table:status-changed', handleStatusChange);
      socket.on('order:updated', handleStatusChange);

      return () => {
        socket.off('table:status-changed', handleStatusChange);
        socket.off('order:updated', handleStatusChange);
      };
    }
  }, []);

  // Abrir mesa directamente (sin crear orden automática hasta que se guarde o envíe a cocina)
  const handleTableClick = (table) => {
    navigate(`/mesas/${table.id}/orden`);
  };

  // CRUD Mesas Admin
  const handleOpenNewTable = () => {
    setEditingTable(null);
    setTableNumber(`Mesa ${tables.length + 1}`);
    setStatus('libre');
    setIsAdminModalOpen(true);
  };

  const handleOpenEditTable = (e, table) => {
    e.stopPropagation();
    setEditingTable(table);
    setTableNumber(table.table_number);
    setStatus(table.status || 'libre');
    setIsAdminModalOpen(true);
  };

  const handleDeleteTable = async (e, table) => {
    e.stopPropagation();
    if (!window.confirm(`¿Seguro que deseas eliminar la ${table.table_number}?`)) return;
    try {
      await api.delete(`/tables/${table.id}`);
      addToast('Mesa eliminada', 'info');
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Error al eliminar mesa', 'danger');
    }
  };

  const handleSaveTable = async () => {
    if (!tableNumber) {
      addToast('Ingresa el nombre o número de la mesa', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        table_number: tableNumber,
        capacity: 4,
        zone: 'interior',
        status
      };

      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, payload);
        addToast('Mesa actualizada', 'success');
      } else {
        await api.post('/tables', payload);
        addToast('Nueva mesa creada', 'success');
      }
      setIsAdminModalOpen(false);
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Error al guardar la mesa', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ocupada': return 'var(--accent-warning)';
      case 'pendiente_pago': return 'var(--accent-danger)';
      default: return 'var(--accent-secondary)';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ocupada': return <Badge variant="warning">Ocupada</Badge>;
      case 'pendiente_pago': return <Badge variant="danger">Pendiente Pago</Badge>;
      default: return <Badge variant="success">Disponible</Badge>;
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando mapa de mesas...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--font-2xl)' }}>Mapa de Mesas</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
            Selecciona una mesa para tomar un pedido o realizar cobro
          </p>
        </div>

        {['super_admin', 'admin', 'gerente'].includes(user?.role) && (
          <Button size="md" icon={<Plus size={18} />} onClick={handleOpenNewTable}>
            Nueva Mesa
          </Button>
        )}
      </div>

      {/* Grid de Mesas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        {tables.map((table) => (
          <div
            key={table.id}
            onClick={() => handleTableClick(table)}
            style={{
              cursor: 'pointer',
              background: 'var(--bg-elevated)',
              border: `2px solid ${table.status === 'libre' ? 'var(--border-color)' : getStatusColor(table.status)}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.15s ease',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)'; }}
          >
            {/* Fila 1: Nombre de la Mesa y Acciones Admin */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {table.table_number || `Mesa ${table.id}`}
              </h3>
              
              {['super_admin', 'admin', 'gerente'].includes(user?.role) ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={(e) => handleOpenEditTable(e, table)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }} title="Editar Mesa">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDeleteTable(e, table)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', color: 'var(--accent-danger)', cursor: 'pointer', padding: '6px' }} title="Eliminar Mesa">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                getStatusBadge(table.status)
              )}
            </div>

            {/* Cronómetro en Tiempo Real para Mesas Ocupadas / En Consumo */}
            {table.current_order && table.status !== 'libre' && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: 'var(--accent-warning)', 
                padding: '6px 10px', 
                borderRadius: '6px', 
                fontSize: '12px', 
                fontWeight: 800 
              }}>
                <Clock size={14} />
                <span>Tiempo: {calculateElapsed(table.current_order.created_at)}</span>
              </div>
            )}

            {/* Fila Estado y Botón de Acción */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: getStatusColor(table.status), textTransform: 'capitalize' }}>
                {table.status === 'libre' ? '● Disponible' : table.status === 'ocupada' ? '● En consumo' : '● Por cobrar'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                <span>Abrir</span> <ArrowRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Admin Crear/Editar Mesa */}
      <Modal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} title={editingTable ? `Editar ${editingTable.table_number}` : 'Nueva Mesa'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input 
            label="Nombre / Número de Mesa" 
            value={tableNumber} 
            onChange={(e) => setTableNumber(e.target.value)} 
            placeholder="Ej. Mesa 1, Mesa VIP, Barra 2" 
          />

          {editingTable && (
            <Select 
              label="Estado de la Mesa" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'libre', label: 'Libre (Disponible)' },
                { value: 'ocupada', label: 'Ocupada (En consumo)' },
                { value: 'pendiente_pago', label: 'Pendiente de Pago' }
              ]}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="ghost" onClick={() => setIsAdminModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSaveTable}>Guardar Mesa</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
