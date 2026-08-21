// src/pages/BillingPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText, Printer, Check, Split, History, Receipt,
  Eye, Trash2, Tag, User, Percent, ShieldCheck, QrCode,
  Search, UserPlus, Phone, MapPin, Mail, X, Building, AlertCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { printInvoiceReceipt, printPreFactura, getCleanTableOrType } from '../utils/printUtils';

export const BillingPage = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId');
  const initialTableId = searchParams.get('tableId');

  const addToast = useUiStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'historial'
  const [pendingOrders, setPendingOrders] = useState([]);
  const [invoicesHistory, setInvoicesHistory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // CRM y Descuentos
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickDocType, setQuickDocType] = useState('CC');
  const [quickDocNum, setQuickDocNum] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickCustomerType, setQuickCustomerType] = useState('regular');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const [discountsList, setDiscountsList] = useState([]);
  const [discountMode, setDiscountMode] = useState('none'); // 'none' | 'promo' | 'manual'
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [manualDiscountValue, setManualDiscountValue] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState('percentage'); // 'percentage' | 'fixed'

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

  // Domicilio / Delivery Fee
  const [deliveryFee, setDeliveryFee] = useState(0);

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
      const [orders, invoices, settingsData, custData, discData] = await Promise.all([
        api.get('/orders'),
        api.get('/invoices'),
        api.get('/settings').catch(() => null),
        api.get('/customers').catch(() => []),
        api.get('/discounts').catch(() => [])
      ]);

      setSettings(settingsData);
      setCustomersList(custData || []);
      setDiscountsList(discData || []);
      if (settingsData && settingsData.default_paper_width) {
        setPaperWidth(settingsData.default_paper_width);
      }

      const active = orders.filter(o => ['abierta', 'enviado_cocina', 'en_preparacion', 'lista'].includes(o.status) && (Array.isArray(o.items) && o.items.length > 0));
      setPendingOrders(active);
      setInvoicesHistory(invoices);

      let targetOrder = null;
      if (initialOrderId) {
        targetOrder = active.find(o => o.id === parseInt(initialOrderId, 10));
      } else if (initialTableId) {
        targetOrder = active.find(o => o.table_id === parseInt(initialTableId, 10));
      } else if (active.length > 0) {
        targetOrder = active[0];
      }

      if (targetOrder) {
        loadOrderDetails(targetOrder);
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error al cargar facturación:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = (order) => {
    setSelectedOrder(order);
    setDeliveryFee(parseFloat(order.delivery_fee || 0));
    setSelectedCustomerId(order.customer_id ? order.customer_id.toString() : '');

    const initDiscount = parseFloat(order.discount_amount || 0);
    if (initDiscount > 0) {
      setDiscountMode('manual');
      setManualDiscountValue(initDiscount.toString());
      setManualDiscountType('fixed');
    } else {
      setDiscountMode('none');
      setSelectedDiscountId('');
      setManualDiscountValue('');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectOrder = async (order) => {
    try {
      const fullOrder = await api.get(`/orders/${order.id}`);
      loadOrderDetails(fullOrder);
    } catch (e) {
      loadOrderDetails(order);
    }
  };

  const handleViewInvoiceDetail = (inv) => {
    setSelectedInvoiceDetail(inv);
    setViewInvoiceModalOpen(true);
  };

  // Filtrado reactivo de clientes por nombre, documento, teléfono o email
  const filteredCustomers = customersList.filter(c => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.document_number || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const handleOpenQuickCustomer = () => {
    setQuickName(customerSearchQuery || '');
    setQuickDocType('CC');
    setQuickDocNum('');
    setQuickPhone('');
    setQuickEmail('');
    setQuickAddress('');
    setQuickCustomerType('regular');
    setCustomerDropdownOpen(false);
    setQuickCustomerModalOpen(true);
  };

  const handleSaveQuickCustomer = async (e) => {
    e.preventDefault();
    if (!quickName.trim()) {
      addToast('El nombre del cliente es requerido', 'error');
      return;
    }

    try {
      setQuickSubmitting(true);
      const newCust = await api.post('/customers', {
        name: quickName.trim(),
        document_type: quickDocType,
        document_number: quickDocNum.trim() || null,
        phone: quickPhone.trim() || null,
        email: quickEmail.trim() || null,
        address: quickAddress.trim() || null,
        customer_type: quickCustomerType,
        city: 'Medellín'
      });

      setCustomersList(prev => [...prev, newCust]);
      setSelectedCustomerId(newCust.id.toString());
      setCustomerSearchQuery('');
      setCustomerDropdownOpen(false);
      setQuickCustomerModalOpen(false);
      addToast(`Cliente "${newCust.name}" registrado y seleccionado`, 'success');
    } catch (err) {
      addToast(err.message || 'Error al registrar cliente', 'error');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Eliminar / Anular Cuenta Pendiente por Cobrar
  const handleCancelPendingOrder = async (order, e) => {
    if (e) e.stopPropagation();
    const label = order.order_type === 'delivery'
      ? `Domicilio #${order.id} (${order.customer_name || 'Cliente'})`
      : (order.table_number || `Mesa #${order.table_id}`);
    if (!window.confirm(`¿Seguro que deseas anular la orden pendiente de ${label}?`)) return;

    try {
      await api.post(`/orders/${order.id}/cancel`, { reason: 'Anulada desde facturación' });
      addToast(`Orden pendiente de ${label} anulada`, 'info');
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
    const taxDetailsMap = {};

    items.forEach(item => {
      const rate = parseFloat(item.tax_rate || 0);
      const unitPrice = parseFloat(item.unit_price || 0);
      const quantity = parseFloat(item.quantity || 0);
      const lineTotal = quantity * unitPrice;
      const taxIncluded = Boolean(item.tax_included);

      let itemBase = 0;
      let itemTax = 0;

      if (taxIncluded && rate > 0) {
        itemBase = lineTotal / (1 + rate);
        itemTax = lineTotal - itemBase;
      } else if (!taxIncluded && rate > 0) {
        itemBase = lineTotal;
        itemTax = lineTotal * rate;
      } else {
        itemBase = lineTotal;
        itemTax = 0;
      }

      subtotal += itemBase;
      taxTotal += itemTax;

      const rateKey = rate === 0.08 ? 'Impoconsumo (8%)' : (rate === 0.19 ? 'IVA (19%)' : 'Exento (0%)');
      if (!taxDetailsMap[rateKey]) {
        taxDetailsMap[rateKey] = { name: rateKey, rate, base: 0, tax: 0 };
      }
      taxDetailsMap[rateKey].base += itemBase;
      taxDetailsMap[rateKey].tax += itemTax;
    });

    return { subtotal, taxTotal, taxDetails: Object.values(taxDetailsMap) };
  };

  const items = selectedOrder?.items || [];
  const { subtotal, taxTotal, taxDetails } = calculateTotals(items);

  // Cálculo del Descuento
  let appliedDiscountAmount = 0;
  let appliedDiscountLabel = '';
  if (discountMode === 'promo' && selectedDiscountId) {
    const promo = discountsList.find(d => d.id.toString() === selectedDiscountId);
    if (promo) {
      const discountVal = parseFloat(promo.value !== undefined ? promo.value : (promo.discount_value || 0)) || 0;
      appliedDiscountLabel = promo.name;
      if (promo.discount_type === 'percentage') {
        appliedDiscountAmount = (subtotal * discountVal) / 100;
        appliedDiscountLabel = `${promo.name} (${discountVal}%)`;
      } else {
        appliedDiscountAmount = discountVal;
        appliedDiscountLabel = `${promo.name} (${formatCOP(discountVal)})`;
      }
    }
  } else if (discountMode === 'manual' && manualDiscountValue !== '') {
    const val = parseFloat(manualDiscountValue) || 0;
    if (manualDiscountType === 'percentage') {
      appliedDiscountAmount = (subtotal * val) / 100;
      appliedDiscountLabel = `Descuento Manual (${val}%)`;
    } else {
      appliedDiscountAmount = val;
      appliedDiscountLabel = `Descuento Manual (${formatCOP(val)})`;
    }
  }
  appliedDiscountAmount = Math.min(subtotal, Math.max(0, appliedDiscountAmount));

  const subtotalAfterDiscount = Math.max(0, subtotal - appliedDiscountAmount);
  const totalBeforeTip = subtotalAfterDiscount + taxTotal;

  let computedTip = 0;
  if (tipMode === 'custom' && customTip !== '') {
    computedTip = parseFloat(customTip) || 0;
  } else {
    computedTip = totalBeforeTip * (tipPercentage / 100);
  }

  const currentDeliveryFee = parseFloat(deliveryFee) || 0;
  const grandTotal = totalBeforeTip + computedTip + currentDeliveryFee;
  const splitAmount = splitCount > 1 ? grandTotal / splitCount : grandTotal;

  // Obtener datos del cliente seleccionado
  const selectedCustomerObj = customersList.find(c => c.id.toString() === selectedCustomerId) || (selectedOrder?.customer_name ? {
    name: selectedOrder.customer_name,
    document_type: selectedOrder.customer_doc_type || 'CC',
    document_number: selectedOrder.customer_document || '222222222222',
    phone: selectedOrder.customer_phone || '',
    address: selectedOrder.customer_address || '',
    email: selectedOrder.customer_email || ''
  } : null);

  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      const payload = {
        order_id: selectedOrder.id,
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        payment_method: paymentMethod,
        delivery_fee: currentDeliveryFee,
        discount_amount: appliedDiscountAmount,
        discount_type: appliedDiscountLabel || (appliedDiscountAmount > 0 ? 'Descuento Comercial' : null),
        ...(tipMode === 'custom'
          ? { custom_tip_amount: computedTip }
          : { tip_percentage: tipPercentage / 100 })
      };

      const invoice = await api.post('/invoices', payload);
      setGeneratedInvoice({
        ...invoice,
        items: selectedOrder.items,
        tax_details: taxDetails,
        customer_name: selectedCustomerObj?.name || invoice.customer_name || 'Consumidor Final',
        customer_doc_type: selectedCustomerObj?.document_type || invoice.customer_doc_type || 'CC',
        customer_document: selectedCustomerObj?.document_number || invoice.customer_document || '222222222222',
        customer_phone: selectedCustomerObj?.phone || invoice.customer_phone || '',
        customer_address: selectedCustomerObj?.address || invoice.customer_address || '',
        customer_email: selectedCustomerObj?.email || invoice.customer_email || '',
        delivery_fee: currentDeliveryFee,
        discount_amount: appliedDiscountAmount,
        discount_type: appliedDiscountLabel,
        waiter_name: selectedOrder.waiter_name || 'Mesero',
        table_number: selectedOrder.order_type === 'delivery'
          ? `Domicilio (${selectedCustomerObj?.name || 'Cliente'})`
          : (selectedOrder.table_number || `Mesa ${selectedOrder.table_id}`)
      });
      setShowInvoiceModal(true);
      addToast('Factura oficial POS generada exitosamente', 'success');
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error al generar la factura. Verifica si la caja está abierta.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprintInvoice = (inv) => {
    const cust = customersList.find(c => c.id === inv.customer_id);
    setGeneratedInvoice({
      ...inv,
      customer_name: inv.customer_name || cust?.name || 'Consumidor Final',
      customer_doc_type: inv.customer_doc_type || cust?.document_type || 'CC',
      customer_document: inv.customer_document || cust?.document_number || '222222222222',
      customer_phone: inv.customer_phone || cust?.phone || '',
      customer_address: inv.customer_address || cust?.address || '',
      customer_email: inv.customer_email || cust?.email || ''
    });
    setViewInvoiceModalOpen(false);
    setShowInvoiceModal(true);
  };

  // Impresión térmica unificada usando printUtils
  const handlePrint = () => {
    if (!generatedInvoice) return;
    printInvoiceReceipt(generatedInvoice, settings || {}, paperWidth || '80mm');
    addToast('Factura enviada a la impresora térmica', 'success');
  };

  const handlePrintPreBill = () => {
    if (!selectedOrder) return;
    printPreFactura(
      selectedOrder,
      items,
      settings || {},
      paperWidth || '80mm',
      {
        itemsSubtotal: subtotal,
        discountVal: appliedDiscountAmount,
        delFee: currentDeliveryFee,
        tipVal: computedTip
      }
    );
    addToast('Pre-factura enviada a imprimir', 'info');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 'var(--space-4)' }}>
      {/* Columna Izquierda: Lista de Cuentas Pendientes & Historial */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setActiveTab('pendientes')}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: 'none',
              background: activeTab === 'pendientes' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'pendientes' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer', fontWeight: 700, fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Receipt size={14} /> Pendientes ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            style={{
              flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: 'none',
              background: activeTab === 'historial' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'historial' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer', fontWeight: 700, fontSize: 'var(--font-xs)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <History size={14} /> Historial ({invoicesHistory.length})
          </button>
        </div>

        {activeTab === 'pendientes' ? (
          <Card header="Mesas / Cuentas Pendientes por Cobrar">
            {pendingOrders.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0', fontSize: 'var(--font-xs)' }}>
                No hay órdenes pendientes por cobrar
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '550px', overflowY: 'auto' }}>
                {pendingOrders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  const { subtotal: orderSub, taxTotal: orderTax } = calculateTotals(order.items || []);
                  const orderTotal = orderSub + orderTax + parseFloat(order.delivery_fee || 0) - parseFloat(order.discount_amount || 0);

                  return (
                    <div
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      style={{
                        padding: '8px 10px',
                        background: isSelected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: isSelected ? 'white' : 'var(--text-primary)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontWeight: 700, fontSize: '12px' }}>
                            {order.order_type === 'delivery'
                              ? `🛵 Domicilio #${order.id}`
                              : (order.table_number || `Mesa #${order.table_id}`)}
                          </span>
                          {order.order_type === 'delivery' && (
                            <span style={{ fontSize: '9px', background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(6, 182, 212, 0.2)', color: isSelected ? 'white' : 'var(--accent-secondary)', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                              {order.customer_name || 'Particular'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>
                          {order.order_type === 'delivery' && order.delivery_address ? `Dir: ${order.delivery_address}` : `Atendió: ${order.waiter_name || 'Mesero'}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '12px' }}>
                          {formatCOP(Math.max(0, orderTotal))}
                        </span>
                        <button
                          onClick={(e) => handleCancelPendingOrder(order, e)}
                          style={{
                            background: 'rgba(225, 29, 72, 0.15)',
                            border: 'none',
                            borderRadius: '4px',
                            color: isSelected ? 'white' : 'var(--accent-danger)',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Eliminar / Anular Cuenta Pendiente"
                        >
                          <Trash2 size={13} />
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
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '20px 0', fontSize: 'var(--font-xs)' }}>
                No hay facturas registradas aún
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '550px', overflowY: 'auto' }}>
                {invoicesHistory.map(inv => (
                  <div
                    key={inv.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>{inv.invoice_number}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {inv.customer_name ? `Cliente: ${inv.customer_name}` : (inv.table_number || 'POS Directo')}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{inv.created_at}</div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '12px' }}>{formatCOP(inv.total)}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button size="sm" variant="secondary" icon={<Eye size={12} />} onClick={() => handleViewInvoiceDetail(inv)} style={{ padding: '2px 6px', fontSize: '10px' }}>
                          Ver
                        </Button>
                        <Button size="sm" variant="ghost" icon={<Printer size={12} />} onClick={() => handleReprintInvoice(inv)} style={{ padding: '2px 6px', fontSize: '10px' }}>
                          Imprimir
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

      {/* Columna Derecha: Detalle, Datos Cliente, Descuentos y Cobro */}
      {selectedOrder ? (
        <Card header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontWeight: 800 }}>
              Facturación - {selectedOrder.order_type === 'delivery' ? `Domicilio #${selectedOrder.id}` : (selectedOrder.table_number || `Mesa ${selectedOrder.table_id}`)}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Button size="sm" variant="secondary" icon={<FileText size={14} />} onClick={handlePrintPreBill} style={{ fontSize: '11px', padding: '4px 8px' }}>
                Pre-Factura
              </Button>
              <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={(e) => handleCancelPendingOrder(selectedOrder, e)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                Anular
              </Button>
            </div>
          </div>
        }>
          {/* Datos del Cliente CRM & Facturación */}
          <div style={{ background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={14} color="var(--accent-secondary)" /> Datos del Cliente / Facturación
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomerId(''); setCustomerSearchQuery(''); }}
                  style={{
                    padding: '3px 8px', borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: !selectedCustomerId ? 'var(--accent-secondary)' : 'var(--bg-primary)',
                    color: !selectedCustomerId ? '#fff' : 'var(--text-secondary)',
                    fontSize: '10.5px', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Facturar a Consumidor Final (222222222222)"
                >
                  Consumidor Final
                </button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenQuickCustomer}
                  icon={<UserPlus size={12} />}
                  style={{ padding: '3px 8px', fontSize: '10.5px' }}
                >
                  Nuevo Cliente
                </Button>
              </div>
            </div>

            {/* Si hay un cliente seleccionado específico */}
            {selectedCustomerObj && selectedCustomerId ? (
              <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                    {selectedCustomerObj.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-primary)' }}>{selectedCustomerObj.name}</span>
                      <Badge variant="primary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {selectedCustomerObj.document_type || 'CC'}: {selectedCustomerObj.document_number || 'Sin doc'}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {selectedCustomerObj.phone && <span>📞 {selectedCustomerObj.phone}</span>}
                      {selectedCustomerObj.email && <span>✉️ {selectedCustomerObj.email}</span>}
                      {selectedCustomerObj.address && <span>📍 {selectedCustomerObj.address}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setSelectedCustomerId(''); setCustomerSearchQuery(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent-danger)',
                    cursor: 'pointer', padding: '4px 8px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                  title="Quitar cliente y volver a Consumidor Final"
                >
                  <X size={14} /> Cambiar
                </button>
              </div>
            ) : (
              /* Buscador predictivo interactivo */
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Input
                    placeholder="Buscar cliente por Nombre, Cédula / NIT, Teléfono o Email..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    style={{ marginBottom: 0, fontSize: '11.5px', paddingLeft: '28px' }}
                  />
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', pointerEvents: 'none' }} />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => { setCustomerSearchQuery(''); setCustomerDropdownOpen(false); }}
                      style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {customerDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      borderRadius: '6px', marginTop: '4px', maxHeight: '220px', overflowY: 'auto',
                      zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Clientes encontrados ({filteredCustomers.length})</span>
                      <button
                        type="button"
                        onClick={() => setCustomerDropdownOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                      >
                        Cerrar ✕
                      </button>
                    </div>

                    {filteredCustomers.length === 0 ? (
                      <div style={{ padding: '14px', textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        <div>No se encontró ningún cliente con "{customerSearchQuery}".</div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<UserPlus size={13} />}
                          onClick={handleOpenQuickCustomer}
                          style={{ marginTop: '8px', fontSize: '11px' }}
                        >
                          Registrar a "{customerSearchQuery}"
                        </Button>
                      </div>
                    ) : (
                      filteredCustomers.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id.toString());
                            setCustomerSearchQuery('');
                            setCustomerDropdownOpen(false);
                            addToast(`Cliente "${c.name}" seleccionado`, 'info');
                          }}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '7px 10px', borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer', transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {c.document_type || 'CC'}: {c.document_number || 'Sin doc'} {c.phone ? `• Tel: ${c.phone}` : ''} {c.email ? `• ${c.email}` : ''}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 700 }}>+ Seleccionar</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Ítems */}
          <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 8px' }}>
            {items.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Esta orden no contiene ítems.</p>
            ) : (
              items.map((item, idx) => {
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
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.quantity}x {item.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                          ({item.tax_rate > 0 ? `${(item.tax_rate * 100).toFixed(0)}% imp` : 'Exento'})
                        </span>
                      </div>
                      <span style={{ fontWeight: 700 }}>{formatCOP(item.unit_price * item.quantity)}</span>
                    </div>
                    {Array.isArray(parsedMods) && parsedMods.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '1px' }}>
                        {parsedMods.map((m, mIdx) => {
                          const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                          return (
                            <span
                              key={mIdx}
                              style={{
                                fontSize: '9.5px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              🍨 {m.name} {m.quantity > 1 ? `(x${m.quantity})` : ''} {extra > 0 ? `(+${formatCOP(extra)})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Financiero: Descuentos, Domicilio, Propina, Totales */}
          <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: 'var(--text-secondary)', fontSize: '11px' }}>
              <span>Subtotal Bruto</span>
              <span>{formatCOP(subtotal)}</span>
            </div>

            {/* Módulo de Descuentos */}
            <div style={{ borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', padding: '6px 0', margin: '4px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} /> Descuento Comercial / Promociones
                </span>
                {appliedDiscountAmount > 0 && (
                  <span style={{ fontWeight: 800, color: 'var(--accent-danger)', fontSize: '11px' }}>
                    -{formatCOP(appliedDiscountAmount)}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setDiscountMode('none'); setSelectedDiscountId(''); setManualDiscountValue(''); }}
                    style={{
                      flex: 1, padding: '3px 6px', borderRadius: '3px', border: '1px solid var(--border-color)',
                      background: discountMode === 'none' ? 'var(--bg-elevated)' : 'transparent',
                      color: discountMode === 'none' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '10px', cursor: 'pointer'
                    }}
                  >
                    Sin Dcto
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('promo')}
                    style={{
                      flex: 1, padding: '3px 6px', borderRadius: '3px', border: '1px solid var(--border-color)',
                      background: discountMode === 'promo' ? 'var(--accent-warning)' : 'transparent',
                      color: discountMode === 'promo' ? 'black' : 'var(--text-muted)', fontWeight: 700, fontSize: '10px', cursor: 'pointer'
                    }}
                  >
                    Promoción
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('manual')}
                    style={{
                      flex: 1, padding: '3px 6px', borderRadius: '3px', border: '1px solid var(--border-color)',
                      background: discountMode === 'manual' ? 'var(--accent-warning)' : 'transparent',
                      color: discountMode === 'manual' ? 'black' : 'var(--text-muted)', fontWeight: 700, fontSize: '10px', cursor: 'pointer'
                    }}
                  >
                    Manual
                  </button>
                </div>

                {discountMode === 'promo' && (
                  <select
                    value={selectedDiscountId}
                    onChange={(e) => setSelectedDiscountId(e.target.value)}
                    style={{
                      width: '100%', padding: '4px 6px', background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)', fontSize: '10px'
                    }}
                  >
                    <option value="">Seleccionar Promoción...</option>
                    {discountsList.map(d => {
                      const val = d.value !== undefined ? d.value : d.discount_value;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.discount_type === 'percentage' ? `${val}%` : formatCOP(val)})
                        </option>
                      );
                    })}
                  </select>
                )}

                {discountMode === 'manual' && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Input
                      type="number"
                      min="0"
                      placeholder={manualDiscountType === 'percentage' ? '%' : '$'}
                      value={manualDiscountValue}
                      onChange={(e) => setManualDiscountValue(e.target.value)}
                      style={{ padding: '3px 6px', fontSize: '10px', marginBottom: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setManualDiscountType(manualDiscountType === 'percentage' ? 'fixed' : 'percentage')}
                      style={{ padding: '3px 6px', borderRadius: '3px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      {manualDiscountType === 'percentage' ? '%' : '$'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', color: 'var(--text-secondary)', fontSize: '11px' }}>
              <span>Impuestos DIAN (IVA / Impoconsumo)</span>
              <span>{formatCOP(taxTotal)}</span>
            </div>

            {/* Tarifa de Domicilio / Envío */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                Tarifa de Domicilio ($)
              </span>
              <div style={{ width: '120px' }}>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="0"
                  value={deliveryFee.toString()}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  style={{ padding: '2px 6px', fontSize: '11px', marginBottom: 0, textAlign: 'right' }}
                />
              </div>
            </div>

            {/* Servicio / Propina Voluntaria */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600 }}>Propina Voluntaria:</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCOP(computedTip)}</span>
              </div>

              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[0, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    onClick={() => { setTipMode('percentage'); setTipPercentage(pct); }}
                    style={{
                      flex: 1, padding: '3px 0', borderRadius: '3px', border: '1px solid var(--border-color)',
                      background: (tipMode === 'percentage' && tipPercentage === pct) ? 'var(--accent-primary)' : 'transparent',
                      color: (tipMode === 'percentage' && tipPercentage === pct) ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '10px'
                    }}
                  >{pct}%</button>
                ))}
                <button
                  onClick={() => setTipMode('custom')}
                  style={{
                    padding: '3px 6px', borderRadius: '3px', border: '1px solid var(--border-color)',
                    background: tipMode === 'custom' ? 'var(--accent-primary)' : 'transparent',
                    color: tipMode === 'custom' ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '10px'
                  }}
                >Valor</button>
              </div>

              {tipMode === 'custom' && (
                <Input
                  type="number"
                  placeholder="Valor exacto propina ($)"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  style={{ marginBottom: 0, padding: '3px 6px', fontSize: '11px' }}
                />
              )}
            </div>

            {/* Valor Total Final */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-base)', fontWeight: 800, borderTop: '2px solid var(--accent-primary)', paddingTop: '8px', marginTop: '6px' }}>
              <span>TOTAL A COBRAR:</span>
              <span style={{ color: 'var(--accent-primary)' }}>{formatCOP(grandTotal)}</span>
            </div>

            {/* División de Cuenta (Split Bill) */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <Split size={13} /> Dividir cuenta:
                </span>
                <select
                  value={splitCount}
                  onChange={(e) => setSplitCount(parseInt(e.target.value, 10))}
                  style={{ padding: '2px 6px', borderRadius: '3px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '11px' }}
                >
                  <option value="1">1 pago (Total)</option>
                  <option value="2">2 personas</option>
                  <option value="3">3 personas</option>
                  <option value="4">4 personas</option>
                  <option value="5">5 personas</option>
                </select>
              </div>
              {splitCount > 1 && (
                <div style={{ background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '4px' }}>
                  <span>Cuota por persona:</span>
                  <span>{formatCOP(splitAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <Select
              label="Forma de Pago"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'efectivo', label: 'Efectivo' },
                { value: 'tarjeta', label: 'Tarjeta de Crédito / Débito' },
                { value: 'transferencia', label: 'Transferencia / Nequi / Daviplata' },
                { value: 'credito', label: 'Crédito Cliente (Cuenta por Cobrar)' }
              ]}
            />
            <Select
              label="Impresora Térmica"
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value)}
              options={[
                { value: '80mm', label: 'Tira Térmica 80mm' },
                { value: '58mm', label: 'Tira Térmica 58mm' }
              ]}
            />
          </div>

          <Button style={{ width: '100%' }} size="md" loading={submitting} icon={<Check size={16} />} onClick={handleGenerateInvoice} disabled={items.length === 0}>
            Generar Factura Oficial POS e Imprimir
          </Button>
        </Card>
      ) : (
        <Card style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', minHeight: '300px' }}>
          Selecciona una mesa o domicilio pendiente para visualizar y facturar
        </Card>
      )}

      {/* Modal Detalle Factura Histórica */}
      <Modal isOpen={viewInvoiceModalOpen} onClose={() => setViewInvoiceModalOpen(false)} title={`Detalle Factura ${selectedInvoiceDetail?.invoice_number || ''}`}>
        {selectedInvoiceDetail && (
          <div>
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>{selectedInvoiceDetail.invoice_number}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{formatCOP(selectedInvoiceDetail.total)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', color: 'var(--text-secondary)' }}>
                <div>Cliente: <strong>{selectedInvoiceDetail.customer_name || 'Consumidor Final'}</strong></div>
                <div>NIT/CC: <strong>{selectedInvoiceDetail.customer_document || '222222222222'}</strong></div>
                <div>Lugar: {selectedInvoiceDetail.table_number || 'POS'}</div>
                <div>Forma de Pago: <strong style={{ textTransform: 'uppercase' }}>{selectedInvoiceDetail.payment_method}</strong></div>
                <div>Fecha: {selectedInvoiceDetail.created_at}</div>
                <div>Cajero: {selectedInvoiceDetail.cashier_name || 'Cajero'}</div>
              </div>
            </div>

            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '12px', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 8px' }}>
              {(selectedInvoiceDetail.items || []).map((i, idx) => {
                const rawMods = i.modifiers || i.modifiers_json;
                let parsedMods = [];
                if (rawMods) {
                  try {
                    parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                  } catch (e) {
                    parsedMods = Array.isArray(rawMods) ? rawMods : [];
                  }
                }
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '3px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{i.quantity}x {i.name}</span>
                      <span style={{ fontWeight: 700 }}>{formatCOP(i.unit_price * i.quantity)}</span>
                    </div>
                    {Array.isArray(parsedMods) && parsedMods.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '1px' }}>
                        {parsedMods.map((m, mIdx) => {
                          const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                          return (
                            <span
                              key={mIdx}
                              style={{
                                fontSize: '10px',
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              🍨 {m.name} {m.quantity > 1 ? `(x${m.quantity})` : ''} {extra > 0 ? `(+${formatCOP(extra)})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal Neto:</span>
                <span>{formatCOP(selectedInvoiceDetail.subtotal)}</span>
              </div>
              {parseFloat(selectedInvoiceDetail.discount_amount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-danger)', fontWeight: 700 }}>
                  <span>(-) Descuento Aplicado:</span>
                  <span>-{formatCOP(selectedInvoiceDetail.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Impuestos:</span>
                <span>{formatCOP(selectedInvoiceDetail.tax_total)}</span>
              </div>
              {parseFloat(selectedInvoiceDetail.delivery_fee || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-secondary)' }}>
                  <span>Servicio Domicilio:</span>
                  <span>{formatCOP(selectedInvoiceDetail.delivery_fee)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Propina Voluntaria:</span>
                <span>{formatCOP(selectedInvoiceDetail.tip_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '14px', borderTop: '1px solid var(--border-color)', marginTop: '4px', paddingTop: '4px' }}>
                <span>TOTAL FACTURADO:</span>
                <span>{formatCOP(selectedInvoiceDetail.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setViewInvoiceModalOpen(false)}>Cerrar</Button>
              <Button icon={<Printer size={15} />} onClick={() => handleReprintInvoice(selectedInvoiceDetail)}>
                Imprimir Factura
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Factura Oficial e Impresión Térmica con DIAN & Helvetica Neue */}
      <Modal isOpen={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title={`Comprobante Fiscal POS (${paperWidth})`}>
        {generatedInvoice && (() => {
          const effSettings = { ...(generatedInvoice.settings || {}), ...(settings || {}) };
          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  padding: paperWidth === '58mm' ? '10px 8px' : '14px 12px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  width: paperWidth === '58mm' ? '250px' : '310px',
                  fontSize: paperWidth === '58mm' ? '11px' : '12px',
                  border: '1px solid #000',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  lineHeight: 1.35,
                  fontWeight: 500
                }}
              >
                <div id="thermal-receipt-content">
                  {/* Encabezado Negocio con Logo */}
                  {effSettings.logo_url && (
                    <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                      <img
                        src={effSettings.logo_url}
                        alt="Logo"
                        style={{ maxHeight: '55px', maxWidth: '140px', objectFit: 'contain', display: 'inline-block', filter: 'grayscale(100%) contrast(170%)', imageRendering: 'crisp-edges' }}
                      />
                    </div>
                  )}
                  <div style={{ textAlign: 'center', marginBottom: '6px', color: '#000' }}>
                    <div style={{ fontSize: paperWidth === '58mm' ? '13px' : '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.2px', color: '#000' }}>
                      {effSettings.business_name || 'GASTROSPOS RESTAURANTE'}
                    </div>
                    <div style={{ fontSize: paperWidth === '58mm' ? '10px' : '11px', fontWeight: 800, color: '#000' }}>
                      NIT: {effSettings.tax_id || effSettings.nit || '900.123.456-7'}
                    </div>
                    {effSettings.address && <div style={{ fontSize: '10px', color: '#000' }}>{effSettings.address}</div>}
                    {effSettings.phone && <div style={{ fontSize: '10px', color: '#000' }}>Tel: {effSettings.phone}</div>}
                    {(() => {
                      const shouldPrint = effSettings.print_tax_regime !== undefined ? (effSettings.print_tax_regime === true || effSettings.print_tax_regime === 1 || effSettings.print_tax_regime === 'true') : true;
                      if (!shouldPrint) return null;
                      const custom = effSettings.custom_tax_regime_text;
                      const regime = effSettings.tax_regime;
                      const text = custom && custom.trim() ? custom.trim() : (
                        regime === 'impoconsumo' ? 'Impoconsumo (INC 8%)' :
                        regime === 'iva' ? 'Responsable de IVA' :
                        regime === 'no_responsable' ? 'No Responsable de IVA' :
                        regime === 'ambos' ? 'Responsable de IVA e INC (8%)' :
                        regime === 'rst' ? 'Régimen Simple de Tributación (RST)' :
                        (regime && regime !== 'personalizado' ? regime : 'Impoconsumo (INC 8%)')
                      );
                      return <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#000', marginTop: '1px' }}>{text}</div>;
                    })()}
                  </div>

                  <div style={{ borderTop: '1px solid #000', margin: '5px 0' }}></div>
                  <div style={{ fontSize: paperWidth === '58mm' ? '13px' : '14.5px', textAlign: 'center', fontWeight: 800, color: '#000' }}>
                    FACTURA DE VENTA POS
                  </div>
                  <div style={{ fontSize: paperWidth === '58mm' ? '13.5px' : '15px', textAlign: 'center', fontWeight: 900, color: '#000' }}>
                    N° {generatedInvoice.invoice_number || 'POS-0000'}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', margin: '2.5px 0', color: '#000' }}>
                    <span>Fecha / Hora:</span>
                    <span>{generatedInvoice.created_at || new Date().toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', margin: '2.5px 0', color: '#000' }}>
                    <span>Cajero:</span>
                    <span>{generatedInvoice.cashier_name || 'Caja'}</span>
                  </div>
                  {generatedInvoice.waiter_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', margin: '2.5px 0', color: '#000' }}>
                      <span>Mesero:</span>
                      <span>{generatedInvoice.waiter_name}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', margin: '2.5px 0', color: '#000' }}>
                    <span>Espacio / Mesa:</span>
                    <span style={{ fontWeight: 800 }}>{getCleanTableOrType(generatedInvoice)}</span>
                  </div>

                  <div style={{ borderTop: '1px solid #000', margin: '5px 0' }}></div>
                  {(() => {
                    const isCF = !generatedInvoice.customer_name || generatedInvoice.customer_name.trim().toLowerCase() === 'consumidor final';
                    const email = !isCF ? (generatedInvoice.customer_email || generatedInvoice.email || '') : '';
                    const city = !isCF ? (generatedInvoice.customer_city || generatedInvoice.city || '') : '';
                    return (
                      <div style={{ fontSize: paperWidth === '58mm' ? '12px' : '13px', color: '#000', lineHeight: 1.4 }}>
                        <div><strong>Cliente:</strong> {isCF ? 'Consumidor Final' : generatedInvoice.customer_name}</div>
                        <div><strong>NIT/CC:</strong> {generatedInvoice.customer_document || (isCF ? '222222222222' : '')}</div>
                        <div><strong>Tel.:</strong> {isCF ? '' : (generatedInvoice.customer_phone || '')}</div>
                        <div><strong>Dirección:</strong> {isCF ? '' : (generatedInvoice.customer_address || '')}</div>
                        {city && <div><strong>Ciudad:</strong> {city}</div>}
                        {email && <div><strong>Email:</strong> {email}</div>}
                      </div>
                    );
                  })()}

                  <div style={{ borderTop: '1px solid #000', margin: '5px 0' }}></div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #000', textAlign: 'left', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', fontWeight: 800 }}>
                        <th style={{ paddingBottom: '3px', width: '14%' }}>Cant</th>
                        <th style={{ paddingBottom: '3px' }}>Descripción</th>
                        <th style={{ paddingBottom: '3px', textAlign: 'right', width: '28%' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(generatedInvoice.items || []).map((i, idx) => {
                        const rawMods = i.modifiers || i.modifiers_json;
                        let parsedMods = [];
                        if (rawMods) {
                          try {
                            parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                          } catch (e) {
                            parsedMods = Array.isArray(rawMods) ? rawMods : [];
                          }
                        }
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ verticalAlign: 'top', padding: '2.5px 0', fontWeight: 900, fontSize: paperWidth === '58mm' ? '12px' : '13px', color: '#000' }}>{i.quantity}x</td>
                            <td style={{ verticalAlign: 'top', padding: '2.5px 0', color: '#000' }}>
                              <div style={{ fontWeight: 800, fontSize: paperWidth === '58mm' ? '12px' : '13.5px', textTransform: 'uppercase' }}>{i.name}</div>
                              <div style={{ fontSize: paperWidth === '58mm' ? '11px' : '12px', fontWeight: 400, color: '#000' }}>Unit: {formatCOP(i.unit_price)}</div>
                              {Array.isArray(parsedMods) && parsedMods.length > 0 && (
                                <div style={{ fontSize: paperWidth === '58mm' ? '10.5px' : '11.5px', color: '#000', marginTop: '2px', paddingLeft: '4px', borderLeft: '2px solid #333' }}>
                                  {parsedMods.map((m, mIdx) => {
                                    const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                                    const extraStr = extra > 0 ? ` (+${formatCOP(extra)})` : '';
                                    return <div key={mIdx}>• {m.name}{m.quantity > 1 ? ` (x${m.quantity})` : ''}{extraStr}</div>;
                                  })}
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: 'top', padding: '2.5px 0', textAlign: 'right', fontWeight: 900, fontSize: paperWidth === '58mm' ? '12px' : '13px', color: '#000' }}>
                              {formatCOP(i.unit_price * i.quantity)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div style={{ borderTop: '1px solid #000', margin: '5px 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '12px' : '13px', margin: '2.5px 0', color: '#000' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 800 }}>{formatCOP(generatedInvoice.subtotal)}</span>
                  </div>
                  {parseFloat(generatedInvoice.discount_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '12px' : '13px', margin: '2.5px 0', color: '#000' }}>
                      <span>Descuento:</span>
                      <span style={{ fontWeight: 800 }}>-{formatCOP(generatedInvoice.discount_amount)}</span>
                    </div>
                  )}
                  {parseFloat(generatedInvoice.delivery_fee || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '12px' : '13px', margin: '2.5px 0', color: '#000' }}>
                      <span>Tarifa Domicilio:</span>
                      <span style={{ fontWeight: 800 }}>+{formatCOP(generatedInvoice.delivery_fee)}</span>
                    </div>
                  )}
                  {parseFloat(generatedInvoice.tip_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '12px' : '13px', margin: '2.5px 0', color: '#000' }}>
                      <span>Propina Voluntaria:</span>
                      <span style={{ fontWeight: 800 }}>+{formatCOP(generatedInvoice.tip_amount)}</span>
                    </div>
                  )}
                  {parseFloat(generatedInvoice.tax_total || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12px', margin: '2.5px 0', color: '#000' }}>
                      <span>Impuestos Incluidos:</span>
                      <span style={{ fontWeight: 700 }}>{formatCOP(generatedInvoice.tax_total)}</span>
                    </div>
                  )}

                  <div style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>

                  {(() => {
                    const isCredit = generatedInvoice.payment_method === 'credito' || parseFloat(generatedInvoice.credit_balance || generatedInvoice.credit_amount || 0) > 0;
                    const creditBalance = parseFloat(generatedInvoice.credit_balance !== undefined ? generatedInvoice.credit_balance : (generatedInvoice.credit_amount || (generatedInvoice.payment_method === 'credito' ? generatedInvoice.total : 0)));
                    const paidInitial = Math.max(0, parseFloat(generatedInvoice.total || 0) - creditBalance);

                    if (isCredit && creditBalance > 0) {
                      return (
                        <div style={{ border: '1.5px solid #000', padding: '6px 8px', margin: '4px 0', background: '#fafafa' }}>
                          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: paperWidth === '58mm' ? '12px' : '13px', color: '#000' }}>
                            *** CONDICIÓN DE PAGO: CRÉDITO ***
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', marginTop: '4px', color: '#000' }}>
                            <span>Total Factura:</span>
                            <span style={{ fontWeight: 800 }}>{formatCOP(generatedInvoice.total)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', color: '#000' }}>
                            <span>Abono Inicial Recibido:</span>
                            <span style={{ fontWeight: 800 }}>{formatCOP(paidInitial)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: paperWidth === '58mm' ? '13px' : '14.5px', color: '#000', marginTop: '3px', borderTop: '1px dashed #000', paddingTop: '3px' }}>
                            <span>VALOR ADEUDADO:</span>
                            <span>{formatCOP(creditBalance)}</span>
                          </div>
                          {generatedInvoice.credit_due_date && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '10.5px' : '11.5px', marginTop: '2px', color: '#000' }}>
                              <span>Fecha Límite Pago:</span>
                              <span>{generatedInvoice.credit_due_date}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: paperWidth === '58mm' ? '14px' : '16px', color: '#000' }}>
                          <span>TOTAL PAGADO:</span>
                          <span>{formatCOP(generatedInvoice.total)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '12px' : '13px', marginTop: '3px', color: '#000' }}>
                          <span>Forma de Pago:</span>
                          <span style={{ textTransform: 'capitalize', fontWeight: 800 }}>{generatedInvoice.payment_method || 'Efectivo'}</span>
                        </div>
                      </>
                    );
                  })()}

                  {generatedInvoice.notes && (
                    <div style={{ borderTop: '1px solid #000', margin: '4px 0', paddingTop: '4px', fontSize: paperWidth === '58mm' ? '11.5px' : '12px', color: '#000' }}>
                      <strong>Notas:</strong> {generatedInvoice.notes}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #000', margin: '5px 0' }}></div>
                  <div style={{ textAlign: 'center', fontWeight: 800, fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', color: '#000' }}>
                    {effSettings.receipt_footer || '¡Gracias por su compra! Vuelva pronto.'}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: paperWidth === '58mm' ? '10px' : '11px', color: '#000', marginTop: '2px', fontStyle: 'italic' }}>
                    Software POS GastrosPOS ERP v1.0
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
          <Button variant="ghost" onClick={() => setShowInvoiceModal(false)}>Cerrar</Button>
          <Button icon={<Printer size={16} />} onClick={handlePrint}>Imprimir Factura ({paperWidth})</Button>
        </div>
      </Modal>

      {/* Modal Registrar Nuevo Cliente Rápido */}
      {quickCustomerModalOpen && (
        <Modal
          isOpen={quickCustomerModalOpen}
          onClose={() => setQuickCustomerModalOpen(false)}
          title="Registrar Nuevo Cliente"
          maxWidth="540px"
        >
          <form onSubmit={handleSaveQuickCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Ingresa los datos del cliente para asociarlo de inmediato a esta factura y guardarlo en el CRM.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                Nombre Completo o Razón Social *
              </label>
              <Input
                placeholder="Ej: Carlos Gómez / Inversiones SAS"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                required
                style={{ fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                  Tipo Documento
                </label>
                <select
                  value={quickDocType}
                  onChange={(e) => setQuickDocType(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '12px'
                  }}
                >
                  <option value="CC">Cédula (CC)</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">Cédula Extranjería (CE)</option>
                  <option value="PASAPORTE">Pasaporte</option>
                  <option value="TI">Tarjeta Identidad (TI)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                  Número de Documento
                </label>
                <Input
                  placeholder="Ej: 1037654321"
                  value={quickDocNum}
                  onChange={(e) => setQuickDocNum(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                  Teléfono / Celular
                </label>
                <Input
                  placeholder="Ej: 3001234567"
                  value={quickPhone}
                  onChange={(e) => setQuickPhone(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                  Correo Electrónico
                </label>
                <Input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                Dirección
              </label>
              <Input
                placeholder="Ej: Carrera 43A # 1-50, Medellín"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
                style={{ fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button type="button" variant="ghost" onClick={() => setQuickCustomerModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={quickSubmitting} icon={<Check size={15} />}>
                {quickSubmitting ? 'Guardando...' : 'Guardar y Vincular'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
