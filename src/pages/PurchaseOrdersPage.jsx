// src/pages/PurchaseOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Plus, Search, CheckCircle, Clock, XCircle, AlertCircle,
  FileText, Calendar, DollarSign, PackageCheck, Eye, Trash2, ArrowRight,
  Boxes, Package, Filter, Check, ChevronDown, Lock
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const PurchaseOrdersPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form Crear OC
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0'); // 0%, 5%, 8%, 19% o editable
  const [orderItems, setOrderItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Buscador de Ítems dentro del modal
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // 'all' | 'insumo' | 'producto'
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // Form Recepción
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [closeOrderOnReceive, setCloseOrderOnReceive] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      let query = '/inventory/purchase-orders?';
      if (statusFilter) query += `status=${statusFilter}&`;

      const [ordersData, suppliersData, productsData, suppliesData] = await Promise.all([
        api.get(query),
        api.get('/suppliers'),
        api.get('/products'),
        api.get('/supplies')
      ]);

      setOrders(ordersData || []);
      setSuppliers(suppliersData || []);
      setProducts(productsData || []);
      setSupplies(suppliesData || []);

      if (suppliersData && suppliersData.length > 0 && !supplierId) {
        setSupplierId(suppliersData[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar órdenes de compra:', err);
      addToast('Error al cargar órdenes de compra', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Lista unificada de ítems para búsqueda (Insumos + Productos)
  const unifiedCatalog = [
    ...supplies.map(s => ({
      uniqueKey: `insumo-${s.id}`,
      id: s.id,
      name: s.name,
      sku: s.sku || '',
      category: s.category || 'Materia Prima',
      type: 'insumo',
      unit_of_measure: s.unit_of_measure || 'kg',
      cost_price: parseFloat(s.cost_price || 0)
    })),
    ...products.map(p => ({
      uniqueKey: `producto-${p.id}`,
      id: p.id,
      name: p.name,
      sku: p.sku || '',
      category: p.category_name || 'Menú / Reventa',
      type: 'producto',
      unit_of_measure: p.unit_of_measure || 'und',
      cost_price: parseFloat(p.cost_price || 0)
    }))
  ];

  // Filtrar catálogo por texto y tipo
  const filteredCatalog = unifiedCatalog.filter(item => {
    const matchesType = itemTypeFilter === 'all' || item.type === itemTypeFilter;
    const q = itemSearchQuery.toLowerCase();
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const handleOpenNew = () => {
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDate('');
    setNotes('');
    setItemSearchQuery('');
    setItemTypeFilter('all');
    setSearchDropdownOpen(false);

    // Si hay insumos o productos, agregar el primero por defecto
    const initialItem = unifiedCatalog[0];
    if (initialItem) {
      setOrderItems([
        {
          item_type: initialItem.type,
          id: initialItem.id,
          name: initialItem.name,
          sku: initialItem.sku,
          unit_of_measure: initialItem.unit_of_measure,
          quantity_ordered: 1,
          unit_cost: initialItem.cost_price
        }
      ]);
    } else {
      setOrderItems([]);
    }
    setIsCreateModalOpen(true);
  };

  // Agregar ítem seleccionado desde el buscador
  const handleSelectItemFromSearch = (item) => {
    // Verificar si ya está en la lista
    const existingIndex = orderItems.findIndex(i => i.item_type === item.type && i.id === item.id);
    if (existingIndex >= 0) {
      // Incrementar cantidad
      const updated = [...orderItems];
      updated[existingIndex].quantity_ordered = parseFloat(updated[existingIndex].quantity_ordered || 0) + 1;
      setOrderItems(updated);
      addToast(`Se aumentó la cantidad de "${item.name}"`, 'info');
    } else {
      setOrderItems([
        ...orderItems,
        {
          item_type: item.type,
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit_of_measure: item.unit_of_measure,
          quantity_ordered: 1,
          unit_cost: item.cost_price
        }
      ]);
      addToast(`"${item.name}" agregado a la orden`, 'success');
    }
    setItemSearchQuery('');
    setSearchDropdownOpen(false);
  };

  const handleRemoveItemRow = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...orderItems];
    newItems[index][field] = value;
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    let subtotal = 0;
    orderItems.forEach(i => {
      subtotal += (parseFloat(i.quantity_ordered) || 0) * (parseFloat(i.unit_cost) || 0);
    });
    const rate = parseFloat(taxRate) || 0;
    const tax = subtotal * (rate / 100);
    return { subtotal, tax, total: subtotal + tax, taxRate: rate };
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!supplierId) {
      addToast('Selecciona un proveedor', 'error');
      return;
    }
    if (orderItems.length === 0 || !orderItems.some(i => i.id && parseFloat(i.quantity_ordered) > 0)) {
      addToast('Agrega al menos un insumo o producto a la orden', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const totalsCalc = calculateTotal();
      await api.post('/inventory/purchase-orders', {
        supplier_id: parseInt(supplierId, 10),
        order_date: orderDate,
        expected_date: expectedDate || null,
        notes: notes || null,
        tax_rate: totalsCalc.taxRate,
        tax_total: totalsCalc.tax,
        items: orderItems.map(i => ({
          item_type: i.item_type,
          supply_id: i.item_type === 'insumo' ? parseInt(i.id, 10) : null,
          product_id: i.item_type === 'producto' ? parseInt(i.id, 10) : null,
          quantity_ordered: parseFloat(i.quantity_ordered),
          unit_cost: parseFloat(i.unit_cost || 0)
        }))
      });

      addToast('Orden de compra creada exitosamente', 'success');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al crear orden de compra', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = async (order) => {
    try {
      const data = await api.get(`/inventory/purchase-orders/${order.id}`);
      setSelectedOrder(data);
      setDetailModalOpen(true);
    } catch (err) {
      addToast('Error al cargar detalle de la orden', 'error');
    }
  };

  const handleOpenReceive = async (order) => {
    try {
      const data = await api.get(`/inventory/purchase-orders/${order.id}`);
      setSelectedOrder(data);

      const initialReceived = {};
      data.items.forEach(i => {
        const pending = parseFloat(i.quantity_ordered) - parseFloat(i.quantity_received || 0);
        initialReceived[i.id] = pending > 0 ? pending : 0;
      });
      setReceivedQuantities(initialReceived);
      setCloseOrderOnReceive(false);
      setReceiveModalOpen(true);
    } catch (err) {
      addToast('Error al preparar recepción', 'error');
    }
  };

  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const itemsToReceive = Object.keys(receivedQuantities).map(itemId => ({
        item_id: parseInt(itemId, 10),
        quantity_received: parseFloat(receivedQuantities[itemId]) || 0
      })).filter(i => i.quantity_received > 0);

      if (itemsToReceive.length === 0 && !closeOrderOnReceive) {
        addToast('Ingresa las cantidades a recibir o marca finalizar orden', 'error');
        return;
      }

      await api.post(`/inventory/purchase-orders/${selectedOrder.id}/receive`, {
        items: itemsToReceive,
        close_order: closeOrderOnReceive
      });

      addToast(
        closeOrderOnReceive
          ? 'Mercancía recibida y orden finalizada / cerrada exitosamente'
          : 'Mercancía recibida y stock actualizado automáticamente',
        'success'
      );
      setReceiveModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al recibir mercancía', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseOrder = async (order) => {
    const reason = window.prompt(
      `¿Deseas cerrar definitivamente la orden de compra ${order.order_number} con las cantidades recibidas hasta la fecha?\n\n(Opcional) Ingresa el motivo del cierre:`,
      'Proveedor no despachará el saldo restante'
    );
    if (reason === null) return;

    try {
      await api.post(`/inventory/purchase-orders/${order.id}/close`, { reason });
      addToast(`Orden ${order.order_number} cerrada y finalizada`, 'success');
      if (detailModalOpen) setDetailModalOpen(false);
      if (receiveModalOpen) setReceiveModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al cerrar orden', 'error');
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`¿Estás seguro de cancelar la orden ${order.order_number}?`)) return;
    try {
      await api.post(`/inventory/purchase-orders/${order.id}/cancel`);
      addToast('Orden cancelada exitosamente', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al cancelar orden', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'borrador':
        return <Badge variant="default">Borrador</Badge>;
      case 'enviada':
        return <Badge variant="info">Enviada</Badge>;
      case 'parcial':
        return <Badge variant="warning">Recepción Parcial</Badge>;
      case 'recibida':
        return <Badge variant="success">Recibida Completa</Badge>;
      case 'cerrada':
        return <Badge variant="warning" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.4)' }}>Cerrada (Finalizada)</Badge>;
      case 'cancelada':
        return <Badge variant="danger">Cancelada</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const totals = calculateTotal();

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={24} color="var(--accent-secondary)" /> Órdenes de Compra (OC) & Abastecimiento
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Solicitud de <strong>Insumos (Materia Prima)</strong> y <strong>Productos Terminados</strong> con ingreso automático al inventario.
          </p>
        </div>
        <Button onClick={handleOpenNew} icon={<Plus size={16} />}>
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card style={{ padding: '10px 14px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Filtrar por Estado:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: '', label: 'Todos' },
              { key: 'borrador', label: 'Borrador' },
              { key: 'enviada', label: 'Enviada' },
              { key: 'parcial', label: 'Recepción Parcial' },
              { key: 'recibida', label: 'Recibida' },
              { key: 'cerrada', label: 'Cerrada' },
              { key: 'cancelada', label: 'Cancelada' }
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: statusFilter === st.key ? 'var(--accent-secondary)' : 'var(--bg-primary)',
                  color: statusFilter === st.key ? '#fff' : 'var(--text-secondary)',
                  fontWeight: statusFilter === st.key ? 700 : 500,
                  fontSize: '11.5px',
                  cursor: 'pointer'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabla de Órdenes */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>N° Orden</th>
                <th style={{ padding: '10px 14px' }}>Proveedor</th>
                <th style={{ padding: '10px 14px' }}>Fecha Emisión</th>
                <th style={{ padding: '10px 14px' }}>Entrega Esperada</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Estimado</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No hay órdenes de compra registradas. Haz clic en "Nueva Orden de Compra" para aprovisionar tu negocio.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent-secondary)' }}>{o.order_number}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{o.supplier_name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{new Date(o.order_date).toLocaleDateString('es-CO')}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {o.expected_date ? new Date(o.expected_date).toLocaleDateString('es-CO') : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--accent-primary)', textAlign: 'right' }}>{formatCOP(o.total)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>{getStatusBadge(o.status)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(o)}
                          title="Ver detalle"
                          style={{ padding: '4px 8px' }}
                        >
                          <Eye size={15} />
                        </Button>
                        {['borrador', 'enviada', 'parcial'].includes(o.status) && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenReceive(o)}
                            title="Recibir Mercancía"
                            icon={<PackageCheck size={14} />}
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                          >
                            Recibir
                          </Button>
                        )}
                        {['borrador', 'enviada', 'parcial'].includes(o.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloseOrder(o)}
                            title="Cerrar / Finalizar orden definitivamente"
                            style={{ padding: '4px 8px', color: 'var(--accent-warning)' }}
                          >
                            <Lock size={14} />
                          </Button>
                        )}
                        {['borrador', 'enviada'].includes(o.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelOrder(o)}
                            title="Cancelar orden"
                            style={{ padding: '4px 8px', color: 'var(--accent-danger)' }}
                          >
                            <XCircle size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Crear OC */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Nueva Orden de Compra"
          maxWidth="880px"
        >
          <form onSubmit={handleSubmitCreate}>
            {/* Datos Generales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>Proveedor *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '12px'
                  }}
                  required
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.payment_terms || 'Contado'})</option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Fecha de Emisión"
                  type="date"
                  required
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="Entrega Esperada"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            {/* SECCIÓN DE BÚSQUEDA Y SELECCIÓN INTELIGENTE DE ÍTEMS */}
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={15} color="var(--accent-secondary)" /> Buscador Rápido de Insumos & Productos
                </div>

                {/* Filtro por Tipo */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('all')}
                    style={{
                      padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                      background: itemTypeFilter === 'all' ? 'var(--accent-secondary)' : 'var(--bg-primary)',
                      color: itemTypeFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '10.5px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    Todos ({unifiedCatalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('insumo')}
                    style={{
                      padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                      background: itemTypeFilter === 'insumo' ? 'var(--accent-secondary)' : 'var(--bg-primary)',
                      color: itemTypeFilter === 'insumo' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '10.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <Boxes size={11} /> Insumos ({supplies.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemTypeFilter('producto')}
                    style={{
                      padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                      background: itemTypeFilter === 'producto' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                      color: itemTypeFilter === 'producto' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '10.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <Package size={11} /> Productos ({products.length})
                  </button>
                </div>
              </div>

              {/* Input de Búsqueda con Dropdown de Resultados */}
              <div style={{ position: 'relative' }}>
                <Input
                  placeholder="Escribe para buscar insumo o producto por nombre, SKU o categoría..."
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  onFocus={() => setSearchDropdownOpen(true)}
                  style={{ marginBottom: 0, fontSize: '12px' }}
                />

                {searchDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                      borderRadius: '6px', marginTop: '4px', maxHeight: '220px', overflowY: 'auto',
                      zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      <span>Resultados ({filteredCatalog.length}) — Haz clic para agregar</span>
                      <button type="button" onClick={() => setSearchDropdownOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}>Cerrar ✕</button>
                    </div>

                    {filteredCatalog.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No se encontraron insumos ni productos con ese criterio.
                      </div>
                    ) : (
                      filteredCatalog.map(item => (
                        <div
                          key={item.uniqueKey}
                          onClick={() => handleSelectItemFromSearch(item)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer', transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Badge variant={item.type === 'insumo' ? 'secondary' : 'primary'} style={{ fontSize: '9.5px', textTransform: 'uppercase' }}>
                              {item.type === 'insumo' ? 'INSUMO' : 'PRODUCTO'}
                            </Badge>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {item.category} {item.sku ? `• SKU: ${item.sku}` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-warning)' }}>
                              {formatCOP(item.cost_price)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/{item.unit_of_measure}</span>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>+ Agregar</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TABLA DE ÍTEMS EN LA ORDEN */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Ítems Solicitados en la Orden ({orderItems.length})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Selecciona desde el buscador arriba para añadir más
                </span>
              </div>

              {/* Cabecera */}
              <div style={{ display: 'grid', gridTemplateColumns: '90px 2.2fr 1fr 80px 1.2fr 1.2fr 36px', gap: '8px', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <div>TIPO</div>
                <div>ÍTEM / DESCRIPCIÓN</div>
                <div>CANTIDAD</div>
                <div style={{ textAlign: 'center' }}>UNIDAD</div>
                <div style={{ textAlign: 'right' }}>COSTO COMPRA</div>
                <div style={{ textAlign: 'right' }}>SUBTOTAL</div>
                <div style={{ textAlign: 'center' }}></div>
              </div>

              {/* Filas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {orderItems.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                    No has agregado ningún ítem a la orden de compra. Usa el buscador superior para añadir insumos o productos.
                  </div>
                ) : (
                  orderItems.map((item, idx) => {
                    const rowSubtotal = (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost) || 0);

                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '90px 2.2fr 1fr 80px 1.2fr 1.2fr 36px', gap: '8px', alignItems: 'center', background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        {/* Badge Tipo */}
                        <div>
                          <Badge variant={item.item_type === 'insumo' ? 'secondary' : 'primary'} style={{ fontSize: '9.5px', padding: '3px 6px' }}>
                            {item.item_type === 'insumo' ? 'INSUMO' : 'PRODUCTO'}
                          </Badge>
                        </div>

                        {/* Nombre del Ítem */}
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                          {item.sku && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>}
                        </div>

                        {/* Cantidad */}
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.quantity_ordered}
                          onChange={(e) => handleItemFieldChange(idx, 'quantity_ordered', e.target.value)}
                          style={{
                            width: '100%', padding: '7px 8px', background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700, textAlign: 'right'
                          }}
                          required
                        />

                        {/* Unidad Automática */}
                        <div style={{
                          padding: '7px 4px', background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600,
                          textAlign: 'center', userSelect: 'none'
                        }}>
                          {item.unit_of_measure || 'und'}
                        </div>

                        {/* Costo Unitario */}
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unit_cost}
                          onChange={(e) => handleItemFieldChange(idx, 'unit_cost', e.target.value)}
                          style={{
                            width: '100%', padding: '7px 8px', background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                            color: 'var(--accent-warning)', fontSize: '12px', fontWeight: 700, textAlign: 'right'
                          }}
                          required
                        />

                        {/* Subtotal */}
                        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)', textAlign: 'right' }}>
                          {formatCOP(rowSubtotal)}
                        </div>

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          style={{
                            width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', borderRadius: '4px'
                          }}
                          title="Eliminar ítem"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Configuración de IVA / Impuesto y Totales Resumen */}
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>IVA / Impuesto:</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { val: '0', label: '0% (Exento)' },
                      { val: '5', label: '5%' },
                      { val: '8', label: '8% (Impoconsumo)' },
                      { val: '19', label: '19% (General)' }
                    ].map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setTaxRate(p.val)}
                        style={{
                          padding: '4px 9px', borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: taxRate === p.val ? 'var(--accent-secondary)' : 'var(--bg-primary)',
                          color: taxRate === p.val ? '#fff' : 'var(--text-secondary)',
                          fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Otro %:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="0"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      style={{
                        width: '60px', padding: '5px 8px', background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)', borderRadius: '4px',
                        color: 'var(--text-primary)', fontSize: '12px', textAlign: 'right', fontWeight: 700
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>%</span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Subtotal: <strong>{formatCOP(totals.subtotal)}</strong> • Impuesto ({totals.taxRate}%): <strong style={{ color: 'var(--accent-warning)' }}>{formatCOP(totals.tax)}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL ESTIMADO: </span>
                  <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCOP(totals.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 600, color: 'var(--text-secondary)' }}>Instrucciones / Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones de entrega al proveedor, condiciones de pago, observaciones..."
                rows="2"
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '12px', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting || orderItems.length === 0}>
                {submitting ? 'Generando...' : 'Generar Orden de Compra'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Detalle OC */}
      {detailModalOpen && selectedOrder && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Detalle de Orden: ${selectedOrder.order_number}`}
          maxWidth="700px"
        >
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PROVEEDOR</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{selectedOrder.supplier_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESTADO</div>
                <div>{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FECHA EMISIÓN</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedOrder.order_date).toLocaleDateString('es-CO')}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL ESTIMADO</div>
                <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '14px' }}>{formatCOP(selectedOrder.total)}</div>
              </div>
            </div>

            <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '12px', color: 'var(--text-primary)' }}>Ítems en la Orden:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
              {selectedOrder.items?.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant={item.item_type === 'insumo' ? 'secondary' : 'primary'} style={{ fontSize: '9px' }}>
                      {item.item_type === 'insumo' ? 'INSUMO' : 'PRODUCTO'}
                    </Badge>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>{item.item_name || item.product_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Pedido: <strong>{item.quantity_ordered} {item.unit_of_measure}</strong> • Recibido: <strong style={{ color: parseFloat(item.quantity_received) >= parseFloat(item.quantity_ordered) ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>{item.quantity_received || 0} {item.unit_of_measure}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '12px' }}>{formatCOP(item.subtotal)}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>@{formatCOP(item.unit_cost)}/{item.unit_of_measure}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Opción de Cierre Manual en Detalle */}
            {['borrador', 'enviada', 'parcial'].includes(selectedOrder.status) && (
              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ¿No recibirás más entregas? Puedes cerrar esta orden de forma anticipada.
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCloseOrder(selectedOrder)}
                  icon={<Lock size={13} />}
                  style={{ color: 'var(--accent-warning)', fontSize: '11px', padding: '5px 12px' }}
                >
                  Cerrar / Finalizar Orden
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Recepción de Mercancía */}
      {receiveModalOpen && selectedOrder && (
        <Modal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          title={`Recepción de Mercancía — ${selectedOrder.order_number}`}
          maxWidth="700px"
        >
          <form onSubmit={handleSubmitReceive} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              📦 Ingresa las cantidades físicas recibidas. El stock de <strong>insumos o productos</strong> se sumará de inmediato al inventario y se actualizará su costo de compra.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {selectedOrder.items?.map((item) => {
                const already = parseFloat(item.quantity_received || 0);
                const ordered = parseFloat(item.quantity_ordered);
                const pending = Math.max(0, ordered - already);

                return (
                  <div key={item.id} style={{ padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Badge variant={item.item_type === 'insumo' ? 'secondary' : 'primary'} style={{ fontSize: '9px' }}>
                          {item.item_type === 'insumo' ? 'INSUMO' : 'PRODUCTO'}
                        </Badge>
                        <span style={{ fontWeight: 700, fontSize: '12.5px' }}>{item.item_name || item.product_name}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Pedido: <strong>{ordered} {item.unit_of_measure}</strong> • Recibido prev: <strong>{already}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <label style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        Cantidad a ingresar ahora ({item.unit_of_measure}):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={pending}
                        step="any"
                        value={receivedQuantities[item.id] !== undefined ? receivedQuantities[item.id] : pending}
                        onChange={(e) => setReceivedQuantities({ ...receivedQuantities, [item.id]: e.target.value })}
                        style={{
                          width: '120px', padding: '7px 10px', background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                          color: 'var(--accent-primary)', fontWeight: 800, fontSize: '13px', textAlign: 'right'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checkbox para Finalizar y Cerrar OC sin esperar más entregas */}
            <div style={{ padding: '10px 12px', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="closeOrderCheck"
                checked={closeOrderOnReceive}
                onChange={(e) => setCloseOrderOnReceive(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="closeOrderCheck" style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
                Finalizar y Cerrar esta orden tras esta entrega (no se esperan más recepciones del proveedor)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button type="button" variant="ghost" onClick={() => setReceiveModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting} icon={<PackageCheck size={15} />}>
                {submitting ? 'Procesando...' : 'Confirmar Ingreso a Inventario'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
