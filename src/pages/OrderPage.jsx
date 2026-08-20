// src/pages/OrderPage.jsx — Restored from Desktop Backup with Table Number & RBAC updates
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, Send, Receipt, Printer, FileText, Edit3, Image as ImageIcon, ShoppingCart, Grid, XCircle, Save, ArrowLeft } from 'lucide-react';
import { api, formatCOP } from '../api/client';
import { getSocket } from '../api/socket';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useUiStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';
import { printKitchenTicket, printPreFactura } from '../utils/printUtils';

export const OrderPage = () => {
  const { id: tableId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const addToast = useUiStore((state) => state.addToast);

  const [mobileTab, setMobileTab] = useState('menu');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [tableDetails, setTableDetails] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState(null);

  // Modales
  const [editPriceModalOpen, setEditPriceModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [customPriceInput, setCustomPriceInput] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

  // Verificar permisos para Facturación
  const canAccessBilling = () => {
    if (!user) return false;
    if (['super_admin', 'admin', 'gerente', 'cajero'].includes(user.role)) return true;
    if (Array.isArray(user.permissions) && user.permissions.includes('/facturacion')) return true;
    return false;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catsData, prodsData, ordersData, settingsData, tableData] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
        api.get(`/orders?table_id=${tableId}`),
        api.get('/settings').catch(() => null),
        api.get(`/tables/${tableId}`).catch(() => null)
      ]);

      setCategories(catsData);
      setProducts(prodsData);
      setSettings(settingsData);
      if (tableData) setTableDetails(tableData);
      
      const activeOrder = ordersData.find(o => ['abierta', 'enviado_cocina', 'en_preparacion', 'lista', 'pendiente_pago'].includes(o.status));
      if (activeOrder) {
        const fullOrder = await api.get(`/orders/${activeOrder.id}`);
        setCurrentOrder(fullOrder);
        const mappedItems = (fullOrder.items || []).map(item => ({
          dbId: item.id,
          product: { id: item.product_id, name: item.name, price: item.unit_price, tax_rate: item.tax_rate, tax_included: item.tax_included, image_url: item.image_url },
          qty: item.quantity,
          note: item.notes || '',
          status: item.status
        }));
        setOrderItems(mappedItems);
      } else {
        // No crear orden en la base de datos hasta que el usuario decida 'Guardar Mesa' o 'Enviar a Cocina'
        setCurrentOrder(null);
        setOrderItems([]);
      }
    } catch (err) {
      console.error('Error al cargar datos de la orden:', err);
      addToast('Error al cargar información de la mesa', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    if (socket) {
      const handleUpdate = (data) => {
        if (currentOrder && data.order_id === currentOrder.id) {
          fetchData();
        }
      };
      socket.on('order:updated', handleUpdate);
      return () => socket.off('order:updated', handleUpdate);
    }
  }, [tableId]);

  const rawTableNum = tableDetails?.table_number || currentOrder?.table_number;
  const displayTableNumber = rawTableNum
    ? (rawTableNum.toString().toLowerCase().startsWith('mesa') ? rawTableNum : `Mesa ${rawTableNum}`)
    : `Mesa ${tableId}`;

  const filteredProducts = products.filter(p => {
    const prodCategory = categories.find(c => c.id === p.category_id)?.name || '';
    const matchCategory = activeCategory === 'Todos' || prodCategory.toLowerCase() === activeCategory.toLowerCase();
    
    if (!searchTerm.trim()) {
      return matchCategory;
    }

    const term = searchTerm.trim().toLowerCase();
    const matchName = (p.name || '').toLowerCase().includes(term);
    const matchCategoryName = prodCategory.toLowerCase().includes(term);
    const matchSku = (p.sku || '').toLowerCase().includes(term);
    const matchDesc = (p.description || '').toLowerCase().includes(term);

    const matchSearch = matchName || matchCategoryName || matchSku || matchDesc;
    return matchCategory && matchSearch;
  });

  const addToOrder = (product) => {
    const existingIndex = orderItems.findIndex(i => i.product.id === product.id && i.status !== 'enviado_cocina');
    if (existingIndex > -1) {
      const updated = [...orderItems];
      updated[existingIndex].qty += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        product: { id: product.id, name: product.name, price: parseFloat(product.price), tax_rate: product.tax_rate, tax_included: product.tax_included, image_url: product.image_url },
        qty: 1,
        note: '',
        status: 'pendiente'
      }]);
    }
    addToast(`${product.name} agregado`, 'info');
  };

  const updateQty = async (index, delta) => {
    const item = orderItems[index];
    if (item.dbId && item.status !== 'pendiente') {
      addToast('Este ítem ya fue enviado a cocina y no se puede modificar', 'warning');
      return;
    }

    const newItems = [...orderItems];
    newItems[index].qty += delta;
    if (newItems[index].qty <= 0) {
      if (item.dbId && currentOrder) {
        try {
          await api.delete(`/orders/${currentOrder.id}/items/${item.dbId}`);
        } catch (e) { console.error(e); }
      }
      newItems.splice(index, 1);
    } else if (item.dbId && currentOrder) {
      try {
        await api.put(`/orders/${currentOrder.id}/items/${item.dbId}/quantity`, { quantity: newItems[index].qty });
      } catch (e) { console.error(e); }
    }
    setOrderItems(newItems);
  };

  const updateNote = (index, note) => {
    const newItems = [...orderItems];
    newItems[index].note = note;
    setOrderItems(newItems);
  };

  const handleOpenEditPrice = (index) => {
    const item = orderItems[index];
    if (item.dbId && item.status !== 'pendiente') {
      addToast('Este ítem ya fue enviado a cocina y no se puede modificar', 'warning');
      return;
    }
    setEditingItemIndex(index);
    setCustomPriceInput(item.product.price.toString());
    setEditPriceModalOpen(true);
  };

  const handleSaveCustomPrice = () => {
    if (editingItemIndex === null) return;
    const val = parseFloat(customPriceInput);
    if (isNaN(val) || val < 0) {
      addToast('Ingresa un precio válido', 'warning');
      return;
    }
    const updated = [...orderItems];
    updated[editingItemIndex].product.price = val;
    setOrderItems(updated);
    setEditPriceModalOpen(false);
    addToast('Precio especial aplicado a la comanda', 'info');
  };

  const handleCancelOrder = async () => {
    if (!currentOrder) {
      setOrderItems([]);
      navigate('/mesas');
      return;
    }
    setCanceling(true);
    try {
      await api.post(`/orders/${currentOrder.id}/cancel`, { reason: cancelReason });
      addToast('Comanda cancelada y mesa liberada', 'info');
      setCancelModalOpen(false);
      navigate('/mesas');
    } catch (err) {
      addToast(err.message || 'Error al cancelar orden', 'danger');
    } finally {
      setCanceling(false);
    }
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((acc, item) => acc + (parseFloat(item.product?.price || 0) * parseFloat(item.qty || 1)), 0);
  };

  const subtotal = calculateSubtotal();

  // Guardar la mesa: verifica internamente si la mesa ya tiene orden activa y crea o añade ítems
  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      addToast('Selecciona al menos un producto para guardar la mesa', 'warning');
      return;
    }
    setSending(true);

    try {
      // Verificación interna silenciosa de orden activa existente en la mesa
      let activeOrder = currentOrder;
      if (!activeOrder) {
        const freshOrders = await api.get(`/orders?table_id=${tableId}`).catch(() => []);
        const found = freshOrders.find(o => ['abierta', 'enviado_cocina', 'en_preparacion', 'lista', 'pendiente_pago'].includes(o.status));
        if (found) {
          activeOrder = found;
          setCurrentOrder(found);
        }
      }

      if (!activeOrder) {
        const payload = {
          table_id: parseInt(tableId, 10),
          guests: 1,
          order_type: 'mesa',
          items: orderItems.map(i => ({
            product_id: i.product.id,
            quantity: i.qty,
            unit_price: parseFloat(i.product.price),
            notes: i.note || null
          }))
        };
        await api.post('/orders', payload);
        addToast('Mesa guardada exitosamente (Comanda creada)', 'success');
      } else {
        const unsavedItems = orderItems.filter(i => !i.dbId);
        if (unsavedItems.length > 0) {
          const payload = unsavedItems.map(i => ({
            product_id: i.product.id,
            quantity: i.qty,
            unit_price: parseFloat(i.product.price),
            notes: i.note || null
          }));
          await api.post(`/orders/${activeOrder.id}/items`, { items: payload });
        }
        addToast('Mesa guardada exitosamente (Comanda permanece abierta)', 'success');
      }

      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar mesa', 'danger');
    } finally {
      setSending(false);
    }
  };

  // Enviar a cocina: verifica internamente y crea o añade ítems disparando comandas
  const handleSendToKitchen = async () => {
    if (orderItems.length === 0) {
      addToast('Selecciona al menos un producto para enviar a cocina', 'warning');
      return;
    }
    setSending(true);

    try {
      // Verificación interna silenciosa de orden activa existente en la mesa
      let activeId = currentOrder?.id;
      if (!activeId) {
        const freshOrders = await api.get(`/orders?table_id=${tableId}`).catch(() => []);
        const found = freshOrders.find(o => ['abierta', 'enviado_cocina', 'en_preparacion', 'lista', 'pendiente_pago'].includes(o.status));
        if (found) {
          activeId = found.id;
          setCurrentOrder(found);
        }
      }

      if (!activeId) {
        const payload = {
          table_id: parseInt(tableId, 10),
          guests: 1,
          order_type: 'mesa',
          items: orderItems.map(i => ({
            product_id: i.product.id,
            quantity: i.qty,
            unit_price: parseFloat(i.product.price),
            notes: i.note || null
          })),
          send_to_kitchen: true
        };
        const newOrderRes = await api.post('/orders', payload);
        activeId = newOrderRes.id || newOrderRes.order?.id;
      } else {
        const unsavedItems = orderItems.filter(i => !i.dbId);
        if (unsavedItems.length > 0) {
          const payload = unsavedItems.map(i => ({
            product_id: i.product.id,
            quantity: i.qty,
            unit_price: parseFloat(i.product.price),
            notes: i.note || null
          }));
          await api.post(`/orders/${activeId}/items`, { items: payload });
        }
        await api.post(`/orders/${activeId}/send-to-kitchen`);
      }

      addToast('Orden enviada a cocina con éxito', 'success');

      handlePrintKitchenTicket(orderItems, activeId);
      await fetchData();
    } catch (err) {
      addToast(err.message || 'Error al enviar a cocina', 'danger');
    } finally {
      setSending(false);
    }
  };

  const handlePrintKitchenTicket = (ticketItems, explicitOrderId = null) => {
    const tableClean = displayTableNumber.replace(/^Mesa\s*/i, '');
    printKitchenTicket(
      {
        id: explicitOrderId || currentOrder?.id,
        table_number: tableClean,
        order_type: 'mesa',
        waiter_name: currentOrder?.waiter_name || user?.full_name || 'Personal'
      },
      ticketItems,
      settings || {},
      settings?.default_paper_width || '80mm'
    );
    addToast('Comanda enviada a impresión', 'info');
  };

  const handlePrintPreBill = () => {
    const tableClean = displayTableNumber.replace(/^Mesa\s*/i, '');
    printPreFactura(
      {
        id: currentOrder?.id,
        table_number: tableClean,
        order_type: 'mesa',
        waiter_name: currentOrder?.waiter_name || user?.full_name || 'Personal'
      },
      orderItems,
      settings || {},
      settings?.default_paper_width || '80mm',
      { itemsSubtotal: subtotal }
    );
    addToast('Pre-factura enviada a impresión térmica', 'info');
  };

  const handleRequestBill = async () => {
    if (!canAccessBilling()) {
      addToast('No tienes permisos para el módulo de Facturación. Solicita el cobro a un cajero o administrador.', 'warning');
      return;
    }
    if (!currentOrder) return;
    if (orderItems.some(i => !i.dbId)) {
      addToast('Guarda o envía los cambios a cocina antes de facturar', 'warning');
      return;
    }
    try {
      await api.put(`/tables/${tableId}/status`, { status: 'pendiente_pago' });
      addToast('Mesa marcada para cobro', 'info');
      navigate(`/facturacion?tableId=${tableId}`);
    } catch (err) {
      navigate(`/facturacion?tableId=${tableId}`);
    }
  };

  const handleBackToTables = () => {
    navigate('/mesas');
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando orden...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 88px)', overflow: 'hidden' }}>
      <style>{`
        /* Anular scroll vertical de la ventana completa */
        .page-content {
          overflow: hidden !important;
          padding: 12px 20px !important;
          display: flex !important;
          flex-direction: column !important;
          height: calc(100vh - 64px) !important;
        }
        @media (max-width: 768px) {
          .mobile-order-tabs { display: flex !important; }
          .order-layout-container { flex-direction: column !important; height: calc(100vh - 140px) !important; }
          .products-section { display: ${mobileTab === 'menu' ? 'flex' : 'none'} !important; height: 100% !important; }
          .cart-section { display: ${mobileTab === 'cart' ? 'flex' : 'none'} !important; width: 100% !important; min-width: 100% !important; height: 100% !important; }
          .order-header-bar { margin-bottom: 14px !important; gap: 12px !important; }
          .products-grid-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .product-card-item {
            padding: 8px !important;
            gap: 6px !important;
          }
          .product-card-item h4 {
            font-size: 13px !important;
          }
          .product-card-item p {
            font-size: 13.5px !important;
          }
        }
      `}</style>

      {/* BARRA SUPERIOR CON MARGEN RESPONSIVO EN MÓVILES */}
      <div className="order-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '16px', flexShrink: 0 }}>
        <Button variant="secondary" size="md" icon={<ArrowLeft size={20} />} onClick={handleBackToTables} style={{ padding: '10px 18px', fontSize: '15px', fontWeight: 700, borderRadius: '8px' }}>
          Volver a Mesas
        </Button>
        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginLeft: '4px' }}>
          {displayTableNumber} {currentOrder?.waiter_name ? `| Mesero: ${currentOrder.waiter_name}` : ''}
        </div>
      </div>

      {/* Pestañas táctiles para móviles */}
      <div className="mobile-order-tabs" style={{ display: 'none', gap: '8px', marginBottom: '8px', flexShrink: 0 }}>
        <button
          onClick={() => setMobileTab('menu')}
          style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
            background: mobileTab === 'menu' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: mobileTab === 'menu' ? 'white' : 'var(--text-primary)', fontWeight: 700, fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}
        >
          <Grid size={18} /> Menú Productos
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          style={{
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
            background: mobileTab === 'cart' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: mobileTab === 'cart' ? 'white' : 'var(--text-primary)', fontWeight: 700, fontSize: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}
        >
          <ShoppingCart size={18} /> Comanda ({orderItems.length})
        </button>
      </div>

      <div className="order-layout-container" style={{ display: 'flex', gap: 'var(--space-4)', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {/* Catálogo de Productos (Izquierda) */}
        <div className="products-section" style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <Input
            icon={<Search size={20} />}
            placeholder="Buscar por producto o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: 0, flexShrink: 0 }}
          />

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', flexShrink: 0 }}>
            <button
              onClick={() => setActiveCategory('Todos')}
              style={{
                padding: '8px 16px', borderRadius: '999px', whiteSpace: 'nowrap',
                background: activeCategory === 'Todos' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                color: activeCategory === 'Todos' ? 'white' : 'var(--text-primary)',
                border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '14px', fontWeight: 700
              }}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.name)}
                style={{
                  padding: '8px 16px', borderRadius: '999px', whiteSpace: 'nowrap',
                  background: activeCategory === cat.name ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  color: activeCategory === cat.name ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '14px', fontWeight: 700
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grilla con tarjetas de productos */}
          <div className="products-grid-container" style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '12px',
            alignContent: 'start',
            paddingRight: '4px'
          }}>
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="product-card-item"
                style={{
                  cursor: 'pointer',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  touchAction: 'manipulation',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                }}
                onClick={() => addToOrder(product)}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none'; }}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      borderRadius: '6px',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ImageIcon size={26} color="var(--text-muted)" />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 700, lineHeight: '1.3' }}>{product.name}</h4>
                  <p style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 800, fontSize: '15px' }}>{formatCOP(product.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel de Orden / Comanda (Derecha) */}
        <div className="cart-section" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: '350px',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          {/* Header Comanda (Estático) */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '16px' }}>Comanda {displayTableNumber}</span>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Atendido por: {currentOrder?.waiter_name || 'Mesero'}</div>
            </div>
            <button onClick={() => setCancelModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700 }} title="Anular Comanda">
              <XCircle size={18} /> Anular Orden
            </button>
          </div>

          {/* Recuadro de Ítems con Scroll Independiente */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            margin: '10px',
            padding: '8px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {orderItems.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: '14px' }}>
                No hay productos en la orden
              </div>
            ) : (
              orderItems.map((item, idx) => (
                <div key={idx} style={{ background: 'var(--bg-elevated)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', borderLeft: item.dbId ? '4px solid var(--accent-primary)' : '4px solid var(--accent-warning)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{item.product.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px' }}>{formatCOP(item.product.price * item.qty)}</span>
                      {(!item.dbId || item.status === 'pendiente') && (
                        <button onClick={() => handleOpenEditPrice(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '2px' }} title="Precio especial">
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', borderRadius: '6px', padding: '4px 8px' }}>
                      <button onClick={() => updateQty(idx, -1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px 8px' }}><Minus size={16} /></button>
                      <span style={{ minWidth: '22px', textAlign: 'center', fontSize: '14px', fontWeight: 800 }}>{item.qty}</span>
                      <button onClick={() => updateQty(idx, 1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px 8px' }}><Plus size={16} /></button>
                    </div>
                    {(!item.dbId || item.status === 'pendiente') && (
                      <button onClick={() => updateQty(idx, -item.qty)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '6px' }}><Trash2 size={18} /></button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Notas (ej. sin cebolla)"
                    value={item.note}
                    onChange={(e) => updateNote(idx, e.target.value)}
                    disabled={!!item.dbId && item.status !== 'pendiente'}
                    style={{ width: '100%', marginTop: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Footer de Acciones Estático con Botones aún más Grandes */}
          <div style={{
            flexShrink: 0,
            padding: '14px 16px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900 }}>
              <span>Consumo Total</span>
              <span style={{ color: 'var(--accent-primary)' }}>{formatCOP(subtotal)}</span>
            </div>

            {/* Fila 1: Botones de Cocina Ticket, Pre-Factura y Guardar Mesa (GRANDES Y EXTRA CÓMODOS) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <Button
                variant="ghost"
                size="md"
                icon={<Printer size={18} />}
                onClick={() => handlePrintKitchenTicket(orderItems)}
                disabled={orderItems.length === 0}
                style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 700, minHeight: '48px' }}
              >
                Ticket Cocina
              </Button>
              <Button
                variant="ghost"
                size="md"
                icon={<FileText size={18} />}
                onClick={handlePrintPreBill}
                disabled={orderItems.length === 0}
                style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 700, minHeight: '48px' }}
              >
                Pre-Factura
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<Save size={18} />}
                onClick={handleSaveOrder}
                disabled={orderItems.length === 0}
                style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 800, minHeight: '48px' }}
              >
                Guardar Mesa
              </Button>
            </div>

            {/* Fila 2: Botones de Facturar y A Cocina (MÁXIMA VISIBILIDAD Y TAMAÑO TÁCTIL) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Button
                variant="warning"
                size="lg"
                icon={<Receipt size={20} />}
                onClick={handleRequestBill}
                disabled={orderItems.length === 0 || !canAccessBilling()}
                title={!canAccessBilling() ? 'No tienes permisos para acceder a Facturación' : ''}
                style={{ padding: '14px 16px', fontSize: '16px', fontWeight: 800, minHeight: '52px' }}
              >
                Facturar
              </Button>
              <Button
                variant="primary"
                size="lg"
                loading={sending}
                icon={<Send size={20} />}
                onClick={handleSendToKitchen}
                disabled={orderItems.length === 0}
                style={{ padding: '14px 16px', fontSize: '16px', fontWeight: 800, minHeight: '52px' }}
              >
                A Cocina
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* Modal Modificar Precio Temporal */}
      <Modal isOpen={editPriceModalOpen} onClose={() => setEditPriceModalOpen(false)} title="Modificar Precio Especial">
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Modifica el precio unitario del producto exclusivamente para esta comanda. El catálogo general conservará su precio original.
          </p>
          <Input
            label="Nuevo Precio Unitario ($)"
            type="number"
            value={customPriceInput}
            onChange={(e) => setCustomPriceInput(e.target.value)}
            style={{ fontSize: '16px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
            <Button variant="ghost" onClick={() => setEditPriceModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCustomPrice}>Aplicar Precio Especial</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Anular Comanda */}
      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Anular / Cancelar Comanda">
        <div>
          <p style={{ fontSize: '14px', color: 'var(--accent-danger)' }}>
            ¿Estás seguro de que deseas anular esta orden? La mesa se marcará como LIBRE y la transacción quedará registrada en el informe anti-fraude.
          </p>
          <Input
            label="Motivo de la Anulación (opcional)"
            placeholder="Ej. Cliente cambió de opinión, error de tipeo"
            value={cancelReason}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ fontSize: '14px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>Atrás</Button>
            <Button variant="danger" loading={canceling} onClick={handleCancelOrder}>Anular Comanda</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
