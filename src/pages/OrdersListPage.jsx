// src/pages/OrdersListPage.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ListOrdered, UtensilsCrossed, Bike, ShoppingBag, Search, Filter,
  Plus, FileText, CheckCircle2, Clock, XCircle, DollarSign,
  User, Phone, MapPin, Printer, CreditCard, ChevronRight, ChevronLeft, Eye,
  AlertCircle, RotateCcw, Calendar, Percent, ShieldCheck, Tag,
  ArrowRight, UserPlus, Check, Sparkles, Receipt, Trash2, Send,
  HelpCircle, RefreshCw, Layers, Edit3, Save, X, Ban, Utensils,
  Mail, Star, ChevronDown, CheckCircle, Landmark, SlidersHorizontal,
  Wallet
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP, formatDateTime, formatDate } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { printKitchenTicket, printPreFactura, printInvoiceReceipt, getCleanTableOrType } from '../utils/printUtils';
import { ProductModifiersModal } from '../components/ProductModifiersModal';

// =========================================================================
// SUB-COMPONENTE: SELECTOR / BUSCADOR INTELIGENTE DE CLIENTES (PREDICTIVO)
// =========================================================================
const CustomerSearchSelector = ({
  customers = [],
  selectedCustomerId = '',
  selectedCustomerName = '',
  onSelectCustomer,
  onSelectConsumidorFinal,
  onOpenQuickCreate,
  isDelivery = false,
  title = 'CLIENTE / CONSUMIDOR'
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'consumidor_final') return null;
    return customers.find(c => c.id.toString() === selectedCustomerId.toString()) || null;
  }, [customers, selectedCustomerId]);

  const isConsumidorFinal = selectedCustomerId === 'consumidor_final' || (!selectedCustomerId && selectedCustomerName.includes('Consumidor Final'));

  // Filtrado reactivo por Nombre, Cédula, NIT, Teléfono, Dirección o Email
  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return customers.slice(0, 8);
    const q = query.toLowerCase().trim();
    const tokens = q.split(/\s+/);

    return customers.filter(c => {
      const name = (c.name || '').toLowerCase();
      const doc = (c.document_number || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      const address = (c.address || '').toLowerCase();
      const email = (c.email || '').toLowerCase();

      const combined = `${name} ${doc} ${phone} ${address} ${email}`;
      return tokens.every(token => combined.includes(token));
    }).slice(0, 10);
  }, [customers, query]);

  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }} ref={dropdownRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{title}</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => {
              onSelectConsumidorFinal();
              setIsOpen(false);
              setQuery('');
            }}
            style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700,
              border: isConsumidorFinal ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: isConsumidorFinal ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
              color: isConsumidorFinal ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Consumidor Final
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickCreate(query)}
            style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700,
              border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
            }}
          >
            <UserPlus size={11} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Si hay un cliente seleccionado del CRM */}
      {selectedCustomer ? (
        <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1.5px solid var(--accent-primary)', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
              {selectedCustomer.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{selectedCustomer.name}</span>
                {selectedCustomer.customer_type === 'vip' && <span style={{ background: '#f59e0b', color: '#000', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>VIP</span>}
                {selectedCustomer.customer_type === 'frecuente' && <span style={{ background: '#8b5cf6', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>Frecuente</span>}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '1px' }}>
                <span><strong>{selectedCustomer.document_type || 'CC'}:</strong> {selectedCustomer.document_number || 'Sin documento'}</span>
                {selectedCustomer.phone && <span>· 📞 {selectedCustomer.phone}</span>}
                {selectedCustomer.address && <span>· 📍 {selectedCustomer.address}</span>}
              </div>
              {isDelivery && selectedCustomer.address && (
                <div style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 700, marginTop: '2px' }}>
                  ✓ Dirección y teléfono sincronizados con el domicilio
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectConsumidorFinal();
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            style={{ padding: '4px 8px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
          >
            Cambiar
          </button>
        </div>
      ) : isConsumidorFinal ? (
        /* Tarjeta de Consumidor Final */
        <div style={{ background: 'var(--bg-primary)', border: '1px dashed var(--border-color)', borderRadius: '6px', padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
              👤
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Consumidor Final (222222222222)
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Venta rápida anónima sin vinculación tributaria a cliente
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            style={{ padding: '4px 8px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 700 }}
          >
            Buscar Cliente CRM
          </button>
        </div>
      ) : (
        /* Barra de Búsqueda Interactiva */
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: query ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar por nombre, cédula, NIT, teléfono, dirección o email..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            style={{
              width: '100%', padding: '8px 30px 8px 30px', fontSize: '12px',
              background: 'var(--bg-primary)',
              border: isOpen ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
              borderRadius: '6px', color: 'var(--text-primary)', outline: 'none'
            }}
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XCircle size={14} />
            </button>
          )}

          {/* Menú desplegable de coincidencias */}
          {isOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', maxHeight: '220px', overflowY: 'auto'
            }}>
              {/* Opción 1: Consumidor Final */}
              <div
                onMouseDown={() => {
                  onSelectConsumidorFinal();
                  setIsOpen(false);
                  setQuery('');
                }}
                style={{
                  padding: '8px 12px', fontSize: '11.5px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                  background: 'rgba(99, 102, 241, 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.04)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-primary)' }}>Consumidor Final</strong>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Cédula/NIT genérico: 222222222222</div>
                  </div>
                </div>
                <Badge variant="info" style={{ fontSize: '9px', padding: '1px 5px' }}>Por Defecto</Badge>
              </div>

              {/* Lista de Clientes Encontrados */}
              {filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onMouseDown={() => {
                    onSelectCustomer(c);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  style={{
                    padding: '8px 12px', fontSize: '11.5px', cursor: 'pointer', borderBottom: '1px dashed var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.name}</strong>
                      <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                        {c.document_number ? `${c.document_type || 'CC'} ${c.document_number}` : 'Sin documento'}
                      </span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      {c.phone && <span> {c.phone}</span>}
                      {c.address && <span>·  {c.address}</span>}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </div>
              ))}

              {/* Si no hay resultados */}
              {filteredCustomers.length === 0 && (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                  <div style={{ marginBottom: '6px' }}>No se encontraron clientes para "<strong>{query}</strong>"</div>
                  <button
                    type="button"
                    onMouseDown={() => {
                      onOpenQuickCreate(query);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 800,
                      background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer'
                    }}
                  >
                    + Registrar cliente "{query}" ahora
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENTE: BARRA DESLIZANTE DE CATEGORÍAS ELEGANTE (SIN SCROLLBAR FEA)
// =========================================================================
const CategoryChipsBar = ({
  categories = [],
  selectedCategory = 'all',
  onSelectCategory
}) => {
  const scrollRef = useRef(null);

  const handleScroll = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '100%', margin: '2px 0' }}>
      {/* Botón Scroll Izquierda */}
      <button
        type="button"
        onClick={() => handleScroll(-140)}
        aria-label="Desplazar a la izquierda"
        style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginRight: '4px',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--bg-primary)';
        }}
      >
        <ChevronLeft size={13} />
      </button>

      {/* Contenedor Deslizable de Pills (Sin scrollbar nativa) */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: '5px',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          padding: '2px 0',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flex: 1
        }}
      >
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          style={{
            padding: '3px 10px',
            borderRadius: '16px',
            fontSize: '11px',
            fontWeight: selectedCategory === 'all' ? 800 : 500,
            border: selectedCategory === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
            background: selectedCategory === 'all' ? 'var(--accent-primary)' : 'var(--bg-primary)',
            color: selectedCategory === 'all' ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: selectedCategory === 'all' ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
          }}
        >
          Todos
        </button>
        {categories.map(c => {
          const isSelected = selectedCategory === c.id.toString();
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id.toString())}
              style={{
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: isSelected ? 800 : 500,
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Botón Scroll Derecha */}
      <button
        type="button"
        onClick={() => handleScroll(140)}
        aria-label="Desplazar a la derecha"
        style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginLeft: '4px',
          transition: 'all 0.15s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--bg-primary)';
        }}
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};

export const OrdersListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId');
  const initialTableId = searchParams.get('tableId');

  const addToast = useUiStore((state) => state.addToast);
  const { user } = useAuth();
  const { socket } = useSocket();

  // Datos principales
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [zones, setZones] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros de la lista de órdenes
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'mesa' | 'para_llevar' | 'delivery'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'pendiente_pago' | 'cerrada' | 'cancelada'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // 'all' | 'efectivo' | 'tarjeta' | 'transferencia' | 'credito' | 'mixto'
  const [waiterFilter, setWaiterFilter] = useState('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState('all'); // 'all' | 'under20k' | '20k_50k' | '50k_100k' | 'over100k'
  const [dateFilter, setDateFilter] = useState('7days'); // 'today' | 'yesterday' | '7days' | 'month' | 'prev_month' | 'all' | 'custom' (7days por defecto)
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all' | <shift_id>
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modal: Nueva Orden
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [newOrderStep, setNewOrderStep] = useState(1); // 1: Selección de Tipo, 2: Datos y Catálogo
  const [newOrderType, setNewOrderType] = useState('para_llevar'); // 'para_llevar' | 'delivery'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickDocType, setQuickDocType] = useState('CC');
  const [quickDocNum, setQuickDocNum] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Campos específicos de delivery
  const [deliveryZoneId, setDeliveryZoneId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryDriverId, setDeliveryDriverId] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('5000');

  // Selector visual de productos en Nueva Orden
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState([]); // [{ product_id, name, price, quantity, tax_rate, tax_included, notes }]
  const [orderNotes, setOrderNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Modal: Detalle de Orden, Facturación y Edición
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [activeOrderTab, setActiveOrderTab] = useState('billing'); // 'billing' | 'edit'
  const [billingSubmitting, setBillingSubmitting] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);

  // Estado de Facturación (dentro del modal de la orden)
  const [billingCustomerId, setBillingCustomerId] = useState('');
  const [discountMode, setDiscountMode] = useState('none'); // 'none' | 'promo' | 'coupon' | 'manual'
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [manualDiscountVal, setManualDiscountVal] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState('percentage'); // 'percentage' | 'fixed'

  // Cupones y Promociones
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [applicablePromos, setApplicablePromos] = useState([]);

  // Propinas
  const [tipMode, setTipMode] = useState('percentage'); // 'percentage' | 'custom'
  const [tipPercentage, setTipPercentage] = useState(10);
  const [customTip, setCustomTip] = useState('');
  const [tipOption, setTipOption] = useState('con_propina'); // 'sin_propina' | 'con_propina' | 'otro'

  // Método de pago y Monto Recibido
  const [paymentMethod, setPaymentMethod] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'transferencia' | 'credito' | 'mixto'
  const [amountReceived, setAmountReceived] = useState('');
  const [recordRemainingAsCredit, setRecordRemainingAsCredit] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState('');
  const [billingNotes, setBillingNotes] = useState('');

  // Pago Mixto y Dinero Entregado en Efectivo / Vueltos
  const [mixedCashAmount, setMixedCashAmount] = useState('');
  const [mixedTransferAmount, setMixedTransferAmount] = useState('');
  const [mixedDigitalType, setMixedDigitalType] = useState('transferencia'); // 'transferencia' | 'tarjeta'
  const [amountTenderedCash, setAmountTenderedCash] = useState('');

  // Modificación de Precio de Ítems (Solo >= catálogo base)
  const [priceEditModalOpen, setPriceEditModalOpen] = useState(false);
  const [priceEditTargetItem, setPriceEditTargetItem] = useState(null);
  const [priceEditTargetIdx, setPriceEditTargetIdx] = useState(null);
  const [priceEditInputVal, setPriceEditInputVal] = useState('');
  const [priceEditMinPrice, setPriceEditMinPrice] = useState(0);
  const [priceEditSource, setPriceEditSource] = useState('edit'); // 'edit' | 'cart'

  // Estado del Modo Edición de Orden
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editOrderType, setEditOrderType] = useState('para_llevar');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editDeliveryPhone, setEditDeliveryPhone] = useState('');
  const [editDeliveryNotes, setEditDeliveryNotes] = useState('');
  const [editDeliveryFee, setEditDeliveryFee] = useState('0');
  const [editGuests, setEditGuests] = useState(1);
  const [editGeneralNotes, setEditGeneralNotes] = useState('');
  const [editSendToKitchen, setEditSendToKitchen] = useState(true);
  const [editProductCategory, setEditProductCategory] = useState('all');
  const [editProductSearch, setEditProductSearch] = useState('');

  // Modificadores / Sabores / Toppings en Edición de Orden
  const [editModifiersModalOpen, setEditModifiersModalOpen] = useState(false);
  const [selectedProdForModifiers, setSelectedProdForModifiers] = useState(null);
  const [editingItemIdx, setEditingItemIdx] = useState(null);
  const [editingInitialModifiers, setEditingInitialModifiers] = useState([]);

  // Modificadores / Sabores / Toppings en Modal Nueva Orden (Domicilio / Para Llevar)
  const [cartModifiersModalOpen, setCartModifiersModalOpen] = useState(false);
  const [selectedCartProduct, setSelectedCartProduct] = useState(null);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState(null);
  const [editingCartInitialModifiers, setEditingCartInitialModifiers] = useState([]);

  // Modal Cancelar Orden
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(false);

  // Visualización / Reimpresión de Factura
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [paperWidth, setPaperWidth] = useState('80mm');
  const printRef = useRef(null);

  // Modal: Gestión de Saldo Pendiente CxC / Abonos / Ajustes
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedCreditOrder, setSelectedCreditOrder] = useState(null);
  const [creditActionTab, setCreditActionTab] = useState('abono'); // 'abono' | 'pagar_todo' | 'ajuste'
  const [creditPaymentAmount, setCreditPaymentAmount] = useState('');
  const [creditPaymentMethod, setCreditPaymentMethod] = useState('efectivo'); // 'efectivo' | 'tarjeta' | 'transferencia'
  const [creditNotes, setCreditNotes] = useState('');
  const [creditNewBalance, setCreditNewBalance] = useState('');
  const [creditAdjustReason, setCreditAdjustReason] = useState('');
  const [submittingCreditAction, setSubmittingCreditAction] = useState(false);

  // Carga inicial
  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        ordersData, custData, prodsData, catsData,
        zonesData, driversData, discData, applicableDiscData, settingsData
      ] = await Promise.all([
        api.get('/orders').catch(() => []),
        api.get('/customers').catch(() => []),
        api.get('/products').catch(() => []),
        api.get('/categories').catch(() => []),
        api.get('/delivery/zones').catch(() => []),
        api.get('/delivery/drivers').catch(() => []),
        api.get('/discounts').catch(() => []),
        api.get('/discounts/applicable').catch(() => []),
        api.get('/settings').catch(() => null)
      ]);

      setOrders(ordersData || []);
      setCustomers(custData || []);
      setProducts(prodsData || []);
      setCategories(catsData || []);
      setZones(zonesData || []);
      setDrivers(driversData || []);
      setDiscounts(discData || []);
      setApplicablePromos(applicableDiscData || []);
      setSettings(settingsData);

      if (settingsData?.default_paper_width) {
        setPaperWidth(settingsData.default_paper_width);
      }

      if (zonesData && zonesData.length > 0 && !deliveryZoneId) {
        setDeliveryZoneId(zonesData[0].id.toString());
        setDeliveryFee(parseFloat(zonesData[0].delivery_fee || 5000).toString());
      }
    } catch (err) {
      console.error('Error al cargar órdenes:', err);
      addToast('Error al sincronizar lista de órdenes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Manejar apertura automática por parámetro en URL (ej. desde mesas o delivery)
  useEffect(() => {
    if (orders.length > 0) {
      if (initialOrderId) {
        const found = orders.find(o => o.id === parseInt(initialOrderId, 10));
        if (found) handleOpenOrderDetail(found, 'billing');
      } else if (initialTableId) {
        const found = orders.find(o => o.table_id === parseInt(initialTableId, 10) && o.status !== 'cerrada' && o.status !== 'cancelada');
        if (found) handleOpenOrderDetail(found, 'billing');
      }
    }
  }, [orders, initialOrderId, initialTableId]);

  // Sockets en tiempo real
  useEffect(() => {
    if (!socket || typeof socket.on !== 'function') return;

    const handleRefresh = () => {
      fetchData();
    };

    socket.on('order:created', handleRefresh);
    socket.on('order:updated', handleRefresh);
    socket.on('order:status-changed', handleRefresh);
    socket.on('invoice:created', handleRefresh);
    socket.on('delivery:status-changed', handleRefresh);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('order:created', handleRefresh);
        socket.off('order:updated', handleRefresh);
        socket.off('order:status-changed', handleRefresh);
        socket.off('invoice:created', handleRefresh);
        socket.off('delivery:status-changed', handleRefresh);
      }
    };
  }, [socket]);

  // Turnos disponibles presentes en las órdenes
  const availableShifts = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const sId = o.cash_shift_id || o.cash_register_id;
      if (sId) {
        if (!map.has(sId)) {
          map.set(sId, { id: sId, count: 1, status: o.shift_status });
        } else {
          map.get(sId).count++;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.id - a.id);
  }, [orders]);

  // Meseros / Responsables disponibles
  const availableWaiters = useMemo(() => {
    const set = new Set();
    orders.forEach(o => {
      if (o.waiter_name && o.waiter_name.trim()) {
        set.add(o.waiter_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Conteo de filtros avanzados activos
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (paymentMethodFilter !== 'all') count++;
    if (waiterFilter !== 'all') count++;
    if (amountRangeFilter !== 'all') count++;
    if (shiftFilter !== 'all') count++;
    if (dateFilter !== '7days') count++;
    if (sortBy !== 'date_desc') count++;
    return count;
  }, [paymentMethodFilter, waiterFilter, amountRangeFilter, shiftFilter, dateFilter, sortBy]);

  // --- FILTRADO Y ORDENAMIENTO DE ÓRDENES ---
  const filteredOrders = useMemo(() => {
    const result = orders.filter(o => {
      // 1. Filtro por Tipo de Pedido
      if (typeFilter !== 'all') {
        if (typeFilter === 'mesa' && o.order_type !== 'mesa' && !o.table_id) return false;
        if (typeFilter === 'para_llevar' && o.order_type !== 'para_llevar') return false;
        if (typeFilter === 'delivery' && o.order_type !== 'delivery') return false;
      }

      // 2. Filtro por Estado
      if (statusFilter !== 'all') {
        const creditBal = parseFloat(o.credit_balance || 0);
        if (statusFilter === 'pending') {
          if (o.status === 'cerrada' && creditBal === 0) return false;
          if (o.status === 'cancelada') return false;
        } else if (statusFilter === 'pendiente_pago') {
          if (o.status !== 'pendiente_pago' && creditBal === 0) return false;
        } else if (statusFilter === 'cerrada') {
          if (o.status !== 'cerrada' || creditBal > 0) return false;
        } else if (statusFilter === 'cancelada') {
          if (o.status !== 'cancelada') return false;
        }
      }

      // 3. Filtro por Método de Pago
      if (paymentMethodFilter !== 'all') {
        const pMethod = (o.payment_method || o.invoice_payment_method || '').toLowerCase();
        if (paymentMethodFilter === 'credito') {
          const isCredit = pMethod === 'credito' || parseFloat(o.credit_balance || 0) > 0;
          if (!isCredit) return false;
        } else if (!pMethod.includes(paymentMethodFilter)) {
          return false;
        }
      }

      // 4. Filtro por Mesero / Responsable
      if (waiterFilter !== 'all') {
        if ((o.waiter_name || '').trim().toLowerCase() !== waiterFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 5. Filtro por Rango de Monto
      if (amountRangeFilter !== 'all') {
        const total = parseFloat(o.final_total || o.computed_total || 0);
        if (amountRangeFilter === 'under20k' && total >= 20000) return false;
        if (amountRangeFilter === '20k_50k' && (total < 20000 || total > 50000)) return false;
        if (amountRangeFilter === '50k_100k' && (total < 50000 || total > 100000)) return false;
        if (amountRangeFilter === 'over100k' && total <= 100000) return false;
      }

      // 6. Filtro por Turno de Caja
      if (shiftFilter !== 'all') {
        const orderShift = o.cash_shift_id || o.cash_register_id;
        if (!orderShift || orderShift.toString() !== shiftFilter.toString()) {
          return false;
        }
      }

      // 7. Filtro por Fecha
      if (dateFilter !== 'all') {
        const orderDate = new Date(o.created_at || Date.now());
        const now = new Date();

        if (dateFilter === 'today') {
          const isToday = orderDate.toDateString() === now.toDateString();
          if (!isToday) return false;
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          if (orderDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          sevenDaysAgo.setHours(0, 0, 0, 0);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const isSameMonth = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        } else if (dateFilter === 'prev_month') {
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (orderDate.getMonth() !== prevMonth || orderDate.getFullYear() !== prevYear) return false;
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate < start || orderDate > end) return false;
        }
      }

      // 8. Búsqueda libre predictiva
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const orderNumMatch = `#${o.id}`.includes(q) || `orden #${o.id}`.toLowerCase().includes(q) || `${o.id}` === q;
      const invoiceMatch = (o.invoice_number || '').toLowerCase().includes(q);
      const shiftMatch = (o.cash_shift_id || o.cash_register_id) ? `turno #${o.cash_shift_id || o.cash_register_id}`.toLowerCase().includes(q) || `turno ${o.cash_shift_id || o.cash_register_id}`.toLowerCase().includes(q) : false;
      const customerMatch = (o.customer_name || '').toLowerCase().includes(q);
      const docMatch = (o.customer_document || '').includes(q);
      const waiterMatch = (o.waiter_name || '').toLowerCase().includes(q);
      const tableMatch = o.table_number ? `mesa ${o.table_number}`.toLowerCase().includes(q) : false;
      const addressMatch = (o.delivery_address || '').toLowerCase().includes(q);
      const itemMatch = (o.items || []).some(it => (it.name || '').toLowerCase().includes(q));

      return orderNumMatch || invoiceMatch || shiftMatch || customerMatch || docMatch || waiterMatch || tableMatch || addressMatch || itemMatch;
    });

    // Ordenamiento dinámico
    result.sort((a, b) => {
      const totalA = parseFloat(a.final_total || a.computed_total || 0);
      const totalB = parseFloat(b.final_total || b.computed_total || 0);
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();

      if (sortBy === 'date_asc') return dateA - dateB;
      if (sortBy === 'total_desc') return totalB - totalA;
      if (sortBy === 'total_asc') return totalA - totalB;
      return dateB - dateA; // date_desc por defecto
    });

    return result;
  }, [orders, typeFilter, statusFilter, paymentMethodFilter, waiterFilter, amountRangeFilter, shiftFilter, dateFilter, customStartDate, customEndDate, searchQuery, sortBy]);

  // KPIs Resumen
  const kpis = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalCreditBalance = 0;
    let totalTips = 0;
    let countPaid = 0;
    let countPending = 0;
    let countCredit = 0;

    filteredOrders.forEach(o => {
      const creditBal = parseFloat(o.credit_balance || 0);
      const isPaid = o.status === 'cerrada' && creditBal === 0;
      const isCancelled = o.status === 'cancelada';
      if (isCancelled) return;

      const orderTotal = o.final_total || o.computed_total || 0;
      const tip = parseFloat(o.invoice_tip_amount || 0);

      if (creditBal > 0) {
        totalCreditBalance += creditBal;
        countCredit++;
      }

      if (isPaid) {
        totalPaid += orderTotal;
        totalTips += tip;
        countPaid++;
      } else {
        totalPending += orderTotal;
        countPending++;
      }
    });

    return { totalPaid, totalPending, totalCreditBalance, totalTips, countPaid, countPending, countCredit, totalCount: filteredOrders.length };
  }, [filteredOrders]);

  // Producto(s) Destacado(s) en Estadísticas Superiores de Órdenes
  const highlightedProducts = useMemo(() => {
    return products.filter(p => Boolean(p.show_in_order_stats));
  }, [products]);

  const highlightedStats = useMemo(() => {
    if (highlightedProducts.length === 0) return [];

    return highlightedProducts.map(prod => {
      let totalRevenue = 0;
      let totalQty = 0;

      filteredOrders.forEach(o => {
        if (o.status === 'cancelada') return;
        (o.items || []).forEach(it => {
          if (it.product_id === prod.id || it.product?.id === prod.id || (it.name && it.name.trim().toLowerCase() === prod.name.trim().toLowerCase())) {
            const qty = parseInt(it.quantity || 0, 10);
            const price = parseFloat(it.unit_price || prod.price || 0);
            totalQty += qty;
            totalRevenue += (qty * price);
          }
        });
      });

      return {
        product: prod,
        totalRevenue,
        totalQty
      };
    });
  }, [highlightedProducts, filteredOrders]);

  // --- MODAL: DETALLE, FACTURACIÓN Y EDICIÓN ---
  const handleOpenOrderDetail = async (order, initialTab = 'billing') => {
    try {
      const fullOrder = await api.get(`/orders/${order.id}`);
      setSelectedOrder(fullOrder);
      loadBillingState(fullOrder);
      loadEditState(fullOrder);
      loadCreditState(fullOrder);
      setActiveOrderTab(initialTab);
      setOrderModalOpen(true);
    } catch (err) {
      setSelectedOrder(order);
      loadBillingState(order);
      loadEditState(order);
      loadCreditState(order);
      setActiveOrderTab(initialTab);
      setOrderModalOpen(true);
    }
  };

  const loadCreditState = (order) => {
    const balance = parseFloat(order.credit_balance || 0);
    setCreditPaymentAmount(balance > 0 ? balance.toString() : '');
    setCreditNewBalance(balance.toString());
    setCreditPaymentMethod('efectivo');
    setCreditNotes('');
    setCreditAdjustReason('');
    setCreditActionTab(balance > 0 ? 'abono' : 'ajuste');
  };

  const handleProcessOrderCreditPayment = async (tabType) => {
    const arId = selectedOrder?.credit_ar_id;
    if (!arId) {
      addToast('No se encontró el registro de cuenta por cobrar vinculado a esta orden.', 'warning');
      return;
    }

    const amount = tabType === 'pagar_todo'
      ? parseFloat(selectedOrder.credit_balance || 0)
      : parseFloat(creditPaymentAmount);

    if (!amount || amount <= 0) {
      addToast('Ingresa un monto válido mayor a 0 para procesar el pago.', 'warning');
      return;
    }

    try {
      setSubmittingCreditAction(true);
      const res = await api.post(`/accounting/receivable/${arId}/payment`, {
        amount,
        payment_method: creditPaymentMethod,
        notes: creditNotes || (tabType === 'pagar_todo' ? 'Pago total de saldo CxC' : 'Abono parcial a saldo CxC')
      });
      addToast(res.message || 'Pago registrado exitosamente', 'success');
      const updatedOrder = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(updatedOrder);
      loadBillingState(updatedOrder);
      loadCreditState(updatedOrder);
      fetchData();
    } catch (err) {
      console.error('Error al registrar pago CxC:', err);
      addToast(err.message || 'Error al procesar el pago del saldo', 'danger');
    } finally {
      setSubmittingCreditAction(false);
    }
  };

  const handleProcessOrderCreditAdjustment = async () => {
    const arId = selectedOrder?.credit_ar_id;
    if (!arId) {
      addToast('No se encontró el registro de cuenta por cobrar vinculado a esta orden.', 'warning');
      return;
    }

    const newBal = parseFloat(creditNewBalance);
    if (isNaN(newBal) || newBal < 0) {
      addToast('Ingresa un valor numérico válido mayor o igual a 0 para el nuevo saldo.', 'warning');
      return;
    }

    try {
      setSubmittingCreditAction(true);
      const res = await api.put(`/accounting/receivable/${arId}/adjust`, {
        new_balance: newBal,
        notes: creditNotes,
        reason: creditAdjustReason
      });
      addToast(res.message || 'Saldo ajustado exitosamente', 'success');
      const updatedOrder = await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(updatedOrder);
      loadBillingState(updatedOrder);
      loadCreditState(updatedOrder);
      fetchData();
    } catch (err) {
      console.error('Error al ajustar saldo CxC:', err);
      addToast(err.message || 'Error al ajustar el saldo', 'danger');
    } finally {
      setSubmittingCreditAction(false);
    }
  };

  const loadBillingState = (order) => {
    setBillingCustomerId(order.customer_id ? order.customer_id.toString() : '');
    setPaymentMethod('efectivo');
    setRecordRemainingAsCredit(false);
    setCreditDueDate('');
    setBillingNotes('');

    // Descuento previo si lo tenía
    const initDisc = parseFloat(order.discount_amount || 0);
    if (initDisc > 0) {
      setDiscountMode('manual');
      setManualDiscountVal(initDisc.toString());
      setManualDiscountType('fixed');
    } else {
      setDiscountMode('none');
      setSelectedDiscountId('');
      setManualDiscountVal('');
    }

    // Default propina 10%
    setTipOption('con_propina');
    setTipMode('percentage');
    setTipPercentage(10);
    setCustomTip('');

    // Monto recibido sugerido por defecto (con propina del 10%)
    const itemsTotal = (order.items || []).reduce((acc, it) => acc + ((parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0)), 0);
    const delFee = parseFloat(order.delivery_fee || 0);
    const gross = Math.max(0, itemsTotal - initDisc) + delFee;
    const suggestedTotal = gross + Math.round(gross * 0.1);
    setAmountReceived(Math.round(suggestedTotal).toString());

    // Reset pago mixto y vueltos
    setMixedCashAmount('');
    setMixedTransferAmount('');
    setMixedDigitalType('transferencia');
    setAmountTenderedCash('');
  };

  const handleOpenPriceEdit = (item, idx, source = 'edit') => {
    const prod = products.find(p => p.id === item.product_id || p.id === item.product?.id || (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase()));
    const currentPrice = (item.price !== undefined && item.price !== null) ? item.price : item.unit_price;
    const minP = parseFloat(prod?.price || currentPrice || 0);
    setPriceEditSource(source);
    setPriceEditTargetItem(item);
    setPriceEditTargetIdx(idx);
    setPriceEditMinPrice(minP);
    setPriceEditInputVal(currentPrice ? Math.round(parseFloat(currentPrice)).toString() : Math.round(minP).toString());
    setPriceEditModalOpen(true);
  };

  const handleSaveItemPrice = async () => {
    const newPrice = parseFloat(priceEditInputVal);
    if (isNaN(newPrice) || newPrice < priceEditMinPrice) {
      addToast(`Solo se permite modificar el precio hacia arriba. El precio base de catálogo es ${formatCOP(priceEditMinPrice)}`, 'warning');
      return;
    }

    if (priceEditSource === 'cart') {
      // Actualizar ítem en el carrito de Nueva Orden (Para Llevar / Domicilio)
      if (priceEditTargetIdx !== null && cartItems[priceEditTargetIdx]) {
        setCartItems(prev => {
          const copy = [...prev];
          copy[priceEditTargetIdx] = {
            ...copy[priceEditTargetIdx],
            price: newPrice,
            unit_price: newPrice
          };
          return copy;
        });
        addToast(`Precio de "${priceEditTargetItem?.name}" ajustado a ${formatCOP(newPrice)} en la comanda`, 'success');
      }
    } else {
      // Modo edición de orden existente
      if (priceEditTargetIdx !== null && editOrderItems[priceEditTargetIdx]) {
        const updated = [...editOrderItems];
        updated[priceEditTargetIdx] = {
          ...updated[priceEditTargetIdx],
          unit_price: newPrice,
          price: newPrice
        };
        setEditOrderItems(updated);
      }

      if (selectedOrder && priceEditTargetItem?.id) {
        try {
          await api.put(`/orders/${selectedOrder.id}/items/${priceEditTargetItem.id}/price`, { unit_price: newPrice });
          addToast(`Precio unitario actualizado a ${formatCOP(newPrice)}`, 'success');
          const freshOrder = await api.get(`/orders/${selectedOrder.id}`);
          setSelectedOrder(freshOrder);
          loadBillingState(freshOrder);
          loadEditState(freshOrder);
          fetchData();
        } catch (e) {
          addToast(e.message || 'Error al actualizar precio en backend', 'danger');
        }
      } else {
        addToast(`Precio asignado: ${formatCOP(newPrice)}`, 'success');
      }
    }

    setPriceEditModalOpen(false);
  };

  const loadEditState = (order) => {
    setEditOrderItems((order.items || []).map(it => {
      let parsedMods = [];
      const rawMods = it.modifiers || it.modifiers_json;
      if (rawMods) {
        try {
          parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
        } catch (e) {
          parsedMods = Array.isArray(rawMods) ? rawMods : [];
        }
      }
      return {
        id: it.id,
        product_id: it.product_id,
        name: it.name,
        unit_price: parseFloat(it.unit_price),
        quantity: parseInt(it.quantity, 10) || 1,
        notes: it.notes || '',
        status: it.status || 'pendiente',
        modifiers: Array.isArray(parsedMods) ? parsedMods : []
      };
    }));
    setEditCustomerId(order.customer_id ? order.customer_id.toString() : '');
    setEditOrderType(order.order_type || 'para_llevar');
    setEditDeliveryAddress(order.delivery_address || '');
    setEditDeliveryPhone(order.delivery_phone || '');
    setEditDeliveryNotes(order.delivery_notes || '');
    setEditDeliveryFee(parseFloat(order.delivery_fee || 0).toString());
    setEditGuests(order.guests || 1);
    setEditGeneralNotes(order.notes || '');
    setEditSendToKitchen(true);
  };

  // Manejo de ítems y modificadores en Modo Edición
  const handleEditAddProduct = async (prod) => {
    try {
      const data = await api.get(`/modifiers/products/${prod.id}`).catch(() => []);
      const activeGroups = (Array.isArray(data) ? data : []).filter(g => g.options && g.options.length > 0);

      if (activeGroups.length > 0) {
        setEditingItemIdx(null);
        setEditingInitialModifiers([]);
        setSelectedProdForModifiers(prod);
        setEditModifiersModalOpen(true);
      } else {
        handleConfirmEditModifiers(prod, [], parseFloat(prod.price));
      }
    } catch (err) {
      handleConfirmEditModifiers(prod, [], parseFloat(prod.price));
    }
  };

  const handleOpenEditItemModifiers = (index) => {
    const item = editOrderItems[index];
    if (!item) return;
    const prod = products.find(p => p.id === item.product_id) || { id: item.product_id, name: item.name, price: item.unit_price };
    setEditingItemIdx(index);
    setEditingInitialModifiers(item.modifiers || []);
    setSelectedProdForModifiers(prod);
    setEditModifiersModalOpen(true);
  };

  const handleConfirmEditModifiers = (product, selectedModifiers, finalUnitPrice) => {
    const unitPrice = finalUnitPrice !== undefined ? finalUnitPrice : parseFloat(product.price);
    const modString = JSON.stringify(selectedModifiers || []);

    if (editingItemIdx !== null && editingItemIdx >= 0) {
      setEditOrderItems(prev => {
        const copy = [...prev];
        if (copy[editingItemIdx]) {
          copy[editingItemIdx] = {
            ...copy[editingItemIdx],
            unit_price: unitPrice,
            modifiers: selectedModifiers || []
          };
        }
        return copy;
      });
      setEditingItemIdx(null);
      setEditingInitialModifiers([]);
    } else {
      setEditOrderItems(prev => {
        const existingIndex = prev.findIndex(it =>
          it.product_id === product.id &&
          !it.id &&
          JSON.stringify(it.modifiers || []) === modString
        );
        if (existingIndex > -1) {
          const copy = [...prev];
          copy[existingIndex].quantity += 1;
          return copy;
        }
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            unit_price: unitPrice,
            quantity: 1,
            notes: '',
            status: 'pendiente',
            modifiers: selectedModifiers || []
          }
        ];
      });
    }
  };

  const handleEditItemQty = (index, delta) => {
    setEditOrderItems(prev => {
      const copy = [...prev];
      const item = copy[index];
      const newQty = (item.quantity || 1) + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index] = { ...item, quantity: newQty };
      return copy;
    });
  };

  const handleEditItemNotes = (index, notes) => {
    setEditOrderItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], notes };
      return copy;
    });
  };

  const handleEditRemoveItem = (index) => {
    setEditOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const editOrderTotal = useMemo(() => {
    const sub = editOrderItems.reduce((acc, it) => acc + ((parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0)), 0);
    const fee = editOrderType === 'delivery' ? (parseFloat(editDeliveryFee) || 0) : 0;
    return sub + fee;
  }, [editOrderItems, editOrderType, editDeliveryFee]);

  // Guardar Cambios de la Orden Editada
  const handleSaveOrderChanges = async (e) => {
    if (e) e.preventDefault();
    if (!selectedOrder) return;

    if (editOrderItems.length === 0) {
      addToast('La orden debe tener al menos un producto', 'warning');
      return;
    }

    setUpdatingOrder(true);
    try {
      const payload = {
        customer_id: editCustomerId ? parseInt(editCustomerId, 10) : null,
        order_type: editOrderType,
        delivery_address: editOrderType === 'delivery' ? editDeliveryAddress : null,
        delivery_phone: editOrderType === 'delivery' ? editDeliveryPhone : null,
        delivery_notes: editOrderType === 'delivery' ? editDeliveryNotes : null,
        delivery_fee: editOrderType === 'delivery' ? (parseFloat(editDeliveryFee) || 0) : 0,
        guests: editGuests || 1,
        notes: editGeneralNotes || null,
        items: editOrderItems.map(it => ({
          id: it.id || undefined,
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          notes: it.notes || null,
          modifiers: it.modifiers || []
        })),
        send_to_kitchen: editSendToKitchen
      };

      const result = await api.put(`/orders/${selectedOrder.id}`, payload);
      addToast('Orden actualizada exitosamente', 'success');

      const updated = result.order || await api.get(`/orders/${selectedOrder.id}`);
      setSelectedOrder(updated);
      loadBillingState(updated);
      loadEditState(updated);
      setActiveOrderTab('billing');
      fetchData();
    } catch (err) {
      console.error('Error al actualizar orden:', err);
      addToast(err.message || 'Error al guardar modificaciones de la orden', 'error');
    } finally {
      setUpdatingOrder(false);
    }
  };

  // Cancelar Orden
  const handleConfirmCancelOrder = async () => {
    if (!selectedOrder) return;
    setCancellingOrder(true);
    try {
      await api.post(`/orders/${selectedOrder.id}/cancel`, { reason: cancelReason || 'Cancelada por el usuario' });
      addToast(`Orden #${selectedOrder.id} cancelada`, 'success');
      setCancelModalOpen(false);
      setOrderModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al cancelar la orden', 'error');
    } finally {
      setCancellingOrder(false);
    }
  };

  // Cálculo financiero dinámico de la orden en el checkout
  const billingCalculations = useMemo(() => {
    if (!selectedOrder) return { itemsSubtotal: 0, discountVal: 0, taxTotal: 0, delFee: 0, tipVal: 0, totalSinPropina: 0, grandTotal: 0 };

    let itemsSubtotal = 0;
    let taxTotal = 0;

    (selectedOrder.items || []).forEach(it => {
      const lineTotal = (parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0);
      itemsSubtotal += lineTotal;
      const rate = parseFloat(it.tax_rate || 0);
      if (rate > 0) {
        if (it.tax_included) {
          const sub = lineTotal / (1 + rate);
          taxTotal += (lineTotal - sub);
        } else {
          taxTotal += (lineTotal * rate);
        }
      }
    });

    let discountVal = 0;
    if (discountMode === 'promo' && selectedDiscountId) {
      const d = discounts.find(x => x.id === parseInt(selectedDiscountId, 10));
      if (d) {
        const isPercent = (d.discount_type === 'percentage' || d.type === 'percentage');
        const numVal = parseFloat(d.value) || 0;

        if (d.applies_to === 'product' && d.target_id) {
          const targetItem = (selectedOrder.items || []).find(it => it.product_id === d.target_id);
          if (targetItem) {
            const itemTotal = (parseFloat(targetItem.quantity) || 1) * (parseFloat(targetItem.unit_price) || 0);
            discountVal = isPercent ? (itemTotal * (numVal / 100)) : Math.min(itemTotal, numVal);
          }
        } else if (d.applies_to === 'category' && d.target_id) {
          let catTotal = 0;
          (selectedOrder.items || []).forEach(it => {
            const p = products.find(prod => prod.id === it.product_id);
            if (p && p.category_id === d.target_id) {
              catTotal += (parseFloat(it.quantity) || 1) * (parseFloat(it.unit_price) || 0);
            }
          });
          discountVal = isPercent ? (catTotal * (numVal / 100)) : Math.min(catTotal, numVal);
        } else {
          discountVal = isPercent ? (itemsSubtotal * (numVal / 100)) : numVal;
        }
      }
    } else if (discountMode === 'coupon' && appliedCoupon) {
      const isPercent = (appliedCoupon.discount_type === 'percentage' || appliedCoupon.type === 'percentage');
      const numVal = parseFloat(appliedCoupon.value) || 0;
      discountVal = isPercent ? (itemsSubtotal * (numVal / 100)) : numVal;
    } else if (discountMode === 'manual' && manualDiscountVal) {
      const v = parseFloat(manualDiscountVal) || 0;
      if (manualDiscountType === 'percentage') discountVal = itemsSubtotal * (v / 100);
      else discountVal = v;
    }

    discountVal = Math.min(discountVal, itemsSubtotal);
    const subAfterDiscount = itemsSubtotal - discountVal;
    const delFee = parseFloat(selectedOrder.delivery_fee || 0);
    const totalSinPropina = subAfterDiscount + delFee;

    let tipVal = 0;
    if (tipOption === 'sin_propina') {
      tipVal = 0;
    } else if (tipOption === 'con_propina') {
      tipVal = Math.round(totalSinPropina * ((parseFloat(tipPercentage) || 10) / 100));
    } else {
      // tipOption === 'otro': asignación automática según monto personalizado o customTip
      if (customTip !== '' && !isNaN(parseFloat(customTip))) {
        tipVal = Math.max(0, parseFloat(customTip));
      } else {
        const rec = parseFloat(amountReceived) || 0;
        tipVal = rec > totalSinPropina ? (rec - totalSinPropina) : 0;
      }
    }

    const grandTotal = totalSinPropina + tipVal;
    return {
      itemsSubtotal,
      discountVal,
      taxTotal,
      delFee,
      tipVal,
      totalSinPropina,
      grandTotal
    };
  }, [selectedOrder, discountMode, selectedDiscountId, appliedCoupon, manualDiscountVal, manualDiscountType, tipOption, tipPercentage, customTip, amountReceived, discounts, products]);

  // Recibido vs Total y Detección de Saldo Restante
  const paymentDiff = useMemo(() => {
    const received = parseFloat(amountReceived) || 0;
    const totalSinPropina = billingCalculations.totalSinPropina;
    const grandTotal = billingCalculations.grandTotal;
    const tipVal = billingCalculations.tipVal;

    // La deuda obligatoria a cubrir es el total SIN propina
    const isUnderpaid = received > 0 && received < totalSinPropina;
    const missingAmount = Math.max(0, totalSinPropina - received);

    // Excedente pagado sobre el consumo neto obligatorio
    const excessOverTotalSinPropina = Math.max(0, received - totalSinPropina);
    // Devuelta considerando el total a pagar
    const change = Math.max(0, received - grandTotal);

    return {
      received,
      totalSinPropina,
      grandTotal,
      tipVal,
      isUnderpaid,
      missingAmount,
      excessOverTotalSinPropina,
      change
    };
  }, [amountReceived, billingCalculations]);

  // Handler para seleccionar porcentaje de propina y recalcular monto recibido
  const handleSelectTipPercent = (pct) => {
    if (pct === 0) {
      setTipOption('sin_propina');
      setTipMode('percentage');
      setTipPercentage(0);
      setCustomTip('0');
      setAmountReceived(Math.round(billingCalculations.totalSinPropina).toString());
    } else {
      setTipOption('con_propina');
      setTipMode('percentage');
      setTipPercentage(pct);
      setCustomTip('');
      const newTip = Math.round(billingCalculations.totalSinPropina * (pct / 100));
      const newGrandTotal = billingCalculations.totalSinPropina + newTip;
      setAmountReceived(Math.round(newGrandTotal).toString());
    }
  };

  // Handler reactivo al escribir en Monto Recibido
  const handleAmountReceivedChange = (val) => {
    setAmountReceived(val);
    const numVal = parseFloat(val) || 0;
    const sinPropinaVal = Math.round(billingCalculations.totalSinPropina);
    const expectedTipVal = Math.round(billingCalculations.totalSinPropina * ((parseFloat(tipPercentage) || 0) / 100));
    const conPropinaVal = Math.round(billingCalculations.totalSinPropina + expectedTipVal);

    if (val === '' || numVal === 0) {
      setTipOption('sin_propina');
      setTipMode('percentage');
      setTipPercentage(0);
      setCustomTip('0');
    } else if (numVal === sinPropinaVal) {
      setTipOption('sin_propina');
      setTipMode('percentage');
      setTipPercentage(0);
      setCustomTip('0');
    } else if (tipMode === 'percentage' && tipPercentage > 0 && numVal === conPropinaVal) {
      setTipOption('con_propina');
      setCustomTip('');
    } else if (numVal > billingCalculations.totalSinPropina) {
      // Si se coloca un valor por encima del total distinto al porcentaje de propina elegido:
      // Cambiar automáticamente a 'Otro' y asignar la diferencia como propina
      setTipOption('otro');
      setTipMode('custom');
      const diff = Math.round(numVal - billingCalculations.totalSinPropina);
      setCustomTip(diff.toString());
    } else {
      setTipOption('otro');
      setTipMode('custom');
      setCustomTip('0');
    }
  };

  // Handler para plazos rápidos de crédito (7, 15, 30, 60, 90 días)
  const handleSelectCreditDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setCreditDueDate(d.toISOString().slice(0, 10));
  };

  // Handler para validar cupón de descuento
  const handleValidateCoupon = async () => {
    if (!couponCodeInput.trim()) {
      addToast('Ingresa el código del cupón', 'warning');
      return;
    }

    setCouponValidating(true);
    try {
      const res = await api.post('/discounts/coupons/validate', {
        code: couponCodeInput.trim().toUpperCase()
      });

      if (res && res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setDiscountMode('coupon');
        addToast(`Cupón "${res.coupon.code}" aplicado: ${res.coupon.name}`, 'success');
      } else {
        setAppliedCoupon(null);
        addToast(res?.message || 'Cupón inválido o expirado', 'warning');
      }
    } catch (err) {
      setAppliedCoupon(null);
      addToast(err.message || 'Error al validar cupón', 'danger');
    } finally {
      setCouponValidating(false);
    }
  };

  // Emitir Factura POS y Finalizar Orden
  const handleProcessInvoice = async () => {
    if (!selectedOrder) return;

    if (paymentDiff.isUnderpaid && !recordRemainingAsCredit && paymentMethod !== 'credito') {
      addToast(`El monto ingresado (${formatCOP(paymentDiff.received)}) es menor al total. Debes confirmar si el saldo de ${formatCOP(paymentDiff.missingAmount)} se registrará como Crédito a Cartera CxC.`, 'warning');
      return;
    }

    const finalCustId = billingCustomerId ? parseInt(billingCustomerId, 10) : (selectedOrder.customer_id || null);

    if ((recordRemainingAsCredit || paymentMethod === 'credito') && !finalCustId) {
      addToast('Para registrar saldo a crédito (CxC) debes seleccionar un cliente registrado del CRM (no es posible con Consumidor Final anónimo).', 'warning');
      return;
    }

    setBillingSubmitting(true);
    try {
      let cashAmount = 0;
      let transferAmount = 0;
      let cardAmount = 0;
      const totalBilled = billingCalculations.grandTotal;

      if (paymentMethod === 'mixto') {
        cashAmount = parseFloat(mixedCashAmount) || 0;
        if (mixedDigitalType === 'tarjeta') {
          cardAmount = parseFloat(mixedTransferAmount) || 0;
        } else {
          transferAmount = parseFloat(mixedTransferAmount) || 0;
        }
      } else if (paymentMethod === 'efectivo') {
        cashAmount = totalBilled;
      } else if (paymentMethod === 'transferencia') {
        transferAmount = totalBilled;
      } else if (paymentMethod === 'tarjeta') {
        cardAmount = totalBilled;
      }

      const tenderedVal = parseFloat(amountTenderedCash) || 0;
      const cashExpected = paymentMethod === 'mixto' ? cashAmount : (paymentMethod === 'efectivo' ? totalBilled : 0);
      const changeVal = tenderedVal > cashExpected ? (tenderedVal - cashExpected) : 0;

      const payload = {
        order_id: selectedOrder.id,
        customer_id: finalCustId,
        payment_method: paymentMethod,
        discount_amount: billingCalculations.discountVal,
        delivery_fee: billingCalculations.delFee,
        tip_percentage: tipMode === 'percentage' ? (parseFloat(tipPercentage) || 0) / 100 : 0,
        custom_tip_amount: (tipMode === 'custom' || billingCalculations.tipVal > 0) ? billingCalculations.tipVal : null,
        amount_paid: paymentMethod === 'credito' ? 0 : Math.min(paymentDiff.received, billingCalculations.grandTotal),
        cash_amount: cashAmount,
        transfer_amount: transferAmount,
        card_amount: cardAmount,
        amount_tendered: tenderedVal > 0 ? tenderedVal : null,
        change_given: changeVal > 0 ? changeVal : null,
        credit_amount: paymentMethod === 'credito' ? billingCalculations.totalSinPropina : (recordRemainingAsCredit ? paymentDiff.missingAmount : 0),
        credit_due_date: creditDueDate || null,
        notes: billingNotes || null
      };

      const result = await api.post('/invoices', payload);

      // Redimir cupón si se aplicó
      if (appliedCoupon?.code) {
        try {
          await api.post('/discounts/coupons/redeem', { code: appliedCoupon.code });
        } catch (couponErr) {
          console.warn('Error al marcar cupón como redimido:', couponErr);
        }
      }

      addToast('Factura emitida exitosamente y orden cerrada', 'success');

      // Cargar formato para vista e impresión de ticket
      const invId = result?.id || result?.invoice?.id;
      let invoicePrint = null;
      if (invId) {
        try {
          invoicePrint = await api.get(`/invoices/${invId}/print`);
        } catch (printErr) {
          console.warn('Error al cargar endpoint print:', printErr);
        }
      }
      setGeneratedInvoice(invoicePrint || result);
      setOrderModalOpen(false);
      setShowInvoiceModal(true);
      fetchData();
    } catch (err) {
      console.error('Error al emitir factura:', err);
      addToast(err.message || 'Error al emitir factura', 'error');
    } finally {
      setBillingSubmitting(false);
    }
  };

  // --- REIMPRESIÓN SEGURA DE FACTURAS ---
  const handleReimprimirTicket = async (order) => {
    if (!order) return;
    try {
      let invId = order.invoice_id;
      if (!invId) {
        const invList = await api.get('/invoices').catch(() => []);
        const found = Array.isArray(invList) ? invList.find(i => i.order_id === order.id) : null;
        if (found) invId = found.id;
      }
      if (!invId) {
        addToast('Esta orden no tiene factura emitida registrada', 'warning');
        return;
      }
      const invPrint = await api.get(`/invoices/${invId}/print`);
      setGeneratedInvoice(invPrint);
      setShowInvoiceModal(true);
    } catch (err) {
      console.error('Error al cargar ticket de factura:', err);
      addToast(err.message || 'Error al cargar ticket para reimpresión', 'danger');
    }
  };

  // --- IMPRESIÓN CENTRALIZADA DE COMANDA DE COCINA ---
  const handlePrintKitchenTicket = (orderData, itemsList) => {
    printKitchenTicket(orderData, itemsList || orderData.items || [], settings || {}, paperWidth);
    addToast('Comanda enviada a impresión', 'info');
  };

  // --- IMPRESIÓN CENTRALIZADA DE PRE-FACTURA / PRE-CUENTA ---
  const handlePrintPreFactura = (orderData, itemsList, discVal = 0, delFeeVal = 0) => {
    const items = itemsList || orderData.items || [];
    printPreFactura(
      orderData,
      items,
      settings || {},
      paperWidth,
      {
        discountVal: discVal,
        delFee: delFeeVal
      }
    );
    addToast('Pre-factura enviada a impresión', 'info');
  };

  // --- IMPRESIÓN CENTRALIZADA DE FACTURA TÉRMICA POS ---
  const handlePrintReceipt = () => {
    if (!generatedInvoice) return;
    printInvoiceReceipt(generatedInvoice, settings || {}, paperWidth);
    addToast('Factura enviada a impresión', 'info');
  };

  // --- MODAL: NUEVA ORDEN ---
  const handleOpenNewOrder = () => {
    setNewOrderStep(1);
    setNewOrderType('para_llevar');
    setSelectedCustomerId('');
    setCustomerSearchQuery('');
    setDeliveryAddress('');
    setDeliveryPhone('');
    setDeliveryNotes('');
    setDeliveryDriverId('');
    if (zones.length > 0) {
      setDeliveryZoneId(zones[0].id.toString());
      setDeliveryFee(parseFloat(zones[0].delivery_fee || 5000).toString());
    }
    setCartItems([]);
    setOrderNotes('');
    setSelectedCategory('all');
    setProductSearch('');
    setNewOrderModalOpen(true);
  };

  const handleSelectZone = (zoneId) => {
    setDeliveryZoneId(zoneId);
    const z = zones.find(x => x.id.toString() === zoneId.toString());
    if (z) {
      setDeliveryFee(parseFloat(z.delivery_fee || 0).toString());
    }
  };

  const handleSelectCustomer = (c) => {
    setSelectedCustomerId(c.id.toString());
    setCustomerSearchQuery(c.name);
    if (c.address) setDeliveryAddress(c.address);
    if (c.phone) setDeliveryPhone(c.phone);
  };

  const handleSetConsumidorFinal = () => {
    setSelectedCustomerId('consumidor_final');
    setCustomerSearchQuery('Consumidor Final (222222222222)');
  };

  const handleOpenQuickCustomerWithQuery = (queryText = '') => {
    const trimmed = (queryText || '').trim();
    const isDoc = /^\d{6,15}$/.test(trimmed);

    if (isDoc) {
      setQuickDocNum(trimmed);
      setQuickName('');
    } else {
      setQuickName(trimmed);
      setQuickDocNum('');
    }
    setQuickPhone('');
    setQuickEmail('');
    setQuickAddress(newOrderType === 'delivery' ? deliveryAddress : '');
    setQuickCustomerModalOpen(true);
  };

  const handleQuickCreateCustomer = async (e) => {
    e.preventDefault();
    if (!quickName.trim()) {
      addToast('El nombre del cliente es obligatorio', 'warning');
      return;
    }

    setQuickSubmitting(true);
    try {
      const newCust = await api.post('/customers', {
        name: quickName.trim(),
        document_type: quickDocType || 'CC',
        document_number: quickDocNum ? quickDocNum.trim() : null,
        phone: quickPhone ? quickPhone.trim() : null,
        email: quickEmail ? quickEmail.trim() : null,
        address: quickAddress ? quickAddress.trim() : null,
        customer_type: 'regular'
      });

      addToast(`Cliente "${newCust.name}" registrado exitosamente`, 'success');
      setCustomers(prev => [newCust, ...prev]);
      handleSelectCustomer(newCust);
      setQuickCustomerModalOpen(false);
      setQuickName('');
      setQuickDocNum('');
      setQuickPhone('');
      setQuickEmail('');
      setQuickAddress('');
    } catch (err) {
      addToast(err.message || 'Error al registrar cliente', 'error');
    } finally {
      setQuickSubmitting(false);
    }
  };

  // Carrito en Nueva Orden con soporte para Sabores y Toppings
  const handleAddProductToCart = async (prod) => {
    try {
      const data = await api.get(`/modifiers/products/${prod.id}`).catch(() => []);
      const activeGroups = (Array.isArray(data) ? data : []).filter(g => g.options && g.options.length > 0);

      if (activeGroups.length > 0) {
        setEditingCartItemIndex(null);
        setEditingCartInitialModifiers([]);
        setSelectedCartProduct(prod);
        setCartModifiersModalOpen(true);
      } else {
        handleConfirmCartModifiers(prod, [], parseFloat(prod.price));
      }
    } catch (err) {
      handleConfirmCartModifiers(prod, [], parseFloat(prod.price));
    }
  };

  const handleOpenEditCartItemModifiers = (index) => {
    const item = cartItems[index];
    if (!item) return;
    const prod = products.find(p => p.id === item.product_id) || { id: item.product_id, name: item.name, price: item.price };
    setEditingCartItemIndex(index);
    setEditingCartInitialModifiers(item.modifiers || []);
    setSelectedCartProduct(prod);
    setCartModifiersModalOpen(true);
  };

  const handleConfirmCartModifiers = (product, selectedModifiers, finalUnitPrice) => {
    const unitPrice = finalUnitPrice !== undefined ? finalUnitPrice : parseFloat(product.price);
    const modString = JSON.stringify(selectedModifiers || []);

    if (editingCartItemIndex !== null && editingCartItemIndex >= 0) {
      setCartItems(prev => {
        const copy = [...prev];
        if (copy[editingCartItemIndex]) {
          copy[editingCartItemIndex] = {
            ...copy[editingCartItemIndex],
            price: unitPrice,
            modifiers: selectedModifiers || []
          };
        }
        return copy;
      });
      setEditingCartItemIndex(null);
      setEditingCartInitialModifiers([]);
    } else {
      setCartItems(prev => {
        const existingIndex = prev.findIndex(it =>
          it.product_id === product.id &&
          JSON.stringify(it.modifiers || []) === modString
        );
        if (existingIndex > -1) {
          const copy = [...prev];
          copy[existingIndex].quantity += 1;
          return copy;
        }
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            price: unitPrice,
            quantity: 1,
            tax_rate: product.tax_rate || 0,
            tax_included: product.tax_included !== undefined ? product.tax_included : true,
            notes: '',
            modifiers: selectedModifiers || []
          }
        ];
      });
    }
  };

  const handleUpdateCartQty = (index, delta) => {
    setCartItems(prev => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      copy[index] = { ...item, quantity: newQty };
      return copy;
    });
  };

  const handleUpdateCartNotes = (index, notes) => {
    setCartItems(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], notes };
      }
      return copy;
    });
  };

  const handleRemoveFromCart = (index) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + (it.quantity * it.price), 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    const fee = newOrderType === 'delivery' ? (parseFloat(deliveryFee) || 0) : 0;
    return cartSubtotal + fee;
  }, [cartSubtotal, newOrderType, deliveryFee]);

  const filteredCatalogProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory !== 'all' && p.category_id?.toString() !== selectedCategory.toString()) {
        return false;
      }
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
    });
  }, [products, selectedCategory, productSearch]);

  const filteredEditCatalogProducts = useMemo(() => {
    return products.filter(p => {
      if (editProductCategory !== 'all' && p.category_id?.toString() !== editProductCategory.toString()) {
        return false;
      }
      if (!editProductSearch.trim()) return true;
      const q = editProductSearch.toLowerCase().trim();
      return p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q));
    });
  }, [products, editProductCategory, editProductSearch]);

  const handleCreateNewOrder = async (e, autoPrintKitchen = false) => {
    if (e) e.preventDefault();
    if (cartItems.length === 0) {
      addToast('Agrega al menos un producto a la orden', 'warning');
      return;
    }

    if (newOrderType === 'delivery' && !deliveryAddress.trim()) {
      addToast('Ingresa la dirección de entrega para el domicilio', 'warning');
      return;
    }

    setCreatingOrder(true);
    try {
      const finalCustId = (selectedCustomerId && selectedCustomerId !== 'consumidor_final') ? parseInt(selectedCustomerId, 10) : null;

      const payload = {
        order_type: newOrderType,
        customer_id: finalCustId,
        delivery_address: newOrderType === 'delivery' ? deliveryAddress : null,
        delivery_phone: newOrderType === 'delivery' ? deliveryPhone : null,
        delivery_notes: newOrderType === 'delivery' ? deliveryNotes : null,
        delivery_fee: newOrderType === 'delivery' ? (parseFloat(deliveryFee) || 0) : 0,
        delivery_zone_id: newOrderType === 'delivery' && deliveryZoneId ? parseInt(deliveryZoneId, 10) : null,
        delivery_driver_id: newOrderType === 'delivery' && deliveryDriverId ? parseInt(deliveryDriverId, 10) : null,
        notes: orderNotes || null,
        items: cartItems.map(it => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.price,
          notes: it.notes || null,
          modifiers: it.modifiers || []
        }))
      };

      const res = await api.post('/orders', payload);
      const createdId = res.id || res.order?.id;
      addToast(`Orden #${createdId} creada exitosamente`, 'success');
      setNewOrderModalOpen(false);
      fetchData();

      // Si se pidió imprimir comanda inmediatamente
      if (autoPrintKitchen) {
        handlePrintKitchenTicket(
          {
            id: createdId,
            order_type: newOrderType,
            customer_name: customerSearchQuery,
            waiter_name: user?.full_name,
            delivery_address: deliveryAddress,
            delivery_phone: deliveryPhone,
            notes: orderNotes
          },
          cartItems
        );
      }

      // Abrir vista de facturación
      if (createdId) {
        const full = await api.get(`/orders/${createdId}`).catch(() => null);
        if (full) {
          handleOpenOrderDetail(full, 'billing');
        }
      }
    } catch (err) {
      console.error('Error al crear orden:', err);
      addToast(err.message || 'Error al registrar orden', 'error');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleOpenCreditModal = (order, defaultTab = 'abono', e = null) => {
    if (e) e.stopPropagation();
    setSelectedCreditOrder(order);
    setCreditActionTab(defaultTab);
    const balance = parseFloat(order.credit_balance || 0);
    setCreditPaymentAmount(balance > 0 ? balance.toString() : '');
    setCreditNewBalance(balance.toString());
    setCreditPaymentMethod('efectivo');
    setCreditNotes('');
    setCreditAdjustReason('');
    setCreditModalOpen(true);
  };

  const handleProcessCreditPayment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCreditOrder || !selectedCreditOrder.credit_ar_id) {
      addToast('No se encontró el registro de cuenta por cobrar vinculado a esta orden.', 'warning');
      return;
    }

    const amount = creditActionTab === 'pagar_todo'
      ? parseFloat(selectedCreditOrder.credit_balance || 0)
      : parseFloat(creditPaymentAmount);

    if (!amount || amount <= 0) {
      addToast('Ingresa un monto válido mayor a 0 para procesar el pago.', 'warning');
      return;
    }

    try {
      setSubmittingCreditAction(true);
      const res = await api.post(`/accounting/receivable/${selectedCreditOrder.credit_ar_id}/payment`, {
        amount,
        payment_method: creditPaymentMethod,
        notes: creditNotes || (creditActionTab === 'pagar_todo' ? 'Pago total de saldo CxC' : 'Abono parcial a saldo CxC')
      });
      addToast(res.message || 'Pago registrado exitosamente', 'success');
      setCreditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error al registrar pago CxC:', err);
      addToast(err.message || 'Error al procesar el pago del saldo', 'danger');
    } finally {
      setSubmittingCreditAction(false);
    }
  };

  const handleProcessCreditAdjustment = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCreditOrder || !selectedCreditOrder.credit_ar_id) {
      addToast('No se encontró el registro de cuenta por cobrar vinculado a esta orden.', 'warning');
      return;
    }

    const newBal = parseFloat(creditNewBalance);
    if (isNaN(newBal) || newBal < 0) {
      addToast('Ingresa un valor numérico válido mayor o igual a 0 para el nuevo saldo.', 'warning');
      return;
    }

    try {
      setSubmittingCreditAction(true);
      const res = await api.put(`/accounting/receivable/${selectedCreditOrder.credit_ar_id}/adjust`, {
        new_balance: newBal,
        notes: creditNotes,
        reason: creditAdjustReason
      });
      addToast(res.message || 'Saldo ajustado exitosamente', 'success');
      setCreditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error al ajustar saldo CxC:', err);
      addToast(err.message || 'Error al ajustar el saldo', 'danger');
    } finally {
      setSubmittingCreditAction(false);
    }
  };

  const getOrderStatusOnlyBadge = (order) => {
    const creditBal = parseFloat(order.credit_balance || 0);
    if (order.status === 'cancelada') {
      return (
        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <XCircle size={13} /> Cancelada
        </span>
      );
    }
    if (order.status === 'pendiente_pago' || creditBal > 0) {
      return (
        <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} /> Pendiente por Cobrar
        </span>
      );
    }
    if (order.status === 'cerrada') {
      return (
        <span style={{ color: 'var(--accent-success)', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} /> Pagada / Cerrada
        </span>
      );
    }
    if (order.status === 'en_preparacion') {
      return (
        <span style={{ color: 'var(--accent-warning)', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} /> En Preparación
        </span>
      );
    }
    if (order.status === 'lista') {
      return (
        <span style={{ color: '#06b6d4', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} /> Lista para Entrega
        </span>
      );
    }
    if (order.status === 'entregada') {
      return (
        <span style={{ color: 'var(--accent-success)', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} /> Entregada
        </span>
      );
    }
    return (
      <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={13} /> Abierta / En Atención
      </span>
    );
  };

  const getOrderPaymentBadge = (order) => {
    if (!order.invoice_number && order.status !== 'cerrada') {
      return (
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          ⏳ Sin Facturar
        </span>
      );
    }
    const pm = (order.invoice_payment_method || '').toLowerCase();
    if (pm === 'credito') {
      return (
        <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CreditCard size={12} /> Crédito CxC
        </span>
      );
    }
    if (pm === 'efectivo') {
      return (
        <span style={{ color: 'var(--accent-success)', fontWeight: 700, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
          <DollarSign size={12} /> Efectivo
        </span>
      );
    }
    if (pm === 'tarjeta') {
      return (
        <span style={{ color: '#06b6d4', fontWeight: 600, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
          <CreditCard size={12} /> Tarjeta
        </span>
      );
    }
    if (pm === 'transferencia' || pm === 'nequi' || pm === 'daviplata') {
      return (
        <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
          <Sparkles size={12} /> {order.invoice_payment_method}
        </span>
      );
    }
    return (
      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '11.5px', textTransform: 'capitalize' }}>
        {order.invoice_payment_method || 'Pagado'}
      </span>
    );
  };

  const getPendingBalanceBadge = (order) => {
    if (order.status === 'cancelada') {
      return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>;
    }
    const creditBal = parseFloat(order.credit_balance || 0);
    if (creditBal > 0) {
      const isOverdue = order.credit_due_date && new Date(order.credit_due_date) < new Date();
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 900, color: isOverdue ? 'var(--accent-danger)' : '#f59e0b' }}>
            {formatCOP(creditBal)}
          </span>
          {order.credit_due_date && (
            <span style={{ fontSize: '10px', color: isOverdue ? 'var(--accent-danger)' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 500 }}>
              {isOverdue ? '⚠️ Vencido' : 'Vence'}: {new Date(order.credit_due_date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </span>
          )}
        </div>
      );
    }
    if (order.status === 'cerrada') {
      return (
        <span style={{ color: 'var(--accent-success)', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <CheckCircle2 size={12} /> $0 (Al día)
        </span>
      );
    }
    // Orden abierta sin facturar
    const unbilledAmount = order.final_total || order.computed_total || 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ color: '#f59e0b', fontSize: '11.5px', fontWeight: 700 }}>
          {formatCOP(unbilledAmount)}
        </span>
        <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>Por Facturar</span>
      </div>
    );
  };

  const getOrderTypeBadge = (order) => {
    if (order.order_type === 'delivery') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
          <Bike size={14} color="var(--text-muted)" /> Domicilio
        </span>
      );
    }
    if (order.order_type === 'para_llevar') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
          <ShoppingBag size={14} color="var(--text-muted)" /> Para Llevar
        </span>
      );
    }
    const cleanTable = (order.table_number || '').toString().replace(/^mesa\s*/i, '').trim();
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
        <UtensilsCrossed size={14} color="var(--text-muted)" /> {cleanTable ? `Mesa ${cleanTable}` : 'Mesa'}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
            <ListOrdered size={24} color="var(--accent-primary)" />
            Lista de Órdenes & Facturación POS
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Control unificado de órdenes de salón/mesas, para llevar y domicilios con impresión térmica, edición en vivo y cartera
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={fetchData}>
            Actualizar
          </Button>
          <Button variant="primary" icon={<Plus size={16} />} onClick={handleOpenNewOrder}>
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.12)', borderRadius: '8px', color: 'var(--accent-primary)' }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Órdenes Totales</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{kpis.totalCount} órdenes</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{kpis.countPaid} pagadas · {kpis.countPending} abiertas</div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.12)', borderRadius: '8px', color: 'var(--accent-warning)' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Abiertas por Facturar</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-warning)' }}>{formatCOP(kpis.totalPending)}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{kpis.countPending} órdenes sin cerrar</div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '8px', color: 'var(--accent-danger)' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Cartera CxC / Saldos</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-danger)' }}>{formatCOP(kpis.totalCreditBalance)}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{kpis.countCredit} créditos de clientes</div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: '8px', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Facturado & Cobrado</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{formatCOP(kpis.totalPaid)}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{kpis.countPaid} facturas emitidas</div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.12)', borderRadius: '8px', color: '#8b5cf6' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Propinas Generadas</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#8b5cf6' }}>{formatCOP(kpis.totalTips)}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Voluntarias del personal</div>
          </div>
        </Card>

        {/* Tarjetas de Productos Destacados en Estadísticas Superiores */}
        {highlightedStats.map(stat => (
          <Card key={stat.product.id} style={{ 
            padding: '12px 16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            border: '1.5px solid #f59e0b', 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.03) 100%)',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
          }}>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.25)', borderRadius: '8px', color: '#f59e0b' }}>
              <Star size={22} fill="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ventas: {stat.product.name}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatCOP(stat.totalRevenue)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {stat.totalQty} {stat.totalQty === 1 ? 'unidad vendida' : 'unidades vendidas'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Barra de Búsqueda y Filtros Avanzados de Órdenes */}
      <Card style={{ padding: '16px', marginBottom: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {/* Fila 1: Buscador Omnibox + Ordenamiento + Botón Filtros Avanzados */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: searchQuery ? 'var(--accent-primary)' : 'var(--text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por # orden (#12), código factura (POS-...), cliente, cédula/NIT, mesero, mesa o producto..."
              style={{
                width: '100%',
                padding: '10px 36px 10px 38px',
                borderRadius: '8px',
                border: searchQuery ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxShadow: searchQuery ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
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
              >
                <XCircle size={16} />
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
                padding: '9px 12px',
                borderRadius: '8px',
                border: sortBy !== 'date_desc' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: sortBy !== 'date_desc' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-primary)',
                color: sortBy !== 'date_desc' ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="date_desc">📅 Más recientes</option>
              <option value="date_asc">📅 Más antiguas</option>
              <option value="total_desc">💰 Mayor Total ($$$ → $)</option>
              <option value="total_asc">💰 Menor Total ($ → $$$)</option>
            </select>
          </div>

          {/* Botón Toggle Filtros Avanzados */}
          <Button
            type="button"
            variant={showAdvancedFilters || activeAdvancedFiltersCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            icon={<SlidersHorizontal size={14} />}
            style={{ padding: '9px 14px', fontSize: '12px', fontWeight: 700 }}
          >
            Filtros Avanzados
            {activeAdvancedFiltersCount > 0 && (
              <span style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '10px',
                background: showAdvancedFilters || activeAdvancedFiltersCount > 0 ? '#fff' : 'var(--accent-primary)',
                color: showAdvancedFilters || activeAdvancedFiltersCount > 0 ? 'var(--accent-primary)' : '#fff',
                fontSize: '10px',
                fontWeight: 900
              }}>
                {activeAdvancedFiltersCount}
              </span>
            )}
            <ChevronDown
              size={14}
              style={{
                marginLeft: '4px',
                transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s'
              }}
            />
          </Button>
        </div>

        {/* Fila 2: Chips Rápidos de Tipo y Estado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
          {/* Tipo de orden */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={12} /> Tipo:
            </span>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'mesa', label: 'Mesas' },
              { id: 'para_llevar', label: 'Para Llevar' },
              { id: 'delivery', label: 'Domicilios' },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                style={{
                  padding: '4px 11px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: typeFilter === t.id ? 700 : 500,
                  border: typeFilter === t.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: typeFilter === t.id ? 'rgba(99, 102, 241, 0.14)' : 'var(--bg-primary)',
                  color: typeFilter === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}

            <div style={{ height: '16px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />

            {/* Estado */}
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Estado:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Abiertas / En Atención' },
              { id: 'pendiente_pago', label: 'Con Saldo / Crédito CxC' },
              { id: 'cerrada', label: 'Pagadas' },
              { id: 'cancelada', label: 'Canceladas' },
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                style={{
                  padding: '4px 11px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: statusFilter === s.id ? 700 : 500,
                  border: statusFilter === s.id ? '1px solid #10b981' : '1px solid var(--border-color)',
                  background: statusFilter === s.id ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-primary)',
                  color: statusFilter === s.id ? '#10b981' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Conteo rápido de resultados */}
          <Badge variant="info" style={{ fontSize: '11.5px', padding: '4px 10px', fontWeight: 700 }}>
            {filteredOrders.length} {filteredOrders.length === 1 ? 'orden' : 'órdenes'}
          </Badge>
        </div>

        {/* Fila 3: Panel Colapsable de Filtros Avanzados */}
        {showAdvancedFilters && (
          <div style={{
            marginTop: '14px',
            padding: '14px',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Filtro: Método de Pago */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <CreditCard size={13} /> Método de Pago
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: paymentMethodFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: paymentMethodFilter !== 'all' ? 700 : 500
                }}
              >
                <option value="all">Todos los Métodos</option>
                <option value="efectivo">💵 Efectivo</option>
                <option value="tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                <option value="transferencia">📱 Transferencia (Nequi/Daviplata)</option>
                <option value="credito">📑 Crédito a Cartera CxC</option>
                <option value="mixto">🔀 Pago Mixto / Múltiple</option>
              </select>
            </div>

            {/* Filtro: Mesero / Atendido Por */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <User size={13} /> Mesero / Responsable
              </label>
              <select
                value={waiterFilter}
                onChange={(e) => setWaiterFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: waiterFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: waiterFilter !== 'all' ? 700 : 500
                }}
              >
                <option value="all">Todos los Responsables</option>
                {availableWaiters.map(w => (
                  <option key={w} value={w}>👤 {w}</option>
                ))}
              </select>
            </div>

            {/* Filtro: Rango de Monto */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <DollarSign size={13} /> Rango de Monto
              </label>
              <select
                value={amountRangeFilter}
                onChange={(e) => setAmountRangeFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: amountRangeFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: amountRangeFilter !== 'all' ? 700 : 500
                }}
              >
                <option value="all">Cualquier Monto</option>
                <option value="under20k">Menor a $20.000</option>
                <option value="20k_50k">$20.000 a $50.000</option>
                <option value="50k_100k">$50.000 a $100.000</option>
                <option value="over100k">Mayor a $100.000</option>
              </select>
            </div>

            {/* Filtro: Turno de Caja */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Wallet size={13} /> Turno de Caja
              </label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: shiftFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: shiftFilter !== 'all' ? 700 : 500
                }}
              >
                <option value="all">Todos los Turnos</option>
                {availableShifts.map(s => (
                  <option key={s.id} value={s.id}>
                    Turno #{s.id} {s.status === 'abierta' ? '● En Curso' : '(Cerrado)'} ({s.count} ord)
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Rango de Fecha */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Calendar size={13} /> Periodo / Fecha
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: dateFilter !== '7days' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: dateFilter !== '7days' ? 700 : 500
                }}
              >
                <option value="today">📅 Hoy</option>
                <option value="yesterday">📅 Ayer</option>
                <option value="7days">📅 Últimos 7 días</option>
                <option value="month">📅 Este Mes</option>
                <option value="prev_month">📅 Mes Anterior</option>
                <option value="all">📅 Todo el Histórico</option>
                <option value="custom">📅 Rango Personalizado</option>
              </select>
            </div>

            {/* Fechas personalizadas si aplica */}
            {dateFilter === 'custom' && (
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Desde:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Hasta:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fila 4: Barra de Pills de Filtros Activos y Limpieza */}
        {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || paymentMethodFilter !== 'all' || waiterFilter !== 'all' || amountRangeFilter !== 'all' || shiftFilter !== 'all' || dateFilter !== '7days' || sortBy !== 'date_desc') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtros Activos:</span>

              {searchQuery && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Búsqueda: "{searchQuery}"
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
                </span>
              )}

              {typeFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Tipo: {typeFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setTypeFilter('all')} />
                </span>
              )}

              {statusFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
                  Estado: {statusFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('all')} />
                </span>
              )}

              {paymentMethodFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-warning)', fontSize: '11px', fontWeight: 700 }}>
                  Pago: {paymentMethodFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setPaymentMethodFilter('all')} />
                </span>
              )}

              {waiterFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', fontSize: '11px', fontWeight: 700 }}>
                  Mesero: {waiterFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setWaiterFilter('all')} />
                </span>
              )}

              {amountRangeFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', fontSize: '11px', fontWeight: 700 }}>
                  Monto: {amountRangeFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setAmountRangeFilter('all')} />
                </span>
              )}

              {shiftFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Turno #{shiftFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setShiftFilter('all')} />
                </span>
              )}

              {dateFilter !== '7days' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Fecha: {dateFilter === 'custom' ? `${customStartDate} al ${customEndDate}` : dateFilter === 'today' ? 'Hoy' : dateFilter === 'yesterday' ? 'Ayer' : dateFilter === 'month' ? 'Este Mes' : dateFilter === 'prev_month' ? 'Mes Anterior' : dateFilter === 'all' ? 'Todo el Histórico' : dateFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setDateFilter('7days'); setCustomStartDate(''); setCustomEndDate(''); }} />
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
                setPaymentMethodFilter('all');
                setWaiterFilter('all');
                setAmountRangeFilter('all');
                setShiftFilter('all');
                setDateFilter('7days');
                setCustomStartDate('');
                setCustomEndDate('');
                setSortBy('date_desc');
              }}
              icon={<RotateCcw size={12} />}
              style={{ fontSize: '11px', padding: '4px 10px', fontWeight: 700, color: 'var(--accent-danger)' }}
            >
              Limpiar Todos los Filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Tabla de Lista de Órdenes */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px' }}># ORDEN</th>
                <th style={{ padding: '12px 14px' }}>TURNO</th>
                <th style={{ padding: '12px 14px' }}>TIPO DE ORDEN</th>
                <th style={{ padding: '12px 14px' }}>CÓDIGO FACTURA</th>
                <th style={{ padding: '12px 14px' }}>CLIENTE</th>
                <th style={{ padding: '12px 14px' }}>ATENDIDO POR</th>
                <th style={{ padding: '12px 14px' }}>ESTADO</th>
                <th style={{ padding: '12px 14px' }}>COBRO / PAGO</th>
                <th style={{ padding: '12px 14px' }}>SALDO PENDIENTE</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>PROPINA</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>MONTO TOTAL</th>
                <th style={{ padding: '12px 14px' }}>FECHA Y HORA</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACCIONES & IMPRESIÓN</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ListOrdered size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      No se encontraron órdenes
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {searchQuery ? `No hay coincidencias para "${searchQuery}".` : 'No hay órdenes registradas para el filtro seleccionado.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const creditBal = parseFloat(o.credit_balance || 0);
                  const isPaid = o.status === 'cerrada' && creditBal === 0;
                  const isPendingCredit = (o.status === 'pendiente_pago' || creditBal > 0) && o.status !== 'cancelada';
                  const isCancelled = o.status === 'cancelada';
                  const isOpen = !isPaid && !isCancelled && !isPendingCredit;
                  const orderTotal = o.final_total || o.computed_total || 0;
                  const tipAmount = parseFloat(o.invoice_tip_amount || 0);

                  return (
                    <tr
                      key={o.id}
                      onClick={() => handleOpenOrderDetail(o, 'billing')}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* # Orden */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>
                          #{o.id}
                        </span>
                      </td>

                      {/* Turno # */}
                      <td style={{ padding: '12px 14px' }}>
                        {o.cash_shift_id || o.cash_register_id ? (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: o.shift_status === 'abierta' ? 700 : 600,
                            color: o.shift_status === 'abierta' ? 'var(--accent-success)' : 'var(--text-primary)'
                          }}>
                            Turno #{o.cash_shift_id || o.cash_register_id}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Tipo de Orden */}
                      <td style={{ padding: '12px 14px' }}>
                        {getOrderTypeBadge(o)}
                      </td>

                      {/* Código Factura */}
                      <td style={{ padding: '12px 14px' }}>
                        {o.invoice_number ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                            {o.invoice_number}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* Cliente */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {o.customer_name || 'Consumidor Final'}
                          </span>
                          {o.customer_document && (
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {o.customer_doc_type || 'CC'}: {o.customer_document}
                            </span>
                          )}
                          {o.delivery_address && (
                            <span style={{ fontSize: '10px', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={10} /> {o.delivery_address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Atendido por */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                          <User size={13} color="var(--text-muted)" />
                          <span>{o.waiter_name || 'Caja / Sistema'}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '12px 14px' }}>
                        {getOrderStatusOnlyBadge(o)}
                      </td>

                      {/* Cobro / Pago */}
                      <td style={{ padding: '12px 14px' }}>
                        {getOrderPaymentBadge(o)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td style={{ padding: '12px 14px' }}>
                        {getPendingBalanceBadge(o)}
                      </td>

                      {/* Propina */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {isPaid && tipAmount > 0 ? (
                          <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '12px' }}>
                            +{formatCOP(tipAmount)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>

                      {/* Monto Total */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: isPaid ? 'var(--accent-success)' : isCancelled ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                          {formatCOP(orderTotal)}
                        </span>
                      </td>

                      {/* Fecha / Hora */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {formatDate(o.created_at)}
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {formatDateTime(o.created_at).split(',')[1]?.trim() || ''}
                          </span>
                        </div>
                      </td>

                      {/* Acciones & Botones de Impresión */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                          {isOpen ? (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<CreditCard size={12} />}
                                onClick={() => handleOpenOrderDetail(o, 'billing')}
                                style={{ fontSize: '11px', padding: '4px 8px', background: 'var(--accent-primary)' }}
                              >
                                Facturar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<Edit3 size={12} />}
                                onClick={() => handleOpenOrderDetail(o, 'edit')}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                Editar
                              </Button>
                            </>
                          ) : isPendingCredit ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<FileText size={12} />}
                              onClick={() => handleOpenOrderDetail(o, 'billing')}
                              style={{ fontSize: '11px', padding: '4px 8px', color: '#f59e0b', borderColor: '#f59e0b' }}
                            >
                              Abonar / Factura
                            </Button>
                          ) : isPaid ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<FileText size={12} />}
                              onClick={() => handleOpenOrderDetail(o, 'billing')}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              Ver Factura
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Eye size={12} />}
                              onClick={() => handleOpenOrderDetail(o, 'billing')}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              Detalle
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================= */}
      {/* MODAL: DETALLE, EDICIÓN & FACTURACIÓN POS                 */}
      {/* ========================================================= */}
      {orderModalOpen && selectedOrder && (() => {
        const hasPendingCredit = parseFloat(selectedOrder.credit_balance || 0) > 0;
        const isOrderClosedOrInvoiced = selectedOrder.status === 'cerrada' || !!selectedOrder.invoice_number;
        const isSingleColumnModal = isOrderClosedOrInvoiced && !hasPendingCredit && activeOrderTab !== 'edit';

        return (
        <Modal
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          title={`Orden #${selectedOrder.id} — ${selectedOrder.order_type === 'delivery' ? 'Domicilio' : selectedOrder.order_type === 'para_llevar' ? 'Para Llevar' : ((selectedOrder.table_number || '').toString().replace(/^mesa\s*/i, '').trim() ? `Mesa ${(selectedOrder.table_number || '').toString().replace(/^mesa\s*/i, '').trim()}` : 'Mesa')}`}
          maxWidth={isSingleColumnModal ? "580px" : "960px"}
        >
          {/* Barra Superior con Pestañas y Botones de Impresión */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            {selectedOrder.status !== 'cerrada' && selectedOrder.status !== 'cancelada' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setActiveOrderTab('billing')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 800,
                    border: activeOrderTab === 'billing' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: activeOrderTab === 'billing' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                    color: activeOrderTab === 'billing' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <CreditCard size={14} /> Cobro & Facturación POS
                </button>

                <button
                  type="button"
                  onClick={() => setActiveOrderTab('edit')}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 800,
                    border: activeOrderTab === 'edit' ? '1px solid #06b6d4' : '1px solid var(--border-color)',
                    background: activeOrderTab === 'edit' ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-secondary)',
                    color: activeOrderTab === 'edit' ? '#06b6d4' : 'var(--text-secondary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Edit3 size={14} /> Editar Pedido & Ítems
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Comprobante de Orden #{selectedOrder.id}
              </div>
            )}

            {/* Botones de Impresión de Comanda y Pre-Factura */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <Button
                size="sm"
                variant="secondary"
                icon={<Utensils size={13} />}
                onClick={() => handlePrintKitchenTicket(selectedOrder, selectedOrder.items)}
                style={{ fontSize: '11px', padding: '5px 9px' }}
              >
                Imprimir Comanda
              </Button>

              <Button
                size="sm"
                variant="secondary"
                icon={<Receipt size={13} />}
                onClick={() => handlePrintPreFactura(selectedOrder, selectedOrder.items, billingCalculations.discountVal, billingCalculations.delFee)}
                style={{ fontSize: '11px', padding: '5px 9px' }}
              >
                Imprimir Pre-Factura
              </Button>

              {selectedOrder.status !== 'cerrada' && selectedOrder.status !== 'cancelada' && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Ban size={13} color="var(--accent-danger)" />}
                  onClick={() => setCancelModalOpen(true)}
                  style={{ fontSize: '11px', color: 'var(--accent-danger)', padding: '5px 8px' }}
                >
                  Anular
                </Button>
              )}
            </div>
          </div>

          {/* MODO 1: FACTURACIÓN & COBRO */}
          {activeOrderTab === 'billing' || selectedOrder.status === 'cerrada' || selectedOrder.status === 'cancelada' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isSingleColumnModal ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '16px' }}>
              {/* Columna Izquierda: Detalle de la Orden e Ítems */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                {/* Cabecera Info Orden */}
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Cliente:</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.customer_name || 'Consumidor Final'}</strong>
                    {selectedOrder.customer_document && <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{selectedOrder.customer_doc_type || 'CC'}: {selectedOrder.customer_document}</div>}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Atendido por:</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.waiter_name || 'Caja'}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{new Date(selectedOrder.created_at).toLocaleString('es-CO')}</div>
                  </div>

                  {selectedOrder.delivery_address && (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Dirección de Entrega: </span>
                      <strong style={{ color: 'var(--accent-secondary)' }}>{selectedOrder.delivery_address}</strong>
                      {selectedOrder.delivery_phone && <span> · Tel: {selectedOrder.delivery_phone}</span>}
                      {selectedOrder.delivery_notes && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '10px' }}>"{selectedOrder.delivery_notes}"</div>}
                    </div>
                  )}
                </div>

                {/* Lista de Ítems / Productos consumidos */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', fontWeight: 700, fontSize: '11.5px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>ÍTEMS DEL PEDIDO</span>
                    {selectedOrder.status !== 'cerrada' && selectedOrder.status !== 'cancelada' && (
                      <button
                        type="button"
                        onClick={() => setActiveOrderTab('edit')}
                        style={{ fontSize: '11px', color: '#06b6d4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Edit3 size={11} /> Modificar Ítems
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(selectedOrder.items || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        No hay productos registrados en esta orden.
                      </div>
                    ) : (
                      selectedOrder.items.map((it, idx) => {
                        const rawMods = it.modifiers || it.modifiers_json;
                        let parsedMods = [];
                        if (rawMods) {
                          try {
                            parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                          } catch (e) {
                            parsedMods = Array.isArray(rawMods) ? rawMods : [];
                          }
                        }
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{it.quantity}x</span> {it.name}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Unit: {formatCOP(it.unit_price)}</div>
                              </div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {formatCOP(parseFloat(it.unit_price) * parseFloat(it.quantity))}
                              </div>
                            </div>

                            {/* Sabores y Toppings elegidos */}
                            {Array.isArray(parsedMods) && parsedMods.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '2px' }}>
                                {parsedMods.map((m, mIdx) => {
                                  const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                                  return (
                                    <span
                                      key={mIdx}
                                      style={{
                                        fontSize: '10px',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        color: 'var(--text-secondary)'
                                      }}
                                    >
                                      🍨 {m.name} {m.quantity > 1 ? `(x${m.quantity})` : ''} {extra > 0 ? `(+${formatCOP(extra)})` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {it.notes && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1px' }}>Nota: {it.notes}</div>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Si la orden ya fue facturada, mostrar comprobante fiscal */}
                {(selectedOrder.status === 'cerrada' || selectedOrder.invoice_number) && (
                  <div style={{ background: parseFloat(selectedOrder.credit_balance || 0) > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '8px', border: parseFloat(selectedOrder.credit_balance || 0) > 0 ? '1px solid #f59e0b' : '1px solid #10b981', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: parseFloat(selectedOrder.credit_balance || 0) > 0 ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                        <CheckCircle2 size={15} /> Factura: {selectedOrder.invoice_number || 'Emitida'} {parseFloat(selectedOrder.credit_balance || 0) > 0 ? '(Saldo Pendiente)' : '(Pagada)'}
                      </strong>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Printer size={13} />}
                        onClick={() => handleReimprimirTicket(selectedOrder)}
                      >
                        Reimprimir Ticket
                      </Button>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Método de Pago: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{selectedOrder.invoice_payment_method}</strong>
                    </div>
                    {parseFloat(selectedOrder.invoice_tip_amount || 0) > 0 && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        Propina Incluida: <strong style={{ color: '#8b5cf6' }}>{formatCOP(selectedOrder.invoice_tip_amount)}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                      Total Facturado: {formatCOP(selectedOrder.final_total || selectedOrder.invoice_total || 0)}
                    </div>
                  </div>
                )}

                {/* Botón Cerrar si la orden está al día y no requiere panel lateral */}
                {isSingleColumnModal && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setOrderModalOpen(false)}>
                      Cerrar Comprobante
                    </Button>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Facturación o Gestión de Saldo Pendiente */}
              {!selectedOrder.invoice_number && selectedOrder.status !== 'cancelada' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={16} color="var(--accent-primary)" /> Módulo de Cobro & Facturación
                  </h3>

                  {/* Selección Inteligente de Cliente para Factura */}
                  <CustomerSearchSelector
                    customers={customers}
                    selectedCustomerId={billingCustomerId}
                    selectedCustomerName={selectedOrder.customer_name || ''}
                    onSelectCustomer={(c) => setBillingCustomerId(c.id.toString())}
                    onSelectConsumidorFinal={() => setBillingCustomerId('')}
                    onOpenQuickCreate={handleOpenQuickCustomerWithQuery}
                    title="CLIENTE TITULAR DE LA FACTURA"
                  />

                  {/* Descuentos y Cupones */}
                  <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Descuento / Promoción / Cupón</span>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'none', label: 'Ninguno' },
                          { id: 'promo', label: 'Promoción' },
                          { id: 'coupon', label: 'Cupón' },
                          { id: 'manual', label: 'Manual' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setDiscountMode(m.id);
                              if (m.id !== 'coupon') setAppliedCoupon(null);
                            }}
                            style={{
                              padding: '2px 8px', fontSize: '10px', borderRadius: '4px', border: 'none',
                              background: discountMode === m.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                              color: discountMode === m.id ? '#fff' : 'var(--text-muted)',
                              fontWeight: discountMode === m.id ? 700 : 500, cursor: 'pointer'
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alerta de Promociones Aplicables del Día */}
                    {discountMode === 'none' && applicablePromos.length > 0 && (
                      <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px dashed var(--accent-primary)', padding: '6px 8px', borderRadius: '6px', marginBottom: '6px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                          ⭐ Promoción activa: {applicablePromos[0].name} ({applicablePromos[0].discount_type === 'percentage' ? `${applicablePromos[0].value}%` : formatCOP(applicablePromos[0].value)})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDiscountMode('promo');
                            setSelectedDiscountId(applicablePromos[0].id.toString());
                          }}
                          style={{ padding: '2px 6px', fontSize: '10px', fontWeight: 800, background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Aplicar
                        </button>
                      </div>
                    )}

                    {discountMode === 'promo' && (
                      <div>
                        <select
                          value={selectedDiscountId}
                          onChange={(e) => setSelectedDiscountId(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        >
                          <option value="">Seleccionar promoción del sistema...</option>
                          {discounts.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} — {(d.discount_type === 'percentage' || d.type === 'percentage') ? `${d.value}%` : formatCOP(d.value)}
                              {d.applies_to === 'product' ? ' (Producto específico)' : d.applies_to === 'category' ? ' (Categoría)' : ' (Orden completa)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {discountMode === 'coupon' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Código del cupón (ej: BIENVENIDO20)"
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                            style={{ flex: 1, padding: '6px', fontSize: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', textTransform: 'uppercase', fontWeight: 700 }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            loading={couponValidating}
                            onClick={handleValidateCoupon}
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                          >
                            Validar
                          </Button>
                        </div>
                        {appliedCoupon && (
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>✓ Cupón "{appliedCoupon.code}": {appliedCoupon.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedCoupon(null);
                                setDiscountMode('none');
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '10.5px' }}
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {discountMode === 'manual' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Valor descuento"
                          value={manualDiscountVal}
                          onChange={(e) => setManualDiscountVal(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                        <select
                          value={manualDiscountType}
                          onChange={(e) => setManualDiscountType(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        >
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Monto Fijo ($)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Propina Voluntaria */}
                  <div style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Propina Voluntaria del Servicio
                    </span>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {[
                        { label: '0%', val: 0 },
                        { label: '5%', val: 5 },
                        { label: '10%', val: 10 },
                        { label: '15%', val: 15 },
                      ].map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectTipPercent(t.val)}
                          style={{
                            padding: '3px 8px', fontSize: '10.5px', borderRadius: '4px', border: 'none',
                            background: (tipOption !== 'otro' && tipMode === 'percentage' && tipPercentage === t.val) ? '#8b5cf6' : 'var(--bg-secondary)',
                            color: (tipOption !== 'otro' && tipMode === 'percentage' && tipPercentage === t.val) ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setTipMode('custom');
                          setTipOption('otro');
                          const rec = parseFloat(amountReceived) || 0;
                          if (rec > billingCalculations.totalSinPropina) {
                            setCustomTip(Math.round(rec - billingCalculations.totalSinPropina).toString());
                          }
                        }}
                        style={{
                          padding: '3px 8px', fontSize: '10.5px', borderRadius: '4px', border: 'none',
                          background: (tipOption === 'otro' || tipMode === 'custom') ? '#8b5cf6' : 'var(--bg-secondary)',
                          color: (tipOption === 'otro' || tipMode === 'custom') ? '#fff' : 'var(--text-secondary)',
                          fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Otro ($)
                      </button>
                    </div>

                    {(tipMode === 'custom' || tipOption === 'otro') && (
                      <input
                        type="number"
                        min="0"
                        placeholder="Monto voluntario propina ($)"
                        value={customTip}
                        onChange={(e) => {
                          const tip = e.target.value;
                          setCustomTip(tip);
                          setTipOption('otro');
                          setTipMode('custom');
                          const tipNum = parseFloat(tip) || 0;
                          const newTotal = billingCalculations.totalSinPropina + tipNum;
                          setAmountReceived(Math.round(newTotal).toString());
                        }}
                        style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#8b5cf6', fontWeight: 700 }}
                      />
                    )}
                  </div>

                  {/* Desglose de Totales con Discriminación Explícita */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Subtotal Ítems:</span>
                      <span>{formatCOP(billingCalculations.itemsSubtotal)}</span>
                    </div>
                    {billingCalculations.discountVal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-danger)' }}>
                        <span>Descuento:</span>
                        <span>-{formatCOP(billingCalculations.discountVal)}</span>
                      </div>
                    )}
                    {billingCalculations.delFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-secondary)' }}>
                        <span>Tarifa Domicilio:</span>
                        <span>+{formatCOP(billingCalculations.delFee)}</span>
                      </div>
                    )}

                    {/* TOTAL SIN PROPINA (OBLIGATORIO) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', margin: '2px 0' }}>
                      <span>TOTAL A PAGAR (SIN PROPINA):</span>
                      <span>{formatCOP(billingCalculations.totalSinPropina)}</span>
                    </div>

                    {/* PROPINA VOLUNTARIA */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6', padding: '0 8px' }}>
                      <span>Propina Voluntaria del Servicio:</span>
                      <span style={{ fontWeight: 700 }}>+{formatCOP(billingCalculations.tipVal)}</span>
                    </div>

                    {/* TOTAL CON PROPINA */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: 'var(--accent-primary)', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--accent-primary)', padding: '6px 8px', borderRadius: '6px', marginTop: '2px' }}>
                      <span>TOTAL A PAGAR (CON PROPINA):</span>
                      <span>{formatCOP(billingCalculations.grandTotal)}</span>
                    </div>
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Método de Pago</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '4px' }}>
                      {[
                        { id: 'efectivo', label: 'Efectivo' },
                        { id: 'transferencia', label: 'Nequi / Transf' },
                        { id: 'tarjeta', label: 'Tarjeta' },
                        { id: 'mixto', label: 'Pago Mixto' },
                        { id: 'credito', label: 'Crédito CxC' }
                      ].map(pm => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(pm.id);
                            if (pm.id === 'credito') {
                              setTipOption('sin_propina');
                              setTipMode('percentage');
                              setTipPercentage(0);
                              setCustomTip('0');
                              setAmountReceived('0');
                              setRecordRemainingAsCredit(true);
                              if (!creditDueDate) handleSelectCreditDays(30);
                            } else if (pm.id === 'mixto') {
                              const half = Math.round(billingCalculations.grandTotal / 2);
                              setMixedCashAmount(half.toString());
                              setMixedTransferAmount((billingCalculations.grandTotal - half).toString());
                              setAmountReceived(Math.round(billingCalculations.grandTotal).toString());
                            } else {
                              setAmountReceived(Math.round(billingCalculations.grandTotal).toString());
                            }
                          }}
                          style={{
                            padding: '6px 4px', fontSize: '10.5px', borderRadius: '6px',
                            border: paymentMethod === pm.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            background: paymentMethod === pm.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                            color: paymentMethod === pm.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontWeight: paymentMethod === pm.id ? 700 : 500, cursor: 'pointer'
                          }}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Panel Configuración Pago Mixto */}
                  {paymentMethod === 'mixto' && (
                    <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1.5px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                          División de Pago Mixto
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const half = Math.round(billingCalculations.grandTotal / 2);
                              setMixedCashAmount(half.toString());
                              setMixedTransferAmount((billingCalculations.grandTotal - half).toString());
                            }}
                            style={{ fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontWeight: 700 }}
                          >
                            50% / 50%
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                            Parte en Efectivo ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={mixedCashAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMixedCashAmount(val);
                              const num = parseFloat(val) || 0;
                              const rem = Math.max(0, billingCalculations.grandTotal - num);
                              setMixedTransferAmount(Math.round(rem).toString());
                            }}
                            style={{ width: '100%', padding: '6px 8px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <label style={{ fontSize: '10.5px', fontWeight: 700 }}>
                              Parte Digital ($)
                            </label>
                            <select
                              value={mixedDigitalType}
                              onChange={(e) => setMixedDigitalType(e.target.value)}
                              style={{ fontSize: '9.5px', padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                              <option value="transferencia">Transferencia</option>
                              <option value="tarjeta">Tarjeta</option>
                            </select>
                          </div>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={mixedTransferAmount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMixedTransferAmount(val);
                              const num = parseFloat(val) || 0;
                              const rem = Math.max(0, billingCalculations.grandTotal - num);
                              setMixedCashAmount(Math.round(rem).toString());
                            }}
                            style={{ width: '100%', padding: '6px 8px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Monto Recibido / Monto a Pagar */}
                  {paymentMethod !== 'credito' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700 }}>
                          Monto Recibido / Pagado ($)
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTipOption('sin_propina');
                              setTipMode('percentage');
                              setTipPercentage(0);
                              setCustomTip('0');
                              setAmountReceived(Math.round(billingCalculations.totalSinPropina).toString());
                            }}
                            style={{
                              fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px',
                              border: tipOption === 'sin_propina' ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                              background: tipOption === 'sin_propina' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                              color: tipOption === 'sin_propina' ? '#10b981' : 'var(--text-secondary)',
                              cursor: 'pointer', fontWeight: 700
                            }}
                            title="Llenar exacto sin propina"
                          >
                            Sin Propina ({formatCOP(billingCalculations.totalSinPropina)})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTipOption('con_propina');
                              setTipMode('percentage');
                              setTipPercentage(10);
                              setCustomTip('');
                              const withTip = billingCalculations.totalSinPropina + Math.round(billingCalculations.totalSinPropina * 0.1);
                              setAmountReceived(Math.round(withTip).toString());
                            }}
                            style={{
                              fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px',
                              border: tipOption === 'con_propina' ? '1.5px solid #8b5cf6' : '1px solid var(--border-color)',
                              background: tipOption === 'con_propina' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-primary)',
                              color: tipOption === 'con_propina' ? '#8b5cf6' : 'var(--text-secondary)',
                              cursor: 'pointer', fontWeight: 700
                            }}
                            title="Llenar exacto con propina (10%)"
                          >
                            Con Propina ({formatCOP(billingCalculations.totalSinPropina + Math.round(billingCalculations.totalSinPropina * 0.1))})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTipOption('otro');
                            }}
                            style={{
                              fontSize: '9.5px', padding: '2px 6px', borderRadius: '4px',
                              border: tipOption === 'otro' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              background: tipOption === 'otro' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                              color: tipOption === 'otro' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              cursor: 'pointer', fontWeight: 700
                            }}
                            title="Valor personalizado"
                          >
                            Otro {tipOption === 'otro' && amountReceived ? `(${formatCOP(parseFloat(amountReceived) || 0)})` : ''}
                          </button>
                        </div>
                      </div>

                      <Input
                        type="number"
                        step="any"
                        min="0"
                        value={amountReceived}
                        onChange={(e) => handleAmountReceivedChange(e.target.value)}
                        placeholder="0"
                        style={{ marginBottom: '4px', fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)' }}
                      />

                      {/* Control de Dinero Entregado en Efectivo y Cambio a Devolver */}
                      {(paymentMethod === 'efectivo' || (paymentMethod === 'mixto' && parseFloat(mixedCashAmount) > 0)) && (
                        <div style={{ marginTop: '8px', background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {(() => {
                            const cashToPay = paymentMethod === 'mixto' ? (parseFloat(mixedCashAmount) || 0) : billingCalculations.grandTotal;
                            const tendered = parseFloat(amountTenderedCash) || 0;
                            const changeVal = tendered > cashToPay ? (tendered - cashToPay) : 0;

                            return (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    💵 Dinero Entregado en Efectivo por el Cliente ($)
                                  </label>
                                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                    {[20000, 50000, 100000].map(b => (
                                      <button
                                        key={b}
                                        type="button"
                                        onClick={() => setAmountTenderedCash(b.toString())}
                                        style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
                                      >
                                        ${b / 1000}k
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => setAmountTenderedCash(Math.round(cashToPay).toString())}
                                      style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                      Exacto
                                    </button>
                                  </div>
                                </div>

                                <input
                                  type="number"
                                  min="0"
                                  placeholder={`Ej: ${cashToPay > 0 ? (cashToPay + 10000) : '50000'}`}
                                  value={amountTenderedCash}
                                  onChange={(e) => setAmountTenderedCash(e.target.value)}
                                  style={{ width: '100%', padding: '6px 8px', fontSize: '13px', fontWeight: 800, background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />

                                {tendered > 0 && (
                                  <div style={{
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: changeVal > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                                    border: `1.5px solid ${changeVal > 0 ? '#10b981' : 'var(--accent-primary)'}`
                                  }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: changeVal > 0 ? '#10b981' : 'var(--text-primary)' }}>
                                      {changeVal > 0 ? 'CAMBIO / VUELTOS A DEVOLVER:' : 'PAGO EXACTO EN EFECTIVO:'}
                                    </span>
                                    <span style={{ fontSize: '15px', fontWeight: 900, color: changeVal > 0 ? '#10b981' : 'var(--accent-primary)' }}>
                                      {formatCOP(changeVal)}
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* ALERTA DE PAGO INFERIOR / CONSULTA DE SALDO A CRÉDITO */}
                      {paymentDiff.isUnderpaid && (
                        <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--accent-warning)', padding: '10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={15} color="var(--accent-warning)" />
                            <span>Saldo Faltante (Sin Propina): {formatCOP(paymentDiff.missingAmount)}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                            El monto pagado no cubre el consumo ({formatCOP(billingCalculations.totalSinPropina)}). ¿Deseas registrar los <strong>{formatCOP(paymentDiff.missingAmount)}</strong> restantes como <strong>Crédito en la Cartera de Clientes (CxC)</strong>?
                          </p>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-primary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={recordRemainingAsCredit}
                              onChange={(e) => {
                                setRecordRemainingAsCredit(e.target.checked);
                                if (e.target.checked && !creditDueDate) handleSelectCreditDays(30);
                              }}
                            />
                            <span>✓ Registrar saldo restante ({formatCOP(paymentDiff.missingAmount)}) a crédito CxC</span>
                          </label>

                          {recordRemainingAsCredit && (
                            <div style={{ marginTop: '4px', background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                                Plazo y Fecha de Vencimiento del Crédito
                              </label>
                              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                {[7, 15, 30, 60, 90].map(d => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => handleSelectCreditDays(d)}
                                    style={{ padding: '2px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
                                  >
                                    {d} días
                                  </button>
                                ))}
                              </div>
                              <input
                                type="date"
                                value={creditDueDate}
                                onChange={(e) => setCreditDueDate(e.target.value)}
                                style={{ width: '100%', padding: '4px 6px', fontSize: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'credito' && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid var(--accent-primary)', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ color: 'var(--accent-primary)' }}>100% Crédito a Cartera CxC</strong>
                      <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        El total neto de consumo de <strong>{formatCOP(billingCalculations.totalSinPropina)}</strong> se cargará directamente a la cuenta por cobrar del cliente seleccionado.
                      </p>

                      <div style={{ marginTop: '2px' }}>
                        <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
                          Plazo y Fecha de Vencimiento
                        </label>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          {[7, 15, 30, 60, 90].map(d => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleSelectCreditDays(d)}
                              style={{ padding: '2px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
                            >
                              {d} días
                            </button>
                          ))}
                        </div>
                        <input
                          type="date"
                          value={creditDueDate}
                          onChange={(e) => setCreditDueDate(e.target.value)}
                          style={{ width: '100%', padding: '4px 6px', fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Botón Acción Facturar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <Button variant="ghost" onClick={() => setOrderModalOpen(false)}>Cerrar</Button>
                    <Button
                      variant="primary"
                      loading={billingSubmitting}
                      onClick={handleProcessInvoice}
                      icon={<CheckCircle2 size={16} />}
                      style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 800 }}
                    >
                      {(() => {
                        if (paymentMethod === 'credito') {
                          return `Emitir Factura a Crédito (${formatCOP(billingCalculations.totalSinPropina)})`;
                        }
                        if (paymentDiff.isUnderpaid) {
                          if (recordRemainingAsCredit) {
                            return `Emitir Factura (Recibir ${formatCOP(paymentDiff.received)} + ${formatCOP(paymentDiff.missingAmount)} Crédito)`;
                          }
                          return `Emitir Factura POS (Faltan ${formatCOP(paymentDiff.missingAmount)})`;
                        }
                        if (paymentDiff.change > 0) {
                          return `Emitir Factura POS (${formatCOP(billingCalculations.grandTotal)} | Cambio: ${formatCOP(paymentDiff.change)})`;
                        }
                        return `Emitir Factura POS (${formatCOP(paymentDiff.received > 0 ? paymentDiff.received : billingCalculations.grandTotal)})`;
                      })()}
                    </Button>
                  </div>
                </div>
              ) : hasPendingCredit ? (
                /* GESTIÓN DIRECTA DE SALDO & CARTERA CXC (Solo visible si hay saldo pendiente > 0) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', minWidth: 0 }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Landmark size={16} color="var(--accent-primary)" /> Gestión de Cartera & Saldo Pendiente
                  </h3>

                  {/* Tarjeta de Resumen del Saldo */}
                  <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Crédito Inicial</div>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          {formatCOP(selectedOrder.credit_amount || selectedOrder.final_total || 0)}
                        </strong>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Abonado</div>
                        <strong style={{ fontSize: '12.5px', color: '#10b981' }}>
                          {formatCOP(selectedOrder.credit_paid_amount || 0)}
                        </strong>
                      </div>
                    </div>

                    <div style={{ background: parseFloat(selectedOrder.credit_balance || 0) > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)', border: parseFloat(selectedOrder.credit_balance || 0) > 0 ? '1px solid #f59e0b' : '1px solid #10b981', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10.5px', color: parseFloat(selectedOrder.credit_balance || 0) > 0 ? '#d97706' : '#10b981', fontWeight: 700 }}>
                        {parseFloat(selectedOrder.credit_balance || 0) > 0 ? 'SALDO PENDIENTE POR PAGAR' : 'ESTADO DE CUENTA'}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: parseFloat(selectedOrder.credit_balance || 0) > 0 ? '#d97706' : '#10b981', margin: '2px 0' }}>
                        {parseFloat(selectedOrder.credit_balance || 0) > 0 ? formatCOP(selectedOrder.credit_balance) : '✓ $0 (Al Día / Pagado)'}
                      </div>
                      {selectedOrder.credit_due_date && parseFloat(selectedOrder.credit_balance || 0) > 0 && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Vencimiento: <strong>{new Date(selectedOrder.credit_due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Saldo: Abonar | Pagar Todo | Ajustar */}
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '6px' }}>
                    {[
                      { id: 'abono', label: '💵 Abonar' },
                      { id: 'pagar_todo', label: '✓ Liquidar Todo' },
                      { id: 'ajuste', label: '⚙️ Ajustar Saldo' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCreditActionTab(tab.id)}
                        style={{
                          flex: 1, padding: '6px 4px', fontSize: '11px', borderRadius: '4px', border: 'none',
                          background: creditActionTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                          color: creditActionTab === tab.id ? '#fff' : 'var(--text-secondary)',
                          fontWeight: creditActionTab === tab.id ? 700 : 500, cursor: 'pointer'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* FORMULARIO DIRECTO DE ABONO */}
                  {creditActionTab === 'abono' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Monto a Abonar ($) *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max={selectedOrder.credit_balance || undefined}
                          value={creditPaymentAmount}
                          onChange={(e) => setCreditPaymentAmount(e.target.value)}
                          placeholder="Monto a abonar..."
                          style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '4px' }}
                        />
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {[
                            { label: '25%', factor: 0.25 },
                            { label: '50%', factor: 0.5 },
                            { label: '75%', factor: 0.75 },
                            { label: '100% Saldo', factor: 1 }
                          ].map((f, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setCreditPaymentAmount(Math.round(parseFloat(selectedOrder.credit_balance || 0) * f.factor).toString())}
                              style={{ padding: '2px 6px', fontSize: '9.5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Medio de Pago *
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                          {[
                            { id: 'efectivo', label: 'Efectivo' },
                            { id: 'tarjeta', label: 'Tarjeta' },
                            { id: 'transferencia', label: 'Transferencia' }
                          ].map(pm => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setCreditPaymentMethod(pm.id)}
                              style={{
                                padding: '5px', fontSize: '10.5px', borderRadius: '4px',
                                border: creditPaymentMethod === pm.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                background: creditPaymentMethod === pm.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                                color: creditPaymentMethod === pm.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: creditPaymentMethod === pm.id ? 700 : 500, cursor: 'pointer'
                              }}
                            >
                              {pm.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Notas / Comprobante (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Referencia de pago, Nequi, etc..."
                          value={creditNotes}
                          onChange={(e) => setCreditNotes(e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                        <Button variant="ghost" size="sm" onClick={() => setOrderModalOpen(false)}>Cerrar</Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={submittingCreditAction}
                          onClick={() => handleProcessOrderCreditPayment('abono')}
                          icon={<CheckCircle2 size={13} />}
                        >
                          Registrar Abono ({formatCOP(parseFloat(creditPaymentAmount) || 0)})
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO DIRECTO DE PAGO TOTAL */}
                  {creditActionTab === 'pagar_todo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', padding: '10px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Monto Total a Liquidar:</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', margin: '2px 0' }}>
                          {formatCOP(selectedOrder.credit_balance || 0)}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-muted)' }}>
                          El saldo de esta orden quedará en $0 (Pagada en su totalidad).
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Medio de Pago *
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                          {[
                            { id: 'efectivo', label: 'Efectivo' },
                            { id: 'tarjeta', label: 'Tarjeta' },
                            { id: 'transferencia', label: 'Transferencia' }
                          ].map(pm => (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => setCreditPaymentMethod(pm.id)}
                              style={{
                                padding: '5px', fontSize: '10.5px', borderRadius: '4px',
                                border: creditPaymentMethod === pm.id ? '2px solid #10b981' : '1px solid var(--border-color)',
                                background: creditPaymentMethod === pm.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-primary)',
                                color: creditPaymentMethod === pm.id ? '#10b981' : 'var(--text-secondary)',
                                fontWeight: creditPaymentMethod === pm.id ? 700 : 500, cursor: 'pointer'
                              }}
                            >
                              {pm.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Notas / Comprobante (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Referencia de pago..."
                          value={creditNotes}
                          onChange={(e) => setCreditNotes(e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                        <Button variant="ghost" size="sm" onClick={() => setOrderModalOpen(false)}>Cerrar</Button>
                        <Button
                          variant="success"
                          size="sm"
                          loading={submittingCreditAction}
                          onClick={() => handleProcessOrderCreditPayment('pagar_todo')}
                          icon={<CheckCircle2 size={13} />}
                          style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                        >
                          Liquidar Saldo Completo ({formatCOP(selectedOrder.credit_balance || 0)})
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* FORMULARIO DIRECTO DE AJUSTE MANUAL */}
                  {creditActionTab === 'ajuste' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--accent-primary)', padding: '8px', borderRadius: '6px', fontSize: '11px' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Ajuste Manual de Cartera</span>
                        <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Modifica directamente el valor pendiente por cobrar de esta orden.
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Nuevo Saldo Restante ($) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={creditNewBalance}
                          onChange={(e) => setCreditNewBalance(e.target.value)}
                          placeholder="0..."
                          style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Motivo / Razón del Ajuste *
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Condonación, corrección contable..."
                          value={creditAdjustReason}
                          onChange={(e) => setCreditAdjustReason(e.target.value)}
                          required
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                          Observaciones
                        </label>
                        <input
                          type="text"
                          placeholder="Detalles adicionales..."
                          value={creditNotes}
                          onChange={(e) => setCreditNotes(e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                        <Button variant="ghost" size="sm" onClick={() => setOrderModalOpen(false)}>Cerrar</Button>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={submittingCreditAction}
                          onClick={handleProcessOrderCreditAdjustment}
                          icon={<SlidersHorizontal size={13} />}
                        >
                          Guardar Ajuste de Saldo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* ========================================================= */
            /* MODO 2: EDICIÓN EN VIVO DEL PEDIDO & ÍTEMS                */
            /* ========================================================= */
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '16px' }}>
              {/* Lado Izquierdo: Catálogo de Productos y Datos Básicos de la Orden */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                {/* Selector Inteligente de Cliente */}
                <CustomerSearchSelector
                  customers={customers}
                  selectedCustomerId={editCustomerId}
                  selectedCustomerName=""
                  onSelectCustomer={(c) => {
                    setEditCustomerId(c.id.toString());
                    if (editOrderType === 'delivery') {
                      if (c.address) setEditDeliveryAddress(c.address);
                      if (c.phone) setEditDeliveryPhone(c.phone);
                    }
                  }}
                  onSelectConsumidorFinal={() => setEditCustomerId('')}
                  onOpenQuickCreate={handleOpenQuickCustomerWithQuery}
                  isDelivery={editOrderType === 'delivery'}
                  title="REASIGNAR CLIENTE"
                />

                {/* Tipo de Pedido y Datos de Entrega */}
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Tipo de Pedido</label>
                      <select
                        value={editOrderType}
                        onChange={(e) => setEditOrderType(e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                      >
                        <option value="mesa">Mesa</option>
                        <option value="para_llevar">Para Llevar</option>
                        <option value="delivery">Domicilio</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Personas / Comensales</label>
                      <input
                        type="number"
                        min="1"
                        value={editGuests}
                        onChange={(e) => setEditGuests(parseInt(e.target.value, 10) || 1)}
                        style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {editOrderType === 'delivery' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Dirección de Entrega</label>
                        <input
                          type="text"
                          value={editDeliveryAddress}
                          onChange={(e) => setEditDeliveryAddress(e.target.value)}
                          placeholder="Dirección..."
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Tarifa Domicilio ($)</label>
                        <input
                          type="number"
                          value={editDeliveryFee}
                          onChange={(e) => setEditDeliveryFee(e.target.value)}
                          style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#06b6d4', fontWeight: 700 }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Catálogo de Productos para Agregar Más Ítems */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      AGREGAR PRODUCTOS ({filteredEditCatalogProducts.length})
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar plato o bebida..."
                      value={editProductSearch}
                      onChange={(e) => setEditProductSearch(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '11px', width: '160px', maxWidth: '45%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Categorías con navegación estilizada sin barra nativa */}
                  <CategoryChipsBar
                    categories={categories}
                    selectedCategory={editProductCategory}
                    onSelectCategory={setEditProductCategory}
                  />

                  {/* Grid de Productos Práctico (2 columnas) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', maxHeight: '250px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px' }}>
                    {filteredEditCatalogProducts.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        No se encontraron productos disponibles.
                      </div>
                    ) : (
                      filteredEditCatalogProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleEditAddProduct(p)}
                          style={{
                            background: 'var(--bg-primary)', padding: '7px 9px', borderRadius: '6px',
                            border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            justifyContent: 'space-between', gap: '5px', minHeight: '60px', transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{
                            fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                          }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 800 }}>
                              {formatCOP(p.price)}
                            </span>
                            <span style={{ fontSize: '9.5px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>
                              + Agregar
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Lista de Ítems Editables y Botón Guardar */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Ítems en la Orden ({editOrderItems.length})</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Edita cantidades y notas</span>
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {editOrderItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                        No hay productos en la orden. Agrega ítems desde el catálogo.
                      </div>
                    ) : (
                      editOrderItems.map((it, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>{it.name}</strong>
                              {!it.id && <Badge variant="warning" style={{ fontSize: '9px', marginLeft: '4px', padding: '1px 4px' }}>Nuevo</Badge>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenPriceEdit(it, idx)}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  border: '1px solid var(--accent-primary)',
                                  color: 'var(--accent-primary)',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 700
                                }}
                                title="Modificar precio unitario (solo superior al base)"
                              >
                                <Edit3 size={10} /> {formatCOP(it.unit_price)}
                              </button>
                              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                {formatCOP(it.unit_price * it.quantity)}
                              </span>
                            </div>
                          </div>

                          {/* Sabores y Toppings configurados */}
                          {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '1px' }}>
                              {it.modifiers.map((m, mIdx) => {
                                const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                                return (
                                  <span
                                    key={mIdx}
                                    style={{
                                      fontSize: '9.5px',
                                      background: 'var(--bg-secondary)',
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

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditItemModifiers(idx)}
                              style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Editar sabores y toppings de este ítem"
                            >
                              <Sparkles size={11} /> {Array.isArray(it.modifiers) && it.modifiers.length > 0 ? 'Editar Sabores/Toppings' : '+ Sabores/Toppings'}
                            </button>

                            <input
                              type="text"
                              placeholder="Notas..."
                              value={it.notes || ''}
                              onChange={(e) => handleEditItemNotes(idx, e.target.value)}
                              style={{ padding: '2px 6px', fontSize: '10px', width: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => handleEditItemQty(idx, -1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800 }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '11.5px', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{it.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleEditItemQty(idx, 1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800 }}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditRemoveItem(idx)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px 4px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Notas Generales */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Observaciones Generales</label>
                    <input
                      type="text"
                      placeholder="Notas de la orden..."
                      value={editGeneralNotes}
                      onChange={(e) => setEditGeneralNotes(e.target.value)}
                      style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Checkbox Comanda a Cocina */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      checked={editSendToKitchen}
                      onChange={(e) => setEditSendToKitchen(e.target.checked)}
                    />
                    <span>Enviar nuevos ítems agregados a comanda de cocina</span>
                  </label>
                </div>

                {/* Total y Botones de Guardar */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    <span>NUEVO TOTAL:</span>
                    <span>{formatCOP(editOrderTotal)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <Button variant="ghost" type="button" onClick={() => setActiveOrderTab('billing')}>
                      Volver a Facturación
                    </Button>
                    <Button
                      variant="primary"
                      type="button"
                      loading={updatingOrder}
                      icon={<Save size={14} />}
                      onClick={handleSaveOrderChanges}
                      style={{ background: '#06b6d4', borderColor: '#06b6d4', color: '#fff', fontWeight: 800 }}
                    >
                      Guardar Modificaciones
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
        );
      })()}

      {/* ========================================================= */}
      {/* MODAL: CANCELAR / ANULAR ORDEN                            */}
      {/* ========================================================= */}
      {cancelModalOpen && selectedOrder && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title={`Anular Orden #${selectedOrder.id}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>¿Estás seguro de cancelar esta orden? Los productos y comandas serán anulados y la mesa quedará liberada.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>Motivo de Cancelación</label>
              <input
                type="text"
                placeholder="Ej. El cliente se retiró, pedido duplicado..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>No, volver</Button>
              <Button
                variant="danger"
                loading={cancellingOrder}
                onClick={handleConfirmCancelOrder}
                icon={<Ban size={14} />}
              >
                Sí, Anular Orden
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: NUEVA ORDEN (PARA LLEVAR / DOMICILIO)              */}
      {/* ========================================================= */}
      {newOrderModalOpen && (
        <Modal
          isOpen={newOrderModalOpen}
          onClose={() => setNewOrderModalOpen(false)}
          title={newOrderStep === 1 ? "Crear Nueva Orden — Selecciona la Modalidad (Paso 1/2)" : `Nueva Orden POS (${newOrderType === 'delivery' ? 'Domicilio' : 'Para Llevar'}) — Paso 2/2`}
          maxWidth={newOrderStep === 1 ? "580px" : "960px"}
        >
          {newOrderStep === 1 ? (
            <div style={{ padding: '20px 8px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                ¿Qué tipo de orden deseas crear?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Selecciona la modalidad para inicializar la toma de pedido
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '560px', margin: '0 auto' }}>
                {/* Opción 1: Para Llevar */}
                <div
                  onClick={() => {
                    setNewOrderType('para_llevar');
                    setNewOrderStep(2);
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '24px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    border: '2px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                  }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={28} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Para Llevar</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>Cliente recoge en el local</p>
                  </div>
                  <Button size="sm" variant="primary" style={{ marginTop: '4px' }}>
                    Continuar →
                  </Button>
                </div>

                {/* Opción 2: Domicilio */}
                <div
                  onClick={() => {
                    setNewOrderType('delivery');
                    setNewOrderStep(2);
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '24px 16px',
                    borderRadius: '12px',
                    background: 'var(--bg-elevated)',
                    border: '2px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#06b6d4';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(6, 182, 212, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                  }}
                >
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bike size={28} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Domicilio</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>Envío a dirección con repartidor</p>
                  </div>
                  <Button size="sm" variant="secondary" style={{ marginTop: '4px', color: '#06b6d4', borderColor: '#06b6d4' }}>
                    Continuar →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => handleCreateNewOrder(e, false)}>
              {/* Barra superior de cambio de modo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {newOrderType === 'delivery' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontWeight: 800, fontSize: '13px' }}>
                      <Bike size={16} /> Modalidad: Domicilio (Delivery)
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '13px' }}>
                      <ShoppingBag size={16} /> Modalidad: Para Llevar (Takeout)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setNewOrderStep(1)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ← Cambiar modalidad
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '16px' }}>
                {/* Columna Izquierda: Selección de Tipo, Cliente, Delivery y Catálogo de Productos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                  {/* Selector Inteligente de Cliente con Búsqueda Predictiva */}
                  <CustomerSearchSelector
                  customers={customers}
                  selectedCustomerId={selectedCustomerId}
                  selectedCustomerName={customerSearchQuery}
                  onSelectCustomer={handleSelectCustomer}
                  onSelectConsumidorFinal={handleSetConsumidorFinal}
                  onOpenQuickCreate={handleOpenQuickCustomerWithQuery}
                  isDelivery={newOrderType === 'delivery'}
                  title="DATOS DEL CLIENTE / CRM"
                />

                {/* Paso 3 (Solo si es Domicilio): Zona, Dirección, Teléfono y Tarifa */}
                {newOrderType === 'delivery' && (
                  <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Zona de Cobertura</label>
                        <select
                          value={deliveryZoneId}
                          onChange={(e) => handleSelectZone(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        >
                          {zones.map(z => (
                            <option key={z.id} value={z.id}>{z.name} — {formatCOP(z.delivery_fee)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Costo Domicilio ($)</label>
                        <input
                          type="number"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: '#06b6d4', fontWeight: 800 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Dirección de Entrega *</label>
                        <input
                          type="text"
                          required
                          placeholder="Calle / Carrera / Apto / Edificio..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Teléfono Contacto</label>
                        <input
                          type="text"
                          placeholder="300 123 4567"
                          value={deliveryPhone}
                          onChange={(e) => setDeliveryPhone(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Repartidor Asignado</label>
                        <select
                          value={deliveryDriverId}
                          onChange={(e) => setDeliveryDriverId(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        >
                          <option value="">(Asignar más tarde)</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name || d.username}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Notas de Entrega</label>
                        <input
                          type="text"
                          placeholder="Ej: Timbre 2, dejar en portería"
                          value={deliveryNotes}
                          onChange={(e) => setDeliveryNotes(e.target.value)}
                          style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Paso 4: Selector Visual de Productos del Menú */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      CATÁLOGO DE PRODUCTOS ({filteredCatalogProducts.length})
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar plato o bebida..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '11px', width: '160px', maxWidth: '45%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                  </div>

                  {/* Categorías con navegación estilizada sin barra nativa */}
                  <CategoryChipsBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                  />

                  {/* Grid de Productos Práctico (2 columnas) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px', maxHeight: '250px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px' }}>
                    {filteredCatalogProducts.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '11px' }}>
                        No se encontraron productos en esta categoría o búsqueda.
                      </div>
                    ) : (
                      filteredCatalogProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleAddProductToCart(p)}
                          style={{
                            background: 'var(--bg-primary)', padding: '7px 9px', borderRadius: '6px',
                            border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            justifyContent: 'space-between', gap: '5px', minHeight: '60px', transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{
                            fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                          }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 800 }}>
                              {formatCOP(p.price)}
                            </span>
                            <span style={{ fontSize: '9.5px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', padding: '2px 5px', borderRadius: '4px', fontWeight: 800 }}>
                              + Agregar
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Bandeja / Carrito de la Orden en Vivo */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Resumen de Ítems ({cartItems.length})</strong>
                    {cartItems.length > 0 && (
                      <button type="button" onClick={() => setCartItems([])} style={{ fontSize: '10.5px', color: 'var(--accent-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Vaciar
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                    {cartItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                        <ShoppingBag size={28} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                        Haz clic en los productos del catálogo para agregarlos a la orden.
                      </div>
                    ) : (
                      cartItems.map((it, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-primary)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>{it.name}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenPriceEdit(it, idx, 'cart')}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  border: '1px solid var(--accent-primary)',
                                  color: 'var(--accent-primary)',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 700
                                }}
                                title="Modificar precio unitario (solo superior al base)"
                              >
                                <Edit3 size={10} /> {formatCOP(it.price || it.unit_price)}
                              </button>
                              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                {formatCOP((it.price || it.unit_price) * it.quantity)}
                              </span>
                            </div>
                          </div>

                          {/* Sabores y Toppings configurados */}
                          {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '1px' }}>
                              {it.modifiers.map((m, mIdx) => {
                                const extra = parseFloat(m.price_modifier || 0) * (m.quantity || 1);
                                return (
                                  <span
                                    key={mIdx}
                                    style={{
                                      fontSize: '9.5px',
                                      background: 'var(--bg-secondary)',
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

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCartItemModifiers(idx)}
                              style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid var(--accent-primary)',
                                color: 'var(--accent-primary)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '10px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Modificar sabores y toppings de este ítem"
                            >
                              <Sparkles size={11} /> {Array.isArray(it.modifiers) && it.modifiers.length > 0 ? 'Editar Sabores/Toppings' : '+ Sabores/Toppings'}
                            </button>

                            <input
                              type="text"
                              placeholder="Nota (ej. sin cebolla)..."
                              value={it.notes}
                              onChange={(e) => handleUpdateCartNotes(idx, e.target.value)}
                              style={{ padding: '2px 6px', fontSize: '10px', width: '110px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            />

                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(idx, -1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800 }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '11.5px', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{it.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQty(idx, 1)}
                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 800 }}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(idx)}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px 4px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>Observaciones Generales de la Orden</label>
                    <input
                      type="text"
                      placeholder="Ej: Empacar para viaje, salsas extra..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      style={{ width: '100%', padding: '6px', fontSize: '11.5px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Desglose y Botones de Creación e Impresión */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    <span>Subtotal Productos:</span>
                    <span>{formatCOP(cartSubtotal)}</span>
                  </div>
                  {newOrderType === 'delivery' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#06b6d4' }}>
                      <span>Tarifa Domicilio:</span>
                      <span>+{formatCOP(parseFloat(deliveryFee) || 0)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--accent-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                    <span>TOTAL:</span>
                    <span>{formatCOP(cartTotal)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<Utensils size={12} />}
                        disabled={cartItems.length === 0}
                        onClick={() => handlePrintKitchenTicket(
                          {
                            order_type: newOrderType,
                            customer_name: customerSearchQuery,
                            waiter_name: user?.full_name,
                            delivery_address: deliveryAddress,
                            delivery_phone: deliveryPhone,
                            notes: orderNotes
                          },
                          cartItems
                        )}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Comanda
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<Receipt size={12} />}
                        disabled={cartItems.length === 0}
                        onClick={() => handlePrintPreFactura(
                          {
                            order_type: newOrderType,
                            customer_name: customerSearchQuery,
                            waiter_name: user?.full_name,
                            delivery_address: deliveryAddress,
                            delivery_phone: deliveryPhone,
                            notes: orderNotes
                          },
                          cartItems,
                          0,
                          newOrderType === 'delivery' ? (parseFloat(deliveryFee) || 0) : 0
                        )}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                      >
                        Pre-Factura
                      </Button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button variant="ghost" size="sm" type="button" onClick={() => setNewOrderModalOpen(false)}>Cancelar</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        loading={creatingOrder}
                        disabled={cartItems.length === 0}
                        icon={<Send size={13} />}
                        style={{ fontWeight: 800 }}
                      >
                        Crear Orden
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLIENTE RÁPIDO                                     */}
      {/* ========================================================= */}
      {quickCustomerModalOpen && (
        <Modal
          isOpen={quickCustomerModalOpen}
          onClose={() => setQuickCustomerModalOpen(false)}
          title="Registrar Cliente Rápido"
        >
          <form onSubmit={handleQuickCreateCustomer}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <Input
                label="Nombre Completo *"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                required
              />
              <Select
                label="Tipo Doc."
                value={quickDocType}
                onChange={(e) => setQuickDocType(e.target.value)}
                options={[
                  { value: 'CC', label: 'C.C.' },
                  { value: 'NIT', label: 'NIT' },
                  { value: 'CE', label: 'C.E.' },
                  { value: 'PAS', label: 'Pasaporte' }
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <Input
                label="Número de Documento"
                value={quickDocNum}
                onChange={(e) => setQuickDocNum(e.target.value)}
                placeholder="Ej. 1020304050"
              />
              <Input
                label="Teléfono / Móvil"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="Ej. 300 123 4567"
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <Input
                label="Dirección de Entrega"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
                placeholder="Ej. Calle 10 # 40-20 Apto 302"
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <Input
                label="Correo Electrónico"
                type="email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button type="button" variant="ghost" onClick={() => setQuickCustomerModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={quickSubmitting}>Guardar y Seleccionar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: VISTA PREVIA E IMPRESIÓN FACTURA TÉRMICA POS       */}
      {/* ========================================================= */}
      {showInvoiceModal && generatedInvoice && (
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title={`Ticket Factura POS #${generatedInvoice.invoice_number}`}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setPaperWidth('58mm')}
                style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: 'none', background: paperWidth === '58mm' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: paperWidth === '58mm' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Formato 58mm
              </button>
              <button
                onClick={() => setPaperWidth('80mm')}
                style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: 'none', background: paperWidth === '80mm' ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: paperWidth === '80mm' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
              >
                Formato 80mm
              </button>
            </div>
          </div>

          {/* Ticket térmico renderizado 100% idéntico a la impresión */}
          {(() => {
            const effSettings = { ...(generatedInvoice.settings || {}), ...(settings || {}) };
            return (
              <div
                ref={printRef}
                style={{
                  background: '#fff',
                  color: '#000',
                  padding: '16px 14px',
                  borderRadius: '4px',
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px',
                  maxWidth: paperWidth === '58mm' ? '270px' : '350px',
                  margin: '0 auto',
                  border: '1px solid #000',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  lineHeight: 1.35,
                  fontWeight: 500
                }}
              >
                {/* Logo y Encabezado */}
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
                  <div style={{ fontWeight: 900, fontSize: paperWidth === '58mm' ? '14px' : '16px', textTransform: 'uppercase', letterSpacing: '-0.2px', color: '#000' }}>
                    {effSettings.business_name || 'GASTROSPOS RESTAURANTE'}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: paperWidth === '58mm' ? '11px' : '12px', color: '#000' }}>
                    NIT: {effSettings.tax_id || effSettings.nit || '900.123.456-7'}
                  </div>
                  {effSettings.address && <div style={{ fontSize: paperWidth === '58mm' ? '11px' : '12px', color: '#000', marginTop: '1px' }}>{effSettings.address}</div>}
                  {effSettings.phone && <div style={{ fontSize: paperWidth === '58mm' ? '11px' : '12px', color: '#000', marginTop: '1px' }}>Tel: {effSettings.phone}</div>}
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
                    return <div style={{ fontSize: paperWidth === '58mm' ? '10.5px' : '11.5px', fontWeight: 800, color: '#000', marginTop: '2px' }}>{text}</div>;
                  })()}
                </div>

                <div style={{ borderTop: '1px solid #000', margin: '5px 0' }} />
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: paperWidth === '58mm' ? '13px' : '14.5px', color: '#000' }}>
                  FACTURA DE VENTA POS
                </div>
                <div style={{ textAlign: 'center', fontWeight: 900, fontSize: paperWidth === '58mm' ? '13.5px' : '15px', color: '#000' }}>
                  N° {generatedInvoice.invoice_number || 'POS-0000'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', margin: '2.5px 0', color: '#000' }}>
                  <span>Fecha:</span>
                  <span>{formatDateTime(generatedInvoice.created_at || Date.now())}</span>
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

                <div style={{ borderTop: '1px solid #000', margin: '5px 0' }} />
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

                <div style={{ borderTop: '1px solid #000', margin: '5px 0' }} />
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: '#000' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #000', fontWeight: 800, fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px' }}>
                      <th style={{ width: '14%', paddingBottom: '3px' }}>Cant</th>
                      <th style={{ paddingBottom: '3px' }}>Descripción</th>
                      <th style={{ textAlign: 'right', width: '28%', paddingBottom: '3px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(generatedInvoice.items || []).map((it, i) => {
                      const rawMods = it.modifiers || it.modifiers_json;
                      let parsedMods = [];
                      if (rawMods) {
                        try {
                          parsedMods = typeof rawMods === 'string' ? JSON.parse(rawMods) : rawMods;
                        } catch (e) {
                          parsedMods = Array.isArray(rawMods) ? rawMods : [];
                        }
                      }
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ fontWeight: 900, fontSize: paperWidth === '58mm' ? '12px' : '13px', padding: '2.5px 0', verticalAlign: 'top', color: '#000' }}>{it.quantity}x</td>
                          <td style={{ padding: '2.5px 0', verticalAlign: 'top', color: '#000' }}>
                            <div style={{ fontWeight: 800, fontSize: paperWidth === '58mm' ? '12px' : '13.5px', textTransform: 'uppercase' }}>{it.name}</div>
                            <div style={{ fontSize: paperWidth === '58mm' ? '11px' : '12px', fontWeight: 400, color: '#000' }}>Unit: {formatCOP(it.unit_price)}</div>
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
                          <td style={{ textAlign: 'right', fontWeight: 900, fontSize: paperWidth === '58mm' ? '12px' : '13px', padding: '2.5px 0', verticalAlign: 'top', color: '#000' }}>
                            {formatCOP(parseFloat(it.unit_price) * parseFloat(it.quantity))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ borderTop: '1px solid #000', margin: '5px 0' }} />
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

                {/* Recuadro de Crédito vs Pago Total */}
                {(() => {
                  const isCredit = generatedInvoice.payment_method === 'credito' || parseFloat(generatedInvoice.credit_balance || generatedInvoice.credit_amount || 0) > 0;
                  const creditBalance = parseFloat(generatedInvoice.credit_balance !== undefined ? generatedInvoice.credit_balance : (generatedInvoice.credit_amount || (generatedInvoice.payment_method === 'credito' ? generatedInvoice.total : 0)));
                  const paidInitial = Math.max(0, parseFloat(generatedInvoice.total || 0) - creditBalance);

                  if (isCredit && creditBalance > 0) {
                    return (
                      <div style={{ border: '1.5px dashed #000', padding: '6px 8px', margin: '6px 0', background: '#f9f9f9', borderRadius: '4px' }}>
                        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
                          *** CONDICIÓN DE PAGO: CRÉDITO ***
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px' }}>
                          <span>Total Factura:</span>
                          <span style={{ fontWeight: 800 }}>{formatCOP(generatedInvoice.total)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px' }}>
                          <span>Abono Inicial Recibido:</span>
                          <span style={{ fontWeight: 800 }}>{formatCOP(paidInitial)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: paperWidth === '58mm' ? '13px' : '14.5px', marginTop: '3px', borderTop: '1px dashed #000', paddingTop: '3px', color: '#000' }}>
                          <span>VALOR ADEUDADO:</span>
                          <span>{formatCOP(creditBalance)}</span>
                        </div>
                        {generatedInvoice.credit_due_date && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: paperWidth === '58mm' ? '10.5px' : '11.5px', marginTop: '2px' }}>
                            <span>Fecha Límite Pago:</span>
                            <span>{generatedInvoice.credit_due_date}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div style={{ borderTop: '2px solid #000', margin: '5px 0' }} />
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

                <div style={{ borderTop: '1px solid #000', margin: '5px 0' }} />
                <div style={{ textAlign: 'center', fontWeight: 800, fontSize: paperWidth === '58mm' ? '11.5px' : '12.5px', color: '#000' }}>
                  {effSettings.receipt_footer || '¡Gracias por su compra! Vuelva pronto.'}
                </div>
                <div style={{ textAlign: 'center', fontSize: paperWidth === '58mm' ? '10px' : '11px', color: '#000', marginTop: '2px', fontStyle: 'italic' }}>
                  Proveedor del software: KAMIA by JF
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <Button variant="ghost" onClick={() => setShowInvoiceModal(false)}>Cerrar</Button>
            <Button variant="primary" icon={<Printer size={14} />} onClick={handlePrintReceipt}>Imprimir Factura</Button>
          </div>
        </Modal>
      )}

      {/* Modal Selección y Edición de Sabores & Toppings */}
      <ProductModifiersModal
        isOpen={editModifiersModalOpen}
        onClose={() => {
          setEditModifiersModalOpen(false);
          setSelectedProdForModifiers(null);
          setEditingItemIdx(null);
          setEditingInitialModifiers([]);
        }}
        product={selectedProdForModifiers}
        initialModifiers={editingInitialModifiers}
        onConfirm={handleConfirmEditModifiers}
      />
      {/* Modal Selección y Edición de Sabores & Toppings en Carrito Nueva Orden */}
      <ProductModifiersModal
        isOpen={cartModifiersModalOpen}
        onClose={() => {
          setCartModifiersModalOpen(false);
          setSelectedCartProduct(null);
          setEditingCartItemIndex(null);
          setEditingCartInitialModifiers([]);
        }}
        product={selectedCartProduct}
        initialModifiers={editingCartInitialModifiers}
        onConfirm={handleConfirmCartModifiers}
      />

      {/* Modal Modificar Precio Unitario (Solo Superior) */}
      <Modal
        isOpen={priceEditModalOpen}
        onClose={() => setPriceEditModalOpen(false)}
        title="Modificar Precio de Ítem"
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block' }}>
              {priceEditTargetItem?.name || 'Producto'}
            </strong>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Precio base en catálogo: <strong style={{ color: 'var(--accent-primary)' }}>{formatCOP(priceEditMinPrice)}</strong>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              ℹ️ Por política del sistema, solo se permite ajustar el precio para un valor igual o superior al precio base.
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Nuevo Precio Unitario ($) *
            </label>
            <input
              type="number"
              min={priceEditMinPrice}
              step="100"
              value={priceEditInputVal}
              onChange={(e) => setPriceEditInputVal(e.target.value)}
              placeholder="0"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1.5px solid var(--accent-primary)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: 800
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button variant="ghost" onClick={() => setPriceEditModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveItemPrice}>Guardar Precio</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
