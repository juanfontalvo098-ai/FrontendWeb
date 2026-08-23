// src/pages/ReportsPage.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Download, Eye, FileSpreadsheet, RefreshCw, User, DollarSign, AlertCircle, ShoppingBag, Clock, FileText, Package, Receipt, ArrowDownRight, ArrowUpRight, Printer, Boxes, TrendingUp, Sparkles, BarChart2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { printShiftCloseTicket } from '../utils/printUtils';

export const ReportsPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [shifts, setShifts] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  // Modal Detalle Z-Report y Pestañas
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [suppliesUsageData, setSuppliesUsageData] = useState(null);
  const [loadingSuppliesUsage, setLoadingSuppliesUsage] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('resumen'); // 'resumen' | 'productos' | 'insumos' | 'facturas' | 'movimientos'
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [exportingConsolidated, setExportingConsolidated] = useState(false);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedUser) params.append('user_id', selectedUser);

      const [shiftsData, usersData, settingsData] = await Promise.all([
        api.get(`/reports/shifts?${params.toString()}`),
        api.get('/users').catch(() => []),
        api.get('/settings').catch(() => null)
      ]);

      setShifts(shiftsData);
      setCashiers(usersData.filter(u => ['cajero', 'admin', 'gerente', 'super_admin'].includes(u.role)));
      setSettings(settingsData);
    } catch (err) {
      console.error('Error cargando reportes:', err);
      addToast('Error al cargar historial de turnos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintShiftTicket = (shift) => {
    if (!shift) return;
    printShiftCloseTicket(shift, settings || {}, settings?.default_paper_width || '80mm');
    addToast('Ticket de Cierre de Turno enviado a impresión', 'info');
  };

  useEffect(() => {
    fetchShifts();
  }, [startDate, endDate, selectedUser]);

  const handleOpenDetail = async (shiftId) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    setActiveModalTab('resumen');
    setSuppliesUsageData(null);
    try {
      const [shiftData, suppliesData] = await Promise.all([
        api.get(`/reports/shifts/${shiftId}`),
        api.get(`/reports/shifts/${shiftId}/supplies-usage`).catch(() => null)
      ]);
      setSelectedShift(shiftData);
      setSuppliesUsageData(suppliesData);
    } catch (err) {
      addToast('Error al cargar detalle del turno', 'danger');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Manejo de respuesta binaria Blob para descarga Excel (.xlsx)
  const handleDownloadExcel = async (shiftId) => {
    setDownloadingId(shiftId);
    try {
      const blob = await api.getBlob(`/reports/shifts/${shiftId}/excel`);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Reporte_Turno_${shiftId}_Detallado.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addToast('Reporte Excel detallado descargado exitosamente (.xlsx)', 'success');
    } catch (err) {
      addToast(err.message || 'Error al descargar el informe Excel', 'danger');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadConsolidatedExcel = async () => {
    setExportingConsolidated(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedUser) params.append('user_id', selectedUser);

      const blob = await api.getBlob(`/reports/export/consolidated?${params.toString()}`);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Informe_Consolidado_BI_${startDate || 'General'}_al_${endDate || 'Hoy'}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addToast('Informe Consolidado BI con Insumos y Recetas descargado con éxito (.xlsx)', 'success');
    } catch (err) {
      addToast(err.message || 'Error al exportar reporte consolidado', 'danger');
    } finally {
      setExportingConsolidated(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando informes de turnos...</div>;
  }

  const snapshot = selectedShift?.snapshot || { invoices: [], itemizedSales: [], movements: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Filtros de Búsqueda */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Calendar size={18} color="var(--accent-primary)" /> Rango de Fechas:
          </span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }} />
          <span>a</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px' }} />

          <Select 
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            options={[
              { value: '', label: 'Todos los Cajeros / Responsables' },
              ...cashiers.map(c => ({ value: c.id.toString(), label: c.full_name }))
            ]}
            style={{ marginBottom: 0, minWidth: '220px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="secondary"
            icon={<FileSpreadsheet size={15} />}
            loading={exportingConsolidated}
            onClick={handleDownloadConsolidatedExcel}
            title="Exportar informe consolidado del período con métricas BI, insumos y recetas a Excel"
          >
            Exportar Consolidado (Excel)
          </Button>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={16} />} onClick={fetchShifts}>Refrescar</Button>
        </div>
      </div>

      {/* KPI Cards — Resumen Global BI del Período */}
      {(() => {
        const totalGross = shifts.reduce((acc, s) => acc + parseFloat(s.gross_revenue || 0), 0);
        const totalNet = shifts.reduce((acc, s) => acc + parseFloat(s.net_revenue || 0), 0);
        const totalTips = shifts.reduce((acc, s) => acc + parseFloat(s.total_tips || 0), 0);
        const totalDiff = shifts.reduce((acc, s) => acc + parseFloat(s.difference || 0), 0);
        const totalTickets = shifts.reduce((acc, s) => acc + (parseInt(s.total_tickets) || 0), 0);
        const avgTicket = totalTickets > 0 ? (totalGross / totalTickets) : 0;

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Card style={{ padding: '16px', borderLeft: '4px solid var(--accent-primary)', background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ventas Brutas Período</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-primary)', marginTop: '4px' }}>{formatCOP(totalGross)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Neto: {formatCOP(totalNet)}</div>
            </Card>

            <Card style={{ padding: '16px', borderLeft: '4px solid #06b6d4', background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ticket Promedio / Factura</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#06b6d4', marginTop: '4px' }}>{formatCOP(avgTicket)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{totalTickets} tickets en {shifts.length} turnos</div>
            </Card>

            <Card style={{ padding: '16px', borderLeft: '4px solid #10b981', background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Propinas Recaudadas</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>{formatCOP(totalTips)}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Destinado a personal de servicio</div>
            </Card>

            <Card style={{ padding: '16px', borderLeft: `4px solid ${totalDiff === 0 ? 'var(--accent-success)' : (totalDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)')}`, background: 'var(--bg-elevated)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Diferencia Neta de Caja</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: totalDiff === 0 ? 'var(--accent-success)' : (totalDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)'), marginTop: '4px' }}>
                {formatCOP(totalDiff)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {totalDiff === 0 ? 'Arqueo perfecto' : (totalDiff < 0 ? 'Faltante acumulado' : 'Sobrante acumulado')}
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Tabla de Historial de Turnos */}
      <Card header="Historial de Reportes de Cierre de Caja">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
              <th style={{ padding: '12px 8px' }}>Turno N°</th>
              <th style={{ padding: '12px 8px' }}>Jornada</th>
              <th style={{ padding: '12px 8px' }}>Cajero / Responsable</th>
              <th style={{ padding: '12px 8px' }}>Fecha y Hora Cierre</th>
              <th style={{ padding: '12px 8px' }}>Ventas Brutas</th>
              <th style={{ padding: '12px 8px' }}>Ventas Netas</th>
              <th style={{ padding: '12px 8px' }}>Diferencia Caja</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay reportes de turnos registrados en este período</td></tr>
            ) : (
              shifts.map(shift => {
                const shiftNum = shift.cash_register_id || shift.id;
                return (
                  <tr key={shift.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>#{shiftNum}</td>
                    <td style={{ padding: '12px 8px' }}>{shift.shift_name}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{shift.user_name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '12px' }}>{shift.closed_at}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCOP(shift.gross_revenue)}</td>
                    <td style={{ padding: '12px 8px' }}>{formatCOP(shift.net_revenue)}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: shift.difference < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                      {formatCOP(shift.difference)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => handlePrintShiftTicket(shift)}>
                          Ticket
                        </Button>
                        <Button size="sm" variant="secondary" icon={<Eye size={14} />} onClick={() => handleOpenDetail(shift.id)}>
                          Ver Detalle
                        </Button>
                        <Button 
                          size="sm" 
                          variant="primary" 
                          loading={downloadingId === shift.id} 
                          icon={<FileSpreadsheet size={14} />} 
                          onClick={() => handleDownloadExcel(shift.id)}
                        >
                          Excel
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal Detalle Reporte con Auditoría Íntegra */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Reporte Exhaustivo - Turno #${selectedShift?.cash_register_id || selectedShift?.id || ''}`} maxWidth="740px">
        {loadingDetail || !selectedShift ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Cargando resumen de cierre exhaustivo...</div>
        ) : (
          <div>
            {/* Encabezado Principal */}
            <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>{selectedShift.shift_name}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '17px' }}>{formatCOP(selectedShift.gross_revenue)}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>Cajero: <strong>{selectedShift.user_name}</strong></div>
                <div>Apertura: {selectedShift.opened_at}</div>
                <div>Cierre: {selectedShift.closed_at}</div>
                <div>Facturas Emitidas: <strong>{selectedShift.total_tickets}</strong></div>
              </div>
            </div>

            {/* Pestañas de Navegación del Modal */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveModalTab('resumen')}
                style={{ 
                  padding: '6px 12px', borderRadius: '6px', border: 'none', 
                  background: activeModalTab === 'resumen' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                  color: activeModalTab === 'resumen' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <DollarSign size={15} /> Resumen Financiero
              </button>
              <button 
                onClick={() => setActiveModalTab('productos')}
                style={{ 
                  padding: '6px 12px', borderRadius: '6px', border: 'none', 
                  background: activeModalTab === 'productos' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                  color: activeModalTab === 'productos' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Package size={15} /> Productos Vendidos ({(snapshot.itemizedSales || []).length})
              </button>
              <button 
                onClick={() => setActiveModalTab('insumos')}
                style={{ 
                  padding: '6px 12px', borderRadius: '6px', border: 'none', 
                  background: activeModalTab === 'insumos' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                  color: activeModalTab === 'insumos' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Boxes size={15} /> Insumos Usados ({suppliesUsageData?.supplies?.length || 0})
              </button>
              <button 
                onClick={() => setActiveModalTab('facturas')}
                style={{ 
                  padding: '6px 12px', borderRadius: '6px', border: 'none', 
                  background: activeModalTab === 'facturas' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                  color: activeModalTab === 'facturas' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Receipt size={15} /> Facturas ({(snapshot.invoices || []).length})
              </button>
              <button 
                onClick={() => setActiveModalTab('movimientos')}
                style={{ 
                  padding: '6px 12px', borderRadius: '6px', border: 'none', 
                  background: activeModalTab === 'movimientos' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                  color: activeModalTab === 'movimientos' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ArrowDownRight size={15} /> Movimientos Caja ({(snapshot.movements || []).length})
              </button>
            </div>

            {/* TAB 1: Resumen Financiero */}
            {activeModalTab === 'resumen' && (
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>1. Control de Efectivo y Arqueo</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  <div>Base Inicial: <strong>{formatCOP(selectedShift.opening_amount)}</strong></div>
                  <div>Esperado en Caja: <strong>{formatCOP(selectedShift.expected_amount)}</strong></div>
                  <div>Declarado Físico: <strong>{formatCOP(selectedShift.closing_amount)}</strong></div>
                  <div>Diferencia Arqueo: <strong style={{ color: selectedShift.difference < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{formatCOP(selectedShift.difference)}</strong></div>
                </div>

                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>2. Medios de Pago Recaudados</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Efectivo:</span><strong>{formatCOP(selectedShift.cash_sales)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tarjeta Crédito/Débito:</span><strong>{formatCOP(selectedShift.card_sales)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Transferencias Bancarias:</span><strong>{formatCOP(selectedShift.transfer_sales)}</strong></div>
                </div>

                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>3. Resumen Fiscal, Servicio y Anulaciones</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  <div>Ventas Netas (Sin Imp): <strong>{formatCOP(selectedShift.net_revenue)}</strong></div>
                  <div>Impuestos (IVA/Impoconsumo): <strong>{formatCOP(selectedShift.tax_total)}</strong></div>
                  <div>Propinas Recaudadas: <strong>{formatCOP(selectedShift.total_tips)}</strong></div>
                  <div>Egresos / Retiros Caja: <strong>{formatCOP(selectedShift.total_withdrawals)}</strong></div>
                  <div>Anulaciones / Cancelaciones: <strong style={{ color: 'var(--accent-danger)' }}>{formatCOP(selectedShift.total_voids)}</strong></div>
                </div>
              </div>
            )}

            {/* TAB 2: Productos Vendidos en el Turno */}
            {activeModalTab === 'productos' && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>Detalle Completo de Productos Vendidos y Cantidades</h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Categoría</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Producto</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Cantidad</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>P. Unitario</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total Recaudado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snapshot.itemizedSales || []).length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin productos registrados en este turno</td></tr>
                      ) : (
                        snapshot.itemizedSales.map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{p.category_name}</td>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{p.product_name}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.quantity} unds</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCOP(p.unit_price)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{formatCOP(p.total_sales)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* TAB: Insumos Consumidos en el Turno */}
            {activeModalTab === 'insumos' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                    Insumos & Materias Primas Consumidas por Recetas
                  </h4>
                  {suppliesUsageData && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Costo Estimado Insumos: <strong style={{ color: 'var(--accent-primary)' }}>{formatCOP(suppliesUsageData.total_supplies_cost || 0)}</strong>
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: '290px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Insumo / Ingrediente</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Categoría</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Consumo Total</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Costo Unit.</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Costo Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!suppliesUsageData?.supplies || suppliesUsageData.supplies.length === 0) ? (
                        <tr>
                          <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Boxes size={24} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                            <div>No se registraron consumos de insumos por recetas en este turno.</div>
                            <div style={{ fontSize: '11px', marginTop: '4px' }}>(Verifica que los productos vendidos tengan recetas configuradas en el módulo de Inventario).</div>
                          </td>
                        </tr>
                      ) : (
                        suppliesUsageData.supplies.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{s.name}</strong>
                              {s.used_in_products?.length > 0 && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Usado en: {s.used_in_products.map(p => `${p.product_name} (${p.units_sold}x)`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{s.category}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#0d9488' }}>
                              {s.total_used.toFixed(2)} {s.unit}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{formatCOP(s.cost_price)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800 }}>{formatCOP(s.total_cost)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Historial de Facturas Emitidas */}
            {activeModalTab === 'facturas' && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>Historial de Facturas y Recibos Generados</h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Factura N°</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Hora</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Mesa / Mesero</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Pago</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snapshot.invoices || []).length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin facturas emitidas en este turno</td></tr>
                      ) : (
                        snapshot.invoices.map((inv, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{inv.invoice_number}</td>
                            <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{inv.created_at}</td>
                            <td style={{ padding: '8px' }}>{inv.table_number || `Mesa ${inv.table_id}`} | {inv.waiter_name}</td>
                            <td style={{ padding: '8px', textTransform: 'uppercase', fontWeight: 600 }}>{inv.payment_method}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCOP(inv.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: Movimientos de Caja */}
            {activeModalTab === 'movimientos' && (
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--accent-primary)', fontWeight: 700 }}>Movimientos, Egresos y Salidas de Caja</h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Tipo</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Descripción</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Método</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snapshot.movements || []).length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin movimientos adicionales de caja en este turno</td></tr>
                      ) : (
                        snapshot.movements.map((m, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', textTransform: 'uppercase', fontWeight: 600, color: m.type === 'ingreso' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                              {m.type}
                            </td>
                            <td style={{ padding: '8px' }}>{m.description || 'Sin descripción'}</td>
                            <td style={{ padding: '8px', textTransform: 'capitalize' }}>{m.payment_method || 'efectivo'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: m.type === 'ingreso' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                              {formatCOP(m.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
              <Button icon={<Printer size={16} />} onClick={() => handlePrintShiftTicket(selectedShift)}>
                Imprimir Ticket Térmico (Z)
              </Button>
              <Button icon={<FileSpreadsheet size={16} />} loading={downloadingId === selectedShift.id} onClick={() => handleDownloadExcel(selectedShift.id)}>
                Exportar Excel Exhaustivo (.xlsx)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
