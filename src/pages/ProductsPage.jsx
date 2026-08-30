import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Upload, Image as ImageIcon,
  Layers, Package, Search, DollarSign, Barcode, Tag,
  FileJson, Download, CheckCircle2, AlertCircle, RefreshCw, FileText, Sparkles, Star,
  SlidersHorizontal, ChevronDown, X, XCircle, RotateCcw, Filter, Check, Handshake
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ProductModifiersConfigModal } from '../components/ProductModifiersConfigModal';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const ProductsPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('productos'); // 'productos' | 'categorias'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Productos
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all' | 'available' | 'out_of_stock'
  const [inventoryFilter, setInventoryFilter] = useState('all'); // 'all' | 'tracked' | 'low_stock' | 'untracked'
  const [taxFilter, setTaxFilter] = useState('all'); // 'all' | 'exempt' | 'impoconsumo' | 'iva'
  const [originFilter, setOriginFilter] = useState('all'); // 'all' | 'own' | 'third_party'
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'newest'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [modifyingProduct, setModifyingProduct] = useState(null);
  const [suppliesList, setSuppliesList] = useState([]);

  // Form states para producto
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('0');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('unidad');
  const [trackInventory, setTrackInventory] = useState(true);
  const [minStock, setMinStock] = useState('5');
  const [taxRate, setTaxRate] = useState('0'); // '0', '0.08', '0.19'
  const [taxIncluded, setTaxIncluded] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showInOrderStats, setShowInOrderStats] = useState(false);
  const [isThirdParty, setIsThirdParty] = useState(false);

  // Form states para categoría
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('0');

  // Modal Importación JSON masiva
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importUpdateExisting, setImportUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importValidation, setImportValidation] = useState(null); // { isValid, prodCount, catCount, error }
  const jsonFileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prods, cats, sups] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/supplies').catch(() => [])
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setSuppliesList(Array.isArray(sups) ? sups : []);
      if (cats && cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
      addToast('Error al cargar catálogo de productos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PRODUCTOS ---
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCostPrice('0');
    setSku('');
    setBarcode('');
    setUnitOfMeasure('unidad');
    setTrackInventory(true);
    setMinStock('5');
    setTaxRate('0');
    setTaxIncluded(1);
    setDescription('');
    setImageUrl('');
    setShowInOrderStats(false);
    setIsThirdParty(false);
    if (categories.length > 0) setCategoryId(categories[0].id.toString());
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(Math.round(parseFloat(prod.price || 0)).toString());
    setCostPrice(parseFloat(prod.cost_price || 0).toString());
    setSku(prod.sku || '');
    setBarcode(prod.barcode || '');
    setUnitOfMeasure(prod.unit_of_measure || 'unidad');
    setTrackInventory(Boolean(prod.track_inventory));
    setMinStock(parseFloat(prod.min_stock || 5).toString());
    setTaxRate(parseFloat(prod.tax_rate ?? 0).toString());
    setTaxIncluded(prod.tax_included ? 1 : 0);
    setDescription(prod.description || '');
    setImageUrl(prod.image_url || '');
    setShowInOrderStats(Boolean(prod.show_in_order_stats));
    setIsThirdParty(Boolean(prod.is_third_party));
    setCategoryId(prod.category_id ? prod.category_id.toString() : (categories[0]?.id?.toString() || ''));
    setIsProductModalOpen(true);
  };

  const handleToggleOrderStats = async (prod) => {
    try {
      const newVal = !prod.show_in_order_stats;
      await api.put(`/products/${prod.id}`, { show_in_order_stats: newVal });
      addToast(newVal ? `⭐ "${prod.name}" ahora se destacará en estadísticas de órdenes` : `"${prod.name}" ya no se destacará en estadísticas`, 'info');
      fetchData();
    } catch (err) {
      addToast('Error al actualizar destaque del producto', 'danger');
    }
  };

  const handleOpenModifiers = (prod) => {
    setModifyingProduct(prod);
    setIsModifiersModalOpen(true);
  };

  const handleProductImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.post('/upload', {
          filename: file.name,
          base64: reader.result
        });
        setImageUrl(res.url);
        addToast('Imagen subida con éxito', 'success');
      } catch (err) {
        addToast('Error al subir la imagen del producto', 'danger');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !price || !categoryId) {
      addToast('Nombre, precio y categoría son obligatorios', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        price: parseFloat(price),
        cost_price: parseFloat(costPrice) || 0,
        sku: sku || undefined,
        barcode: barcode || undefined,
        unit_of_measure: unitOfMeasure || 'unidad',
        track_inventory: Boolean(trackInventory),
        min_stock: parseFloat(minStock) || 0,
        tax_rate: parseFloat(taxRate),
        tax_included: Boolean(parseInt(taxIncluded, 10)),
        category_id: parseInt(categoryId, 10),
        description: description || undefined,
        image_url: imageUrl || undefined,
        show_in_order_stats: Boolean(showInOrderStats),
        is_third_party: Boolean(isThirdParty)
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        addToast('Producto actualizado exitosamente', 'success');
      } else {
        await api.post('/products', payload);
        addToast('Producto creado exitosamente', 'success');
      }
      setIsProductModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar producto', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (prod, displayIndex) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el producto #${displayIndex} "${prod.name}"?`)) return;
    try {
      await api.delete(`/products/${prod.id}`);
      addToast(`Producto #${displayIndex} eliminado`, 'info');
      fetchData();
    } catch (err) {
      addToast('Error al eliminar producto', 'danger');
    }
  };

  // --- CATEGORÍAS ---
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setCatSortOrder(categories.length.toString());
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || '');
    setCatSortOrder((cat.sort_order || 0).toString());
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    if (e) e.preventDefault();
    if (!catName.trim()) {
      addToast('El nombre de la categoría es obligatorio', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: catName.trim(),
        description: catDescription || undefined,
        sort_order: parseInt(catSortOrder, 10) || 0
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        addToast('Categoría actualizada exitosamente', 'success');
      } else {
        await api.post('/categories', payload);
        addToast('Categoría creada exitosamente', 'success');
      }
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar categoría', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat, displayIndex) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la categoría #${displayIndex} "${cat.name}"?`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      addToast(`Categoría #${displayIndex} eliminada`, 'info');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al eliminar categoría', 'danger');
    }
  };

  // --- IMPORTACIÓN MASIVA JSON ---
  const handleOpenImportModal = () => {
    setImportJsonText('');
    setImportValidation(null);
    setIsImportModalOpen(true);
  };

  const validateJsonContent = (text) => {
    if (!text || !text.trim()) {
      setImportValidation(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      let catCount = 0;
      let prodCount = 0;

      if (Array.isArray(parsed)) {
        prodCount = parsed.length;
        const setCats = new Set(parsed.map(p => p.category_name || p.category || p.categoria || 'General'));
        catCount = setCats.size;
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.categories)) catCount = parsed.categories.length;
        if (Array.isArray(parsed.products)) prodCount = parsed.products.length;
        else if (Array.isArray(parsed.items)) prodCount = parsed.items.length;
      }

      if (prodCount === 0 && catCount === 0) {
        setImportValidation({ isValid: false, error: 'El JSON no contiene arreglos de "products" o "categories"' });
      } else {
        setImportValidation({ isValid: true, prodCount, catCount, error: null });
      }
    } catch (e) {
      setImportValidation({ isValid: false, error: `Sintaxis JSON inválida: ${e.message}` });
    }
  };

  const handleJsonTextChange = (val) => {
    setImportJsonText(val);
    validateJsonContent(val);
  };

  const handleJsonFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportJsonText(content);
        validateJsonContent(content);
        addToast(`Archivo "${file.name}" cargado exitosamente`, 'success');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleJson = () => {
    const sample = {
      categories: [
        {
          name: "Bebidas",
          description: "Bebidas frías y calientes",
          sort_order: 1
        },
        {
          name: "Platos Fuertes",
          description: "Carnes, hamburguesas y especialidades",
          sort_order: 2
        },
        {
          name: "Postres",
          description: "Helados y repostería artesanal",
          sort_order: 3
        }
      ],
      products: [
        {
          name: "Hamburguesa Especial",
          category_name: "Platos Fuertes",
          price: 28000,
          cost_price: 14000,
          sku: "HAM-ESP-01",
          barcode: "7701234567891",
          description: "Doble carne artesanal con tocineta y queso cheddar",
          unit_of_measure: "unidad",
          tax_rate: 0.08,
          tax_included: true,
          track_inventory: true,
          min_stock: 10,
          initial_stock: 50,
          is_available: true
        },
        {
          name: "Limonada de Coco",
          category_name: "Bebidas",
          price: 9500,
          cost_price: 3200,
          sku: "BEB-LIM-02",
          barcode: "7701234567892",
          description: "Limonada cremosa con leche de coco y hielo",
          unit_of_measure: "unidad",
          tax_rate: 0.08,
          tax_included: true,
          track_inventory: false,
          min_stock: 0,
          is_available: true
        },
        {
          name: "Copa de Helado Artesanal",
          category_name: "Postres",
          price: 12000,
          cost_price: 4500,
          sku: "POS-HEL-03",
          description: "3 bolas de helado artesanal con barquillo y salsa de chocolate",
          unit_of_measure: "unidad",
          tax_rate: 0.0,
          tax_included: true,
          track_inventory: false,
          min_stock: 0,
          is_available: true
        }
      ]
    };

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_catalogo_productos.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Plantilla JSON descargada con éxito', 'info');
  };

  const handleExecuteImport = async () => {
    if (!importJsonText.trim()) {
      addToast('Ingresa o carga el contenido JSON a importar', 'warning');
      return;
    }
    let parsedData;
    try {
      parsedData = JSON.parse(importJsonText);
    } catch (e) {
      addToast('Error de sintaxis en el archivo JSON', 'danger');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/products/import-json', {
        data: parsedData,
        update_existing: importUpdateExisting
      });
      addToast(res.message || 'Catálogo importado exitosamente', 'success');
      setIsImportModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al importar catálogo', 'danger');
    } finally {
      setImporting(false);
    }
  };

  const getTaxLabel = (rate) => {
    const num = parseFloat(rate);
    if (!num || num === 0) return 'Exento (0%)';
    if (num === 0.08) return 'Impoconsumo (8%)';
    if (num === 0.19) return 'IVA (19%)';
    return `${(num * 100).toFixed(0)}%`;
  };

  // Conteo de productos por categoría
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    categories.forEach(c => { counts[c.id] = 0; });
    products.forEach(p => {
      if (p.category_id && counts[p.category_id] !== undefined) {
        counts[p.category_id]++;
      }
    });
    return counts;
  }, [products, categories]);

  // Conteo de filtros activos en productos
  const activeProductsFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter && categoryFilter !== 'all') count++;
    if (availabilityFilter !== 'all') count++;
    if (inventoryFilter !== 'all') count++;
    if (taxFilter !== 'all') count++;
    if (minPriceFilter) count++;
    if (maxPriceFilter) count++;
    if (sortBy !== 'name_asc') count++;
    return count;
  }, [categoryFilter, availabilityFilter, inventoryFilter, taxFilter, minPriceFilter, maxPriceFilter, sortBy]);

  // Filtrado y Ordenamiento de Productos
  const filteredProducts = useMemo(() => {
    const result = products.filter(p => {
      // 1. Buscador Omnibox
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch = (p.name || '').toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 2. Categoría
      if (categoryFilter && categoryFilter !== 'all') {
        if (p.category_id?.toString() !== categoryFilter.toString()) return false;
      }

      // 3. Disponibilidad
      if (availabilityFilter === 'available') {
        if (p.is_available === false || p.is_available === 0) return false;
      } else if (availabilityFilter === 'out_of_stock') {
        const stock = parseFloat(p.current_stock ?? p.stock ?? 0);
        if (p.track_inventory && stock > 0) return false;
        if (!p.track_inventory && p.is_available !== false) return false;
      }

      // 4. Inventario / Stock
      if (inventoryFilter === 'tracked') {
        if (!p.track_inventory) return false;
      } else if (inventoryFilter === 'low_stock') {
        if (!p.track_inventory) return false;
        const stock = parseFloat(p.current_stock ?? p.stock ?? 0);
        const min = parseFloat(p.min_stock ?? 5);
        if (stock > min) return false;
      } else if (inventoryFilter === 'untracked') {
        if (p.track_inventory) return false;
      }

      // 5. Impuesto
      if (taxFilter !== 'all') {
        const rate = parseFloat(p.tax_rate ?? 0);
        if (taxFilter === 'exempt' && rate > 0) return false;
        if (taxFilter === 'impoconsumo' && Math.abs(rate - 0.08) > 0.005) return false;
        if (taxFilter === 'iva' && Math.abs(rate - 0.19) > 0.005) return false;
      }

      // 6. Origen (Propios vs Terceros)
      if (originFilter === 'own' && Boolean(p.is_third_party)) return false;
      if (originFilter === 'third_party' && !Boolean(p.is_third_party)) return false;

      // 7. Rango de precio
      const price = parseFloat(p.price || 0);
      if (minPriceFilter && price < parseFloat(minPriceFilter)) return false;
      if (maxPriceFilter && price > parseFloat(maxPriceFilter)) return false;

      return true;
    });

    // Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price_asc') return parseFloat(a.price || 0) - parseFloat(b.price || 0);
      if (sortBy === 'price_desc') return parseFloat(b.price || 0) - parseFloat(a.price || 0);
      if (sortBy === 'stock_asc') {
        const stockA = parseFloat(a.current_stock ?? a.stock ?? 0);
        const stockB = parseFloat(b.current_stock ?? b.stock ?? 0);
        return stockA - stockB;
      }
      if (sortBy === 'stock_desc') {
        const stockA = parseFloat(a.current_stock ?? a.stock ?? 0);
        const stockB = parseFloat(b.current_stock ?? b.stock ?? 0);
        return stockB - stockA;
      }
      if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
      return a.name.localeCompare(b.name); // name_asc por defecto
    });

    return result;
  }, [products, searchTerm, categoryFilter, availabilityFilter, inventoryFilter, taxFilter, originFilter, minPriceFilter, maxPriceFilter, sortBy]);

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => { setActiveTab('productos'); setSearchTerm(''); }}
            style={{
              padding: '6px 14px',
              background: activeTab === 'productos' ? 'var(--bg-elevated)' : 'transparent',
              border: activeTab === 'productos' ? '1px solid var(--accent-secondary)' : '1px solid transparent',
              color: activeTab === 'productos' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={15} color={activeTab === 'productos' ? 'var(--accent-secondary)' : 'inherit'} />
            Catálogo de Productos ({products.length})
          </button>
          <button
            onClick={() => { setActiveTab('categorias'); setSearchTerm(''); }}
            style={{
              padding: '6px 14px',
              background: activeTab === 'categorias' ? 'var(--bg-elevated)' : 'transparent',
              border: activeTab === 'categorias' ? '1px solid var(--accent-secondary)' : '1px solid transparent',
              color: activeTab === 'categorias' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 'var(--font-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} color={activeTab === 'categorias' ? 'var(--accent-secondary)' : 'inherit'} />
            Categorías ({categories.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleOpenImportModal}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Importar productos y categorías desde un archivo .json"
          >
            <FileJson size={15} color="var(--accent-primary)" />
            Importar JSON
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={activeTab === 'productos' ? handleOpenNewProduct : handleOpenNewCategory}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            Nuevo {activeTab === 'productos' ? 'Producto' : 'Categoría'}
          </Button>
        </div>
      </div>

      {/* Search & Advanced Filters */}
      <Card style={{ padding: '14px 16px', marginBottom: 'var(--space-4)', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {/* Fila 1: Buscador Omnibox + Ordenamiento + Botón Filtros Avanzados */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: searchTerm ? 'var(--accent-primary)' : 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder={activeTab === 'productos' ? 'Buscar por nombre, SKU, código de barras o descripción...' : 'Buscar categorías por nombre o descripción...'}
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

          {activeTab === 'productos' && (
            <>
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
                  <option value="price_asc">💰 Precio: Menor a Mayor</option>
                  <option value="price_desc">💰 Precio: Mayor a Menor</option>
                  <option value="stock_asc">📦 Stock: Menor a Mayor (Reabastecer)</option>
                  <option value="stock_desc">📦 Stock: Mayor a Menor</option>
                  <option value="newest">✨ Más Recientes</option>
                </select>
              </div>

              {/* Botón Filtros Avanzados */}
              <Button
                type="button"
                size="sm"
                variant={showAdvancedFilters || activeProductsFiltersCount > 0 ? 'primary' : 'secondary'}
                onClick={() => setShowAdvancedFilters(prev => !prev)}
                icon={<SlidersHorizontal size={13} />}
                style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
              >
                Filtros
                {activeProductsFiltersCount > 0 && (
                  <span style={{
                    marginLeft: '4px',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    background: showAdvancedFilters || activeProductsFiltersCount > 0 ? '#fff' : 'var(--accent-primary)',
                    color: showAdvancedFilters || activeProductsFiltersCount > 0 ? 'var(--accent-primary)' : '#fff',
                    fontSize: '10px',
                    fontWeight: 900
                  }}>
                    {activeProductsFiltersCount}
                  </span>
                )}
                <ChevronDown size={13} style={{ marginLeft: '4px', transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </Button>
            </>
          )}
        </div>

        {/* Fila 2: Chips de Categorías (solo en pestaña productos) */}
        {activeTab === 'productos' && (
          <div style={{ padding: '8px 0 10px 0', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
                Categorías ({categories.length})
              </span>
              {categoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  <RotateCcw size={11} />
                  Ver todas
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Opción Todas */}
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: categoryFilter === 'all' ? 800 : 500,
                  border: categoryFilter === 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: categoryFilter === 'all' ? 'var(--accent-primary)' : 'var(--bg-primary)',
                  color: categoryFilter === 'all' ? '#fff' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: categoryFilter === 'all' ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <span>Todas</span>
                <span style={{
                  background: categoryFilter === 'all' ? 'rgba(255, 255, 255, 0.28)' : 'var(--bg-tertiary, rgba(0,0,0,0.06))',
                  color: categoryFilter === 'all' ? '#fff' : 'var(--text-muted)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 800
                }}>
                  {categoryCounts.all || 0}
                </span>
              </button>

              {/* Lista de Categorías */}
              {categories.map(c => {
                const isSelected = categoryFilter === c.id.toString();
                const count = categoryCounts[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id.toString())}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: isSelected ? 800 : 500,
                      border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                      color: isSelected ? '#fff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.28)' : 'var(--bg-tertiary, rgba(0,0,0,0.06))',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: 800
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Fila 3: Chips Rápidos de Estado e Inventario */}
        {activeTab === 'productos' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Disponibilidad:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'available', label: 'Disponibles' },
                { id: 'out_of_stock', label: 'Agotados / Sin Stock' },
              ].map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAvailabilityFilter(a.id)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: availabilityFilter === a.id ? 700 : 500,
                    border: availabilityFilter === a.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: availabilityFilter === a.id ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-primary)',
                    color: availabilityFilter === a.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {a.label}
                </button>
              ))}

              <div style={{ height: '14px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />

              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Control Stock:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'low_stock', label: '⚠️ Stock Bajo / Crítico' },
                { id: 'tracked', label: 'Con Inventario' },
                { id: 'untracked', label: 'Sin Control' },
              ].map(inv => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => setInventoryFilter(inv.id)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: inventoryFilter === inv.id ? 700 : 500,
                    border: inventoryFilter === inv.id ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                    background: inventoryFilter === inv.id ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-primary)',
                    color: inventoryFilter === inv.id ? '#f59e0b' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {inv.label}
                </button>
              ))}
              <div style={{ height: '14px', width: '1px', background: 'var(--border-color)', margin: '0 2px' }} />

              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Origen:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'own', label: 'Propios' },
                { id: 'third_party', label: '🤝 Terceros / Socios' },
              ].map(orig => (
                <button
                  key={orig.id}
                  type="button"
                  onClick={() => setOriginFilter(orig.id)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: originFilter === orig.id ? 700 : 500,
                    border: originFilter === orig.id ? '1px solid #d97706' : '1px solid var(--border-color)',
                    background: originFilter === orig.id ? 'rgba(217, 119, 6, 0.15)' : 'var(--bg-primary)',
                    color: originFilter === orig.id ? '#d97706' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {orig.label}
                </button>
              ))}
            </div>

            <Badge variant="info" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 700 }}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
            </Badge>
          </div>
        )}

        {/* Fila 4: Panel Desplegable de Filtros Avanzados */}
        {activeTab === 'productos' && showAdvancedFilters && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Filtro: Impuesto */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Régimen / Impuesto
              </label>
              <select
                value={taxFilter}
                onChange={(e) => setTaxFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: taxFilter !== 'all' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                <option value="all">Todos los Impuestos</option>
                <option value="exempt">Exento (0%)</option>
                <option value="impoconsumo">Impoconsumo (8%)</option>
                <option value="iva">IVA (19%)</option>
              </select>
            </div>

            {/* Filtro: Precio Mínimo */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Precio Mínimo ($)
              </label>
              <input
                type="number"
                placeholder="Ej: 10000"
                value={minPriceFilter}
                onChange={(e) => setMinPriceFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: minPriceFilter ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Filtro: Precio Máximo */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Precio Máximo ($)
              </label>
              <input
                type="number"
                placeholder="Ej: 50000"
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: maxPriceFilter ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
            </div>
          </div>
        )}

        {/* Fila 5: Pills de Filtros Activos y Limpieza */}
        {activeTab === 'productos' && (searchTerm || (categoryFilter && categoryFilter !== 'all') || availabilityFilter !== 'all' || inventoryFilter !== 'all' || taxFilter !== 'all' || minPriceFilter || maxPriceFilter || sortBy !== 'name_asc') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtros Activos:</span>

              {searchTerm && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  "{searchTerm}"
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                </span>
              )}

              {categoryFilter && categoryFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700 }}>
                  Cat: {categories.find(c => c.id.toString() === categoryFilter.toString())?.name || categoryFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setCategoryFilter('all')} />
                </span>
              )}

              {availabilityFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
                  {availabilityFilter === 'available' ? 'Disponibles' : 'Agotados'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setAvailabilityFilter('all')} />
                </span>
              )}

              {inventoryFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
                  {inventoryFilter === 'low_stock' ? 'Stock Bajo' : inventoryFilter === 'tracked' ? 'Con Control' : 'Sin Control'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setInventoryFilter('all')} />
                </span>
              )}

              {taxFilter !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', fontSize: '11px', fontWeight: 700 }}>
                  Impuesto: {taxFilter}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => setTaxFilter('all')} />
                </span>
              )}

              {(minPriceFilter || maxPriceFilter) && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', fontSize: '11px', fontWeight: 700 }}>
                  Precio: {minPriceFilter ? `$${minPriceFilter}` : '$0'} - {maxPriceFilter ? `$${maxPriceFilter}` : '∞'}
                  <X size={11} style={{ cursor: 'pointer' }} onClick={() => { setMinPriceFilter(''); setMaxPriceFilter(''); }} />
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setAvailabilityFilter('all');
                setInventoryFilter('all');
                setTaxFilter('all');
                setMinPriceFilter('');
                setMaxPriceFilter('');
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

      {/* Main Table */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--font-xs)' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 10px', width: '50px' }}>#</th>
                <th style={{ padding: '8px 10px', width: '60px' }}>Foto</th>
                <th style={{ padding: '8px 10px' }}>Nombre</th>
                {activeTab === 'productos' && <th style={{ padding: '8px 10px' }}>Categoría</th>}
                {activeTab === 'productos' && <th style={{ padding: '8px 10px' }}>U. Medida</th>}
                {activeTab === 'productos' && <th style={{ padding: '8px 10px' }}>Costo</th>}
                {activeTab === 'productos' && <th style={{ padding: '8px 10px' }}>Precio Venta</th>}
                {activeTab === 'productos' && <th style={{ padding: '8px 10px' }}>Margen</th>}
                {activeTab === 'productos' && <th style={{ padding: '8px 10px' }}>Impuesto</th>}
                {activeTab === 'categorias' && <th style={{ padding: '8px 10px' }}>Descripción</th>}
                {activeTab === 'categorias' && <th style={{ padding: '8px 10px' }}>Orden</th>}
                <th style={{ padding: '8px 10px' }}>Estado</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                    Cargando catálogo...
                  </td>
                </tr>
              ) : activeTab === 'productos' ? (
                filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                      No se encontraron productos registrados.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod, index) => {
                    const displayId = index + 1; // ID relativo correlativo del negocio (#1, #2...)
                    const cost = parseFloat(prod.cost_price || 0);
                    const priceVal = parseFloat(prod.price || 0);
                    const margin = priceVal > 0 ? (((priceVal - cost) / priceVal) * 100).toFixed(0) : 0;

                    return (
                      <tr key={prod.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                          #{displayId}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {prod.image_url ? (
                            <img src={prod.image_url} alt={prod.name} style={{ width: '34px', height: '34px', borderRadius: '4px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '34px', height: '34px', borderRadius: '4px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={14} color="var(--text-muted)" />
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 700 }}>{prod.name}</div>
                          {prod.sku && <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SKU: {prod.sku}</div>}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{prod.category_name || 'Sin categoría'}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textTransform: 'capitalize'
                          }}>
                            {prod.unit_of_measure || 'unidad'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{formatCOP(cost)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCOP(priceVal)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {margin}%
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <Badge variant={prod.tax_rate > 0 ? 'warning' : 'info'}>{getTaxLabel(prod.tax_rate)}</Badge>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Badge variant={prod.is_available ? 'success' : 'danger'}>{prod.is_available ? 'Disponible' : 'Agotado'}</Badge>
                            {prod.is_third_party && (
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: 'rgba(217, 119, 6, 0.15)',
                                color: '#d97706',
                                border: '1px solid rgba(217, 119, 6, 0.3)',
                                whiteSpace: 'nowrap'
                              }}>
                                🤝 Tercero
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <button
                              onClick={() => handleToggleOrderStats(prod)}
                              style={{ background: 'none', border: 'none', color: prod.show_in_order_stats ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              title={prod.show_in_order_stats ? 'Producto destacado en estadísticas de órdenes (Clic para desmarcar)' : 'Destacar ventas de este producto en estadísticas de órdenes'}
                            >
                              <Star size={14} fill={prod.show_in_order_stats ? '#f59e0b' : 'none'} />
                            </button>
                            <button
                              onClick={() => handleOpenModifiers(prod)}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                              title="Configurar Sabores, Toppings y Modificadores"
                            >
                              <Sparkles size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(prod)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                              title="Editar Producto"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod, displayId)}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                              title="Eliminar Producto"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                      No hay categorías registradas.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, index) => {
                    const displayCatId = index + 1; // ID relativo correlativo del negocio (#1, #2...)

                    return (
                      <tr key={cat.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                          #{displayCatId}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={15} color="var(--accent-secondary)" />
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{cat.name}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{cat.description || '-'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Posición {cat.sort_order || 0}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <Badge variant="success">Activa</Badge>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                            <button
                              onClick={() => handleOpenEditCategory(cat)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                              title="Editar Categoría"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat, displayCatId)}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                              title="Eliminar Categoría"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Producto */}
      {isProductModalOpen && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        >
          <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Nombre del Producto *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Hamburguesa Doble Queso"
                style={{ padding: '6px 8px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Precio de Venta ($) *</label>
                <Input
                  type="number"
                  required
                  min="0"
                  step="50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ej. 28000"
                  style={{ padding: '6px 8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Costo Unitario ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Ej. 12000"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Categoría *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Unidad de Medida</label>
                <select
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                  }}
                >
                  <option value="unidad">unidad</option>
                  <option value="porción">porción</option>
                  <option value="vaso">vaso</option>
                  <option value="plato">plato</option>
                  <option value="gramos">gramos</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="litro">litro</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Código SKU (Opcional)</label>
                <Input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="HAM-001"
                  style={{ padding: '6px 8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Código de Barras</label>
                <Input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="770123456789"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Impuesto</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)', fontSize: 'var(--font-xs)'
                  }}
                >
                  <option value="0">Exento / Sin Impuesto (0%)</option>
                  <option value="0.08">Impoconsumo Restaurantes (8%)</option>
                  <option value="0.19">IVA General (19%)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Stock Mínimo Alerta</label>
                <Input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  placeholder="5"
                  style={{ padding: '6px 8px' }}
                />
              </div>
            </div>

            {/* Imagen */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Imagen del Producto</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  style={{ display: 'none' }}
                  id="product-image-file"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => document.getElementById('product-image-file').click()}
                  disabled={uploadingImage}
                  style={{ fontSize: 'var(--font-xs)', padding: '5px 10px' }}
                >
                  <Upload size={13} /> {uploadingImage ? 'Subiendo...' : 'Examinar Foto'}
                </Button>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... o ruta de imagen"
                  style={{ flex: 1, padding: '5px 8px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ingredientes principales, preparación o notas para cocina..."
                rows="2"
                style={{
                  width: '100%', padding: '6px 8px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-xs)', resize: 'vertical'
                }}
              />
            </div>

            {/* Switch Destacar en Estadísticas de Órdenes */}
            <div style={{
              padding: '10px 12px',
              background: showInOrderStats ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-secondary)',
              border: showInOrderStats ? '1px solid #f59e0b' : '1px solid var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={18} color={showInOrderStats ? '#f59e0b' : 'var(--text-muted)'} fill={showInOrderStats ? '#f59e0b' : 'none'} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>Destacar en Estadísticas de Órdenes (Top KPI)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Muestra un recuadro con la plata y unidades vendidas de este producto arriba en la Lista de Órdenes.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showInOrderStats}
                onChange={(e) => setShowInOrderStats(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
              />
            </div>

            {/* Switch Producto de Tercero / Negocio Socio */}
            <div style={{
              padding: '10px 12px',
              background: isThirdParty ? 'rgba(217, 119, 6, 0.12)' : 'var(--bg-secondary)',
              border: isThirdParty ? '1px solid #d97706' : '1px solid var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Handshake size={20} color={isThirdParty ? '#d97706' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: isThirdParty ? '#d97706' : 'var(--text-primary)' }}>
                    Producto de Tercero / Socio (Excluir de Facturado y Ganancia)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Se registra la venta y cobro en comanda/ticket, pero <strong>NO</strong> suma en el facturado bruto/neto ni en la ganancia propia del negocio.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isThirdParty}
                onChange={(e) => setIsThirdParty(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#d97706' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                {editingProduct && (
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Sparkles size={14} />}
                    onClick={() => {
                      setIsProductModalOpen(false);
                      handleOpenModifiers(editingProduct);
                    }}
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                  >
                    Sabores & Toppings
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button type="button" variant="ghost" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Categoría (Crear y Editar) */}
      {isCategoryModalOpen && (
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        >
          <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Nombre de la Categoría *</label>
              <Input
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ej. Hamburguesas Gourmet, Bebidas Frías..."
                style={{ padding: '6px 8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Orden de Visualización (0, 1, 2...)</label>
              <Input
                type="number"
                min="0"
                value={catSortOrder}
                onChange={(e) => setCatSortOrder(e.target.value)}
                placeholder="0"
                style={{ padding: '6px 8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-xs)', marginBottom: '3px', fontWeight: 600 }}>Descripción (Opcional)</label>
              <textarea
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Breve descripción o notas de la categoría..."
                rows="2"
                style={{
                  width: '100%', padding: '6px 8px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)', fontSize: 'var(--font-xs)', resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: '4px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Guardando...' : editingCategory ? 'Actualizar Categoría' : 'Crear Categoría'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: IMPORTACIÓN MASIVA JSON */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => !importing && setIsImportModalOpen(false)}
          title="Importación Masiva de Productos y Categorías (.json)"
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileJson size={16} color="var(--accent-primary)" /> Estructura JSON Oficial
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Puedes cargar un archivo <code>.json</code> o pegar el código directamente.
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<Download size={13} />}
                onClick={handleDownloadSampleJson}
              >
                Descargar Plantilla de Ejemplo (.json)
              </Button>
            </div>

            {/* Input de archivo */}
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center', background: 'var(--bg-primary)' }}>
              <input
                type="file"
                ref={jsonFileInputRef}
                accept=".json,application/json"
                onChange={handleJsonFileUpload}
                style={{ display: 'none' }}
              />
              <Upload size={24} style={{ color: 'var(--accent-primary)', marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Selecciona tu archivo JSON de productos
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Formatos compatibles: Objeto con <code>categories</code> y <code>products</code> o Lista plana de productos.
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => jsonFileInputRef.current?.click()}
              >
                Examinar Archivo .json
              </Button>
            </div>

            {/* Editor / Textarea JSON */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Contenido JSON (Pegar o editar):
                </label>
                {importJsonText && (
                  <button
                    type="button"
                    onClick={() => { setImportJsonText(''); setImportValidation(null); }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <textarea
                value={importJsonText}
                onChange={(e) => handleJsonTextChange(e.target.value)}
                placeholder='{\n  "categories": [\n    { "name": "Bebidas", "sort_order": 1 }\n  ],\n  "products": [\n    { "name": "Limonada Natural", "category_name": "Bebidas", "price": 8000 }\n  ]\n}'
                rows={9}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  background: 'var(--bg-primary)',
                  border: `1px solid ${importValidation ? (importValidation.isValid ? '#10b981' : '#ef4444') : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  lineHeight: '1.4'
                }}
              />
            </div>

            {/* Validador en vivo */}
            {importValidation && (
              <div style={{
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: importValidation.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${importValidation.isValid ? '#10b981' : '#ef4444'}`,
                color: importValidation.isValid ? '#10b981' : '#ef4444'
              }}>
                {importValidation.isValid ? (
                  <>
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>JSON Válido:</strong> Se detectaron <strong>{importValidation.prodCount}</strong> productos y <strong>{importValidation.catCount}</strong> categorías listas para procesar.
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Error en JSON:</strong> {importValidation.error}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Opciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px' }}>
              <input
                type="checkbox"
                id="update-existing-chk"
                checked={importUpdateExisting}
                onChange={(e) => setImportUpdateExisting(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <label htmlFor="update-existing-chk" style={{ fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}>
                Actualizar precios y detalles si el producto ya existe (coincidencia por SKU o Nombre).
              </label>
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button
                type="button"
                variant="ghost"
                disabled={importing}
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={importing}
                disabled={!importValidation || !importValidation.isValid}
                onClick={handleExecuteImport}
                icon={<Upload size={14} />}
              >
                {importing ? 'Importando Catálogo...' : 'Procesar e Importar al Catálogo'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Configuración de Sabores, Toppings y Modificadores */}
      <ProductModifiersConfigModal
        isOpen={isModifiersModalOpen}
        onClose={() => {
          setIsModifiersModalOpen(false);
          setModifyingProduct(null);
        }}
        product={modifyingProduct}
        supplies={suppliesList}
      />
    </div>
  );
};
