// src/pages/DeliveryPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bike, MapPin, Plus, Navigation, Phone, CheckCircle2,
  Clock, DollarSign, CreditCard, ChevronRight, FileText, AlertCircle,
  Search, X, Filter, User, Package, RotateCcw
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { useSocket } from '../hooks/useSocket';

export const DeliveryPage = () => {
  const navigate = useNavigate();
  const addToast = useUiStore((state) => state.addToast);
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'pending' | 'zones'
  const [assignments, setAssignments] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros y Búsqueda de Domicilios
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'asignado' | 'en_camino' | 'entregado' | 'cancelado'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'unpaid' | 'paid'
  const [driverFilter, setDriverFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  // Modales
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [newDeliveryModalOpen, setNewDeliveryModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPendingOrder, setSelectedPendingOrder] = useState(null);

  // Form Zona
  const [zoneName, setZoneName] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30');

  // Form Nuevo Pedido Domicilio
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [orderDeliveryFee, setOrderDeliveryFee] = useState('5000');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product_id: '', quantity: '1', unit_price: 0 }
  ]);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assData, pendData, zonesData, driversData, custData, prodData] = await Promise.all([
        api.get('/delivery/assignments').catch(() => []),
        api.get('/delivery/pending').catch(() => []),
        api.get('/delivery/zones').catch(() => []),
        api.get('/delivery/drivers').catch(() => []),
        api.get('/customers').catch(() => []),
        api.get('/products').catch(() => [])
      ]);

      setAssignments(assData || []);
      setPendingOrders(pendData || []);
      setZones(zonesData || []);
      setDrivers(driversData || []);
      setCustomers(custData || []);
      setProducts(prodData || []);

      if (zonesData && zonesData.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zonesData[0].id.toString());
        setOrderDeliveryFee(parseFloat(zonesData[0].delivery_fee || 5000).toString());
      }
      if (driversData && driversData.length > 0 && !selectedDriverId) {
        setSelectedDriverId(driversData[0].id.toString());
      }
      if (custData && custData.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custData[0].id.toString());
        setDeliveryAddress(custData[0].address || '');
        setDeliveryPhone(custData[0].phone || '');
      }
      if (prodData && prodData.length > 0 && (!orderItems[0].product_id || orderItems[0].product_id === '')) {
        setOrderItems([{ product_id: prodData[0].id.toString(), quantity: '1', unit_price: prodData[0].price }]);
      }
    } catch (err) {
      console.error('Error al cargar delivery:', err);
      addToast('Error al cargar información de delivery', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Escuchar eventos WebSocket de Delivery en tiempo real
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleUpdate = () => {
      fetchData();
    };

    socket.on('delivery:status-changed', handleUpdate);
    socket.on('delivery:assigned', handleUpdate);
    socket.on('order:created', handleUpdate);
    socket.on('order:updated', handleUpdate);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('delivery:status-changed', handleUpdate);
        socket.off('delivery:assigned', handleUpdate);
        socket.off('order:created', handleUpdate);
        socket.off('order:updated', handleUpdate);
      }
    };
  }, [socket]);

  const handleUpdateStatus = async (assignmentId, newStatus) => {
    try {
      await api.put(`/delivery/assignments/${assignmentId}/status`, { status: newStatus });
      addToast(`Estado de entrega actualizado a: ${newStatus === 'en_camino' ? 'En Camino' : 'Entregado'}`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al actualizar estado', 'error');
    }
  };

  // --- MODAL NUEVO DOMICILIO ---
  const handleOpenNewDelivery = () => {
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setCustomerDropdownOpen(false);
    setDeliveryAddress('');
    setDeliveryPhone('');
    setDeliveryNotes('');
    if (zones.length > 0) {
      setSelectedZoneId(zones[0].id.toString());
      setOrderDeliveryFee(parseFloat(zones[0].delivery_fee || 5000).toString());
    }
    if (drivers.length > 0) setSelectedDriverId(drivers[0].id.toString());
    if (products.length > 0) {
      setOrderItems([{ product_id: products[0].id.toString(), quantity: '1', unit_price: products[0].price }]);
    }
    setNewDeliveryModalOpen(true);
  };

  const handleCustomerChange = (custId) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id.toString() === custId);
    if (cust) {
      setDeliveryAddress(cust.address || '');
      setDeliveryPhone(cust.phone || '');
    }
  };

  const handleZoneChange = (zId) => {
    setSelectedZoneId(zId);
    const z = zones.find(item => item.id.toString() === zId);
    if (z) {
      setOrderDeliveryFee(parseFloat(z.delivery_fee || 0).toString());
    }
  };

  const handleAddItemRow = () => {
    if (products.length === 0) return;
    setOrderItems([...orderItems, { product_id: products[0].id.toString(), quantity: '1', unit_price: products[0].price }]);
  };

  const handleRemoveItemRow = (index) => {
    if (orderItems.length <= 1) return;
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    if (field === 'product_id') {
      const prod = products.find(p => p.id.toString() === value);
      updated[index].product_id = value;
      updated[index].unit_price = prod ? prod.price : 0;
    } else if (field === 'quantity') {
      updated[index].quantity = value;
    }
    setOrderItems(updated);
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((acc, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      return acc + (qty * price);
    }, 0);
  };

  const handleSubmitNewDelivery = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      addToast('La dirección de entrega es obligatoria', 'warning');
      return;
    }

    const validItems = orderItems.filter(i => i.product_id && (parseFloat(i.quantity) || 0) > 0);
    if (validItems.length === 0) {
      addToast('Debe agregar al menos un producto al pedido', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: selectedCustomerId ? parseInt(selectedCustomerId, 10) : null,
        delivery_address: deliveryAddress,
        delivery_phone: deliveryPhone || null,
        delivery_notes: deliveryNotes || null,
        delivery_zone_id: selectedZoneId ? parseInt(selectedZoneId, 10) : null,
        delivery_fee: parseFloat(orderDeliveryFee) || 0,
        driver_user_id: selectedDriverId ? parseInt(selectedDriverId, 10) : null,
        items: validItems.map(i => ({
          product_id: parseInt(i.product_id, 10),
          quantity: parseInt(i.quantity, 10) || 1,
          unit_price: parseFloat(i.unit_price) || 0
        }))
      };

      await api.post('/delivery/orders', payload);
      addToast('Pedido de domicilio registrado y asignado exitosamente', 'success');
      setNewDeliveryModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al crear pedido de domicilio', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- MODAL ASIGNAR REPARTIDOR ---
  const handleOpenAssignModal = (order) => {
    setSelectedPendingOrder(order);
    if (drivers.length > 0) setSelectedDriverId(drivers[0].id.toString());
    if (zones.length > 0) setSelectedZoneId(zones[0].id.toString());
    setAssignModalOpen(true);
  };

  const handleSubmitAssign = async (e) => {
    e.preventDefault();
    if (!selectedPendingOrder || !selectedDriverId) return;

    setSubmitting(true);
    try {
      await api.post('/delivery/assign', {
        order_id: selectedPendingOrder.id,
        driver_user_id: parseInt(selectedDriverId, 10),
        delivery_zone_id: selectedZoneId ? parseInt(selectedZoneId, 10) : null
      });
      addToast('Repartidor asignado exitosamente', 'success');
      setAssignModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al asignar repartidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- MODAL ZONAS ---
  const handleOpenNewZone = () => {
    setEditingZone(null);
    setZoneName('');
    setDeliveryFee('5000');
    setEstimatedTime('30');
    setZoneModalOpen(true);
  };

  const handleOpenEditZone = (zone) => {
    setEditingZone(zone);
    setZoneName(zone.name);
    setDeliveryFee(zone.delivery_fee.toString());
    setEstimatedTime(zone.estimated_time_mins.toString());
    setZoneModalOpen(true);
  };

  const handleSubmitZone = async (e) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      addToast('El nombre de la zona es obligatorio', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: zoneName,
        delivery_fee: parseFloat(deliveryFee) || 0,
        estimated_time_mins: parseInt(estimatedTime, 10) || 30
      };

      if (editingZone) {
        await api.put(`/delivery/zones/${editingZone.id}`, payload);
        addToast('Zona de cobertura actualizada', 'success');
      } else {
        await api.post('/delivery/zones', payload);
        addToast('Zona de cobertura creada', 'success');
      }
      setZoneModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar zona', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'asignado':
        return <Badge variant="warning">En Preparación / Asignado</Badge>;
      case 'en_camino':
        return <Badge variant="info">En Ruta / En Camino</Badge>;
      case 'entregado':
        return <Badge variant="success">Entregado</Badge>;
      case 'cancelado':
        return <Badge variant="danger">Cancelado</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const activeCount = assignments.filter(a => a.status === 'asignado' || a.status === 'en_camino').length;
  const enCaminoCount = assignments.filter(a => a.status === 'en_camino').length;
  const entregadosCount = assignments.filter(a => a.status === 'entregado').length;

  // Filtrado reactivo de despachos activos
  const filteredAssignments = assignments.filter((a) => {
    // Filtro por estado
    if (statusFilter && statusFilter !== 'all' && a.status !== statusFilter) {
      return false;
    }

    // Filtro por cobro/pago
    if (paymentFilter === 'paid' && a.order_status !== 'cerrada') return false;
    if (paymentFilter === 'unpaid' && a.order_status === 'cerrada') return false;

    // Filtro por repartidor
    if (driverFilter !== 'all') {
      if (a.driver_user_id?.toString() !== driverFilter && a.driver_name !== driverFilter) return false;
    }

    // Filtro por zona
    if (zoneFilter !== 'all') {
      if (a.delivery_zone_id?.toString() !== zoneFilter && a.zone_name !== zoneFilter) return false;
    }

    // Búsqueda de texto libre predictiva
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const orderIdMatch = `orden #${a.order_id}`.toLowerCase().includes(q) ||
      `#${a.order_id}`.includes(q) ||
      `${a.order_id}` === q;
    const customerMatch = (a.customer_name || '').toLowerCase().includes(q);
    const phoneMatch = (a.customer_phone || '').includes(q);
    const addressMatch = (a.delivery_address || '').toLowerCase().includes(q);
    const driverMatch = (a.driver_name || '').toLowerCase().includes(q);
    const zoneMatch = (a.zone_name || '').toLowerCase().includes(q);
    const notesMatch = (a.delivery_notes || '').toLowerCase().includes(q);
    const itemsMatch = (a.items || []).some(it => (it.name || '').toLowerCase().includes(q));

    return orderIdMatch || customerMatch || phoneMatch || addressMatch || driverMatch || zoneMatch || notesMatch || itemsMatch;
  });

  // Filtrado reactivo de pedidos pendientes
  const filteredPendingOrders = pendingOrders.filter((po) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const orderIdMatch = `orden #${po.id}`.toLowerCase().includes(q) ||
      `#${po.id}`.includes(q) ||
      `${po.id}` === q;
    const customerMatch = (po.customer_name || '').toLowerCase().includes(q);
    const phoneMatch = (po.delivery_phone || '').includes(q);
    const addressMatch = (po.delivery_address || '').toLowerCase().includes(q);
    const notesMatch = (po.notes || '').toLowerCase().includes(q);
    const itemsMatch = (po.items || []).some(it => (it.name || '').toLowerCase().includes(q));

    return orderIdMatch || customerMatch || phoneMatch || addressMatch || notesMatch || itemsMatch;
  });

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || paymentFilter !== 'all' || driverFilter !== 'all' || zoneFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDriverFilter('all');
    setZoneFilter('all');
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Bike size={24} color="var(--accent-secondary)" />
            Despachos & Domicilios (Delivery Hub)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-xs)', marginTop: '2px' }}>
            Control de pedidos para llevar y despachos a domicilio con tracking en tiempo real
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {activeTab === 'zones' ? (
            <Button variant="primary" onClick={handleOpenNewZone} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Plus size={15} />
              Nueva Zona
            </Button>
          ) : (
            <Button variant="primary" onClick={handleOpenNewDelivery} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Plus size={15} />
              Nuevo Domicilio
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <Card style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Bike size={18} color="var(--accent-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Activos en Despacho</div>
            <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>{activeCount} pedidos</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Navigation size={18} color="var(--accent-warning)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>En Ruta (En Camino)</div>
            <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--accent-warning)' }}>{enCaminoCount} pedidos</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <CheckCircle2 size={18} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Entregados Hoy</div>
            <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--accent-primary)' }}>{entregadosCount}</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <MapPin size={18} color="var(--accent-purple)" />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Zonas de Cobertura</div>
            <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>{zones.length} zonas</div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-3)' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
            color: activeTab === 'orders' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'orders' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 'var(--font-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Navigation size={14} />
          Despachos Activos ({assignments.length})
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
            color: activeTab === 'pending' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'pending' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 'var(--font-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Clock size={14} />
          Pendientes de Asignar ({pendingOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'zones' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
            color: activeTab === 'zones' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'zones' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 'var(--font-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <MapPin size={14} />
          Zonas & Tarifas ({zones.length})
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros Predictivos para Domicilios */}
      {(activeTab === 'orders' || activeTab === 'pending') && (
        <Card style={{ padding: '12px 16px', marginBottom: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
          {/* Fila 1: Input de búsqueda inteligente */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: searchQuery ? 'var(--accent-secondary)' : 'var(--text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar domicilio por cliente, N° orden (#12), dirección, teléfono, repartidor o producto..."
              style={{
                width: '100%',
                padding: '10px 36px 10px 38px',
                borderRadius: '8px',
                border: searchQuery ? '1px solid var(--accent-secondary)' : '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxShadow: searchQuery ? '0 0 0 2px rgba(6, 182, 212, 0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Fila 2: Filtros por Chips, Cobro, Repartidor y Zona */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {activeTab === 'orders' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={12} /> Estado:
                </span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'asignado', label: 'En Preparación / Asignados' },
                  { id: 'en_camino', label: 'En Ruta' },
                  { id: 'entregado', label: 'Entregados' },
                  { id: 'cancelado', label: 'Cancelados' }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: statusFilter === st.id ? 700 : 500,
                      border: statusFilter === st.id ? '1px solid var(--accent-secondary)' : '1px solid var(--border-color)',
                      background: statusFilter === st.id ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-primary)',
                      color: statusFilter === st.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {st.label}
                  </button>
                ))}

                {/* Filtro de Cobro */}
                <div style={{ height: '16px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />

                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Cobro:</span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'unpaid', label: '⚠️ Pendiente Cobro' },
                  { id: 'paid', label: '✓ Facturados' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPaymentFilter(p.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: paymentFilter === p.id ? 700 : 500,
                      border: paymentFilter === p.id ? '1px solid #10b981' : '1px solid var(--border-color)',
                      background: paymentFilter === p.id ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-primary)',
                      color: paymentFilter === p.id ? '#10b981' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Filtra los pedidos pendientes por nombre, teléfono, dirección o ítems.
              </div>
            )}

            {/* Selectores y Botón Limpiar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {activeTab === 'orders' && drivers.length > 0 && (
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '11px'
                  }}
                >
                  <option value="all">Todos los repartidores</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.name || d.username}</option>
                  ))}
                </select>
              )}

              {activeTab === 'orders' && zones.length > 0 && (
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '11px'
                  }}
                >
                  <option value="all">📍 Todas las zonas</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id.toString()}>{z.name}</option>
                  ))}
                </select>
              )}

              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetFilters}
                  icon={<RotateCcw size={12} />}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Restablecer
                </Button>
              )}

              <Badge variant="info" style={{ fontSize: '11px', padding: '3px 8px' }}>
                {activeTab === 'orders'
                  ? `${filteredAssignments.length} de ${assignments.length} domicilios`
                  : `${filteredPendingOrders.length} de ${pendingOrders.length} pendientes`}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Despachos Activos */}
      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-3)' }}>
          {assignments.length === 0 ? (
            <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              <Bike size={36} style={{ margin: '0 auto var(--space-2)', opacity: 0.5 }} />
              <div>No hay pedidos en despacho en este momento.</div>
              <Button variant="primary" onClick={handleOpenNewDelivery} style={{ marginTop: 'var(--space-3)', display: 'inline-flex' }}>
                <Plus size={14} /> Crear Primer Pedido de Delivery
              </Button>
            </Card>
          ) : filteredAssignments.length === 0 ? (
            <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              <Search size={36} style={{ margin: '0 auto var(--space-2)', opacity: 0.5, color: 'var(--accent-secondary)' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No se encontraron domicilios coincidentes
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {searchQuery ? `No hay resultados para "${searchQuery}" con los filtros actuales.` : 'Ningún domicilio coincide con los filtros aplicados.'}
              </div>
              <Button variant="secondary" onClick={handleResetFilters} icon={<RotateCcw size={14} />}>
                Limpiar Filtros y Búsqueda
              </Button>
            </Card>
          ) : (
            filteredAssignments.map((a) => {
              const isOrderPaid = a.order_status === 'cerrada';

              return (
                <Card key={a.id} style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>ORDEN #{a.order_id}</span>
                          {isOrderPaid ? (
                            <Badge variant="success" style={{ fontSize: '9px', padding: '1px 5px' }}>✓ Facturado & Pagado</Badge>
                          ) : (
                            <Badge variant="danger" style={{ fontSize: '9px', padding: '1px 5px' }}>Pendiente Cobro</Badge>
                          )}
                        </div>
                        <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800, marginTop: '2px' }}>{a.customer_name || 'Cliente Particular'}</h3>
                      </div>
                      {getStatusBadge(a.status)}
                    </div>

                    {/* Dirección y Repartidor */}
                    <div style={{ background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: 'var(--radius-md)', margin: 'var(--space-2) 0', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                        <MapPin size={13} color="var(--accent-secondary)" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontWeight: 600 }}>{a.delivery_address || 'Sin dirección registrada'}</span>
                      </div>
                      {a.customer_phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={12} color="var(--text-muted)" />
                          <span>{a.customer_phone}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-warning)', fontWeight: 600 }}>
                        <Bike size={12} />
                        <span>Repartidor: {a.driver_name}</span>
                      </div>
                      {a.zone_name && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                          Zona: {a.zone_name}
                        </div>
                      )}
                      {a.delivery_notes && (
                        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '10px', marginTop: '2px' }}>
                          "{a.delivery_notes}"
                        </div>
                      )}
                    </div>

                    {/* Ítems y Desglose Financiero */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', marginBottom: '8px', background: 'rgba(255,255,255,0.01)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Detalle del Pedido
                      </div>
                      <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {(a.items || []).map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span>{it.quantity}x {it.name}</span>
                            <span style={{ fontWeight: 600 }}>{formatCOP(parseFloat(it.unit_price) * parseFloat(it.quantity))}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '4px', paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>Consumo Productos:</span>
                          <span>{formatCOP(a.items_total || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-secondary)' }}>
                          <span>Tarifa Domicilio:</span>
                          <span>{formatCOP(a.delivery_fee || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px', color: 'var(--accent-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '2px', marginTop: '2px' }}>
                          <span>TOTAL A COBRAR:</span>
                          <span>{formatCOP(a.grand_total || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Entrega y Cobro */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {a.status === 'asignado' && (
                        <Button
                          variant="primary"
                          onClick={() => handleUpdateStatus(a.id, 'en_camino')}
                          style={{ flex: 1, fontSize: '11px', padding: '5px 8px', background: 'var(--accent-secondary)' }}
                        >
                          <Navigation size={12} /> Salir a Ruta
                        </Button>
                      )}
                      {a.status === 'en_camino' && (
                        <Button
                          variant="primary"
                          onClick={() => handleUpdateStatus(a.id, 'entregado')}
                          style={{ flex: 1, fontSize: '11px', padding: '5px 8px', background: 'var(--accent-primary)' }}
                        >
                          <CheckCircle2 size={12} /> Confirmar Entrega
                        </Button>
                      )}
                      {a.status === 'entregado' && (
                        <div style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, padding: '4px' }}>
                          ✓ Despacho Entregado
                        </div>
                      )}
                    </div>

                    {!isOrderPaid && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/facturacion?orderId=${a.order_id}`)}
                        style={{ width: '100%', fontSize: '11px', padding: '5px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'var(--accent-primary)', color: 'white' }}
                      >
                        <CreditCard size={13} color="var(--accent-secondary)" />
                        <span>Facturar & Confirmar Pago en Caja</span>
                        <ChevronRight size={12} />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Pendientes */}
      {activeTab === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
          {pendingOrders.length === 0 ? (
            <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              No hay pedidos pendientes de asignación.
            </Card>
          ) : filteredPendingOrders.length === 0 ? (
            <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              <Search size={36} style={{ margin: '0 auto var(--space-2)', opacity: 0.5, color: 'var(--accent-secondary)' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                No se encontraron pedidos pendientes coincidentes
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                No hay resultados para "{searchQuery}".
              </div>
              <Button variant="secondary" onClick={() => setSearchQuery('')} icon={<RotateCcw size={14} />}>
                Limpiar Búsqueda
              </Button>
            </Card>
          ) : (
            filteredPendingOrders.map((po) => (
              <Card key={po.id} style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800 }}>ORDEN #{po.id}</span>
                      <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800 }}>{po.customer_name || 'Cliente Particular'}</h3>
                    </div>
                    <Badge variant="warning">Sin Repartidor</Badge>
                  </div>

                  <div style={{ background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: 'var(--radius-md)', margin: 'var(--space-2) 0', display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={12} color="var(--accent-secondary)" />
                      <span>{po.delivery_address || 'Sin dirección'}</span>
                    </div>
                    {po.delivery_phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Phone size={12} color="var(--text-muted)" />
                        <span>{po.delivery_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    onClick={() => handleOpenAssignModal(po)}
                    style={{ width: '100%', fontSize: '11px', padding: '5px' }}
                  >
                    <Bike size={12} /> Asignar Repartidor
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Zonas */}
      {activeTab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
          {zones.map((z) => (
            <Card key={z.id} style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 800 }}>{z.name}</h3>
                  <Badge variant="success">Activa</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: 'var(--radius-md)', margin: 'var(--space-2) 0' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Tarifa de Envío</div>
                    <div style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCOP(z.delivery_fee)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Tiempo Estimado</div>
                    <div style={{ fontSize: 'var(--font-sm)', fontWeight: 800 }}>{z.estimated_time_mins} mins</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                <Button variant="secondary" size="sm" onClick={() => handleOpenEditZone(z)} style={{ fontSize: '11px', padding: '4px 8px' }}>
                  Editar Tarifa
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Nuevo Pedido Domicilio */}
      {newDeliveryModalOpen && (
        <Modal
          isOpen={newDeliveryModalOpen}
          onClose={() => setNewDeliveryModalOpen(false)}
          title="Crear y Despachar Pedido de Domicilio"
        >
          <form onSubmit={handleSubmitNewDelivery} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Buscador de Cliente CRM */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cliente (CRM)
                </label>
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomerId(''); setCustomerSearchQuery(''); setDeliveryAddress(''); setDeliveryPhone(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '10.5px' }}
                  >
                    ✕ Limpiar Selección
                  </button>
                )}
              </div>

              {selectedCustomerId ? (
                (() => {
                  const cust = customers.find(c => c.id.toString() === selectedCustomerId);
                  return cust ? (
                    <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '12px' }}>{cust.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {cust.document_type || 'CC'}: {cust.document_number || 'Sin doc'} {cust.phone ? `• Tel: ${cust.phone}` : ''}
                        </div>
                      </div>
                      <Badge variant="primary" style={{ fontSize: '9px' }}>Vinculado</Badge>
                    </div>
                  ) : null;
                })()
              ) : (
                <div style={{ position: 'relative' }}>
                  <Input
                    placeholder="Buscar cliente por Nombre, Cédula / NIT, Teléfono o Dirección..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    style={{ marginBottom: 0, fontSize: '11.5px' }}
                  />

                  {customerDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute', top: '100%', left: 0, right: 0,
                        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                        borderRadius: '6px', marginTop: '4px', maxHeight: '180px', overflowY: 'auto',
                        zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <span>Resultados ({customers.filter(c => !customerSearchQuery || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.phone || '').includes(customerSearchQuery) || (c.document_number || '').includes(customerSearchQuery) || (c.address || '').toLowerCase().includes(customerSearchQuery.toLowerCase())).length})</span>
                        <button type="button" onClick={() => setCustomerDropdownOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                      </div>

                      {customers
                        .filter(c => !customerSearchQuery || c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || (c.phone || '').includes(customerSearchQuery) || (c.document_number || '').includes(customerSearchQuery) || (c.address || '').toLowerCase().includes(customerSearchQuery.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              handleCustomerChange(c.id.toString());
                              setCustomerSearchQuery('');
                              setCustomerDropdownOpen(false);
                            }}
                            style={{
                              padding: '6px 10px', borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer', fontSize: '11.5px', transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {c.document_type || 'CC'}: {c.document_number || 'Sin doc'} {c.phone ? `• 📞 ${c.phone}` : ''} {c.address ? `• 📍 ${c.address}` : ''}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Dirección de Entrega *</label>
                <Input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ej: Calle 10 # 43E-12, Apto 502"
                  style={{ padding: '6px 8px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Teléfono Contacto</label>
                <Input
                  type="text"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="300 123 4567"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Zona de Cobertura</label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => handleZoneChange(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 8px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                  }}
                >
                  <option value="">Sin zona (Personalizada)</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name} ({formatCOP(z.delivery_fee)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Valor Domicilio ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={orderDeliveryFee}
                  onChange={(e) => setOrderDeliveryFee(e.target.value)}
                  placeholder="5000"
                  style={{ padding: '6px 8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Repartidor Asignado</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 8px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                  }}
                >
                  <option value="">Asignar más tarde</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name} ({d.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Productos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--font-xs)' }}>Productos del Pedido</span>
                <Button type="button" variant="ghost" onClick={handleAddItemRow} style={{ fontSize: '11px', padding: '2px 6px' }}>
                  <Plus size={12} /> Agregar Producto
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', maxHeight: '160px', overflowY: 'auto' }}>
                {orderItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr auto', gap: 'var(--space-1)', alignItems: 'center', background: 'var(--bg-primary)', padding: '5px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                      style={{
                        padding: '5px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                      }}
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCOP(p.price)})</option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      style={{ padding: '4px' }}
                    />

                    <div style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textAlign: 'right' }}>
                      {formatCOP((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      disabled={orderItems.length === 1}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px 4px' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div style={{ background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-xs)' }}>
              <div>
                <span>Productos: {formatCOP(calculateSubtotal())}</span>
                <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>+</span>
                <span>Domicilio: {formatCOP(parseFloat(orderDeliveryFee) || 0)}</span>
              </div>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: 'var(--font-sm)' }}>
                Total a Cobrar: {formatCOP(calculateSubtotal() + (parseFloat(orderDeliveryFee) || 0))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Notas de Envío / Instrucciones</label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ej: Timbre no funciona, pagar con efectivo..."
                rows="2"
                style={{
                  width: '100%', padding: '5px 8px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-xs)', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setNewDeliveryModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear y Despachar Pedido'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Asignar Repartidor a Pendiente */}
      {assignModalOpen && selectedPendingOrder && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title={`Asignar Domiciliario a Orden #${selectedPendingOrder.id}`}
        >
          <form onSubmit={handleSubmitAssign} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              <div><strong>Cliente:</strong> {selectedPendingOrder.customer_name || 'Particular'}</div>
              <div><strong>Dirección:</strong> {selectedPendingOrder.delivery_address}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Repartidor *</label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                }}
              >
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name} ({d.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Zona de Cobertura</label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                }}
              >
                <option value="">Sin zona específica</option>
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setAssignModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>Asignar y Notificar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Zona */}
      {zoneModalOpen && (
        <Modal
          isOpen={zoneModalOpen}
          onClose={() => setZoneModalOpen(false)}
          title={editingZone ? 'Editar Zona de Cobertura' : 'Nueva Zona de Cobertura'}
        >
          <form onSubmit={handleSubmitZone} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Nombre de la Zona *</label>
              <Input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Ej: El Poblado / Provenza"
                style={{ padding: '6px 8px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Tarifa de Envío ($) *</label>
                <Input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="Ej: 5000"
                  style={{ padding: '6px 8px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Tiempo Estimado (Minutos)</label>
                <Input
                  type="number"
                  min="5"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  placeholder="30"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setZoneModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Guardando...' : editingZone ? 'Actualizar Zona' : 'Crear Zona'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
