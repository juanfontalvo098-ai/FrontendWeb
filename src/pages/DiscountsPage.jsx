// src/pages/DiscountsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Tag, Percent, Plus, Edit2, Trash2, Clock, Ticket,
  ListOrdered, CheckCircle, Calendar, DollarSign, Sparkles
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const DiscountsPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('discounts'); // 'discounts' | 'coupons' | 'pricelists'
  const [discounts, setDiscounts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  // Form Descuento
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed_amount'
  const [value, setValue] = useState('');
  const [appliesTo, setAppliesTo] = useState('order'); // 'order' | 'category' | 'product'
  const [targetId, setTargetId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]); // Lunes a Viernes

  // Form Cupón
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountId, setCouponDiscountId] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('50');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [disc, coup, lists, cats, prods] = await Promise.all([
        api.get('/discounts'),
        api.get('/discounts/coupons'),
        api.get('/discounts/price-lists'),
        api.get('/categories'),
        api.get('/products')
      ]);
      setDiscounts(disc || []);
      setCoupons(coup || []);
      setPriceLists(lists || []);
      setCategories(cats || []);
      setProducts(prods || []);
      if (disc && disc.length > 0 && !couponDiscountId) {
        setCouponDiscountId(disc[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar descuentos:', err);
      addToast('Error al cargar descuentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenNewDiscount = () => {
    setEditingDiscount(null);
    setName('');
    setDescription('');
    setDiscountType('percentage');
    setValue('');
    setAppliesTo('order');
    setTargetId('');
    setStartTime('');
    setEndTime('');
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setDiscountModalOpen(true);
  };

  const handleOpenEditDiscount = (d) => {
    setEditingDiscount(d);
    setName(d.name);
    setDescription(d.description || '');
    setDiscountType(d.discount_type);
    setValue(d.value.toString());
    setAppliesTo(d.applies_to || 'order');
    setTargetId(d.target_id ? d.target_id.toString() : '');
    setStartTime(d.start_time || '');
    setEndTime(d.end_time || '');
    try {
      const days = typeof d.days_of_week === 'string' ? JSON.parse(d.days_of_week) : d.days_of_week;
      setDaysOfWeek(Array.isArray(days) ? days : [1, 2, 3, 4, 5]);
    } catch (e) {
      setDaysOfWeek([1, 2, 3, 4, 5]);
    }
    setDiscountModalOpen(true);
  };

  const handleSubmitDiscount = async (e) => {
    e.preventDefault();
    if (!name.trim() || !value) {
      addToast('Nombre y valor del descuento son obligatorios', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name,
        description: description || null,
        discount_type: discountType,
        value: parseFloat(value),
        applies_to: appliesTo,
        target_id: targetId ? parseInt(targetId, 10) : null,
        start_time: startTime || null,
        end_time: endTime || null,
        days_of_week: daysOfWeek
      };

      if (editingDiscount) {
        await api.put(`/discounts/${editingDiscount.id}`, payload);
        addToast('Descuento actualizado', 'success');
      } else {
        await api.post('/discounts', payload);
        addToast('Descuento creado', 'success');
      }

      setDiscountModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar descuento', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDiscount = async (d) => {
    if (!window.confirm(`¿Desactivar descuento "${d.name}"?`)) return;
    try {
      await api.delete(`/discounts/${d.id}`);
      addToast('Descuento desactivado', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al desactivar descuento', 'error');
    }
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim() || !couponDiscountId) {
      addToast('Código y descuento asociado son requeridos', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/discounts/coupons', {
        code: couponCode.trim().toUpperCase(),
        discount_id: parseInt(couponDiscountId, 10),
        max_uses: couponMaxUses ? parseInt(couponMaxUses, 10) : null,
        valid_from: validFrom,
        valid_until: validUntil
      });

      addToast('Cupón promocional creado exitosamente', 'success');
      setCouponModalOpen(false);
      setCouponCode('');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al crear cupón', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDay = (day) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter(d => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const DAYS = [
    { num: 1, label: 'L' }, { num: 2, label: 'M' }, { num: 3, label: 'X' },
    { num: 4, label: 'J' }, { num: 5, label: 'V' }, { num: 6, label: 'S' }, { num: 0, label: 'D' }
  ];

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Tag size={32} color="var(--accent-secondary)" />
            Descuentos, Promociones & Cupones
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '4px' }}>
            Campañas promocionales automáticas, Happy Hours por franja horaria y cupones de fidelización
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {activeTab === 'discounts' && (
            <Button variant="primary" onClick={handleOpenNewDiscount} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Plus size={18} />
              Nueva Promoción
            </Button>
          )}
          {activeTab === 'coupons' && (
            <Button variant="primary" onClick={() => setCouponModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Plus size={18} />
              Nuevo Cupón
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-6)' }}>
        <button
          onClick={() => setActiveTab('discounts')}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'discounts' ? '3px solid var(--accent-secondary)' : '3px solid transparent',
            color: activeTab === 'discounts' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'discounts' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 'var(--font-base)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}
        >
          <Percent size={18} />
          Promociones & Happy Hour ({discounts.length})
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          style={{
            padding: 'var(--space-3) var(--space-6)',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'coupons' ? '3px solid var(--accent-secondary)' : '3px solid transparent',
            color: activeTab === 'coupons' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'coupons' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 'var(--font-base)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)'
          }}
        >
          <Ticket size={18} />
          Cupones de Descuento ({coupons.length})
        </button>
      </div>

      {/* Tab: Promociones */}
      {activeTab === 'discounts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
          {discounts.length === 0 ? (
            <Card style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
              No hay promociones registradas. Crea una nueva promoción o Happy Hour.
            </Card>
          ) : (
            discounts.map((d) => {
              const isHappyHour = Boolean(d.start_time && d.end_time);

              return (
                <Card key={d.id} style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: 800 }}>{d.name}</h3>
                        {d.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.description}</div>}
                      </div>
                      <Badge variant={d.discount_type === 'percentage' ? 'success' : 'info'}>
                        {d.discount_type === 'percentage' ? `${d.value}% OFF` : `-${formatCOP(d.value)}`}
                      </Badge>
                    </div>

                    <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 'var(--radius-md)', margin: 'var(--space-3) 0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Aplica a:</span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{d.applies_to}</span>
                      </div>
                      {isHappyHour && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Horario Happy Hour:</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {d.start_time.slice(0, 5)} - {d.end_time.slice(0, 5)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
                    <Button variant="ghost" onClick={() => handleOpenEditDiscount(d)} style={{ padding: '6px 12px', fontSize: 'var(--font-xs)' }}>
                      <Edit2 size={14} /> Editar
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteDiscount(d)} style={{ padding: '6px 12px', fontSize: 'var(--font-xs)', color: 'var(--accent-danger)' }}>
                      <Trash2 size={14} /> Desactivar
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Cupones */}
      {activeTab === 'coupons' && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-sm)' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: 'var(--space-4)' }}>Código Cupón</th>
                  <th style={{ padding: 'var(--space-4)' }}>Descuento Asociado</th>
                  <th style={{ padding: 'var(--space-4)' }}>Usos</th>
                  <th style={{ padding: 'var(--space-4)' }}>Vigencia Desde</th>
                  <th style={{ padding: 'var(--space-4)' }}>Vigencia Hasta</th>
                  <th style={{ padding: 'var(--space-4)' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                      No hay cupones promocionales registrados.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => {
                    const isExpired = new Date(c.valid_until) < new Date();
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: 'var(--space-4)' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', letterSpacing: '0.05em', color: 'var(--accent-secondary)' }}>
                            {c.code}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-4)', fontWeight: 600 }}>{c.discount_name}</td>
                        <td style={{ padding: 'var(--space-4)' }}>
                          <strong>{c.used_count || 0}</strong> / {c.max_uses ? c.max_uses : '∞'}
                        </td>
                        <td style={{ padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>{new Date(c.valid_from).toLocaleDateString()}</td>
                        <td style={{ padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>{new Date(c.valid_until).toLocaleDateString()}</td>
                        <td style={{ padding: 'var(--space-4)' }}>
                          <Badge variant={isExpired ? 'danger' : 'success'}>
                            {isExpired ? 'Vencido' : 'Activo'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal Descuento */}
      {discountModalOpen && (
        <Modal
          isOpen={discountModalOpen}
          onClose={() => setDiscountModalOpen(false)}
          title={editingDiscount ? 'Editar Promoción' : 'Nueva Promoción / Descuento'}
        >
          <form onSubmit={handleSubmitDiscount} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Nombre de la Promoción *</label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Happy Hour Bebidas 15% o Descuento Almuerzo"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Tipo de Descuento</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                  }}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed_amount">Monto Fijo ($)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>
                  Valor ({discountType === 'percentage' ? '%' : '$'}) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? 'Ej: 15' : 'Ej: 5000'}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Aplica a</label>
                <select
                  value={appliesTo}
                  onChange={(e) => { setAppliesTo(e.target.value); setTargetId(''); }}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                  }}
                >
                  <option value="order">Toda la Cuenta / Orden</option>
                  <option value="category">Categoría Específica</option>
                  <option value="product">Producto Específico</option>
                </select>
              </div>

              {appliesTo === 'category' && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Categoría Destino</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                    }}
                  >
                    <option value="">Selecciona categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {appliesTo === 'product' && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Producto Destino</label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                    }}
                  >
                    <option value="">Selecciona producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Happy Hour Times */}
            <div style={{ background: 'var(--bg-primary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-xs)', color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Franja Horaria Happy Hour (Opcional)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hora Inicio:</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hora Fin:</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Días de la semana:</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {DAYS.map((d) => (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => toggleDay(d.num)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        border: '1px solid var(--border-color)',
                        background: daysOfWeek.includes(d.num) ? 'var(--accent-secondary)' : 'var(--bg-elevated)',
                        color: daysOfWeek.includes(d.num) ? '#000' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setDiscountModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Guardando...' : editingDiscount ? 'Actualizar' : 'Crear Promoción'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Cupón */}
      {couponModalOpen && (
        <Modal
          isOpen={couponModalOpen}
          onClose={() => setCouponModalOpen(false)}
          title="Crear Nuevo Cupón Promocional"
        >
          <form onSubmit={handleSubmitCoupon} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Código del Cupón *</label>
              <Input
                type="text"
                required
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Ej: BIENVENIDO2026 o BLACKFRIDAY"
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Descuento Asociado *</label>
              <select
                value={couponDiscountId}
                onChange={(e) => setCouponDiscountId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
                }}
              >
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.discount_type === 'percentage' ? `${d.value}%` : formatCOP(d.value)})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Límite Máximo de Usos (Vacío = Ilimitado)</label>
              <Input
                type="number"
                min="1"
                value={couponMaxUses}
                onChange={(e) => setCouponMaxUses(e.target.value)}
                placeholder="Ej: 50"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Válido Desde</label>
                <Input type="date" required value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-sm)', marginBottom: '4px', fontWeight: 600 }}>Válido Hasta</label>
                <Input type="date" required value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button type="button" variant="ghost" onClick={() => setCouponModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear Cupón'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
