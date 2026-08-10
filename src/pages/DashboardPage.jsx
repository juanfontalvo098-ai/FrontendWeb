// src/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, ShoppingBag, Users, Clock, Flame, 
  Calendar, RefreshCw, AlertTriangle, PieChart as PieIcon, BarChart2, Award, Zap
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { getSocket } from '../api/socket';

export const DashboardPage = () => {
  const [period, setPeriod] = useState('today'); // 'today', 'yesterday', 'last7', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [liveView, setLiveView] = useState(true);

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      let url = `/dashboard/metrics?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const data = await api.get(url);
      setMetrics(data);
    } catch (err) {
      console.error('Error al cargar métricas del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period, startDate, endDate]);

  // Real-Time Live Refresh
  useEffect(() => {
    if (!liveView) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);

    const socket = getSocket();
    if (socket) {
      const handleSocketUpdate = () => fetchMetrics();
      socket.on('table:status-changed', handleSocketUpdate);
      socket.on('order:updated', handleSocketUpdate);
      return () => {
        clearInterval(interval);
        socket.off('table:status-changed', handleSocketUpdate);
        socket.off('order:updated', handleSocketUpdate);
      };
    }
    return () => clearInterval(interval);
  }, [liveView, period, startDate, endDate]);

  if (loading || !metrics) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando analítica avanzada...</div>;
  }

  const { kpis, live, payments, voids, products, staff, hourlySales } = metrics;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Barra de Filtro Global de Fechas & Real-Time Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <Calendar size={18} color="var(--accent-primary)" /> Período Analítico:
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
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
                  padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-color)',
                  background: period === p.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: period === p.id ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <span>a</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setLiveView(!liveView)}
            style={{
              padding: '6px 16px', borderRadius: '999px', border: 'none',
              background: liveView ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-secondary)',
              color: liveView ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
            }}
          >
            <Zap size={16} color={liveView ? 'var(--accent-primary)' : 'currentColor'} />
            {liveView ? 'En Vivo (Actualizando)' : 'Modo Estático'}
          </button>
          <Button size="sm" variant="ghost" icon={<RefreshCw size={16} />} onClick={fetchMetrics}>Refrescar</Button>
        </div>
      </div>

      {/* 2. Hero KPIs (Ventas Brutas con impuestos, Ventas Netas, Ticket Promedio, Ocupación) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <Card glass style={{ borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
            <span>Ventas Brutas Totales</span>
            <DollarSign size={20} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCOP(kpis.gross_sales)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Neto: {formatCOP(kpis.net_sales)}</div>
        </Card>

        <Card glass style={{ borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
            <span>Tickets / Órdenes Cerradas</span>
            <ShoppingBag size={20} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{kpis.total_tickets}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Facturas emitidas</div>
        </Card>

        <Card glass style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
            <span>Ticket Promedio por Mesa</span>
            <TrendingUp size={20} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{formatCOP(kpis.avg_ticket)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Gasto medio por orden</div>
        </Card>

        <Card glass style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
            <span>Propinas Recaudadas</span>
            <Award size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, color: '#f59e0b' }}>{formatCOP(kpis.total_tips)}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Servicio voluntario</div>
        </Card>

        <Card glass style={{ borderLeft: '4px solid #ec4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: '8px' }}>
            <span>Tasa de Ocupación</span>
            <Users size={20} color="#ec4899" />
          </div>
          <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>{kpis.occupancy_rate}%</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpis.occupied_tables} de {kpis.total_tables} mesas ocupadas</div>
        </Card>
      </div>

      {/* 3. Live Operational Heatmap (Mesas Abiertas, Tiempo Cocina, Monto en Mesas) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
        <Card header="Operación en Vivo del Salón">
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '16px 0' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monto en Mesas Abiertas</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px' }}>{formatCOP(live.open_orders_value)}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0 24px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tiempo Promedio Cocina</div>
              <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Clock size={20} color="var(--accent-warning)" /> {live.avg_prep_time_mins} min
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mesas Ocupadas</div>
              <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{kpis.occupied_tables} / {kpis.total_tables}</div>
            </div>
          </div>
        </Card>

        {/* Auditoría Anti-Fraude (Anulaciones y Descuentos) */}
        <Card header="Auditoría Anti-Fraude & Impuestos">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <AlertTriangle size={18} color="var(--accent-danger)" /> Órdenes Canceladas / Anuladas:
            </span>
            <span style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{voids.count} ({formatCOP(voids.total)})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Pasivo Fiscal (Impuestos IVA/Impoconsumo Recaudados):</span>
            <span style={{ fontWeight: 700 }}>{formatCOP(kpis.tax_total)}</span>
          </div>
        </Card>
      </div>

      {/* 4. Gráficos Analíticos: Métodos de Pago (Donut) y Ventas por Hora */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-6)' }}>
        {/* Gráfico Donut de Métodos de Pago */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieIcon size={18} /> Ventas por Método de Pago</div>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
            {payments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Sin registros de pagos en el período</p>
            ) : (
              payments.map((p, idx) => {
                const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b'];
                const color = colors[idx % colors.length];
                const pct = kpis.gross_sales > 0 ? ((p.total / kpis.gross_sales) * 100).toFixed(1) : 0;
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p.payment_method} ({pct}%)</span>
                      <span style={{ fontWeight: 700 }}>{formatCOP(p.total)}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Gráfico de Barras: Ventas por Hora */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={18} /> Ventas por Hora del Día</div>}>
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '20px', paddingBottom: '10px', overflowX: 'auto' }}>
            {hourlySales.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>Sin transacciones registradas hoy</p>
            ) : (
              hourlySales.map((h, idx) => {
                const maxVal = Math.max(...hourlySales.map(item => item.total)) || 1;
                const heightPct = Math.max(10, (h.total / maxVal) * 100);
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{formatCOP(h.total)}</span>
                    <div 
                      style={{ 
                        width: '100%', 
                        maxHeight: '140px',
                        height: `${heightPct}%`, 
                        background: 'linear-gradient(180deg, var(--accent-primary) 0%, rgba(34, 197, 94, 0.3) 100%)', 
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s'
                      }}
                      title={`${h.hour}: ${formatCOP(h.total)}`}
                    ></div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{h.hour}</span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* 5. Analítica de Productos y Rendimiento del Personal (Meseros) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Top 5 Más Vendidos y Peores Vendidos */}
        <Card header="Productos Más Vendidos vs Peores Vendidos">
          <h4 style={{ fontSize: '13px', color: 'var(--accent-primary)', marginBottom: '8px' }}>🔥 Top 5 Más Vendidos (Por Ingresos)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {products.top.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '13px' }}>
                <span>{idx + 1}. <strong>{p.name}</strong> ({p.volume} unds)</span>
                <span style={{ fontWeight: 700 }}>{formatCOP(p.total_sales)}</span>
              </div>
            ))}
          </div>

          <h4 style={{ fontSize: '13px', color: 'var(--accent-danger)', marginBottom: '8px' }}>📉 Menor Rotación (Baja Venta)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {products.worst.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>{p.name}</span>
                <span>{p.volume} vendidos ({formatCOP(p.total_sales)})</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Desempeño del Personal (Leaderboard Meseros) */}
        <Card header={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={18} color="#f59e0b" /> Leaderboard de Ventas por Mesero</div>}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                <th style={{ padding: '8px' }}>Mesero</th>
                <th style={{ padding: '8px' }}>Órdenes</th>
                <th style={{ padding: '8px' }}>Propinas</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total Ventas</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin ventas por meseros en este período</td></tr>
              ) : (
                staff.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>{s.waiter_name}</td>
                    <td style={{ padding: '10px 8px' }}>{s.tickets_handled}</td>
                    <td style={{ padding: '10px 8px', color: '#f59e0b' }}>{formatCOP(s.total_tips)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCOP(s.total_sales)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};
