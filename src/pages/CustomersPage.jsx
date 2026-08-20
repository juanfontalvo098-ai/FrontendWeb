// src/pages/CustomersPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, Edit2, Trash2, Award, CreditCard,
  History, ShoppingBag, DollarSign, Calendar, ChevronRight, Phone, Mail, MapPin, Building
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

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
      let query = '/customers?';
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      if (filterType) query += `customer_type=${filterType}&`;
      const data = await api.get(query);
      setCustomers(data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      addToast('Error al cargar lista de clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, filterType]);

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
        name,
        document_type: documentType,
        document_number: documentNumber || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        customer_type: customerType,
        credit_limit: parseFloat(creditLimit) || 0,
        notes: notes || null
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

  const getTypeBadge = (type) => {
    switch (type) {
      case 'vip':
        return <Badge variant="warning">VIP</Badge>;
      case 'mayorista':
        return <Badge variant="info">Mayorista</Badge>;
      default:
        return <Badge variant="default">Regular</Badge>;
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
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{customers.length}</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Award size={24} color="var(--accent-warning)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Clientes VIP</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>
              {customers.filter(c => c.customer_type === 'vip').length}
            </div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <CreditCard size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Crédito Otorgado</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>
              {formatCOP(customers.reduce((sum, c) => sum + parseFloat(c.credit_balance || 0), 0))}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento, teléfono o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)'
              }}
            />
          </div>
          <div style={{ width: '200px' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-sm)'
              }}
            >
              <option value="">Todos los tipos</option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
              <option value="mayorista">Mayorista</option>
            </select>
          </div>
        </div>
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
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
