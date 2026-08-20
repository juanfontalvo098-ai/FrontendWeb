// src/pages/StockCountPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Plus, CheckCircle, XCircle, AlertTriangle,
  Play, CheckSquare, Search, Eye, Calendar, User, ArrowRight
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const StockCountPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState(null);
  const [countModalOpen, setCountModalOpen] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Local state para edición en vivo de cantidades contadas
  const [countedValues, setCountedValues] = useState({});

  const fetchCounts = async () => {
    try {
      setLoading(true);
      const data = await api.get('/inventory/stock-counts');
      setCounts(data || []);
    } catch (err) {
      console.error('Error al cargar conteos:', err);
      addToast('Error al cargar conteos de inventario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleStartNewCount = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/inventory/stock-counts', { notes });
      addToast('Conteo físico iniciado exitosamente', 'success');
      setNewModalOpen(false);
      setNotes('');
      fetchCounts();
      // Abrir directamente el conteo
      handleOpenCount({ id: res.id });
    } catch (err) {
      addToast(err.message || 'Error al iniciar conteo', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCount = async (count) => {
    try {
      const data = await api.get(`/inventory/stock-counts/${count.id}`);
      setSelectedCount(data);

      const initialValues = {};
      data.items?.forEach(i => {
        initialValues[i.id] = i.counted_quantity !== null ? i.counted_quantity : '';
      });
      setCountedValues(initialValues);
      setCountModalOpen(true);
    } catch (err) {
      addToast('Error al cargar detalle del conteo', 'error');
    }
  };

  const handleCountValueChange = async (itemId, val) => {
    setCountedValues(prev => ({ ...prev, [itemId]: val }));

    if (val !== '' && !isNaN(parseFloat(val))) {
      try {
        await api.put(`/inventory/stock-counts/items/${itemId}`, {
          counted_quantity: parseFloat(val)
        });
      } catch (err) {
        console.error('Error al guardar cantidad contada:', err);
      }
    }
  };

  const handleCompleteCount = async () => {
    if (!window.confirm('¿Confirmas finalizar el conteo? Se generarán los ajustes automáticos en el inventario para todas las diferencias detectadas.')) return;
    try {
      setSubmitting(true);
      await api.post(`/inventory/stock-counts/${selectedCount.id}/complete`);
      addToast('Conteo finalizado y stock reconciliado con éxito', 'success');
      setCountModalOpen(false);
      fetchCounts();
    } catch (err) {
      addToast(err.message || 'Error al finalizar conteo', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCount = async () => {
    if (!window.confirm('¿Estás seguro de cancelar este conteo? No se aplicará ningún ajuste.')) return;
    try {
      await api.post(`/inventory/stock-counts/${selectedCount.id}/cancel`);
      addToast('Conteo cancelado', 'success');
      setCountModalOpen(false);
      fetchCounts();
    } catch (err) {
      addToast(err.message || 'Error al cancelar conteo', 'error');
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <ClipboardList size={32} color="var(--accent-secondary)" />
            Conteo Físico & Reconciliación
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            Auditoría de existencias reales vs teóricas del sistema con auto-ajuste de descuadres
          </p>
        </div>
        <Button variant="primary" onClick={() => setNewModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Play size={18} />
          Iniciar Nuevo Conteo
        </Button>
      </div>

      {/* Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 'var(--space-4)' }}>ID / Conteo</th>
                <th style={{ padding: 'var(--space-4)' }}>Fecha Inicio</th>
                <th style={{ padding: 'var(--space-4)' }}>Fecha Fin</th>
                <th style={{ padding: 'var(--space-4)' }}>Responsable</th>
                <th style={{ padding: 'var(--space-4)' }}>Sucursal</th>
                <th style={{ padding: 'var(--space-4)' }}>Estado</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    Cargando historial de auditorías...
                  </td>
                </tr>
              ) : counts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    No hay conteos de inventario registrados.
                  </td>
                </tr>
              ) : (
                counts.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 'var(--space-4)', fontWeight: 700 }}>Conteo #{c.id}</td>
                    <td style={{ padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>{new Date(c.started_at).toLocaleString()}</td>
                    <td style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                      {c.completed_at ? new Date(c.completed_at).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>{c.user_name}</td>
                    <td style={{ padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>{c.branch_name}</td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <Badge variant={c.status === 'completado' ? 'success' : (c.status === 'en_proceso' ? 'warning' : 'danger')}>
                        {c.status === 'en_proceso' ? 'En Proceso' : (c.status === 'completado' ? 'Completado' : 'Cancelado')}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                      <Button
                        variant={c.status === 'en_proceso' ? 'primary' : 'ghost'}
                        onClick={() => handleOpenCount(c)}
                        style={{ fontSize: 'var(--font-xs)', padding: '6px 12px' }}
                      >
                        {c.status === 'en_proceso' ? 'Continuar Conteo' : 'Ver Resultados'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Iniciar Conteo */}
      {newModalOpen && (
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="Iniciar Auditoría / Conteo Físico"
        >
          <form onSubmit={handleStartNewCount} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              Se tomará una fotografía instantánea del stock teórico actual del sistema para todos los productos controlados de esta sucursal.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Notas u Observaciones</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Cierre de mes, auditoría de fin de semana..."
                rows="3"
                style={{
                  width: '100%', padding: '8px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-sm)', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Iniciando...' : 'Iniciar Conteo'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detalle / Ejecución de Conteo */}
      {countModalOpen && selectedCount && (
        <Modal
          isOpen={countModalOpen}
          onClose={() => setCountModalOpen(false)}
          title={`Planilla de Conteo Físico #${selectedCount.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Responsable: {selectedCount.user_name}</span>
              </div>
              <div>
                <Badge variant={selectedCount.status === 'completado' ? 'success' : 'warning'}>
                  {selectedCount.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Listado de ítems para conteo */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {selectedCount.items?.map((item) => {
                const sysQty = parseFloat(item.system_quantity);
                const countVal = countedValues[item.id];
                const hasCounted = countVal !== '' && countVal !== undefined;
                const parsedCount = hasCounted ? parseFloat(countVal) : null;
                const diff = hasCounted ? (parsedCount - sysQty) : null;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      gap: 'var(--space-2)',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.product_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unit_of_measure}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sistema</div>
                      <div style={{ fontWeight: 700 }}>{sysQty}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Físico Contado</div>
                      {selectedCount.status === 'en_proceso' ? (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={countedValues[item.id] !== undefined ? countedValues[item.id] : ''}
                          onChange={(e) => handleCountValueChange(item.id, e.target.value)}
                          style={{
                            width: '90px', padding: '6px 8px', background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)', fontWeight: 800, textAlign: 'right'
                          }}
                        />
                      ) : (
                        <div style={{ fontWeight: 800 }}>{item.counted_quantity !== null ? item.counted_quantity : '-'}</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Diferencia</div>
                      {diff !== null ? (
                        <span style={{
                          fontWeight: 800,
                          color: diff === 0 ? 'var(--accent-primary)' : (diff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)')
                        }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Buttons */}
            {selectedCount.status === 'en_proceso' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
                <Button variant="ghost" onClick={handleCancelCount} style={{ color: 'var(--accent-danger)' }}>
                  Cancelar Conteo
                </Button>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="ghost" onClick={() => setCountModalOpen(false)}>Guardar y Salir</Button>
                  <Button variant="primary" onClick={handleCompleteCount} disabled={submitting} style={{ background: 'var(--accent-primary)' }}>
                    {submitting ? 'Reconciliando...' : 'Finalizar y Aplicar Ajustes'}
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
                <Button variant="ghost" onClick={() => setCountModalOpen(false)}>Cerrar</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
