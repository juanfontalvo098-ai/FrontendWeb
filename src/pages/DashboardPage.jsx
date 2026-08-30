// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, DollarSign, ShoppingBag, Users, Clock, Flame, 
  Calendar, RefreshCw, AlertTriangle, PieChart as PieIcon, BarChart2, Award, Zap,
  UtensilsCrossed, Bike, PackageCheck, Layers, ArrowUpRight, ArrowDownRight, Tag, AlertCircle, UserCheck, Wallet
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { getSocket } from '../api/socket';
import { useAuth } from '../hooks/useAuth';
import { isPathAllowed, getFirstAllowedPath } from '../utils/navigationUtils';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, activeBranchId } = useAuth();

  // Si el usuario no tiene permisos sobre el Dashboard, redirigir a su primera sección permitida
  useEffect(() => {
    if (user && !isPathAllowed('/', user)) {
      const destination = getFirstAllowedPath(user);
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);

  const [filterMode, setFilterMode] = useState('period'); // 'period' | 'shift'
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [shiftsList, setShiftsList] = useState([]);
  const [period, setPeriod] = useState('today'); // 'today', 'yesterday', 'last7', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [liveView, setLiveView] = useState(true);

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Cargar lista de turnos para el selector de filtro por turno
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const data = await api.get('/reports/shifts');
        if (Array.isArray(data)) setShiftsList(data);
      } catch (e) {
        console.warn('No se pudo cargar la lista de turnos para el dashboard:', e.message);
      }
    };
    loadShifts();
  }, [activeBranchId, user?.businessId]);

  const fetchMetrics = async () => {
    try {
      let url = '/dashboard/metrics';
      if (filterMode === 'shift' && selectedShiftId) {
        url += `?shift_id=${selectedShiftId}`;
      } else {
        url += `?period=${period}`;
        if (period === 'custom' && startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }
      }
      const data = await api.get(url);

      // Verificación directa complementaria para garantizar el turno actual en vivo
      if (!data.currentShift) {
        try {
          const shiftData = await api.get('/cash/current');
          if (shiftData && (shiftData.status === 'abierta' || shiftData.id)) {
            const summary = await api.get('/cash/summary').catch(() => null);
            data.currentShift = {
              id: shiftData.id,
              status: 'abierta',
              user_name: shiftData.user_name || 'Cajero en Turno',
              opened_at: shiftData.opened_at || shiftData.created_at || new Date().toISOString(),
              opening_amount: parseFloat(shiftData.opening_amount || 0),
              cash_sales: parseFloat(summary?.cashSales || 0),
              total_sales: parseFloat(summary?.grossRevenue || 0),
              cash_inflows: parseFloat(summary?.cashInflows || 0),
              cash_outflows: parseFloat(summary?.cashOutflows || 0),
              expected_cash: parseFloat(summary?.expectedCash || summary?.expectedInDrawer || shiftData.opening_amount || 0),
              invoices_count: parseInt(summary?.ticketsCount || 0)
            };
          }
        } catch (e) {
          // No hay caja abierta
        }
      }

      setMetrics(data);
    } catch (err) {
      console.error('Error al cargar métricas del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [filterMode, selectedShiftId, period, startDate, endDate, activeBranchId, user?.businessId]);

  // Real-Time Live Refresh
  useEffect(() => {
    if (!liveView) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 6000);

    const socket = getSocket();
    if (socket) {
      const handleSocketUpdate = () => fetchMetrics();
      socket.on('table:status-changed', handleSocketUpdate);
      socket.on('order:updated', handleSocketUpdate);
      socket.on('cash:status-changed', handleSocketUpdate);
      socket.on('cash:opened', handleSocketUpdate);
      socket.on('cash:closed', handleSocketUpdate);
      socket.on('cash:movement-added', handleSocketUpdate);
      socket.on('invoice:created', handleSocketUpdate);

      return () => {
        clearInterval(interval);
        socket.off('table:status-changed', handleSocketUpdate);
        socket.off('order:updated', handleSocketUpdate);
        socket.off('cash:status-changed', handleSocketUpdate);
        socket.off('cash:opened', handleSocketUpdate);
        socket.off('cash:closed', handleSocketUpdate);
        socket.off('cash:movement-added', handleSocketUpdate);
        socket.off('invoice:created', handleSocketUpdate);
      };
    }
    return () => clearInterval(interval);
  }, [liveView, period, startDate, endDate]);

  if (loading && !metrics) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Cargando analítica inteligente del negocio...</div>
      </div>
    );
  }

  const { 
    kpis = {}, 
    live = {}, 
    currentShift = null,
    payments = [], 
    channels = [], 
    voids = { count: 0, total: 0 }, 
    products = { top: [], worst: [], categories: [] }, 
    staff = [], 
    hourlySales = [], 
    dailySales = [], 
    topCustomers = [], 
    lowStockSupplies = [] 
  } = metrics || {};

  const isMultiDay = ['last7', 'month', 'custom'].includes(period) && dailySales.length > 1;
  const chartData = isMultiDay ? dailySales : hourlySales;
  const maxChartValue = Math.max(...chartData.map(d => parseFloat(d.total || 0)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Barra de Control de Período y Turno */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--bg-elevated)', 
        padding: '14px 20px', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border-color)', 
        flexWrap: 'wrap', 
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Selector de Modo de Filtro */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { setFilterMode('period'); setSelectedShiftId(''); }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filterMode === 'period' ? 'var(--accent-primary)' : 'transparent',
                color: filterMode === 'period' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Calendar size={14} /> Por Período
            </button>
            <button
              onClick={() => { 
                setFilterMode('shift'); 
                if (!selectedShiftId && currentShift?.id) setSelectedShiftId(currentShift.id.toString());
                else if (!selectedShiftId && shiftsList.length > 0) setSelectedShiftId((shiftsList[0].cash_register_id || shiftsList[0].id).toString());
              }}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: filterMode === 'shift' ? 'var(--accent-primary)' : 'transparent',
                color: filterMode === 'shift' ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Clock size={14} /> Por Turno de Caja
            </button>
          </div>

          {filterMode === 'period' ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'today', label: 'Hoy' },
                { id: 'yesterday', label: 'Ayer' },
                { id: 'last7', label: 'Últimos 7 Días' },
                { id: 'month', label: 'Este Mes' },
                { id: 'custom', label: 'Personalizado' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  style={{
                    padding: '6px 14px', 
                    borderRadius: '8px', 
                    border: period === p.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: period === p.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: period === p.id ? '#ffffff' : 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    fontWeight: period === p.id ? 700 : 500, 
                    fontSize: '13px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--accent-primary)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  maxWidth: '380px',
                  cursor: 'pointer'
                }}
              >
                {currentShift && (
                  <option value={currentShift.id}>
                    🟢 Turno Actual (Abierto) - {currentShift.user_name || 'Cajero'}
                  </option>
                )}
                {shiftsList.map(s => {
                  const sNum = s.cash_register_id || s.id;
                  return (
                    <option key={s.id} value={sNum}>
                      Turno #{sNum} - {s.user_name} ({s.shift_name}) - {formatCOP(s.gross_revenue)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {filterMode === 'period' && period === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px' }} 
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>a</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px' }} 
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => setLiveView(!liveView)}
            style={{
              padding: '6px 14px', 
              borderRadius: '20px', 
              border: liveView ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
              background: liveView ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
              color: liveView ? '#10b981' : 'var(--text-muted)',
              cursor: 'pointer', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12.5px',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: liveView ? '#10b981' : 'var(--text-muted)',
              boxShadow: liveView ? '0 0 8px #10b981' : 'none'
            }} />
            {liveView ? 'En Vivo Activo' : 'Pausado'}
          </button>

          <Button size="sm" variant="secondary" icon={<RefreshCw size={14} />} onClick={fetchMetrics}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Banner de Turno Seleccionado (si se filtra por un turno específico) */}
      {filterMode === 'shift' && metrics?.selectedShiftInfo && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.08) 100%)',
          border: '1.5px solid var(--accent-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent-primary)', padding: '10px', borderRadius: '10px', color: '#fff' }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Visualizando: Turno #{metrics.selectedShiftInfo.cash_register_id || metrics.selectedShiftInfo.id} — {metrics.selectedShiftInfo.shift_name || 'Turno'}
                </span>
                <Badge variant={metrics.selectedShiftInfo.status === 'abierta' ? 'success' : 'secondary'} style={{ fontSize: '11px' }}>
                  {metrics.selectedShiftInfo.status === 'abierta' ? '● En Curso' : 'Cerrado'}
                </Badge>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <strong>Responsable:</strong> {metrics.selectedShiftInfo.user_name || 'Cajero'} | <strong>Apertura:</strong> {new Date(metrics.selectedShiftInfo.opened_at).toLocaleString('es-CO')} {metrics.selectedShiftInfo.closed_at ? `| Cierre: ${new Date(metrics.selectedShiftInfo.closed_at).toLocaleString('es-CO')}` : ''}
              </div>
            </div>
          </div>

          <Button size="sm" variant="secondary" onClick={() => { setFilterMode('period'); setSelectedShiftId(''); }}>
            Volver a Vista General
          </Button>
        </div>
      )}

      {/* 2. Turno de Caja Actual en Vivo */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: currentShift ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: currentShift ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
            padding: '12px',
            borderRadius: '12px',
            border: currentShift ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <Wallet size={26} color={currentShift ? '#10b981' : '#ef4444'} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Turno de Caja Actual
              </span>
              {currentShift ? (
                <Badge variant="success" style={{ fontSize: '11px', fontWeight: 700 }}>
                  ● Caja Abierta
                </Badge>
              ) : (
                <Badge variant="danger" style={{ fontSize: '11px', fontWeight: 700 }}>
                  ● Sin Caja Abierta
                </Badge>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {currentShift ? (
                <span>Responsable: <strong style={{ color: 'var(--text-primary)' }}>{currentShift.user_name}</strong> • Apertura: {new Date(currentShift.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              ) : (
                <span>No hay una caja abierta actualmente en esta sucursal.</span>
              )}
            </div>
          </div>
        </div>

        {currentShift ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base Inicial</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCOP(currentShift.opening_amount)}</div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ventas Efectivo ({currentShift.invoices_count} fac)</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>+{formatCOP(currentShift.cash_sales)}</div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ingresos / Egresos</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: currentShift.cash_inflows - currentShift.cash_outflows >= 0 ? 'var(--text-primary)' : '#ef4444' }}>
                {formatCOP(currentShift.cash_inflows - currentShift.cash_outflows)}
              </div>
            </div>
            <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Dinero Esperado en Gaveta</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>{formatCOP(currentShift.expected_cash)}</div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => navigate('/caja')}>
              Administrar Caja
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="primary" onClick={() => navigate('/caja')}>
            Abrir Caja Ahora
          </Button>
        )}
      </div>

      {/* 3. Hero KPIs Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* KPI 1: Ventas Brutas */}
        <Card style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ventas Brutas Facturadas</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <DollarSign size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
            {formatCOP(kpis.gross_sales)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Neto: <strong>{formatCOP(kpis.net_sales)}</strong></span>
            <span>Imp: <strong>{formatCOP(kpis.tax_total)}</strong></span>
          </div>
          {parseFloat(kpis.third_party_sales || 0) > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '4px 6px',
              borderRadius: '4px',
              background: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              fontSize: '10.5px',
              color: '#d97706',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>🤝 Terceros (No ganancia):</span>
              <strong>{formatCOP(kpis.third_party_sales)}</strong>
            </div>
          )}
        </Card>

        {/* KPI 2: Órdenes / Tickets */}
        <Card style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tickets Emitidos</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <ShoppingBag size={18} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {kpis.total_tickets}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Ocupación Salón: <strong style={{ color: '#3b82f6' }}>{kpis.occupancy_rate}%</strong> ({kpis.occupied_tables}/{kpis.total_tables} mesas)
          </div>
        </Card>

        {/* KPI 3: Ticket Promedio */}
        <Card style={{ padding: '16px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ticket Promedio</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <TrendingUp size={18} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {formatCOP(kpis.avg_ticket)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Gasto medio por cuenta / factura
          </div>
        </Card>

        {/* KPI 4: Propinas Recaudadas */}
        <Card style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Propinas Voluntarias</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Award size={18} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em' }}>
            {formatCOP(kpis.total_tips)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Servicio para el personal del salón
          </div>
        </Card>

        {/* KPI 5: Descuentos & Domicilios */}
        <Card style={{ padding: '16px', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>Descuentos & Delivery</span>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Tag size={18} color="#06b6d4" />
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Desc: <span style={{ color: '#ef4444' }}>-{formatCOP(kpis.total_discounts)}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 700, marginTop: '4px' }}>
            Fletes Domicilio: +{formatCOP(kpis.total_delivery_fees)}
          </div>
        </Card>

      </div>

      {/* 3. Operación en Vivo & Alertas Operativas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Monitoreo del Salón en Vivo */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UtensilsCrossed size={18} color="var(--accent-primary)" /> Estado en Vivo del Salón & Cocina</div>}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', padding: '10px 0', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Cuentas Abiertas</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
                {formatCOP(live.open_orders_value)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{live.open_orders_count || 0} órdenes en mesa</div>
            </div>

            <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Tiempo Cocina</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Clock size={16} /> {live.avg_prep_time_mins} min
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Promedio despacho</div>
            </div>

            <div style={{ padding: '8px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Mesas Activas</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                {kpis.occupied_tables} / {kpis.total_tables}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{kpis.occupancy_rate}% de ocupación</div>
            </div>
          </div>
        </Card>

        {/* Auditoría & Alertas de Inventario Crítico */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={18} color="#ef4444" /> Alertas Operativas & Stock Crítico</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} /> Órdenes Canceladas / Anuladas:
              </span>
              <strong style={{ color: '#ef4444', fontSize: '13px' }}>{voids.count} ({formatCOP(voids.total)})</strong>
            </div>

            {lowStockSupplies.length > 0 ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Insumos / Productos con Stock Bajo:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {lowStockSupplies.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                      <span><strong>{s.name}</strong></span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>
                        {s.current_stock} {s.unit} (Mín: {s.min_stock})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PackageCheck size={16} /> Todos los insumos e inventario se encuentran sobre el nivel óptimo.
              </div>
            )}
          </div>
        </Card>

      </div>

      {/* 4. Gráfica Principal de Ventas (Diaria / Por Hora) */}
      <Card header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
            <BarChart2 size={18} color="var(--accent-primary)" /> 
            {isMultiDay ? 'Evolución de Ventas por Día' : 'Curva de Ventas por Hora del Día'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {chartData.length} intervalos registrados
          </div>
        </div>
      }>
        {chartData.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No hay registros de transacciones en el período seleccionado.
          </div>
        ) : (
          <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '10px', paddingTop: '50px', paddingBottom: '10px', overflowX: 'auto', overflow: 'visible', position: 'relative' }}>
            {chartData.map((item, idx) => {
              const val = parseFloat(item.total || 0);
              const heightPct = Math.max(8, (val / maxChartValue) * 100);
              const isHovered = hoveredBar === idx;

              return (
                <div 
                  key={idx} 
                  style={{ 
                    flex: 1, 
                    minWidth: isMultiDay ? '50px' : '36px',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    height: '100%', 
                    justifyContent: 'flex-end',
                    position: 'relative'
                  }}
                  onMouseEnter={() => setHoveredBar(idx)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Tooltip flotante al pasar el cursor */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translate(-50%, -110%)',
                      background: 'rgba(15, 23, 42, 0.95)',
                      color: '#ffffff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      zIndex: 50,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                      border: '1px solid var(--accent-primary)',
                      pointerEvents: 'none',
                      backdropFilter: 'blur(8px)'
                    }}>
                      <div style={{ fontWeight: 700, textAlign: 'center' }}>{formatCOP(val)}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>{item.count || item.tickets_handled || 0} tickets</div>
                    </div>
                  )}

                  <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                    {val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : (val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`)}
                  </span>

                  <div 
                    style={{ 
                      width: '100%', 
                      maxHeight: '160px',
                      height: `${heightPct}%`, 
                      background: isHovered 
                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
                        : 'linear-gradient(180deg, var(--accent-primary) 0%, rgba(99, 102, 241, 0.4) 100%)', 
                      borderRadius: '6px 6px 0 0',
                      transition: 'all 0.2s ease',
                      boxShadow: isHovered ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                  />

                  <span style={{ fontSize: '10.5px', color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: '6px', fontWeight: isHovered ? 700 : 500 }}>
                    {item.label || item.hour || item.date}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 5. Canales de Venta & Métodos de Pago */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Canales de Venta */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={18} color="#3b82f6" /> Ventas por Canal / Tipo de Orden</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 0' }}>
            {channels.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Sin ventas registradas en el período</div>
            ) : (
              channels.map((ch, idx) => {
                const totalGross = kpis.gross_sales > 0 ? kpis.gross_sales : 1;
                const pct = ((ch.total / totalGross) * 100).toFixed(1);
                const isDineIn = ch.channel === 'dine_in' || ch.channel === 'mesa';
                const isDelivery = ch.channel === 'delivery';
                const label = isDineIn ? 'Mesa / Salón' : (isDelivery ? 'Delivery / Domicilio' : 'Para Llevar / Takeout');
                const color = isDineIn ? '#3b82f6' : (isDelivery ? '#10b981' : '#f59e0b');

                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isDineIn && <UtensilsCrossed size={14} color={color} />}
                        {isDelivery && <Bike size={14} color={color} />}
                        {!isDineIn && !isDelivery && <ShoppingBag size={14} color={color} />}
                        {label} ({ch.count} órdenes)
                      </span>
                      <span style={{ fontWeight: 800 }}>{formatCOP(ch.total)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Métodos de Pago */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieIcon size={18} color="#8b5cf6" /> Desglose por Método de Pago</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 0' }}>
            {payments.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Sin registros de pagos en el período</div>
            ) : (
              payments.map((p, idx) => {
                const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];
                const color = colors[idx % colors.length];
                const totalGross = kpis.gross_sales > 0 ? kpis.gross_sales : 1;
                const pct = ((p.total / totalGross) * 100).toFixed(1);

                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p.payment_method} ({p.count} facturas)</span>
                      <span style={{ fontWeight: 800 }}>{formatCOP(p.total)} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

      </div>

      {/* 6. Categorías & Productos Más Vendidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Ventas por Categoría */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={18} color="var(--accent-primary)" /> Facturación por Categoría</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.categories.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Sin datos por categoría</div>
            ) : (
              products.categories.map((cat, idx) => {
                const totalCatSales = products.categories.reduce((acc, c) => acc + parseFloat(c.total_sales || 0), 0) || 1;
                const pct = ((cat.total_sales / totalCatSales) * 100).toFixed(1);

                return (
                  <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700 }}>{cat.category_name} ({cat.items_sold} unds)</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCOP(cat.total_sales)} ({pct}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Top 6 Más Vendidos vs Menor Rotación */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame size={18} color="#ef4444" /> Productos Estrella (Top Ventas)</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {products.top.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Sin productos vendidos en el período</div>
            ) : (
              products.top.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12.5px' }}>
                  <span>
                    <strong style={{ color: 'var(--accent-primary)', marginRight: '6px' }}>#{idx + 1}</strong>
                    <strong>{p.name}</strong> 
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: '6px' }}>({p.volume} unds)</span>
                  </span>
                  <span style={{ fontWeight: 800 }}>{formatCOP(p.total_sales)}</span>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

      {/* 7. Leaderboard de Personal & Top Clientes Frecuentes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        
        {/* Leaderboard Meseros */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={18} color="#f59e0b" /> Leaderboard de Ventas del Personal</div>}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', fontSize: '11.5px' }}>
                <th style={{ padding: '8px 6px' }}>Colaborador</th>
                <th style={{ padding: '8px 6px' }}>Tickets</th>
                <th style={{ padding: '8px 6px' }}>Propinas</th>
                <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Facturado</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin registros en el período</td></tr>
              ) : (
                staff.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '12.5px' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{s.waiter_name}</td>
                    <td style={{ padding: '8px 6px' }}>{s.tickets_handled}</td>
                    <td style={{ padding: '8px 6px', color: '#f59e0b', fontWeight: 600 }}>{formatCOP(s.total_tips)}</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCOP(s.total_sales)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>

        {/* Top Clientes */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCheck size={18} color="#10b981" /> Clientes Más Frecuentes del Período</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topCustomers.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>Sin clientes registrados con compras en el período</div>
            ) : (
              topCustomers.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12.5px' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone || 'Sin teléfono'} • {c.total_orders} compras</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#10b981' }}>{formatCOP(c.total_spent)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>

    </div>
  );
};

