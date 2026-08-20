// src/pages/SuppliersPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, Search, Edit2, Trash2, Package, Phone, Mail, MapPin,
  ShoppingBag, DollarSign, Calendar, ExternalLink, Clock, PlusCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const SuppliersPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState({ orders: [], stats: {} });

  // Form Proveedor
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Medellín');
  const [paymentTerms, setPaymentTerms] = useState('contado');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form Asociar Producto a Proveedor
  const [selectedProductId, setSelectedProductId] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [supplierCostPrice, setSupplierCostPrice] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('1');

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      let query = '/suppliers?';
      if (searchTerm) query += `search=${encodeURIComponent(searchTerm)}&`;
      const data = await api.get(query);
      setSuppliers(data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
      addToast('Error al cargar proveedores', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.get('/products');
      setProducts(data);
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [searchTerm]);

  const handleOpenNew = () => {
    setEditingSupplier(null);
    setName('');
    setContactName('');
    setDocumentNumber('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('Medellín');
    setPaymentTerms('contado');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContactName(sup.contact_name || '');
    setDocumentNumber(sup.document_number || '');
    setEmail(sup.email || '');
    setPhone(sup.phone || '');
    setAddress(sup.address || '');
    setCity(sup.city || 'Medellín');
    setPaymentTerms(sup.payment_terms || 'contado');
    setNotes(sup.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('El nombre de la empresa es obligatorio', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name,
        contact_name: contactName || null,
        document_number: documentNumber || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        payment_terms: paymentTerms,
        notes: notes || null
      };

      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        addToast('Proveedor actualizado exitosamente', 'success');
      } else {
        await api.post('/suppliers', payload);
        addToast('Proveedor registrado exitosamente', 'success');
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      addToast(err.message || 'Error al guardar proveedor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sup) => {
    if (!window.confirm(`¿Estás seguro de desactivar al proveedor "${sup.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${sup.id}`);
      addToast('Proveedor desactivado', 'success');
      fetchSuppliers();
    } catch (err) {
      addToast(err.message || 'Error al desactivar proveedor', 'error');
    }
  };

  const handleOpenCatalog = async (sup) => {
    setSelectedSupplier(sup);
    setCatalogModalOpen(true);
    try {
      const data = await api.get(`/suppliers/${sup.id}`);
      setSupplierProducts(data.products || []);
    } catch (err) {
      addToast('Error al cargar catálogo del proveedor', 'error');
    }
  };

  const handleOpenAddProduct = () => {
    setSupplierSku('');
    setSupplierCostPrice('');
    setLeadTimeDays('1');
    setAddProductModalOpen(true);
  };

  const handleSaveProductToSupplier = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !supplierCostPrice) {
      addToast('Selecciona el producto y define el precio de costo', 'error');
      return;
    }

    try {
      await api.post(`/suppliers/${selectedSupplier.id}/products`, {
        product_id: parseInt(selectedProductId, 10),
        supplier_sku: supplierSku || null,
        cost_price: parseFloat(supplierCostPrice),
        lead_time_days: parseInt(leadTimeDays, 10) || 1
      });
      addToast('Producto agregado al catálogo del proveedor', 'success');
      setAddProductModalOpen(false);

      // Recargar catálogo
      const data = await api.get(`/suppliers/${selectedSupplier.id}`);
      setSupplierProducts(data.products || []);
    } catch (err) {
      addToast(err.message || 'Error al asociar producto', 'error');
    }
  };

  const handleRemoveProductFromSupplier = async (productId) => {
    if (!window.confirm('¿Remover este producto del catálogo del proveedor?')) return;
    try {
      await api.delete(`/suppliers/${selectedSupplier.id}/products/${productId}`);
      addToast('Producto removido', 'success');
      const data = await api.get(`/suppliers/${selectedSupplier.id}`);
      setSupplierProducts(data.products || []);
    } catch (err) {
      addToast(err.message || 'Error al remover producto', 'error');
    }
  };

  const handleOpenHistory = async (sup) => {
    setSelectedSupplier(sup);
    setHistoryModalOpen(true);
    try {
      const data = await api.get(`/suppliers/${sup.id}/purchases`);
      setPurchaseHistory(data);
    } catch (err) {
      addToast('Error al cargar historial de compras', 'error');
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Truck size={32} color="var(--accent-secondary)" />
            Proveedores & Abastecimiento
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            Gestión de compras, condiciones de pago y catálogo de materias primas
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenNew} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Plus size={18} />
          Nuevo Proveedor
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(6, 182, 212, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Truck size={24} color="var(--accent-secondary)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Proveedores Activos</div>
            <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800 }}>{suppliers.length}</div>
          </div>
        </Card>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)' }}>
            <Package size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Plazos de Crédito</div>
            <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {suppliers.filter(s => s.payment_terms !== 'contado').length} a crédito
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar proveedor por nombre, NIT, contacto o teléfono..."
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
      </Card>

      {/* Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 'var(--space-4)' }}>Empresa / Razón Social</th>
                <th style={{ padding: 'var(--space-4)' }}>NIT / Documento</th>
                <th style={{ padding: 'var(--space-4)' }}>Contacto</th>
                <th style={{ padding: 'var(--space-4)' }}>Condición de Pago</th>
                <th style={{ padding: 'var(--space-4)' }}>Ubicación</th>
                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    Cargando proveedores...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    No hay proveedores registrados.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 'var(--space-4)', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-xs)', color: 'var(--accent-primary)' }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{s.name}</div>
                          {s.contact_name && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Attn: {s.contact_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>{s.document_number || '-'}</td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        {s.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} color="var(--text-muted)" /> {s.phone}</span>}
                        {s.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}><Mail size={12} color="var(--text-muted)" /> {s.email}</span>}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <Badge variant={s.payment_terms === 'contado' ? 'default' : 'info'}>
                        {s.payment_terms || 'Contado'}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                      {s.city ? `${s.city}` : '-'}
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenCatalog(s)}
                          title="Ver catálogo de productos"
                          style={{ padding: '6px 8px' }}
                        >
                          <Package size={16} color="var(--accent-secondary)" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenHistory(s)}
                          title="Historial de órdenes de compra"
                          style={{ padding: '6px 8px' }}
                        >
                          <ShoppingBag size={16} color="var(--accent-warning)" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenEdit(s)}
                          title="Editar"
                          style={{ padding: '6px 8px' }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(s)}
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

      {/* Modal Crear/Editar Proveedor */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Razón Social / Nombre *</label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Distribuidora Avícola S.A.S."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Persona de Contacto</label>
                <Input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ej: Roberto Gómez"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>NIT / Cédula</label>
                <Input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ej: 900.123.456-7"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Teléfono</label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 3157778899"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Correo Electrónico</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pedidos@proveedor.com"
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
                  placeholder="Central Mayorista Bloque 12"
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

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Condiciones de Pago</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                }}
              >
                <option value="contado">Contado</option>
                <option value="15 días">Crédito 15 días</option>
                <option value="30 días">Crédito 30 días</option>
                <option value="45 días">Crédito 45 días</option>
                <option value="60 días">Crédito 60 días</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Días de despacho, mínimos de compra, cuenta bancaria..."
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
                {submitting ? 'Guardando...' : editingSupplier ? 'Actualizar' : 'Crear Proveedor'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Catálogo de Productos del Proveedor */}
      {catalogModalOpen && selectedSupplier && (
        <Modal
          isOpen={catalogModalOpen}
          onClose={() => setCatalogModalOpen(false)}
          title={`Catálogo de Productos — ${selectedSupplier.name}`}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                Productos suministrados por este proveedor y sus costos pactados:
              </div>
              <Button variant="primary" onClick={handleOpenAddProduct} style={{ fontSize: 'var(--font-xs)', padding: '6px 12px' }}>
                <PlusCircle size={14} /> Asociar Producto
              </Button>
            </div>

            {supplierProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                No hay productos asociados a este proveedor aún.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '350px', overflowY: 'auto' }}>
                {supplierProducts.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.product_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        SKU Proveedor: {p.supplier_sku || 'N/A'} • Entrega: {p.lead_time_days || 1} día(s)
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>COSTO PACTADO</div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCOP(p.cost_price)}</div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleRemoveProductFromSupplier(p.product_id)}
                        style={{ color: 'var(--accent-danger)', padding: '4px' }}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Asociar Producto */}
      {addProductModalOpen && (
        <Modal
          isOpen={addProductModalOpen}
          onClose={() => setAddProductModalOpen(false)}
          title="Asociar Producto al Proveedor"
        >
          <form onSubmit={handleSaveProductToSupplier} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Producto del Sistema *</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                }}
              >
                {products.map((prod) => (
                  <option key={prod.id} value={prod.id}>{prod.name} (Precio venta: {formatCOP(prod.price)})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>SKU / Código Proveedor</label>
                <Input
                  type="text"
                  value={supplierSku}
                  onChange={(e) => setSupplierSku(e.target.value)}
                  placeholder="Ej: PROV-001"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Precio de Costo ($) *</label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={supplierCostPrice}
                  onChange={(e) => setSupplierCostPrice(e.target.value)}
                  placeholder="Ej: 14000"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Días de Entrega Estimados</label>
              <Input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                placeholder="1"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setAddProductModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary">Guardar en Catálogo</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Historial de Compras */}
      {historyModalOpen && selectedSupplier && (
        <Modal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          title={`Historial de Compras — ${selectedSupplier.name}`}
        >
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ÓRDENES DE COMPRA</div>
                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>{purchaseHistory.stats?.total_orders || 0}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL COMPRADO</div>
                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {formatCOP(purchaseHistory.stats?.total_purchased || 0)}
                </div>
              </div>
            </div>

            {purchaseHistory.orders?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                No hay órdenes de compra registradas con este proveedor.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '350px', overflowY: 'auto' }}>
                {purchaseHistory.orders.map((po) => (
                  <div key={po.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{po.order_number}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(po.order_date).toLocaleDateString()} • <Badge variant={po.status === 'recibida' ? 'success' : 'warning'}>{po.status}</Badge>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCOP(po.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
