// src/pages/SuppliesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes, Plus, Search, Edit2, Trash2, SlidersHorizontal,
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Package,
  Layers, DollarSign, ArrowDownRight, ArrowUpRight, History, Tag,
  FolderPlus, RotateCcw, X, XCircle, ChevronDown, ChevronRight, Filter
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const SuppliesPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [supplies, setSupplies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros Avanzados de Insumos
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all' | 'critical' | 'low' | 'optimal' | 'overstock'
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stock_asc'); // 'stock_asc' | 'stock_desc' | 'name_asc' | 'name_desc' | 'cost_desc' | 'cost_asc' | 'total_val_desc'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modales Insumos
  const [supplyModalOpen, setSupplyModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [selectedSupplyForAction, setSelectedSupplyForAction] = useState(null);
  const [supplyMovements, setSupplyMovements] = useState([]);

  // Modal Categorías de Insumos
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [savingCategory, setSavingCategory] = useState(false);

  // Form Insumo
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('kg');
  const [costPrice, setCostPrice] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [idealStock, setIdealStock] = useState('20');
  const [initialStock, setInitialStock] = useState('0');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');

  // Form Ajuste
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('ajuste');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustUnitCost, setAdjustUnitCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const unitsList = [
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'g', label: 'Gramo (g)' },
    { value: 'lt', label: 'Litro (lt)' },
    { value: 'ml', label: 'Mililitro (ml)' },
    { value: 'unidad', label: 'Unidad (und)' },
    { value: 'oz', label: 'Onza (oz)' },
    { value: 'lb', label: 'Libra (lb)' },
    { value: 'paquete', label: 'Paquete' },
    { value: 'porcion', label: 'Porción' }
  ];

  const colorOptions = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppliesRes, categoriesRes, suppliersRes] = await Promise.all([
        api.get('/supplies'),
        api.get('/supply-categories'),
        api.get('/suppliers')
      ]);
      setSupplies(suppliesRes || []);
      setCategories(categoriesRes || []);
      setSuppliers(suppliersRes || []);

      if (categoriesRes && categoriesRes.length > 0 && !categoryId) {
        setCategoryId(categoriesRes[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar insumos:', err);
      addToast('Error al cargar catálogo de insumos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- GESTIÓN DE INSUMOS ---
  const handleOpenCreateModal = () => {
    setEditingSupply(null);
    setName('');
    setSku('');
    setBarcode('');
    setCategoryId(categories[0]?.id?.toString() || '');
    setUnitOfMeasure('kg');
    setCostPrice('');
    setMinStock('5');
    setIdealStock('20');
    setInitialStock('0');
    setSupplierId('');
    setDescription('');
    setSupplyModalOpen(true);
  };

  const handleOpenEditModal = (sup) => {
    setEditingSupply(sup);
    setName(sup.name || '');
    setSku(sup.sku || '');
    setBarcode(sup.barcode || '');
    setCategoryId(sup.category_id?.toString() || (categories.find(c => c.name === sup.category)?.id?.toString() || ''));
    setUnitOfMeasure(sup.unit_of_measure || 'kg');
    setCostPrice(sup.cost_price?.toString() || '');
    setMinStock(sup.min_stock?.toString() || '5');
    setIdealStock(sup.ideal_stock?.toString() || '20');
    setInitialStock('0');
    setSupplierId(sup.supplier_id?.toString() || '');
    setDescription(sup.description || '');
    setSupplyModalOpen(true);
  };

  const handleSaveSupply = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('El nombre del insumo es obligatorio', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCat = categories.find(c => c.id.toString() === categoryId.toString());

      const payload = {
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        barcode: barcode ? barcode.trim() : null,
        category: selectedCat ? selectedCat.name : 'General',
        category_id: categoryId ? parseInt(categoryId, 10) : null,
        unit_of_measure: unitOfMeasure,
        cost_price: parseFloat(costPrice) || 0,
        min_stock: parseFloat(minStock) || 0,
        ideal_stock: parseFloat(idealStock) || 0,
        supplier_id: supplierId ? parseInt(supplierId, 10) : null,
        description: description ? description.trim() : null,
        initial_stock: parseFloat(initialStock) || 0
      };

      if (editingSupply) {
        await api.put(`/supplies/${editingSupply.id}`, payload);
        addToast('Insumo actualizado exitosamente', 'success');
      } else {
        await api.post('/supplies', payload);
        addToast('Insumo registrado exitosamente', 'success');
      }

      setSupplyModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar insumo', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupply = async (sup) => {
    if (!window.confirm(`¿Estás seguro de eliminar o desactivar el insumo "${sup.name}"?`)) return;
    try {
      const res = await api.delete(`/supplies/${sup.id}`);
      addToast(res.message || 'Insumo eliminado', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al eliminar insumo', 'danger');
    }
  };

  // --- GESTIÓN DE CATEGORÍAS DE INSUMOS ---
  const handleOpenCategoriesModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setCatColor('#3b82f6');
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || '');
    setCatColor(cat.color || '#3b82f6');
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setCatColor('#3b82f6');
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) {
      addToast('El nombre de la categoría es obligatorio', 'warning');
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await api.put(`/supply-categories/${editingCategory.id}`, {
          name: catName.trim(),
          description: catDescription.trim(),
          color: catColor
        });
        addToast('Categoría de insumo actualizada', 'success');
      } else {
        await api.post('/supply-categories', {
          name: catName.trim(),
          description: catDescription.trim(),
          color: catColor
        });
        addToast('Categoría de insumo creada exitosamente', 'success');
      }

      handleCancelEditCategory();
      const updatedCats = await api.get('/supply-categories');
      setCategories(updatedCats || []);
      const updatedSupplies = await api.get('/supplies');
      setSupplies(updatedSupplies || []);
    } catch (err) {
      addToast(err.message || 'Error al guardar categoría', 'danger');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"? Los insumos vinculados pasarán a categoría General.`)) return;
    try {
      await api.delete(`/supply-categories/${cat.id}`);
      addToast('Categoría de insumo eliminada', 'success');
      const updatedCats = await api.get('/supply-categories');
      setCategories(updatedCats || []);
      const updatedSupplies = await api.get('/supplies');
      setSupplies(updatedSupplies || []);
    } catch (err) {
      addToast(err.message || 'Error al eliminar categoría', 'danger');
    }
  };

  // --- AJUSTES Y KARDEX ---
  const handleOpenAdjustModal = (sup) => {
    setSelectedSupplyForAction(sup);
    setAdjustQty(sup.current_stock?.toString() || '0');
    setAdjustType('ajuste');
    setAdjustNotes('');
    setAdjustUnitCost(sup.cost_price?.toString() || '0');
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustQty || isNaN(parseFloat(adjustQty))) {
      addToast('Ingresa una cantidad válida', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/supplies/${selectedSupplyForAction.id}/adjust`, {
        quantity: parseFloat(adjustQty),
        movement_type: adjustType,
        notes: adjustNotes,
        unit_cost: parseFloat(adjustUnitCost) || undefined
      });
      addToast('Inventario de insumo actualizado exitosamente', 'success');
      setAdjustModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al ajustar inventario', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (sup) => {
    setSelectedSupplyForAction(sup);
    try {
      const res = await api.get(`/supplies/movements?supply_id=${sup.id}&limit=50`);
      setSupplyMovements(res || []);
      setHistoryModalOpen(true);
    } catch (err) {
      addToast('Error al consultar historial del insumo', 'danger');
    }
  };

  // Conteo de insumos por categoría
  const categoryCounts = useMemo(() => {
    const counts = { all: supplies.length };
    categories.forEach(c => { counts[c.name] = 0; });
    supplies.forEach(s => {
      const cat = s.category || 'General';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts[cat] = 1;
    });
    return counts;
  }, [supplies, categories]);

  // Conteo de estados de stock (Semáforo de inventario)
  const stockCounts = useMemo(() => {
    let critical = 0;
    let low = 0;
    let optimal = 0;
    let overstock = 0;

    supplies.forEach(s => {
      const stock = parseFloat(s.current_stock || 0);
      const min = parseFloat(s.min_stock || 0);
      const ideal = parseFloat(s.ideal_stock || min * 3 || 20);

      if (stock <= 0) critical++;
      else if (stock <= min) low++;
      else if (stock <= ideal) optimal++;
      else overstock++;
    });

    return { all: supplies.length, critical, low, optimal, overstock };
  }, [supplies]);

  // Conteo de filtros activos en insumos
  const activeSuppliesFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory && selectedCategory !== 'all') count++;
    if (stockStatusFilter !== 'all') count++;
    if (supplierFilter !== 'all') count++;
    if (unitFilter !== 'all') count++;
    if (sortBy !== 'stock_asc') count++;
    return count;
  }, [selectedCategory, stockStatusFilter, supplierFilter, unitFilter, sortBy]);

  // Filtrado y Ordenamiento de Insumos
  const filteredSupplies = useMemo(() => {
    const result = supplies.filter(s => {
      // 1. Buscador Omnibox
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesSearch = (s.name || '').toLowerCase().includes(q) ||
          (s.sku && s.sku.toLowerCase().includes(q)) ||
          (s.barcode && s.barcode.includes(q)) ||
          (s.category && s.category.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Categoría
      if (selectedCategory && selectedCategory !== 'all') {
        if ((s.category || 'General') !== selectedCategory) return false;
      }

      // 3. Estado de Stock
      const stock = parseFloat(s.current_stock || 0);
      const min = parseFloat(s.min_stock || 0);
      const ideal = parseFloat(s.ideal_stock || min * 3 || 20);

      if (stockStatusFilter === 'critical' && stock > 0) return false;
      if (stockStatusFilter === 'low' && (stock <= 0 || stock > min)) return false;
      if (stockStatusFilter === 'optimal' && (stock <= min || stock > ideal)) return false;
      if (stockStatusFilter === 'overstock' && stock <= ideal) return false;

      // 4. Proveedor
      if (supplierFilter !== 'all') {
        if (s.supplier_id?.toString() !== supplierFilter.toString()) return false;
      }

      // 5. Unidad de Medida
      if (unitFilter !== 'all') {
        if ((s.unit_of_measure || '').toLowerCase() !== unitFilter.toLowerCase()) return false;
      }

      return true;
    });

    // Ordenamiento
    result.sort((a, b) => {
      const stockA = parseFloat(a.current_stock || 0);
      const stockB = parseFloat(b.current_stock || 0);
      const costA = parseFloat(a.cost_price || 0);
      const costB = parseFloat(b.cost_price || 0);
      const valA = stockA * costA;
      const valB = stockB * costB;

      if (sortBy === 'stock_desc') return stockB - stockA;
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'cost_desc') return costB - costA;
      if (sortBy === 'cost_asc') return costA - costB;
      if (sortBy === 'total_val_desc') return valB - valA;
      return stockA - stockB; // stock_asc por defecto (priorizar compras)
    });

    return result;
  }, [supplies, search, selectedCategory, stockStatusFilter, supplierFilter, unitFilter, sortBy]);

  // Métricas
  const totalSupplies = supplies.length;
  const lowStockCount = supplies.filter(s => s.current_stock <= s.min_stock).length;
  const totalValue = supplies.reduce((sum, s) => sum + (s.current_stock * s.cost_price), 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header & Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Boxes size={24} color="var(--accent-primary)" /> Gestión de Insumos & Materias Primas
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Control de ingredientes, materias primas, empaques y sus categorías personalizables.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" icon={<Tag size={15} />} onClick={handleOpenCategoriesModal}>
            Categorías de Insumos ({categories.length})
          </Button>
          <Button icon={<Plus size={16} />} onClick={handleOpenCreateModal}>
            Nuevo Insumo
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL INSUMOS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSupplies}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>en {categories.length} categorías</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Package size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>STOCK CRÍTICO / BAJO</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: lowStockCount > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                {lowStockCount}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Requieren compra</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: lowStockCount > 0 ? '#ef4444' : '#10b981' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </Card>

        <Card style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>VALORIZACIÓN INVENTARIO</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {formatCOP(totalValue)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Costo total en almacén</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <DollarSign size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de Filtros Avanzados de Insumos */}
      <Card style={{ padding: '14px 16px', marginBottom: '14px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {/* Fila 1: Buscador Omnibox + Ordenamiento + Botón Filtros Avanzados */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: search ? 'var(--accent-primary)' : 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, código SKU, código de barras o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 34px 9px 36px',
                background: 'var(--bg-primary)',
                border: search ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxShadow: search ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                transition: 'all 0.2s'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
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
                border: sortBy !== 'stock_asc' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: sortBy !== 'stock_asc' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-primary)',
                color: sortBy !== 'stock_asc' ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="stock_asc">🚨 Stock: Menor a Mayor (Reabastecer)</option>
              <option value="stock_desc">📦 Stock: Mayor a Menor</option>
              <option value="name_asc">🔤 Nombre (A - Z)</option>
              <option value="name_desc">🔤 Nombre (Z - A)</option>
              <option value="cost_desc">💰 Costo: Mayor a Menor</option>
              <option value="cost_asc">💰 Costo: Menor a Mayor</option>
              <option value="total_val_desc">💎 Mayor Valor Total en Bodega</option>
            </select>
          </div>

          {/* Botón Filtros Avanzados */}
          <Button
            type="button"
            size="sm"
            variant={showAdvancedFilters || activeSuppliesFiltersCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowAdvancedFilters(prev => !prev)}
            icon={<SlidersHorizontal size={13} />}
            style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
          >
            Filtros
            {activeSuppliesFiltersCount > 0 && (
              <span style={{
                marginLeft: '4px',
                padding: '1px 5px',
                borderRadius: '8px',
                background: showAdvancedFilters || activeSuppliesFiltersCount > 0 ? '#fff' : 'var(--accent-primary)',
                color: showAdvancedFilters || activeSuppliesFiltersCount > 0 ? 'var(--accent-primary)' : '#fff',
                fontSize: '10px',
                fontWeight: 900
              }}>
                {activeSuppliesFiltersCount}
              </span>
            )}
            <ChevronDown size={13} style={{ marginLeft: '4px', transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </Button>
        </div>

        {/* Fila 2: Chips de Categorías de Insumos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', padding: '4px 0 8px 0', scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '11.5px',
              fontWeight: selectedCategory === 'all' ? 800 : 500,
              border: selectedCategory === 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: selectedCategory === 'all' ? 'var(--accent-primary)' : 'var(--bg-primary)',
              color: selectedCategory === 'all' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: selectedCategory === 'all' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            Todas ({categoryCounts.all || 0})
          </button>
          {categories.map(c => {
            const isSelected = selectedCategory === c.name;
            const count = categoryCounts[c.name] || 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11.5px',
                  fontWeight: isSelected ? 800 : 500,
                  border: isSelected ? `1.5px solid ${c.color || 'var(--accent-primary)'}` : '1px solid var(--border-color)',
                  background: isSelected ? (c.color || 'var(--accent-primary)') : 'var(--bg-primary)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Fila 3: Semáforo de Estado de Stock */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Semáforo Stock:</span>
            {[
              { id: 'all', label: `Todos (${stockCounts.all})`, color: 'var(--text-secondary)', bg: 'var(--bg-primary)', border: 'var(--border-color)' },
              { id: 'critical', label: `🔴 Agotado (${stockCounts.critical})`, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444' },
              { id: 'low', label: `🟡 Bajo / Reorden (${stockCounts.low})`, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b' },
              { id: 'optimal', label: `🟢 Óptimo (${stockCounts.optimal})`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981' },
              { id: 'overstock', label: `🔵 Sobre-stock (${stockCounts.overstock})`, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6' },
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStockStatusFilter(st.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: stockStatusFilter === st.id ? 800 : 500,
                  border: stockStatusFilter === st.id ? `1.5px solid ${st.border}` : '1px solid var(--border-color)',
                  background: stockStatusFilter === st.id ? st.bg : 'var(--bg-primary)',
                  color: stockStatusFilter === st.id ? st.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          <Badge variant="info" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>
            {filteredSupplies.length} {filteredSupplies.length === 1 ? 'insumo' : 'insumos'}
          </Badge>
        </div>

        {/* Fila 4: Panel Desplegable de Filtros Avanzados */}
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
            {/* Filtro: Proveedor */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Proveedor Asignado
              </label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: supplierFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="all">Todos los Proveedores</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>🏢 {sup.name}</option>
                ))}
              </select>
            </div>

            {/* Filtro: Unidad de Medida */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Unidad de Medida
              </label>
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: unitFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="all">Todas las Unidades</option>
                {unitsList.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Fila 5: Pills de Filtros Activos y Limpieza */}
        {(search || (selectedCategory && selectedCategory !== 'all') || stockStatusFilter !== 'all' || supplierFilter !== 'all' || unitFilter !== 'all' || sortBy !== 'stock_asc') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtros Activos:</span>

              {search && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  "{search}"
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
                </span>
              )}

              {selectedCategory && selectedCategory !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Cat: {selectedCategory}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('all')} />
                </span>
              )}

              {stockStatusFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                  Stock: {stockStatusFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setStockStatusFilter('all')} />
                </span>
              )}

              {supplierFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', fontSize: '11px', fontWeight: 700 }}>
                  Proveedor: {suppliers.find(s => s.id.toString() === supplierFilter.toString())?.name || supplierFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSupplierFilter('all')} />
                </span>
              )}

              {unitFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', fontSize: '11px', fontWeight: 700 }}>
                  Unidad: {unitFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setUnitFilter('all')} />
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setStockStatusFilter('all');
                setSupplierFilter('all');
                setUnitFilter('all');
                setSortBy('stock_asc');
              }}
              icon={<RotateCcw size={12} />}
              style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700, color: 'var(--accent-danger)' }}
            >
              Limpiar Filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Tabla de Insumos */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px', width: '60px' }}># ID</th>
                <th style={{ padding: '10px 14px' }}>Insumo / Materia Prima</th>
                <th style={{ padding: '10px 14px' }}>Categoría</th>
                <th style={{ padding: '10px 14px' }}>U. Medida</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Stock Actual</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Mín / Ideal</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Costo Unitario</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Valor Total</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', width: '130px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando catálogo de insumos...
                  </td>
                </tr>
              ) : filteredSupplies.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron insumos registrados.
                  </td>
                </tr>
              ) : (
                filteredSupplies.map((s) => {
                  const isLow = s.current_stock <= s.min_stock;
                  const isOut = s.current_stock <= 0;
                  const stockValue = s.current_stock * s.cost_price;

                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        #{s.business_relative_id}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                        {s.sku && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SKU: {s.sku}</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600,
                          background: s.category_color ? `${s.category_color}18` : 'var(--bg-elevated)',
                          color: s.category_color || 'var(--text-primary)',
                          border: `1px solid ${s.category_color || 'var(--border-color)'}30`
                        }}>
                          {s.category}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-secondary)' }}>
                        {s.unit_of_measure}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: isOut ? 'var(--accent-danger)' : (isLow ? '#f59e0b' : 'var(--text-primary)') }}>
                        {s.current_stock} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{s.unit_of_measure}</span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '11px' }}>
                        {s.min_stock} / {s.ideal_stock}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCOP(s.cost_price)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {formatCOP(stockValue)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {isOut ? (
                          <Badge variant="danger" style={{ fontSize: '10px' }}>AGOTADO</Badge>
                        ) : isLow ? (
                          <Badge variant="warning" style={{ fontSize: '10px' }}>STOCK BAJO</Badge>
                        ) : (
                          <Badge variant="success" style={{ fontSize: '10px' }}>ÓPTIMO</Badge>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            style={{ padding: '4px 6px' }}
                            title="Ajustar Stock"
                            onClick={() => handleOpenAdjustModal(s)}
                          >
                            <SlidersHorizontal size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            style={{ padding: '4px 6px' }}
                            title="Historial / Kardex"
                            onClick={() => handleOpenHistoryModal(s)}
                          >
                            <History size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            style={{ padding: '4px 6px' }}
                            title="Editar Insumo"
                            onClick={() => handleOpenEditModal(s)}
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            style={{ padding: '4px 6px', color: 'var(--accent-danger)' }}
                            title="Eliminar"
                            onClick={() => handleDeleteSupply(s)}
                          >
                            <Trash2 size={13} />
                          </Button>
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

      {/* Modal Gestión de Categorías de Insumos */}
      <Modal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title="Gestión de Categorías de Insumos & Materias Primas"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Formulario Crear / Editar Categoría */}
          <form onSubmit={handleSaveCategory} style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderPlus size={14} /> {editingCategory ? `Editar Categoría #${editingCategory.business_relative_id}` : 'Crear Nueva Categoría de Insumo'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', marginBottom: '8px' }}>
              <Input
                label="Nombre de la Categoría"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ej. Frutas & Pulpas, Licores..."
                required
                style={{ marginBottom: 0 }}
              />
              <Input
                label="Descripción (Opcional)"
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Ej. Ingredientes de bar"
                style={{ marginBottom: 0 }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Color Identificador</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {colorOptions.map(c => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCatColor(c)}
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%', background: c,
                      border: catColor === c ? '2px solid #ffffff' : '1px solid transparent',
                      cursor: 'pointer', outline: catColor === c ? `2px solid ${c}` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              {editingCategory && (
                <Button type="button" size="sm" variant="ghost" onClick={handleCancelEditCategory}>
                  Cancelar Edición
                </Button>
              )}
              <Button type="submit" size="sm" loading={savingCategory} icon={<CheckCircle size={13} />}>
                {editingCategory ? 'Guardar Cambios' : 'Agregar Categoría'}
              </Button>
            </div>
          </form>

          {/* Lista de Categorías Existentes */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Categorías Registradas ({categories.length})
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: '4px',
                    border: '1px solid var(--border-color)', fontSize: '11.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color || '#3b82f6' }} />
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cat.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({cat.supplies_count || 0} insumos)
                      </span>
                      {cat.description && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{cat.description}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button size="sm" variant="ghost" style={{ padding: '3px 6px' }} onClick={() => handleEditCategory(cat)}>
                      <Edit2 size={12} />
                    </Button>
                    <Button size="sm" variant="ghost" style={{ padding: '3px 6px', color: 'var(--accent-danger)' }} onClick={() => handleDeleteCategory(cat)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Crear / Editar Insumo */}
      <Modal
        isOpen={supplyModalOpen}
        onClose={() => setSupplyModalOpen(false)}
        title={editingSupply ? `Editar Insumo #${editingSupply.business_relative_id}` : 'Registrar Nuevo Insumo / Materia Prima'}
      >
        <form onSubmit={handleSaveSupply}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label="Nombre del Insumo / Ingrediente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Carne de Res Molida 80/20"
              required
            />
            <Input
              label="Código / SKU Interno"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Ej. INS-CRN01"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Categoría de Insumo
                </label>
                <button
                  type="button"
                  onClick={handleOpenCategoriesModal}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Gestionar Categorías
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '12px'
                }}
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                Unidad de Medida
              </label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                style={{
                  width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)', fontSize: '12px'
                }}
              >
                {unitsList.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
            <Input
              label={`Costo Unitario ($/${unitOfMeasure})`}
              type="number"
              min="0"
              step="any"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0"
            />
            <Input
              label={`Stock Mínimo (${unitOfMeasure})`}
              type="number"
              min="0"
              step="any"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="5"
            />
            <Input
              label={`Stock Ideal (${unitOfMeasure})`}
              type="number"
              min="0"
              step="any"
              value={idealStock}
              onChange={(e) => setIdealStock(e.target.value)}
              placeholder="20"
            />
          </div>

          {!editingSupply && (
            <div style={{ marginBottom: '10px' }}>
              <Input
                label={`Inventario Inicial en Sucursal (${unitOfMeasure})`}
                type="number"
                min="0"
                step="any"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Proveedor Habitual (Opcional)
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '12px'
              }}
            >
              <option value="">Ninguno / Proveedor Ocasional</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name} ({sup.contact_name || 'Sin contacto'})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <Input
              label="Notas o Especificaciones Técnicas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Rendimiento 85%, almacenar refrigerado a 4°C"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setSupplyModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Guardar Insumo</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Rápido de Stock */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Ajustar Stock: ${selectedSupplyForAction?.name || ''}`}
      >
        <form onSubmit={handleSaveAdjustment}>
          <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Stock Actual:</span>
              <strong>{selectedSupplyForAction?.current_stock} {selectedSupplyForAction?.unit_of_measure}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Costo Unitario Registrado:</span>
              <strong>{formatCOP(selectedSupplyForAction?.cost_price)}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>
              Tipo de Movimiento
            </label>
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontSize: '12px'
              }}
            >
              <option value="ajuste">Ajuste Físico (Establecer stock exacto)</option>
              <option value="entrada_compra">Entrada / Ingreso por Compra (+)</option>
              <option value="merma">Merma / Desperdicio / Vencimiento (-)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <Input
              label={`Cantidad (${selectedSupplyForAction?.unit_of_measure})`}
              type="number"
              step="any"
              min="0"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              required
            />
            <Input
              label="Costo Unitario ($)"
              type="number"
              step="any"
              min="0"
              value={adjustUnitCost}
              onChange={(e) => setAdjustUnitCost(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <Input
              label="Motivo / Observaciones"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="Ej. Conteo físico semanal, recepción de factura..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setAdjustModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Confirmar Ajuste</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Historial / Kardex */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Kardex de Movimientos: ${selectedSupplyForAction?.name || ''}`}
      >
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          {supplyMovements.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '12px' }}>
              No hay movimientos registrados para este insumo.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px 8px' }}>Fecha</th>
                  <th style={{ padding: '6px 8px' }}>Tipo</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cantidad</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Balance</th>
                  <th style={{ padding: '6px 8px' }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {supplyMovements.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>
                      {new Date(m.created_at).toLocaleString('es-CO')}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {m.movement_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: m.movement_type.includes('salida') || m.movement_type === 'merma' ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                      {parseFloat(m.quantity) > 0 ? `+${parseFloat(m.quantity).toFixed(1)}` : parseFloat(m.quantity).toFixed(1)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800 }}>
                      {parseFloat(m.balance_after).toFixed(1)}
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                      {m.notes || '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button variant="ghost" onClick={() => setHistoryModalOpen(false)}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  );
};
