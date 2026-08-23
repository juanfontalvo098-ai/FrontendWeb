// src/pages/CustomersPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, Search, Edit2, Trash2, Award, CreditCard,
  History, ShoppingBag, DollarSign, Calendar, ChevronRight, Phone, Mail, MapPin, Building,
  RotateCcw, X, XCircle, ChevronDown, Filter, AlertCircle, CheckCircle2, SlidersHorizontal
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const CustomersPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros Avanzados de Clientes / CRM
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'regular' | 'vip' | 'mayorista'
  const [creditStatusFilter, setCreditStatusFilter] = useState('all'); // 'all' | 'with_debt' | 'with_limit' | 'no_debt'
  const [loyaltyFilter, setLoyaltyFilter] = useState('all'); // 'all' | 'with_points' | 'zero_points'
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'debt_desc' | 'points_desc' | 'limit_desc' | 'newest'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Medellín');
  const [customerType, setCustomerType] = useState('regular');
  const [creditLimit, setCreditLimit] = useState('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History & Stats State
  const [purchaseHistory, setPurchaseHistory] = useState({ purchases: [], stats: {} });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Credit Adjustment State
  const [creditAmount, setCreditAmount] = useState('');
  const [creditOperation, setCreditOperation] = useState('add');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      addToast('Error al cargar lista de clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setName('');
    setDocumentType('CC');
    setDocumentNumber('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('Medellín');
    setCustomerType('regular');
    setCreditLimit('0');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setDocumentType(customer.document_type || 'CC');
    setDocumentNumber(customer.document_number || '');
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setCity(customer.city || 'Medellín');
    setCustomerType(customer.customer_type || 'regular');
    setCreditLimit(customer.credit_limit ? customer.credit_limit.toString() : '0');
    setNotes(customer.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('El nombre del cliente es obligatorio', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        document_type: documentType || 'CC',
        document_number: documentNumber ? documentNumber.trim() : null,
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : 'Medellín',
        customer_type: customerType || 'regular',
        credit_limit: parseFloat(creditLimit) || 0,
        notes: notes ? notes.trim() : null
      };

      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        addToast('Cliente actualizado exitosamente', 'success');
      } else {
        await api.post('/customers', payload);
        addToast('Cliente creado exitosamente', 'success');
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      addToast(err.message || 'Error al guardar cliente', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`¿Estás seguro de desactivar al cliente "${customer.name}"?`)) return;
    try {
      await api.delete(`/customers/${customer.id}`);
      addToast('Cliente desactivado', 'success');
      fetchCustomers();
    } catch (err) {
      addToast(err.message || 'Error al eliminar cliente', 'error');
    }
  };

  const handleOpenHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryModalOpen(true);
    try {
      setHistoryLoading(true);
      const data = await api.get(`/customers/${customer.id}/purchases`);
      setPurchaseHistory(data);
    } catch (err) {
      addToast('Error al cargar historial de compras', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenCredit = (customer) => {
    setSelectedCustomer(customer);
    setCreditAmount('');
    setCreditOperation('add');
    setCreditModalOpen(true);
  };

  const handleSaveCredit = async (e) => {
    e.preventDefault();
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      addToast('Ingresa un monto válido', 'error');
      return;
    }
    try {
      await api.post(`/customers/${selectedCustomer.id}/credit`, {
        amount: parseFloat(creditAmount),
        operation: creditOperation
      });
      addToast('Saldo de crédito actualizado', 'success');
      setCreditModalOpen(false);
      fetchCustomers();
    } catch (err) {
      addToast(err.message || 'Error al ajustar crédito', 'error');
    }
  };

  // Lista de ciudades disponibles
  const availableCities = useMemo(() => {
    const set = new Set();
    customers.forEach(c => {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    });
    return Array.from(set).sort();
  }, [customers]);

  // Métricas y conteos de segmentación
  const counts = useMemo(() => {
    let regular = 0;
    let vip = 0;
    let mayorista = 0;
    let withDebt = 0;
    let totalDebt = 0;
    let totalCreditLimit = 0;
    let totalPoints = 0;

    customers.forEach(c => {
      if (c.customer_type === 'vip') vip++;
      else if (c.customer_type === 'mayorista') mayorista++;
      else regular++;

      const debt = parseFloat(c.credit_balance || 0);
      const limit = parseFloat(c.credit_limit || 0);
      const points = parseInt(c.loyalty_points || 0);

      if (debt > 0) withDebt++;
      totalDebt += debt;
      totalCreditLimit += limit;
      totalPoints += points;
    });

    return {
      all: customers.length,
      regular,
      vip,
      mayorista,
      withDebt,
      totalDebt,
      totalCreditLimit,
      totalPoints
    };
  }, [customers]);

  // Conteo de filtros activos
  const activeCustomersFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (creditStatusFilter !== 'all') count++;
    if (loyaltyFilter !== 'all') count++;
    if (cityFilter !== 'all') count++;
    if (sortBy !== 'name_asc') count++;
    return count;
  }, [filterType, creditStatusFilter, loyaltyFilter, cityFilter, sortBy]);

  // Filtrado y Ordenamiento Reactivo de Clientes
  const filteredCustomers = useMemo(() => {
    const result = customers.filter(c => {
      // 1. Buscador Omnibox
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matches = (c.name || '').toLowerCase().includes(q) ||
          (c.document_number || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Tipo de Cliente
      if (filterType !== 'all') {
        if ((c.customer_type || 'regular') !== filterType) return false;
      }

      // 3. Estado de Crédito / Cartera
      const balance = parseFloat(c.credit_balance || 0);
      const limit = parseFloat(c.credit_limit || 0);

      if (creditStatusFilter === 'with_debt' && balance <= 0) return false;
      if (creditStatusFilter === 'no_debt' && balance > 0) return false;
      if (creditStatusFilter === 'with_limit' && limit <= 0) return false;

      // 4. Puntos de Fidelidad
      const points = parseInt(c.loyalty_points || 0);
      if (loyaltyFilter === 'with_points' && points <= 0) return false;
      if (loyaltyFilter === 'zero_points' && points > 0) return false;

      // 5. Ciudad
      if (cityFilter !== 'all') {
        if ((c.city || '').trim().toLowerCase() !== cityFilter.trim().toLowerCase()) return false;
      }

      return true;
    });

    // Ordenamiento
    result.sort((a, b) => {
      const balanceA = parseFloat(a.credit_balance || 0);
      const balanceB = parseFloat(b.credit_balance || 0);
      const pointsA = parseInt(a.loyalty_points || 0);
      const pointsB = parseInt(b.loyalty_points || 0);
      const limitA = parseFloat(a.credit_limit || 0);
      const limitB = parseFloat(b.credit_limit || 0);

      if (sortBy === 'debt_desc') return balanceB - balanceA;
      if (sortBy === 'points_desc') return pointsB - pointsA;
      if (sortBy === 'limit_desc') return limitB - limitA;
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
      return (a.name || '').localeCompare(b.name || ''); // name_asc
    });

    return result;
  }, [customers, searchTerm, filterType, creditStatusFilter, loyaltyFilter, cityFilter, sortBy]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'vip':
        return <Badge variant="warning">⭐ VIP</Badge>;
      case 'mayorista':
        return <Badge variant="info">🏢 Mayorista / Empresa</Badge>;
      default:
        return <Badge variant="default">👤 Regular</Badge>;
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Users size={32} color="var(--accent-secondary)" />
            Clientes & CRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            Directorio fiscal, historial de compras, créditos y puntos de fidelización
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenNew} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <UserPlus size={18} />
          Nuevo Cliente
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--accent-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Clientes</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{counts.all}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{counts.regular} regulares · {counts.mayorista} empresas</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Award size={24} color="var(--accent-warning)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Fidelización VIP</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-warning)' }}>
              {counts.vip} VIP
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{counts.totalPoints} pts acumulados</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: counts.totalDebt > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <CreditCard size={24} color={counts.totalDebt > 0 ? 'var(--accent-danger)' : 'var(--accent-success)'} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cartera CxC / Deuda</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: counts.totalDebt > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
              {formatCOP(counts.totalDebt)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{counts.withDebt} clientes con saldo pendiente</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <DollarSign size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Cupo Total Otorgado</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-primary)' }}>
              {formatCOP(counts.totalCreditLimit)}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Disponible: {formatCOP(Math.max(0, counts.totalCreditLimit - counts.totalDebt))}</div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card style={{ padding: '14px 16px', marginBottom: 'var(--space-6)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {/* Fila 1: Buscador Omnibox + Ordenamiento + Botón Filtros Avanzados */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: searchTerm ? 'var(--accent-primary)' : 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento (cédula/NIT), teléfono, correo, ciudad o notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 34px 9px 36px',
                background: 'var(--bg-primary)',
                border: searchTerm ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxShadow: searchTerm ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Limpiar búsqueda"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <XCircle size={15} />
              </button>
            )}
          </div>

          {/* Selector de Ordenamiento */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                border: sortBy !== 'name_asc' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: sortBy !== 'name_asc' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-primary)',
                color: sortBy !== 'name_asc' ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="name_asc">🔤 Nombre (A - Z)</option>
              <option value="name_desc">🔤 Nombre (Z - A)</option>
              <option value="debt_desc">🚨 Mayor Deuda Pendiente (Cobranza)</option>
              <option value="points_desc">⭐ Más Puntos de Fidelidad</option>
              <option value="limit_desc">💰 Mayor Cupo Aprobado</option>
              <option value="newest">✨ Más Recientes</option>
            </select>
          </div>

          {/* Botón Filtros Avanzados */}
          <Button
            type="button"
            size="sm"
            variant={showAdvancedFilters || activeCustomersFiltersCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            icon={<SlidersHorizontal size={13} />}
            style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
          >
            Filtros
            {activeCustomersFiltersCount > 0 && (
              <span style={{
                marginLeft: '4px',
                padding: '1px 5px',
                borderRadius: '8px',
                background: showAdvancedFilters || activeCustomersFiltersCount > 0 ? '#fff' : 'var(--accent-primary)',
                color: showAdvancedFilters || activeCustomersFiltersCount > 0 ? 'var(--accent-primary)' : '#fff',
                fontSize: '10px',
                fontWeight: 900
              }}>
                {activeCustomersFiltersCount}
              </span>
            )}
            <ChevronDown size={13} style={{ marginLeft: '4px', transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </Button>
        </div>

        {/* Fila 2: Chips de Segmento y Deuda */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Segmento:</span>
            {[
              { id: 'all', label: `Todos (${counts.all})` },
              { id: 'regular', label: `Regular (${counts.regular})` },
              { id: 'vip', label: `⭐ VIP (${counts.vip})` },
              { id: 'mayorista', label: `🏢 Mayorista / Empresa (${counts.mayorista})` },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterType(t.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: filterType === t.id ? 700 : 500,
                  border: filterType === t.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: filterType === t.id ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
                  color: filterType === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}

            <div style={{ height: '14px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />

            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Cartera:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'with_debt', label: `🚨 Con Saldo Pendiente (${counts.withDebt})` },
              { id: 'with_limit', label: '💳 Con Cupo' },
              { id: 'no_debt', label: '✅ Sin Deuda' },
            ].map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCreditStatusFilter(c.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: creditStatusFilter === c.id ? 700 : 500,
                  border: creditStatusFilter === c.id ? (c.id === 'with_debt' ? '1px solid #ef4444' : '1px solid #10b981') : '1px solid var(--border-color)',
                  background: creditStatusFilter === c.id ? (c.id === 'with_debt' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)') : 'var(--bg-primary)',
                  color: creditStatusFilter === c.id ? (c.id === 'with_debt' ? '#ef4444' : '#10b981') : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Badge variant="info" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'cliente' : 'clientes'}
          </Badge>
        </div>

        {/* Fila 3: Panel Desplegable de Filtros Avanzados */}
        {showAdvancedFilters && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Filtro: Ciudad */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} /> Ciudad / Ubicación
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: cityFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="all">Todas las Ciudades</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Filtro: Puntos de Fidelidad */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                <Award size={12} style={{ display: 'inline', marginRight: '4px' }} /> Puntos de Fidelidad
              </label>
              <select
                value={loyaltyFilter}
                onChange={(e) => setLoyaltyFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: loyaltyFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="all">Todos los Clientes</option>
                <option value="with_points">⭐ Con Puntos Acumulados (+ de 0)</option>
                <option value="zero_points">Sin Puntos Acumulados (0)</option>
              </select>
            </div>
          </div>
        )}

        {/* Fila 4: Pills de Filtros Activos y Limpieza */}
        {(searchTerm || filterType !== 'all' || creditStatusFilter !== 'all' || loyaltyFilter !== 'all' || cityFilter !== 'all' || sortBy !== 'name_asc') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtros Activos:</span>

              {searchTerm && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  "{searchTerm}"
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                </span>
              )}

              {filterType !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Tipo: {filterType}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setFilterType('all')} />
                </span>
              )}

              {creditStatusFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                  Cartera: {creditStatusFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setCreditStatusFilter('all')} />
                </span>
              )}

              {cityFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', fontSize: '11px', fontWeight: 700 }}>
                  Ciudad: {cityFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setCityFilter('all')} />
                </span>
              )}

              {loyaltyFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
                  Fidelización: {loyaltyFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setLoyaltyFilter('all')} />
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setCreditStatusFilter('all');
                setLoyaltyFilter('all');
                setCityFilter('all');
                setSortBy('name_asc');
              }}
              icon={<RotateCcw size={12} />}
              style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700, color: 'var(--accent-danger)' }}
            >
              Limpiar Filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 'var(--space-4)' }}>Cliente</th>
                <th style={{ padding: 'var(--space-4)' }}>Documento</th>
                <th style={{ padding: 'var(--space-4)' }}>Contacto</th>
                <th style={{ padding: 'var(--space-4)' }}>Tipo</th>
                <th style={{ padding: 'var(--space-4)' }}>Puntos</th>
                <th style={{ padding: 'var(--space-4)' }}>Crédito (Usado / Límite)</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    Cargando directorio de clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    No se encontraron clientes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: 'var(--space-4)', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-xs)', color: 'var(--accent-secondary)' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{c.name}</div>
                          {c.city && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.city}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      {c.document_number ? (
                        <span><strong style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.document_type}</strong> {c.document_number}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} color="var(--text-muted)" /> {c.phone}</span>}
                        {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}><Mail size={12} color="var(--text-muted)" /> {c.email}</span>}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>{getTypeBadge(c.customer_type)}</td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.1)', color: 'var(--accent-warning)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                        <Award size={14} /> {c.loyalty_points || 0} pts
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: parseFloat(c.credit_balance) > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
                          {formatCOP(c.credit_balance || 0)}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> / {formatCOP(c.credit_limit || 0)}</span>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenHistory(c)}
                          title="Historial de compras"
                          style={{ padding: '6px 8px' }}
                        >
                          <History size={16} color="var(--accent-secondary)" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenCredit(c)}
                          title="Gestionar crédito"
                          style={{ padding: '6px 8px' }}
                        >
                          <DollarSign size={16} color="var(--accent-primary)" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenEdit(c)}
                          title="Editar cliente"
                          style={{ padding: '6px 8px' }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(c)}
                          title="Desactivar"
                          style={{ padding: '6px 8px', color: 'var(--accent-danger)' }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Crear / Editar Cliente */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente CRM'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Nombre o Razón Social *</label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Juan Pérez o Inversiones S.A.S."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Tipo Doc.</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                  }}
                >
                  <option value="CC">Cédula (CC)</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">Cédula Ext. (CE)</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Número Documento</label>
                <Input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ej: 1020304050"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Teléfono / Móvil</label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 3001234567"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Correo Electrónico</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Dirección</label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Cra 43A # 1-50"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Ciudad</label>
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Medellín"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Tipo de Cliente</label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                  }}
                >
                  <option value="regular">Regular</option>
                  <option value="vip">VIP (Descuentos y beneficios)</option>
                  <option value="mayorista">Mayorista</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Límite de Crédito ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Notas Internas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferencias del cliente, observaciones fiscales..."
                rows="2"
                style={{
                  width: '100%', padding: '8px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-sm)', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Guardando...' : editingCustomer ? 'Actualizar' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Historial de Compras */}
      {historyModalOpen && selectedCustomer && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Historial de Compras — ${selectedCustomer.name}`}
        >
          <div>
            {/* Stats resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>COMPRAS</div>
                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>{purchaseHistory.stats?.total_purchases || 0}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL GASTADO</div>
                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {formatCOP(purchaseHistory.stats?.total_spent || 0)}
                </div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TICKET PROMEDIO</div>
                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>
                  {formatCOP(purchaseHistory.stats?.avg_ticket || 0)}
                </div>
              </div>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>Cargando compras...</div>
            ) : purchaseHistory.purchases?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>El cliente aún no tiene facturas registradas.</div>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {purchaseHistory.purchases.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.invoice_number}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleDateString()} • {p.payment_method?.toUpperCase()} • {p.table_number || 'Para Llevar'}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {formatCOP(p.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Ajustar Crédito */}
      {creditModalOpen && selectedCustomer && (
        <Modal
          isOpen={creditModalOpen}
          onClose={() => setCreditModalOpen(false)}
          title={`Gestionar Crédito — ${selectedCustomer.name}`}
        >
          <form onSubmit={handleSaveCredit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Saldo Utilizado Actual:</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-danger)' }}>{formatCOP(selectedCustomer.credit_balance || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Límite Autorizado:</span>
                <span style={{ fontWeight: 800 }}>{formatCOP(selectedCustomer.credit_limit || 0)}</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Operación</label>
              <select
                value={creditOperation}
                onChange={(e) => setCreditOperation(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                }}
              >
                <option value="subtract">Abono / Pago de Crédito (Disminuir saldo adeudado)</option>
                <option value="add">Cargar Consumo a Crédito (Aumentar saldo adeudado)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Monto ($)</label>
              <Input
                type="number"
                min="1"
                step="100"
                required
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setCreditModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary">Guardar Ajuste</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
