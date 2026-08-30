// src/pages/CashPage.jsx
import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, Printer, FileSpreadsheet, Lock, Eye, CheckCircle2, AlertTriangle, ShieldAlert, CreditCard, DollarSign, RefreshCcw, TrendingUp, Smartphone } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCurrency, formatCOP, formatDateTime } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { printShiftCloseTicket } from '../utils/printUtils';

import { useAuth } from '../hooks/useAuth';

export const CashPage = () => {
  const { user } = useAuth();
  const addToast = useUiStore((state) => state.addToast);

  const [currentCash, setCurrentCash] = useState(null);
  const [report, setReport] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [modalType, setModalType] = useState(null); // 'open', 'income', 'expense', 'close', 'zreport'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado para el Cierre Ciego (Blind Close) y Arqueo Z
  const [summaryData, setSummaryData] = useState(null);
  const [declaredCashInput, setDeclaredCashInput] = useState('');
  const [declaredTransfersInput, setDeclaredTransfersInput] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [zReportFinal, setZReportFinal] = useState(null);

  const fetchCashState = async () => {
    try {
      setLoading(true);
      const [cash, settingsData] = await Promise.all([
        api.get('/cash/current').catch(() => null),
        api.get('/settings').catch(() => null)
      ]);
      setCurrentCash(cash);
      setSettings(settingsData);
      if (cash && cash.id) {
        const rep = await api.get(`/cash/report/${cash.id}`);
        setReport(rep);
      }
    } catch (err) {
      setCurrentCash(null);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashState();
  }, []);

  const handlePrintZTicket = async (zData) => {
    if (!zData) return;

    try {
      let currentSettings = settings;
      if (!currentSettings) {
        currentSettings = await api.get('/settings').catch(() => ({}));
      }

      const cashId = zData.cashId || currentCash?.id || zData.id || '---';
      const openedAt = zData.openedAt || zData.opened_at || currentCash?.opened_at || '---';
      const closedAt = zData.closedAt || zData.closed_at || new Date().toLocaleString('es-CO');
      const summary = zData.summary || summaryData || zData.salesSummary || {};
      const audit = summary.audit || { canceledOrdersCount: 0, canceledAmount: 0 };

      const openingBase = parseFloat(zData.opening_amount ?? zData.openingAmount ?? summary.initialFloat ?? summary.openingAmount ?? summary.opening_amount ?? currentCash?.opening_amount ?? 0);
      const expectedCash = parseFloat(zData.expected ?? summary.expectedCash ?? 0);
      const declaredCash = parseFloat(zData.declaredCash ?? zData.closing_amount ?? zData.declared_amount ?? 0);
      const diff = parseFloat(zData.difference ?? (declaredCash - expectedCash));

      const grossRev = parseFloat(summary.grossRevenue || summary.totalSales || (
        (parseFloat(summary.cashSales) || 0) +
        (parseFloat(summary.cardSales) || 0) +
        (parseFloat(summary.transferSales) || 0) +
        (parseFloat(summary.creditSales) || 0)
      ) || 0);

      const thirdPartyRev = parseFloat(summary.thirdPartyRevenue ?? summary.third_party_revenue ?? zData.third_party_revenue ?? 0);

      const shiftData = {
        id: cashId,
        shift_name: 'Turno Principal',
        user_name: user?.full_name || 'Cajero',
        opened_at: openedAt,
        closed_at: closedAt,
        opening_amount: openingBase,
        declared_amount: declaredCash,
        difference: diff,
        gross_revenue: grossRev,
        third_party_revenue: thirdPartyRev,
        snapshot: {
          initialFloat: openingBase,
          cashSales: parseFloat(summary.cashSales || 0),
          cardSales: parseFloat(summary.cardSales || 0),
          transferSales: parseFloat(summary.transferSales || 0),
          creditSales: parseFloat(summary.creditSales || 0),
          cashInflows: parseFloat(summary.cashInflows || summary.manualIncomes || 0),
          cashOutflows: parseFloat(summary.cashOutflows || summary.manualExpenses || 0),
          expectedCash: expectedCash,
          totalTips: parseFloat(summary.totalTips || 0),
          cashRefunds: parseFloat(summary.cashRefunds || 0),
          thirdPartyRevenue: thirdPartyRev,
          audit: audit
        }
      };

      printShiftCloseTicket(shiftData, currentSettings || {}, currentSettings?.default_paper_width || '80mm');
      addToast('Ticket de Cierre de Turno enviado a impresión', 'info');
    } catch (err) {
      console.error('Error al imprimir ticket de cierre:', err);
      addToast('Error al procesar la impresión del ticket', 'danger');
    }
  };

  const handleOpenCash = async () => {
    if (!amount || parseFloat(amount) < 0) {
      addToast('Ingresa un monto inicial válido', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/cash/open', { opening_amount: parseFloat(amount) });
      addToast('Caja abierta exitosamente', 'success');
      setModalType(null);
      setAmount('');
      fetchCashState();
    } catch (err) {
      addToast(err.message || 'Error al abrir caja', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMovement = async (type) => {
    if (!amount || parseFloat(amount) <= 0) {
      addToast('Ingresa un valor válido', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/cash/movements', {
        type: type,
        amount: parseFloat(amount),
        description: description || (type === 'ingreso' ? 'Ingreso manual' : 'Egreso manual'),
        payment_method: 'efectivo'
      });
      addToast('Movimiento registrado en caja', 'success');
      setModalType(null);
      setAmount('');
      setDescription('');
      fetchCashState();
    } catch (err) {
      addToast(err.message || 'Error al registrar movimiento', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir Modal Cierre de Turno Z (Iniciar Cierre Ciego)
  const handleOpenCloseModal = async () => {
    setDeclaredCashInput('');
    setDeclaredTransfersInput('');
    setIsRevealed(false);
    setModalType('close');
    try {
      const summary = await api.get('/cash/summary');
      setSummaryData(summary);
    } catch (err) {
      addToast('Error al cargar datos pre-cierre', 'danger');
    }
  };

  // Acción Cierre Ciego: Revelar Cálculo de Arqueo
  const handleCalculateBlindClose = () => {
    const valCash = parseFloat(declaredCashInput);
    if (isNaN(valCash) || valCash < 0) {
      addToast('Ingresa el monto de efectivo físico contado en la caja', 'warning');
      return;
    }
    setIsRevealed(true);
  };

  // Confirmación Final de Cierre Z y Guardado de Snapshot
  const handleConfirmFinalClose = async () => {
    const declaredCashVal = parseFloat(declaredCashInput || 0);
    const declaredTransfersVal = parseFloat(declaredTransfersInput || 0);

    setSubmitting(true);
    try {
      const res = await api.post('/cash/close', { 
        closing_amount: declaredCashVal,
        declared_transfers: declaredTransfersInput !== '' ? declaredTransfersVal : null
      });
      
      setZReportFinal({
        ...res,
        declaredCash: declaredCashVal,
        declaredTransfers: declaredTransfersInput !== '' ? declaredTransfersVal : null,
        cashId: currentCash.id,
        openedAt: currentCash.opened_at,
        opening_amount: res.opening_amount || currentCash.opening_amount || summaryData?.initialFloat,
        openingAmount: res.openingAmount || currentCash.opening_amount || summaryData?.initialFloat,
        summary: summaryData
      });

      addToast(`Caja cerrada exitosamente. Diferencia Total: ${formatCurrency(res.difference || 0)}`, 'info');
      setModalType('zreport');
      fetchCashState();
    } catch (err) {
      addToast(err.message || 'Error al cerrar caja', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center', fontSize: '16px' }}>Cargando estado de caja...</div>;
  }

  if (!currentCash) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Card style={{ textAlign: 'center', padding: '40px', maxWidth: '440px' }}>
          <Wallet size={52} color="var(--text-muted)" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ marginBottom: '16px', fontSize: '22px' }}>Caja Cerrada</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>Debes abrir el turno de caja para comenzar las operaciones del POS.</p>
          <Button size="lg" onClick={() => { setAmount(''); setModalType('open'); }}>Abrir Turno de Caja</Button>
        </Card>

        {/* Modal Abrir Caja */}
        <Modal isOpen={modalType === 'open'} onClose={() => setModalType(null)} title="Abrir Turno de Caja">
          <div>
            <Input 
              label="Monto base inicial en caja ($)" 
              type="number" 
              placeholder="Ej. 200000"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              style={{ fontSize: '16px', padding: '10px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <Button variant="ghost" onClick={() => setModalType(null)}>Cancelar</Button>
              <Button loading={submitting} onClick={handleOpenCash}>Abrir Caja</Button>
            </div>
          </div>
        </Modal>

        {/* Modal Resumen Recién Cerrado */}
        <Modal isOpen={modalType === 'zreport'} onClose={() => setModalType(null)} title="Informe de Cierre Final" maxWidth="600px">
          {zReportFinal && (
            <div style={{ padding: '8px 0' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700 }}>ARQUEO DE CAJA - REPORTE DE CIERRE</h3>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Caja N° #{zReportFinal.cashId} | Apertura: {formatDateTime(zReportFinal.openedAt || zReportFinal.opened_at)}</div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px', marginBottom: '16px', fontSize: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Efectivo Esperado en Sistema:</span>
                  <strong>{formatCurrency(zReportFinal.expected)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Efectivo Contado Físicamente:</span>
                  <strong>{formatCurrency(zReportFinal.declaredCash)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '17px', marginTop: '6px', color: zReportFinal.difference === 0 ? 'var(--accent-primary)' : zReportFinal.difference < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                  <span>Diferencia Arqueo Efectivo:</span>
                  <span>{formatCurrency(zReportFinal.difference)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button variant="ghost" onClick={() => setModalType(null)}>Cerrar</Button>
                <Button icon={<Printer size={16} />} onClick={() => handlePrintZTicket(zReportFinal)}>Imprimir Ticket de Cierre</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // Valores acumulados de caja abierta (incluye ventas en efectivo + movimientos manuales)
  const salesSummary = report?.salesSummary || {};
  const baseInicial = parseFloat(currentCash.opening_amount || 0);
  const totalIngresos = parseFloat(salesSummary.cashSales || 0) + parseFloat(salesSummary.cashInflows || 0);
  const totalEgresos = parseFloat(salesSummary.cashOutflows || 0);
  const totalEnCaja = parseFloat(salesSummary.expectedCash || 0) || (baseInicial + totalIngresos - totalEgresos);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Tarjetas de Resumen General */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        <Card glass style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Base Inicial Float</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(baseInicial)}</div>
        </Card>
        <Card glass style={{ borderLeft: '5px solid var(--accent-primary)', padding: '20px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ingresos & Ventas Acumuladas</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(totalIngresos)}</div>
        </Card>
        <Card glass style={{ borderLeft: '5px solid var(--accent-warning)', padding: '20px' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Efectivo Estimado en Caja</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{formatCurrency(totalEnCaja)}</div>
        </Card>
      </div>

      {/* Tabla Principal y Acciones */}
      <Card header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700 }}>Caja Activa N° #{currentCash.id}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button size="sm" variant="secondary" icon={<ArrowUpRight size={16} />} onClick={() => { setAmount(''); setDescription(''); setModalType('income'); }}>Ingreso</Button>
            <Button size="sm" variant="secondary" icon={<ArrowDownRight size={16} />} onClick={() => { setAmount(''); setDescription(''); setModalType('expense'); }}>Egreso</Button>
            <Button size="sm" variant="danger" icon={<FileSpreadsheet size={16} />} onClick={handleOpenCloseModal}>Cierre de Turno (Arqueo)</Button>
          </div>
        </div>
      }>
        <div style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Historial de Movimientos del Turno</h3>
          {report && report.movements && report.movements.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <th style={{ padding: '12px 8px' }}>Tipo Movimiento</th>
                  <th style={{ padding: '12px 8px' }}>Método de Pago</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {report.movements.map((mov, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '14px' }}>
                    <td style={{ padding: '12px 8px', textTransform: 'capitalize', fontWeight: 600 }}>
                      <span style={{ color: (mov.type === 'ingreso' || mov.type === 'venta') ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>
                        {mov.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>{mov.payment_method}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(mov.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No hay movimientos ni ventas registradas aún en esta caja.</p>
          )}
        </div>
      </Card>

      {/* Modal Ingreso/Egreso */}
      <Modal isOpen={modalType === 'income' || modalType === 'expense'} onClose={() => setModalType(null)} title={modalType === 'income' ? 'Registrar Ingreso de Dinero' : 'Registrar Egreso / Salida'}>
        <div>
          <Input label="Valor ($)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ fontSize: '16px' }} />
          <Input label="Descripción / Motivo" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Cambio de billetes, Pago insumos" style={{ fontSize: '14px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <Button variant="ghost" onClick={() => setModalType(null)}>Cancelar</Button>
            <Button loading={submitting} onClick={() => handleAddMovement(modalType === 'income' ? 'ingreso' : 'egreso')}>Guardar Movimiento</Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL CIERRE DE TURNO (SIN EMOJIS, LIMPIO Y PROFESIONAL)                */}
      {/* ========================================================================= */}
      <Modal isOpen={modalType === 'close'} onClose={() => setModalType(null)} title="Cierre de Turno & Arqueo Exhaustivo" maxWidth="740px">
        {!summaryData ? (
          <div style={{ padding: '30px', textAlign: 'center', fontSize: '16px' }}>Cargando resumen de caja...</div>
        ) : !isRevealed ? (
          /* PASO 1: CIERRE CIEGO CON CONTEO DE EFECTIVO Y TRANSFERENCIAS */
          <div>
            <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
              <div style={{ background: 'var(--bg-elevated)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Lock size={32} color="var(--accent-primary)" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700 }}>Cierre Ciego de Caja (Arqueo Físico)</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '580px', marginLeft: 'auto', marginRight: 'auto' }}>
                Ingresa el efectivo físico en caja y las transferencias comprobadas en bancos/Nequi antes de revelar la información del sistema.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input 
                label="1. Total en Efectivo Contado Físicamente en Caja ($)" 
                type="number"
                placeholder="Ej. 1450000.00"
                value={declaredCashInput}
                onChange={(e) => setDeclaredCashInput(e.target.value)}
                style={{ fontSize: '17px', fontWeight: 700, padding: '12px' }}
              />

              <Input 
                label="2. Total Verificado en Transferencias / Nequi / Bancos ($)" 
                type="number"
                placeholder="Ej. 350000.00 (Opcional)"
                value={declaredTransfersInput}
                onChange={(e) => setDeclaredTransfersInput(e.target.value)}
                style={{ fontSize: '17px', fontWeight: 700, padding: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <Button variant="ghost" onClick={() => setModalType(null)}>Cancelar</Button>
              <Button icon={<Eye size={18} />} onClick={handleCalculateBlindClose} style={{ padding: '12px 24px', fontSize: '15px' }}>
                Calcular Arqueo y Revelar Cierre
              </Button>
            </div>
          </div>
        ) : (
          /* PASO 2: CIERRE REVELADO CON PANELES SEGMENTADOS (SIN EMOJIS) */
          <div>
            {(() => {
              const declaredCash = parseFloat(declaredCashInput || 0);
              const expectedCash = summaryData.expectedCash;
              const cashDiff = declaredCash - expectedCash;

              const declaredTransfers = parseFloat(declaredTransfersInput || 0);
              const expectedTransfers = summaryData.transferSales || 0;
              const hasTransfers = declaredTransfersInput !== '';
              const transfersDiff = hasTransfers ? (declaredTransfers - expectedTransfers) : 0;
              const totalDiff = cashDiff + transfersDiff;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  
                  {/* BLOQUE DESTACADO DE DIFERENCIA TOTAL (EFECTIVO + TRANSFERENCIAS) */}
                  <div style={{ 
                    padding: '18px 20px', 
                    borderRadius: 'var(--radius-lg)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: totalDiff === 0 ? 'rgba(22, 163, 74, 0.15)' : totalDiff < 0 ? 'rgba(225, 29, 72, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                    border: `2px solid ${totalDiff === 0 ? 'var(--accent-primary)' : totalDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {totalDiff === 0 ? (
                        <CheckCircle2 size={32} color="var(--accent-primary)" />
                      ) : (
                        <AlertTriangle size={32} color={totalDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)'} />
                      )}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                          Resultado Arqueo Total (Efectivo + Transferencias)
                        </div>
                        <div style={{ fontSize: '17px', fontWeight: 800, color: totalDiff === 0 ? 'var(--accent-primary)' : totalDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                          {totalDiff === 0 ? 'Caja y Cuentas Cuadradas' : totalDiff < 0 ? 'Faltante Total en Arqueo' : 'Sobrante Total en Arqueo'}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: totalDiff === 0 ? 'var(--accent-primary)' : totalDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>
                        {formatCurrency(totalDiff)}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Efectivo: <span style={{ color: cashDiff === 0 ? 'inherit' : cashDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>{cashDiff >= 0 ? '+' : ''}{formatCurrency(cashDiff)}</span>
                        {hasTransfers && (
                          <span> | Transf: <span style={{ color: transfersDiff === 0 ? 'inherit' : transfersDiff < 0 ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>{transfersDiff >= 0 ? '+' : ''}{formatCurrency(transfersDiff)}</span></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MATRIZ DE PANELES TARJETAS (A, B, C, D) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    
                    {/* PANEL A: Control de Efectivo */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={16} /> Panel A: Control de Efectivo
                      </h4>
                      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Base Inicial Float:</span>
                          <strong>{formatCurrency(summaryData.initialFloat)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Ventas Efectivo:</span>
                          <strong style={{ color: 'var(--accent-primary)' }}>+ {formatCurrency(summaryData.cashSales)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Ingresos Manuales:</span>
                          <strong>+ {formatCurrency(summaryData.cashInflows)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Egresos / Salidas:</span>
                          <strong style={{ color: 'var(--accent-danger)' }}>- {formatCurrency(summaryData.cashOutflows)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Devoluciones Efectivo:</span>
                          <strong style={{ color: 'var(--accent-danger)' }}>- {formatCurrency(summaryData.cashRefunds)}</strong>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px' }}>
                          <span>Total Esperado Efectivo:</span>
                          <span>{formatCurrency(summaryData.expectedCash)}</span>
                        </div>
                      </div>
                    </div>

                    {/* PANEL B: Medios Digitales y Bancos */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Smartphone size={16} /> Panel B: Medios Digitales y Bancos
                      </h4>
                      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Tarjetas Crédito/Débito:</span>
                          <strong>{formatCurrency(summaryData.cardSales)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Transferencias en Sistema:</span>
                          <strong>{formatCurrency(summaryData.transferSales)}</strong>
                        </div>
                        {transfersDiff !== null && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '4px' }}>
                            <span>Transferencias Verificadas:</span>
                            <strong style={{ color: transfersDiff === 0 ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>
                              {formatCurrency(declaredTransfers)}
                            </strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Ventas a Crédito (Fiado):</span>
                          <strong>{formatCurrency(summaryData.creditSales)}</strong>
                        </div>
                        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: 'var(--accent-secondary)' }}>
                          <span>Total Digital / Crédito:</span>
                          <span>{formatCurrency(summaryData.cardSales + summaryData.transferSales + summaryData.creditSales)}</span>
                        </div>
                      </div>
                    </div>

                    {/* PANEL C: Deducciones y Propinas */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--accent-warning)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp size={16} /> Panel C: Propinas y Reembolsos
                      </h4>
                      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Propinas Recaudadas:</span>
                          <strong style={{ color: 'var(--accent-primary)', fontSize: '16px' }}>{formatCurrency(summaryData.totalTips)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Devoluciones Pagadas:</span>
                          <strong style={{ color: 'var(--accent-danger)' }}>{formatCurrency(summaryData.cashRefunds)}</strong>
                        </div>
                        {parseFloat(summaryData.thirdPartyRevenue || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '4px', color: '#d97706' }}>
                            <span style={{ fontWeight: 700 }}>Ventas de Terceros / Socios:</span>
                            <strong style={{ fontSize: '15px' }}>{formatCurrency(summaryData.thirdPartyRevenue)}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PANEL D: Auditoría y Seguridad Anti-Fraude */}
                    <div style={{ background: 'rgba(234, 179, 8, 0.12)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--accent-warning)' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 800, color: 'var(--accent-warning)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldAlert size={16} /> Panel D: Auditoría & Anti-Fraude
                      </h4>
                      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Órdenes / Precuentas Anuladas:</span>
                          <strong style={{ fontSize: '15px' }}>{summaryData.audit.canceledOrdersCount} órdenes</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Valor Anulaciones:</span>
                          <strong style={{ color: 'var(--accent-danger)', fontSize: '15px' }}>{formatCurrency(summaryData.audit.canceledAmount)}</strong>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                          * Informe registrado automáticamente para auditoría gerencial.
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* PIE DE ACCIONES FINAL */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <Button size="sm" variant="ghost" icon={<RefreshCcw size={14} />} onClick={() => setIsRevealed(false)}>
                      Modificar Conteo Físico / Digital
                    </Button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <Button variant="ghost" onClick={() => setModalType(null)}>Cancelar</Button>
                      <Button variant="danger" loading={submitting} onClick={handleConfirmFinalClose} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 700 }}>
                        Confirmar y Cerrar Caja Definitivamente
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};
