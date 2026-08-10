// src/pages/TablesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, Plus, Edit2, Trash2, MapPin, Receipt, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { api, formatCOP } from '../api/client';
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
  const [capacity, setCapacity] = useState('4');
  const [zone, setZone] = useState('interior');
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

  // Abrir mesa directamente
  const handleTableClick = async (table) => {
    if (table.status === 'libre') {
      try {
        await api.post('/orders', { table_id: table.id, guests: 1 });
        navigate(`/mesas/${table.id}/orden`);
      } catch (err) {
        addToast('Error al abrir la mesa', 'danger');
      }
    } else {
      navigate(`/mesas/${table.id}/orden`);
    }
  };

  // CRUD Mesas Admin
  const handleOpenNewTable = () => {
    setEditingTable(null);
    setTableNumber(`Mesa ${tables.length + 1}`);
    setCapacity('4');
    setZone('interior');
    setStatus('libre');
    setIsAdminModalOpen(true);
  };

  const handleOpenEditTable = (e, table) => {
    e.stopPropagation();
    setEditingTable(table);
    setTableNumber(table.table_number);
    setCapacity(table.capacity.toString());
    setZone(table.zone || 'interior');
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
        capacity: parseInt(capacity, 10) || 4,
        zone,
        status
      };

      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, payload);
        addToast('Mesa actualizada', 'success');
      } else {
        await api.post('/tables', payload);
        addToast('Mesa creada exitosamente', 'success');
      }
      setIsAdminModalOpen(false);
      fetchTables();
    } catch (err) {
      addToast(err.message || 'Error al guardar mesa', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (st) => {
    switch (st) {
      case 'libre': return 'var(--accent-primary)';
      case 'ocupada': return 'var(--accent-warning)';
      case 'pendiente_pago': return 'var(--accent-danger)';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'libre': return <Badge variant="success">Libre</Badge>;
      case 'ocupada': return <Badge variant="warning">Ocupada</Badge>;
      case 'pendiente_pago': return <Badge variant="danger">Cobro Pendiente</Badge>;
      default: return <Badge variant="info">{st}</Badge>;
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando mapa de mesas...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Encabezado y Leyenda de Estados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-elevated)', padding: '14px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Leyenda de Mesas:</span>
          <Badge variant="success">Libre (Disponible)</Badge>
          <Badge variant="warning">Ocupada (Consumiendo)</Badge>
          <Badge variant="danger">Pendiente de Pago</Badge>
        </div>

        {user?.role === 'admin' && (
          <Button size="sm" icon={<Plus size={16} />} onClick={handleOpenNewTable}>
            Nueva Mesa
          </Button>
        )}
      </div>

      <style>{`
        .tables-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        @media (max-width: 600px) {
          .tables-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
            gap: 10px !important;
          }
        }
      `}</style>

      {/* Grid Espacioso y Responsivo para Mesas */}
      <div className="tables-grid">
        {tables.map(table => (
          <div 
            key={table.id} 
            style={{ 
              cursor: 'pointer', 
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              borderLeft: `6px solid ${getStatusColor(table.status)}`,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              touchAction: 'manipulation',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)'
            }}
            onClick={() => handleTableClick(table)}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)'; }}
          >
            {/* Fila 1: Nombre de la Mesa y Acciones Admin */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {table.table_number || `Mesa ${table.id}`}
              </h3>
              
              {user?.role === 'admin' ? (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={(e) => handleOpenEditTable(e, table)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }} title="Editar Mesa">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={(e) => handleDeleteTable(e, table)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }} title="Eliminar Mesa">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                getStatusBadge(table.status)
              )}
            </div>

            {/* Fila 2: Capacidad y Zona */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="var(--accent-secondary)" />
                <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{table.zone || 'Interior'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px' }}>
                <Users size={13} />
                <span>Cap: <strong>{table.capacity} p.</strong></span>
              </div>
            </div>

            {/* Cronómetro en Tiempo Real para Mesas en Consumo / Ocupadas */}
            {table.current_order && table.status !== 'libre' && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: 'var(--accent-warning)', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                fontSize: '12px', 
                fontWeight: 800 
              }}>
                <Clock size={14} />
                <span>Tiempo: {calculateElapsed(table.current_order.created_at)}</span>
              </div>
            )}

            {/* Fila 3: Estado y Botón de Acción */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: getStatusColor(table.status), textTransform: 'capitalize' }}>
                {table.status === 'libre' ? '● Disponible' : table.status === 'ocupada' ? '● En consumo' : '● Por cobrar'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                <span>Abrir</span> <ArrowRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Admin Crear/Editar Mesa */}
      <Modal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} title={editingTable ? `Editar ${editingTable.table_number}` : 'Nueva Mesa'}>
        <div>
          <Input 
            label="Nombre / Número de Mesa" 
            value={tableNumber} 
            onChange={(e) => setTableNumber(e.target.value)} 
            placeholder="Ej. Mesa VIP 1, Barra 2" 
          />
          <Input 
            label="Capacidad (Personas)" 
            type="number" 
            value={capacity} 
            onChange={(e) => setCapacity(e.target.value)} 
          />
          <Select 
            label="Zona del Restaurante" 
            value={zone} 
            onChange={(e) => setZone(e.target.value)}
            options={[
              { value: 'interior', label: 'Salón Interior' },
              { value: 'exterior', label: 'Terraza / Exterior' },
              { value: 'barra', label: 'Barra' }
            ]}
          />
          {editingTable && (
            <Select 
              label="Estado de la Mesa" 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'libre', label: 'Libre' },
                { value: 'ocupada', label: 'Ocupada' },
                { value: 'pendiente_pago', label: 'Pendiente de Pago' }
              ]}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setIsAdminModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSaveTable}>Guardar Mesa</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
