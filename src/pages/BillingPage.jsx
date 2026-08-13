// src/pages/BillingPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Printer, Check, Split, History, Receipt, Eye, Trash2, XCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const BillingPage = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId');
  const initialTableId = searchParams.get('tableId');

  const addToast = useUiStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'historial'
  const [pendingOrders, setPendingOrders] = useState([]);
  const [invoicesHistory, setInvoicesHistory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Modal para visualizar detalle de factura histórica en la plataforma
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Propina Voluntaria
  const [tipMode, setTipMode] = useState('percentage'); // 'percentage' | 'custom'
  const [tipPercentage, setTipPercentage] = useState(10);
  const [customTip, setCustomTip] = useState('');
  
  // División de Cuenta (Split Bill)
  const [splitCount, setSplitCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');

  // Formato Térmico (58mm vs 80mm)
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orders, invoices, settingsData] = await Promise.all([
        api.get('/orders'),
        api.get('/invoices'),
        api.get('/settings').catch(() => null)
      ]);

      setSettings(settingsData);
      if (settingsData && settingsData.default_paper_width) {
        setPaperWidth(settingsData.default_paper_width);
      }

      const active = orders.filter(o => ['abierta', 'enviado_cocina', 'en_preparacion', 'lista'].includes(o.status) && (Array.isArray(o.items) && o.items.length > 0));
      setPendingOrders(active);
      setInvoicesHistory(invoices);

      if (initialOrderId) {
        const found = active.find(o => o.id === parseInt(initialOrderId, 10));
        if (found) setSelectedOrder(found);
        else if (active.length > 0) setSelectedOrder(active[0]);
        else setSelectedOrder(null);
      } else if (initialTableId) {
        const found = active.find(o => o.table_id === parseInt(initialTableId, 10));
        if (found) setSelectedOrder(found);
        else if (active.length > 0) setSelectedOrder(active[0]);
        else setSelectedOrder(null);
      } else if (active.length > 0) {
        if (!selectedOrder || !active.some(o => o.id === selectedOrder.id)) {
          setSelectedOrder(active[0]);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error al cargar facturación:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectOrder = async (order) => {
    try {
      const fullOrder = await api.get(`/orders/${order.id}`);
      setSelectedOrder(fullOrder);
    } catch (e) {
      setSelectedOrder(order);
    }
  };

  const handleViewInvoiceDetail = (inv) => {
    setSelectedInvoiceDetail(inv);
    setViewInvoiceModalOpen(true);
  };

  // Eliminar / Anular Cuenta Pendiente por Cobrar
  const handleCancelPendingOrder = async (order, e) => {
    if (e) e.stopPropagation();
    const tableName = order.table_number || `Mesa #${order.table_id}`;
    if (!window.confirm(`¿Seguro que deseas eliminar/anular la cuenta pendiente de la ${tableName}? La mesa se marcará como LIBRE.`)) return;

    try {
      await api.post(`/orders/${order.id}/cancel`, { reason: 'Anulada desde facturación' });
      addToast(`Cuenta pendiente de ${tableName} eliminada y mesa liberada`, 'info');
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error al eliminar cuenta pendiente', 'danger');
    }
  };

  // Cálculo de Subtotal e Impuestos exactos por producto
  const calculateTotals = (items = []) => {
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach(item => {
      const rate = parseFloat(item.tax_rate || 0);
      const unitPrice = parseFloat(item.unit_price || 0);
      const quantity = parseFloat(item.quantity || 0);
      const lineTotal = quantity * unitPrice;
      const taxIncluded = Boolean(item.tax_included);

      if (taxIncluded && rate > 0) {
        const base = lineTotal / (1 + rate);
        subtotal += base;
        taxTotal += (lineTotal - base);
      } else if (!taxIncluded && rate > 0) {
        subtotal += lineTotal;
        taxTotal += (lineTotal * rate);
      } else {
        subtotal += lineTotal;
      }
    });
    return { subtotal, taxTotal };
  };

  const items = selectedOrder?.items || [];
  const { subtotal, taxTotal } = calculateTotals(items);
  const totalBeforeTip = subtotal + taxTotal;

  let computedTip = 0;
  if (tipMode === 'custom' && customTip !== '') {
    computedTip = parseFloat(customTip) || 0;
  } else {
    computedTip = totalBeforeTip * (tipPercentage / 100);
  }

  const grandTotal = totalBeforeTip + computedTip;
  const splitAmount = splitCount > 1 ? grandTotal / splitCount : grandTotal;

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const payload = {
        order_id: selectedOrder.id,
        payment_method: paymentMethod,
        ...(tipMode === 'custom' 
            ? { custom_tip_amount: computedTip }
            : { tip_percentage: tipPercentage / 100 })
      };

      const invoice = await api.post('/invoices', payload);
      setGeneratedInvoice({ 
        ...invoice, 
        items: selectedOrder.items,
        waiter_name: selectedOrder.waiter_name || 'Mesero',
        table_number: selectedOrder.table_number || `Mesa ${selectedOrder.table_id}`
      });
      setShowInvoiceModal(true);
      addToast('Factura generada con éxito', 'success');
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error al generar la factura. Verifica si la caja está abierta.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprintInvoice = (inv) => {
    setGeneratedInvoice(inv);
    setViewInvoiceModalOpen(false);
    setShowInvoiceModal(true);
  };

  // Función de impresión mediante iframe aislado
  const handlePrint = () => {
    const receiptHtml = document.getElementById('thermal-receipt-content')?.innerHTML;
    if (!receiptHtml) return;

    const widthCss = paperWidth === '58mm' ? '58mm' : '80mm';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura ${generatedInvoice?.invoice_number || ''}</title>
          <style>
            @page {
              size: ${widthCss} auto;
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 6px;
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === '58mm' ? '11px' : '12px'};
              width: ${widthCss};
              color: black;
              background: white;
            }
            table { width: 100%; border-collapse: collapse; }
            .dashed { border-top: 1px dashed #000; margin: 6px 0; }
            .solid { border-top: 1px solid #000; margin: 6px 0; }
            .bold { font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);

    addToast('Factura enviada a la impresora térmica', 'success');
  };

  const handlePrintPreBill = () => {
    if (!selectedOrder) return;
    const widthCss = paperWidth === '58mm' ? '58mm' : '80mm';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pre-Cuenta Mesa ${selectedOrder.table_number || selectedOrder.table_id}</title>
          <style>
            @page { size: ${widthCss} auto; margin: 0mm; }
            body {
              margin: 0; padding: 6px;
              font-family: 'Courier New', Courier, monospace;
              font-size: ${paperWidth === '58mm' ? '11px' : '12px'};
              color: black; background: white; width: ${widthCss};
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #000; margin: 6px 0; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          ${settings?.logo_url ? `<div class="center"><img src="${settings.logo_url}" style="max-height:50px; max-width:80%;" /></div>` : ''}
          <div class="center bold" style="font-size: 15px;">${settings?.business_name || 'JF POS'}</div>
          <div class="center">NIT: ${settings?.nit || '900.123.456-7'}</div>
          <div class="center bold" style="margin-top:4px;">*** PRE-CUENTA / PRE-FACTURA ***</div>
          <div class="center">(Documento no fiscal)</div>
          <div class="dashed"></div>
          <div>Mesa: ${selectedOrder.table_number || `Mesa ${selectedOrder.table_id}`}</div>
          <div>Atendido por: ${selectedOrder.waiter_name || 'Mesero'}</div>
          <div>Fecha: ${new Date().toLocaleString('es-CO')}</div>
          <div class="dashed"></div>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #000; text-align:left;">
                <th>Cant</th>
                <th>Producto</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td style="vertical-align:top; padding:2px 0;">${i.quantity}x</td>
                  <td style="vertical-align:top; padding:2px 0;">${i.name}</td>
                  <td style="vertical-align:top; padding:2px 0; text-align:right;">${formatCOP(i.unit_price * i.quantity)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="dashed"></div>
          <div class="flex-between">
            <span>Subtotal Neto:</span>
            <span>${formatCOP(subtotal)}</span>
          </div>
          <div class="flex-between">
            <span>Impuestos:</span>
            <span>${formatCOP(taxTotal)}</span>
          </div>
          <div class="flex-between bold" style="font-size:13px; border-top:1px dashed #000; margin-top:4px; padding-top:4px;">
            <span>TOTAL SIN PROPINA:</span>
            <span>${formatCOP(totalBeforeTip)}</span>
          </div>
          <div class="flex-between" style="margin-top:4px;">
            <span>Propina (10% sugerida):</span>
            <span>${formatCOP(totalBeforeTip * 0.1)}</span>
          </div>
          <div class="flex-between bold" style="font-size:14px; border-top:1px solid #000; margin-top:4px; padding-top:4px;">
            <span>TOTAL CON PROPINA:</span>
            <span>${formatCOP(totalBeforeTip * 1.1)}</span>
          </div>
          <div class="dashed"></div>
          <div class="center" style="font-size:10px;">${settings?.receipt_footer || '¡Gracias por su visita!'}</div>
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
    }, 300);

    addToast('Pre-factura enviada a la impresora térmica', 'info');
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando datos de facturación...</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 'var(--space-6)' }}>
      {/* Columna Izquierda: Pestañas Pendientes / Historial */}
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button 
            onClick={() => setActiveTab('pendientes')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
              background: activeTab === 'pendientes' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
              color: activeTab === 'pendientes' ? 'white' : 'var(--text-primary)', 
              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Receipt size={16} /> Pendientes ({pendingOrders.length})
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
              background: activeTab === 'historial' ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
              color: activeTab === 'historial' ? 'white' : 'var(--text-primary)', 
              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <History size={16} /> Historial ({invoicesHistory.length})
          </button>
        </div>

        {activeTab === 'pendientes' ? (
          <Card header="Mesas / Cuentas Pendientes por Cobrar">
            {pendingOrders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>No hay órdenes pendientes por cobrar</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
                {pendingOrders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  const { subtotal: orderSub, taxTotal: orderTax } = calculateTotals(order.items || []);
                  const orderTotalSinPropina = orderSub + orderTax;
                  return (
                    <div 
                      key={order.id} 
                      onClick={() => handleSelectOrder(order)}
                      style={{ 
                        padding: '12px', 
                        background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
                        color: isSelected ? 'white' : 'var(--text-primary)', 
                        borderRadius: 'var(--radius-md)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{order.table_number || `Mesa ${order.table_id}`}</span>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>Orden #{order.id} | Atendió: {order.waiter_name || 'Mesero'}</div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px' }}>{formatCOP(orderTotalSinPropina)}</span>
                        <button 
                          onClick={(e) => handleCancelPendingOrder(order, e)} 
                          style={{ 
                            background: 'rgba(225, 29, 72, 0.15)', 
                            border: 'none', 
                            borderRadius: '6px', 
                            color: isSelected ? 'white' : 'var(--accent-danger)', 
                            cursor: 'pointer', 
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }} 
                          title="Eliminar / Anular Cuenta Pendiente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ) : (
          <Card header="Historial de Facturas Emitidas">
            {invoicesHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0' }}>No hay facturas registradas aún</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
                {invoicesHistory.map(inv => (
                  <div 
                    key={inv.id} 
                    style={{ 
                      padding: '12px', 
                      background: 'var(--bg-secondary)', 
                      borderRadius: 'var(--radius-md)', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{inv.invoice_number}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inv.table_number} | Mesero: {inv.waiter_name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{inv.created_at}</div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCOP(inv.total)}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button size="sm" variant="secondary" icon={<Eye size={14} />} onClick={() => handleViewInvoiceDetail(inv)} style={{ padding: '2px 8px' }}>
                          Ver Detalle
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => handleReprintInvoice(inv)} style={{ padding: '2px 8px' }}>
                          Reimprimir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Columna Derecha: Detalle y Cobro de la Orden Seleccionada */}
      {selectedOrder ? (
        <Card header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>Facturación - {selectedOrder.table_number || `Mesa ${selectedOrder.table_id}`}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button size="sm" variant="secondary" icon={<FileText size={16} />} onClick={handlePrintPreBill}>
                Imprimir Pre-Factura
              </Button>
              <Button size="sm" variant="danger" icon={<Trash2 size={16} />} onClick={(e) => handleCancelPendingOrder(selectedOrder, e)}>
                Eliminar Cuenta Pendiente
              </Button>
            </div>
          </div>
        }>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Atendido por Mesero: <strong>{selectedOrder.waiter_name || 'Mesero Asignado'}</strong>
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px' }}>
            {items.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Esta orden no contiene ítems.</p>
            ) : (
              items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{item.quantity}x {item.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      ({item.tax_rate > 0 ? `${(item.tax_rate * 100).toFixed(0)}% imp` : 'Exento'})
                    </span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{formatCOP(item.unit_price * item.quantity)}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--text-secondary)' }}>
              <span>Subtotal Neto</span>
              <span>{formatCOP(subtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <span>Impuestos (IVA / Impoconsumo)</span>
              <span>{formatCOP(taxTotal)}</span>
            </div>

            {/* Valor Total Sin Propina */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-base)', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginBottom: '12px', color: 'var(--text-primary)' }}>
              <span>VALOR TOTAL SIN PROPINA</span>
              <span>{formatCOP(totalBeforeTip)}</span>
            </div>
            
            {/* Servicio / Propina Voluntaria */}
            <div style={{ marginBottom: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
                <span>Propina Voluntaria (calculada sobre Total Sin Propina)</span>
                <span style={{ color: 'var(--accent-primary)' }}>{formatCOP(computedTip)}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {[0, 10, 15, 20].map(pct => (
                  <button 
                    key={pct}
                    onClick={() => { setTipMode('percentage'); setTipPercentage(pct); }}
                    style={{ 
                      flex: 1, padding: '6px 0', borderRadius: '4px', border: '1px solid var(--border-color)',
                      background: (tipMode === 'percentage' && tipPercentage === pct) ? 'var(--accent-primary)' : 'transparent',
                      color: (tipMode === 'percentage' && tipPercentage === pct) ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600
                    }}
                  >{pct}%</button>
                ))}
                <button 
                  onClick={() => setTipMode('custom')}
                  style={{ 
                    padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-color)',
                    background: tipMode === 'custom' ? 'var(--accent-primary)' : 'transparent',
                    color: tipMode === 'custom' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600
                  }}
                >Personalizada</button>
              </div>

              {tipMode === 'custom' && (
                <Input 
                  type="number" 
                  placeholder="Ingrese valor exacto de propina ($)" 
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  style={{ marginBottom: 0 }}
                />
              )}
            </div>

            {/* Valor Total Con Propina */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-xl)', fontWeight: 700, borderTop: '2px solid var(--accent-primary)', paddingTop: '12px', marginBottom: '8px' }}>
              <span>VALOR TOTAL CON PROPINA</span>
              <span style={{ color: 'var(--accent-primary)' }}>{formatCOP(grandTotal)}</span>
            </div>

            {/* División de Cuenta (Split Bill) */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Split size={16} /> Dividir cuenta entre personas:
                </span>
                <select 
                  value={splitCount} 
                  onChange={(e) => setSplitCount(parseInt(e.target.value, 10))}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600 }}
                >
                  <option value="1">No dividir (1 pago)</option>
                  <option value="2">2 personas</option>
                  <option value="3">3 personas</option>
                  <option value="4">4 personas</option>
                  <option value="5">5 personas</option>
                </select>
              </div>
              {splitCount > 1 && (
                <div style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '8px' }}>
                  <span>Cuota por persona ({splitCount} partes):</span>
                  <span>{formatCOP(splitAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <Select 
              label="Método de Pago" 
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'tarjeta', label: 'Tarjeta de Crédito / Débito' },
                { value: 'transferencia', label: 'Transferencia Bancaria / Nequi' }
              ]}
            />
            <Select 
              label="Formato Impresora Térmica" 
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value)}
              options={[
                { value: '80mm', label: 'Tira Térmica 80mm' },
                { value: '58mm', label: 'Tira Térmica 58mm' }
              ]}
            />
          </div>

          <Button style={{ width: '100%' }} size="lg" loading={submitting} icon={<Check size={20} />} onClick={handleGenerateInvoice} disabled={items.length === 0}>
            Generar Factura Oficial e Imprimir
          </Button>
        </Card>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Selecciona una mesa pendiente para visualizar y facturar
        </Card>
      )}

      {/* Modal Visualizar Detalle de Factura Histórica en Plataforma */}
      <Modal isOpen={viewInvoiceModalOpen} onClose={() => setViewInvoiceModalOpen(false)} title={`Detalle Factura ${selectedInvoiceDetail?.invoice_number || ''}`}>
        {selectedInvoiceDetail && (
          <div>
            <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{selectedInvoiceDetail.invoice_number}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCOP(selectedInvoiceDetail.total)}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div>Mesa: {selectedInvoiceDetail.table_number ? (selectedInvoiceDetail.table_number.toLowerCase().startsWith('mesa') ? selectedInvoiceDetail.table_number : `Mesa ${selectedInvoiceDetail.table_number}`) : 'Mesa N/A'}</div>
                <div>Atendido por Mesero: <strong>{selectedInvoiceDetail.waiter_name || 'Mesero'}</strong></div>
                <div>Cajero: {selectedInvoiceDetail.cashier_name || 'Cajero'}</div>
                <div>Fecha y Hora: {selectedInvoiceDetail.created_at}</div>
                <div>Forma de Pago: <strong style={{ textTransform: 'uppercase' }}>{selectedInvoiceDetail.payment_method}</strong></div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Desglose de Ítems Consumidos</h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px' }}>
              {(selectedInvoiceDetail.items || []).map((i, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '13px' }}>
                  <span>{i.quantity}x {i.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatCOP(i.unit_price * i.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal Neto:</span>
                <span>{formatCOP(selectedInvoiceDetail.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Impuestos:</span>
                <span>{formatCOP(selectedInvoiceDetail.tax_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed var(--border-color)', marginTop: '4px', paddingTop: '4px' }}>
                <span>Total Sin Propina:</span>
                <span>{formatCOP(selectedInvoiceDetail.subtotal + selectedInvoiceDetail.tax_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Propina Voluntaria:</span>
                <span>{formatCOP(selectedInvoiceDetail.tip_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '15px', borderTop: '1px solid var(--border-color)', marginTop: '4px', paddingTop: '4px' }}>
                <span>TOTAL CON PROPINA:</span>
                <span>{formatCOP(selectedInvoiceDetail.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button variant="ghost" onClick={() => setViewInvoiceModalOpen(false)}>Cerrar</Button>
              <Button icon={<Printer size={16} />} onClick={() => handleReprintInvoice(selectedInvoiceDetail)}>
                Imprimir Factura
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Factura e Impresión Térmica */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title={`Comprobante Fiscal POS (${paperWidth})`}>
        {generatedInvoice && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div 
              style={{ 
                background: 'white', 
                color: 'black', 
                padding: '16px', 
                fontFamily: "'Courier New', Courier, monospace", 
                width: paperWidth === '58mm' ? '240px' : '320px', 
                fontSize: paperWidth === '58mm' ? '11px' : '12px',
                border: '1px solid #ccc',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <div id="thermal-receipt-content">
                {settings?.logo_url && (
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '60px', maxWidth: '80%' }} />
                  </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{settings?.business_name || 'JF POS ENTERPRISE'}</div>
                  <div>NIT: {settings?.nit || '900.123.456-7'}</div>
                  <div>{settings?.address || 'Calle 10 # 43-12, Medellín'}</div>
                  <div>Tel: {settings?.phone || '(604) 444-5566'}</div>
                </div>
                
                <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '8px 0' }}>
                  <div>Factura N°: <strong>{generatedInvoice.invoice_number}</strong></div>
                  <div>Mesa: {generatedInvoice.table_number ? (generatedInvoice.table_number.toLowerCase().startsWith('mesa') ? generatedInvoice.table_number : `Mesa ${generatedInvoice.table_number}`) : 'Mesa N/A'}</div>
                  <div>Atendido por: <strong>{generatedInvoice.waiter_name || 'Mesero'}</strong></div>
                  <div>Cajero: {generatedInvoice.cashier_name || 'Cajero'}</div>
                  <div>Fecha: {generatedInvoice.created_at}</div>
                  <div>Forma de Pago: {generatedInvoice.payment_method?.toUpperCase()}</div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                      <th style={{ paddingBottom: '4px' }}>Cant</th>
                      <th style={{ paddingBottom: '4px' }}>Producto</th>
                      <th style={{ paddingBottom: '4px', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(generatedInvoice.items || items).map((i, idx) => (
                      <tr key={idx}>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{i.quantity}x</td>
                        <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{i.name}</td>
                        <td style={{ verticalAlign: 'top', padding: '2px 0', textAlign: 'right' }}>{formatCOP(i.unit_price * i.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px dashed #000', paddingTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal Neto:</span>
                    <span>{formatCOP(generatedInvoice.subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Impuestos:</span>
                    <span>{formatCOP(generatedInvoice.tax_total)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px dashed #000', margin: '4px 0', paddingTop: '4px' }}>
                    <span>TOTAL SIN PROPINA:</span>
                    <span>{formatCOP(generatedInvoice.subtotal + generatedInvoice.tax_total)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Propina Voluntaria:</span>
                    <span>{formatCOP(generatedInvoice.tip_amount)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', marginTop: '6px', paddingTop: '4px' }}>
                    <span>TOTAL CON PROPINA:</span>
                    <span>{formatCOP(generatedInvoice.total)}</span>
                  </div>
                </div>

                {splitCount > 1 && (
                  <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '4px', fontSize: '11px' }}>
                    <div>Dividido en {splitCount} cuotas iguales:</div>
                    <div style={{ fontWeight: 'bold' }}>{formatCOP(generatedInvoice.total / splitCount)} / persona</div>
                  </div>
                )}
                
                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', textTransform: 'uppercase' }}>
                  *** {settings?.receipt_footer || '¡Gracias por su compra!'} ***
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="ghost" onClick={() => setShowInvoiceModal(false)}>Cerrar</Button>
          <Button icon={<Printer size={18} />} onClick={handlePrint}>Imprimir Factura ({paperWidth})</Button>
        </div>
      </Modal>
    </div>
  );
};
