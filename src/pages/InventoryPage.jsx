// src/pages/InventoryPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Package, AlertTriangle, ArrowDownRight, ArrowUpRight, RefreshCw,
  Plus, Search, Filter, Layers, ArrowLeftRight, Trash2, ShieldAlert,
  DollarSign, TrendingUp, CheckCircle, FileText, Boxes, History, SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { useNavigate } from 'react-router-dom';

export const InventoryPage = () => {
  const addToast = useUiStore((state) => state.addToast);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('supplies'); // 'supplies' | 'products' | 'movements' | 'alerts'
  
  // Datos Insumos
  const [suppliesList, setSuppliesList] = useState([]);
  
  // Datos Productos
  const [stockItems, setStockItems] = useState([]);
  const [valuation, setValuation] = useState({ totalItems: 0, totalValue: 0 });
  
  // Movimientos y Alertas
  const [movements, setMovements] = useState([]);
  const [suppliesMovements, setSuppliesMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modales Producto
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form Ajuste Producto
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('set');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Form Merma Producto
  const [wasteQty, setWasteQty] = useState('');
  const [wasteNotes, setWasteNotes] = useState('');

  // Form Transferencia
  const [transferQty, setTransferQty] = useState('');
  const [targetBranchId, setTargetBranchId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Modal Ajuste Rápido Insumo
  const [supplyAdjustModalOpen, setSupplyAdjustModalOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState(null);
  const [supplyAdjustQty, setSupplyAdjustQty] = useState('');
  const [supplyAdjustType, setSupplyAdjustType] = useState('ajuste');
  const [supplyAdjustNotes, setSupplyAdjustNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [suppliesRes, stockRes, alertsRes, catsRes, brsRes] = await Promise.allSettled([
        api.get('/supplies'),
        api.get('/inventory/stock'),
        api.get('/inventory/alerts'),
        api.get('/categories'),
        api.get('/branches')
      ]);

      const suppliesData = (suppliesRes.status === 'fulfilled' && Array.isArray(suppliesRes.value)) ? suppliesRes.value : [];
      const stockData = (stockRes.status === 'fulfilled' && stockRes.value && typeof stockRes.value === 'object') ? stockRes.value : { stock: [], valuation: { totalItems: 0, totalValue: 0 } };
      const alertsData = (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) ? alertsRes.value : [];
      const catsData = (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value)) ? catsRes.value : [];
      const brsData = (brsRes.status === 'fulfilled' && Array.isArray(brsRes.value)) ? brsRes.value : [];

      setSuppliesList(suppliesData);
      setStockItems(Array.isArray(stockData?.stock) ? stockData.stock : []);
      setValuation(stockData?.valuation || { totalItems: 0, totalValue: 0 });
      setAlerts(alertsData);
      setCategories(catsData);
      setBranches(brsData);

      if (brsData && brsData.length > 0 && !targetBranchId) {
        setTargetBranchId(brsData[0].id);
      }
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      addToast('Error al cargar datos del inventario', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const [prodMovs, supMovs] = await Promise.allSettled([
        api.get('/inventory/movements'),
        api.get('/supplies/movements?limit=100')
      ]);
      setMovements(prodMovs.status === 'fulfilled' ? prodMovs.value : []);
      setSuppliesMovements(supMovs.status === 'fulfilled' ? supMovs.value : []);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements();
    }
  }, [activeTab]);

  // Handle Ajuste Insumo
  const handleOpenSupplyAdjust = (sup) => {
    setSelectedSupply(sup);
    setSupplyAdjustQty(sup.current_stock?.toString() || '0');
    setSupplyAdjustType('ajuste');
    setSupplyAdjustNotes('');
    setSupplyAdjustModalOpen(true);
  };

  const handleSubmitSupplyAdjust = async (e) => {
    e.preventDefault();
    if (!supplyAdjustQty || isNaN(parseFloat(supplyAdjustQty))) {
      addToast('Ingresa una cantidad válida', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/supplies/${selectedSupply.id}/adjust`, {
        quantity: parseFloat(supplyAdjustQty),
        movement_type: supplyAdjustType,
        notes: supplyAdjustNotes
      });
      addToast('Inventario de insumo actualizado', 'success');
      setSupplyAdjustModalOpen(false);
      fetchAllData();
    } catch (err) {
      addToast(err.message || 'Error al ajustar insumo', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Ajuste Producto
  const handleOpenAdjust = (prod) => {
    setSelectedProduct(prod);
    setAdjustQty(prod.quantity !== undefined ? prod.quantity.toString() : '0');
    setAdjustType('set');
    setAdjustNotes('');
    setAdjustModalOpen(true);
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!adjustQty || isNaN(parseFloat(adjustQty))) {
      addToast('Ingresa una cantidad válida', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/inventory/adjust', {
        product_id: selectedProduct.product_id || selectedProduct.id,
        quantity: parseFloat(adjustQty),
        adjustment_type: adjustType,
        notes: adjustNotes || 'Ajuste manual de producto'
      });
      addToast('Inventario de producto ajustado exitosamente', 'success');
      setAdjustModalOpen(false);
      fetchAllData();
    } catch (err) {
      addToast(err.message || 'Error al ajustar inventario', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Arrays Seguros
  const safeSuppliesList = Array.isArray(suppliesList) ? suppliesList : [];
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  // Filtrado Insumos
  const filteredSupplies = safeSuppliesList.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.sku && s.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory ? s.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Filtrado Productos
  const filteredProducts = safeStockItems.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category_name && p.category_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory ? (p.category_name === selectedCategory || p.category_id?.toString() === selectedCategory.toString()) : true;
    return matchesSearch && matchesCategory;
  });

  // Métricas Combinadas
  const suppliesTotalVal = safeSuppliesList.reduce((acc, s) => acc + ((parseFloat(s.current_stock) || 0) * (parseFloat(s.cost_price) || 0)), 0);
  const productsTotalVal = safeStockItems.reduce((acc, p) => acc + (Math.max(0, parseFloat(p.quantity) || 0) * (parseFloat(p.cost_price) || 0)), 0);
  const grandTotalValuation = suppliesTotalVal + productsTotalVal;
  const criticalSuppliesCount = safeSuppliesList.filter(s => (parseFloat(s.current_stock) || 0) <= (parseFloat(s.min_stock) || 0)).length;
  const criticalProductsCount = safeStockItems.filter(p => (parseFloat(p.quantity) || 0) <= (parseFloat(p.min_stock) || 0)).length;

  const [exportingStockExcel, setExportingStockExcel] = useState(false);

  const handleExportStockExcel = async () => {
    setExportingStockExcel(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = (import.meta.env.VITE_API_URL || 'https://backendweb-ca9k.onrender.com').replace(/\/$/, '');
      const baseUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
      const response = await fetch(`${baseUrl}/inventory/stock/export/excel`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel de inventario');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Inventario_Stock_Productos_e_Insumos_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      addToast('Inventario Excel descargado exitosamente (.xlsx)', 'success');
    } catch (err) {
      addToast(err.message || 'Error al exportar inventario a Excel', 'danger');
    } finally {
      setExportingStockExcel(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={24} color="var(--accent-primary)" /> Control de Inventario & Stock
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Gestión separada de <strong>Insumos (Materia Prima)</strong> y <strong>Productos Terminados (Menú / Reventa)</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button 
            variant="secondary" 
            icon={<FileSpreadsheet size={15} />} 
            onClick={handleExportStockExcel}
            loading={exportingStockExcel}
            title="Descargar reporte Excel con hojas separadas de Productos e Insumos"
          >
            Exportar Stock (Excel)
          </Button>
          <Button variant="secondary" icon={<Boxes size={15} />} onClick={() => navigate('/insumos')}>
            Catálogo de Insumos
          </Button>
          <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={fetchAllData}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VALOR INSUMOS & MATERIA PRIMA</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                {formatCOP(suppliesTotalVal)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{suppliesList.length} insumos registrados</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Boxes size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VALOR PRODUCTOS TERMINADOS</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatCOP(productsTotalVal)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{stockItems.length} productos en catálogo</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Package size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VALOR TOTAL INVENTARIOS</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-warning)' }}>
                {formatCOP(grandTotalValuation)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Insumos + Productos</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>ALERTAS STOCK BAJO</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: (criticalSuppliesCount + criticalProductsCount) > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                {criticalSuppliesCount + criticalProductsCount}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {criticalSuppliesCount} insumos / {criticalProductsCount} productos
              </div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: (criticalSuppliesCount + criticalProductsCount) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: (criticalSuppliesCount + criticalProductsCount) > 0 ? '#ef4444' : '#10b981' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <button
          onClick={() => { setActiveTab('supplies'); setSearchTerm(''); setSelectedCategory(''); }}
          style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'supplies' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
            color: activeTab === 'supplies' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'supplies' ? 700 : 500, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Boxes size={15} /> Insumos & Materias Primas ({suppliesList.length})
        </button>

        <button
          onClick={() => { setActiveTab('products'); setSearchTerm(''); setSelectedCategory(''); }}
          style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'products' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'products' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'products' ? 700 : 500, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Package size={15} /> Productos Terminados ({stockItems.length})
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'movements' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === 'movements' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'movements' ? 700 : 500, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <History size={15} /> Kardex de Movimientos
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          style={{
            padding: '8px 16px', background: 'none', border: 'none',
            borderBottom: activeTab === 'alerts' ? '2px solid var(--accent-danger)' : '2px solid transparent',
            color: activeTab === 'alerts' ? 'var(--accent-danger)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'alerts' ? 700 : 500, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <AlertTriangle size={15} /> Alertas de Reorden ({criticalSuppliesCount + criticalProductsCount})
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      {(activeTab === 'supplies' || activeTab === 'products') && (
        <Card style={{ padding: '10px 14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <Input
                placeholder={`Buscar en ${activeTab === 'supplies' ? 'insumos' : 'productos'} por nombre o código...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', marginBottom: 0, fontSize: '12px' }}
              />
            </div>

            {activeTab === 'products' && (
              <div style={{ width: '220px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)', fontSize: '12px'
                  }}
                >
                  <option value="">Todas las Categorías ({categories.length})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* PESTAÑA 1: INSUMOS */}
      {activeTab === 'supplies' && (
        <div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 14px' }}>#</th>
                    <th style={{ padding: '10px 14px' }}>Insumo</th>
                    <th style={{ padding: '10px 14px' }}>Categoría</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Stock Actual</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Mín / Ideal</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Costo Unitario</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Valor Total</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay insumos registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSupplies.map((s, idx) => {
                      const isLow = s.current_stock <= s.min_stock;
                      const isOut = s.current_stock <= 0;
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            #{s.business_relative_id || (idx + 1)}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {s.name}
                            {s.sku && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SKU: {s.sku}</div>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Badge variant="secondary" style={{ fontSize: '10px' }}>{s.category}</Badge>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: isOut ? 'var(--accent-danger)' : (isLow ? '#f59e0b' : 'var(--text-primary)') }}>
                            {s.current_stock} {s.unit_of_measure}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {s.min_stock} / {s.ideal_stock}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {formatCOP(s.cost_price)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                            {formatCOP(s.current_stock * s.cost_price)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {isOut ? (
                              <Badge variant="danger" style={{ fontSize: '10px' }}>AGOTADO</Badge>
                            ) : isLow ? (
                              <Badge variant="warning" style={{ fontSize: '10px' }}>BAJO</Badge>
                            ) : (
                              <Badge variant="success" style={{ fontSize: '10px' }}>ÓPTIMO</Badge>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <Button size="sm" variant="secondary" onClick={() => handleOpenSupplyAdjust(s)} icon={<SlidersHorizontal size={12} />}>
                              Ajustar
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 2: PRODUCTOS TERMINADOS */}
      {activeTab === 'products' && (
        <div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 14px' }}># ID</th>
                    <th style={{ padding: '10px 14px' }}>Producto Terminado</th>
                    <th style={{ padding: '10px 14px' }}>Categoría</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Stock Actual</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Mínimo</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Costo Unitario</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Precio Venta</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Valor Total</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay productos registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const isLow = p.quantity <= p.min_stock;
                      const isOut = p.quantity <= 0;
                      const stockVal = Math.max(0, p.quantity) * (p.cost_price || 0);

                      return (
                        <tr key={p.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                            #{p.business_relative_id || (idx + 1)}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {p.name}
                            {p.sku && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Badge variant="secondary" style={{ fontSize: '10px' }}>{p.category_name || 'General'}</Badge>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: isOut ? 'var(--accent-danger)' : (isLow ? '#f59e0b' : 'var(--text-primary)') }}>
                            {p.quantity} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.unit_of_measure || 'und'}</span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>
                            {p.min_stock || 0}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {formatCOP(p.cost_price || 0)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
                            {formatCOP(p.price || 0)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                            {formatCOP(stockVal)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {isOut ? (
                              <Badge variant="danger" style={{ fontSize: '10px' }}>AGOTADO</Badge>
                            ) : isLow ? (
                              <Badge variant="warning" style={{ fontSize: '10px' }}>BAJO</Badge>
                            ) : (
                              <Badge variant="success" style={{ fontSize: '10px' }}>ÓPTIMO</Badge>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <Button size="sm" variant="secondary" onClick={() => handleOpenAdjust(p)} icon={<SlidersHorizontal size={12} />}>
                              Ajustar
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 3: KARDEX */}
      {activeTab === 'movements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Kardex Insumos */}
          <Card header="Movimientos Recientes de Insumos (Materias Primas)">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px 8px' }}>Fecha</th>
                    <th style={{ padding: '6px 8px' }}>Insumo</th>
                    <th style={{ padding: '6px 8px' }}>Tipo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cant</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliesMovements.slice(0, 30).map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{m.supply_name}</td>
                      <td style={{ padding: '6px 8px', textTransform: 'capitalize' }}>
                        {m.movement_type.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: m.movement_type.includes('salida') || m.movement_type === 'merma' ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>{m.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Kardex Productos */}
          <Card header="Movimientos de Productos Terminados">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px 8px' }}>Fecha</th>
                    <th style={{ padding: '6px 8px' }}>Producto</th>
                    <th style={{ padding: '6px 8px' }}>Tipo</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cant</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 30).map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{m.product_name}</td>
                      <td style={{ padding: '6px 8px', textTransform: 'capitalize' }}>
                        {m.movement_type}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: m.quantity < 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>{m.balance_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PESTAÑA 4: ALERTAS */}
      {activeTab === 'alerts' && (
        <Card header="Alertas de Reorden & Stock Crítico">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Insumos con bajo stock */}
            {suppliesList.filter(s => s.current_stock <= s.min_stock).map(s => (
              <div key={`sup-${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} /> Insumo: {s.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Stock Actual: <strong>{s.current_stock} {s.unit_of_measure}</strong> | Mínimo Requerido: <strong>{s.min_stock} {s.unit_of_measure}</strong> | Sugerido a comprar: <strong>{Math.max(0, s.ideal_stock - s.current_stock)} {s.unit_of_measure}</strong>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleOpenSupplyAdjust(s)}>
                  Reponer Insumo
                </Button>
              </div>
            ))}

            {/* Productos con bajo stock */}
            {stockItems.filter(p => p.quantity <= p.min_stock).map((p, idx) => (
              <div key={`prod-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px 14px', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={15} /> Producto: {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Stock Actual: <strong>{p.quantity} {p.unit_of_measure || 'und'}</strong> | Mínimo: <strong>{p.min_stock} {p.unit_of_measure || 'und'}</strong>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleOpenAdjust(p)}>
                  Ajustar Stock
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Ajuste Insumo */}
      <Modal
        isOpen={supplyAdjustModalOpen}
        onClose={() => setSupplyAdjustModalOpen(false)}
        title={`Ajuste de Insumo: ${selectedSupply?.name || ''}`}
      >
        <form onSubmit={handleSubmitSupplyAdjust}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Tipo de Movimiento</label>
            <select
              value={supplyAdjustType}
              onChange={(e) => setSupplyAdjustType(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              <option value="ajuste">Ajuste Físico (Establecer stock exacto)</option>
              <option value="entrada_compra">Entrada / Compra (+)</option>
              <option value="merma">Merma / Desperdicio (-)</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <Input
              label={`Cantidad (${selectedSupply?.unit_of_measure})`}
              type="number"
              step="any"
              min="0"
              value={supplyAdjustQty}
              onChange={(e) => setSupplyAdjustQty(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <Input
              label="Notas / Motivo"
              value={supplyAdjustNotes}
              onChange={(e) => setSupplyAdjustNotes(e.target.value)}
              placeholder="Ej. Ajuste por inventario físico mensual"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setSupplyAdjustModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Guardar Ajuste</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Producto */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Ajuste de Producto: ${selectedProduct?.name || ''}`}
      >
        <form onSubmit={handleSubmitAdjust}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Acción</label>
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px' }}
            >
              <option value="set">Establecer Stock Fijo (=)</option>
              <option value="add">Sumar al Stock (+)</option>
              <option value="subtract">Restar del Stock (-)</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <Input
              label="Cantidad"
              type="number"
              step="any"
              min="0"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <Input
              label="Notas"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="Ej. Ajuste manual de producto"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setAdjustModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
