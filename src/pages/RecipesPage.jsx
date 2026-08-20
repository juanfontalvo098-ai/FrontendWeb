// src/pages/RecipesPage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UtensilsCrossed, Plus, Search, Edit2, Trash2, Layers, DollarSign,
  PieChart, AlertCircle, ChevronDown, CheckCircle, Package, Boxes,
  TrendingUp, Info, X, Check, ArrowRight, Sparkles, Scale, AlertTriangle,
  Minus, Filter
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

// =========================================================================
// COMPONENTE: SELECTOR / BUSCADOR PREDICTIVO DE PRODUCTO TERMINADO (MENÚ)
// =========================================================================
const SearchableProductSelect = ({ products = [], selectedId, onSelect, disabled = false, existingRecipeProductIds = new Set() }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedProduct = useMemo(() => {
    return products.find(p => p.id.toString() === (selectedId || '').toString());
  }, [products, selectedId]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase().trim();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  }, [products, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Botón / Input disparador */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: disabled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.75 : 1
        }}
      >
        {selectedProduct ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <UtensilsCrossed size={16} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
            <div style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                {selectedProduct.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                Precio: <strong>{formatCOP(selectedProduct.price)}</strong>
              </span>
              {selectedProduct.category_name && (
                <span style={{ fontSize: '10px', background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  {selectedProduct.category_name}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Selecciona un plato o producto del menú POS...
          </span>
        )}
        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </div>

      {/* Popover desplegable con buscador */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                autoFocus
                placeholder="Escribe para buscar plato (ej. Fresa, Hamburguesa, Helado)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px 6px 28px',
                  fontSize: '11.5px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '220px', padding: '4px' }}>
            {filteredProducts.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                No se encontraron platos o productos para "<strong>{search}</strong>"
              </div>
            ) : (
              filteredProducts.map(p => {
                const isSelected = selectedProduct?.id === p.id;
                const hasRecipe = existingRecipeProductIds.has(p.id) && !isSelected;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id.toString());
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      transition: 'background 0.1s ease',
                      marginBottom: '2px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: '12px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {p.name}
                      </div>
                      {p.category_name && (
                        <span style={{ fontSize: '9.5px', background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                          {p.category_name}
                        </span>
                      )}
                      {hasRecipe && (
                        <span style={{ fontSize: '9px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                          Ya tiene receta
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatCOP(p.price)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// COMPONENTE: SELECTOR / BUSCADOR PREDICTIVO EN CADA FILA DE INSUMO
// =========================================================================
const SearchableSupplyCombobox = ({ supplies = [], selectedId, onSelect, placeholder = "Buscar insumo..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedSupply = useMemo(() => {
    return supplies.find(s => s.id.toString() === (selectedId || '').toString());
  }, [supplies, selectedId]);

  const filteredSupplies = useMemo(() => {
    if (!search.trim()) return supplies;
    const q = search.toLowerCase().trim();
    return supplies.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.sku && s.sku.toLowerCase().includes(q)) ||
      (s.category_name && s.category_name.toLowerCase().includes(q))
    );
  }, [supplies, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1000 : 1 }}>
      {/* Botón disparador */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        style={{
          width: '100%',
          padding: '7px 10px',
          background: 'var(--bg-primary)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '6px',
          minHeight: '36px',
          transition: 'border-color 0.15s'
        }}
      >
        {selectedSupply ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
            <Boxes size={14} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
            <div style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '11.5px' }}>
                {selectedSupply.name}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--accent-warning)', marginLeft: '6px', fontWeight: 600 }}>
                ({formatCOP(selectedSupply.cost_price)} / {selectedSupply.unit_of_measure})
              </span>
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
            {placeholder}
          </span>
        )}
        <ChevronDown size={14} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </div>

      {/* Popover desplegable flotante con buscador */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '340px',
            maxWidth: '85vw',
            zIndex: 9999,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 14px 36px rgba(0,0,0,0.5)',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '6px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                autoFocus
                placeholder="Escribe para buscar insumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 6px 5px 26px',
                  fontSize: '11px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '200px', padding: '3px' }}>
            {filteredSupplies.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                No hay insumos para "<strong>{search}</strong>"
              </div>
            ) : (
              filteredSupplies.map(s => {
                const isSelected = selectedSupply?.id === s.id;
                const stock = parseFloat(s.current_stock || 0);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelect(s.id.toString());
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      transition: 'background 0.1s ease',
                      marginBottom: '2px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: '11.5px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>Unidad: {s.unit_of_measure}</span>
                        <span>·</span>
                        <span style={{ color: stock <= 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                          Stock: {stock} {s.unit_of_measure}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '11px', color: 'var(--accent-warning)', textAlign: 'right' }}>
                      {formatCOP(s.cost_price)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// PÁGINA PRINCIPAL: RECIPES & FICHAS TÉCNICAS
// =========================================================================
export const RecipesPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [recipes, setRecipes] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Form State
  const [productId, setProductId] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Barra de Búsqueda Rápida de Insumos (Quick Add)
  const [quickSupplySearch, setQuickSupplySearch] = useState('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const quickSearchRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recipesData, productsData, suppliesData] = await Promise.all([
        api.get('/inventory/recipes'),
        api.get('/products'),
        api.get('/supplies')
      ]);
      setRecipes(recipesData || []);
      setProducts(productsData || []);
      setSupplies(suppliesData || []);
      if (productsData.length > 0 && !productId) {
        setProductId(productsData[0].id.toString());
      }
    } catch (err) {
      console.error('Error al cargar recetas:', err);
      addToast('Error al cargar recetas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cerrar popover de quick search al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target)) {
        setIsQuickSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const existingRecipeProductIds = useMemo(() => {
    return new Set(recipes.map(r => r.product_id));
  }, [recipes]);

  const handleOpenNew = () => {
    setEditingRecipe(null);
    const prodWithoutRecipe = products.find(p => !existingRecipeProductIds.has(p.id));
    setProductId(prodWithoutRecipe?.id?.toString() || products[0]?.id?.toString() || '');
    setYieldQuantity('1');
    setNotes('');
    setQuickSupplySearch('');
    setIsQuickSearchOpen(false);

    if (supplies.length > 0) {
      const firstSupply = supplies[0];
      setIngredients([
        {
          supply_id: firstSupply.id.toString(),
          quantity: '1',
          unit_of_measure: firstSupply.unit_of_measure || 'kg'
        }
      ]);
    } else {
      setIngredients([]);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (recipe) => {
    setEditingRecipe(recipe);
    setProductId(recipe.product_id.toString());
    setYieldQuantity(recipe.yield_quantity.toString());
    setNotes(recipe.notes || '');
    setQuickSupplySearch('');
    setIsQuickSearchOpen(false);
    setIngredients(recipe.ingredients.map(ing => ({
      supply_id: (ing.supply_id || ing.ingredient_id || '').toString(),
      quantity: ing.quantity.toString(),
      unit_of_measure: ing.unit_of_measure || 'kg'
    })));
    setIsModalOpen(true);
  };

  // Agregar insumo desde la barra rápida superior
  const handleQuickAddSupply = (supply) => {
    if (!supply) return;
    const existingIndex = ingredients.findIndex(i => i.supply_id.toString() === supply.id.toString());
    if (existingIndex >= 0) {
      const updated = [...ingredients];
      const currentQty = parseFloat(updated[existingIndex].quantity) || 0;
      updated[existingIndex].quantity = (currentQty + 1).toString();
      setIngredients(updated);
      addToast(`Se sumó +1 a "${supply.name}"`, 'info');
    } else {
      setIngredients([
        ...ingredients,
        {
          supply_id: supply.id.toString(),
          quantity: '1',
          unit_of_measure: supply.unit_of_measure || 'kg'
        }
      ]);
      addToast(`"${supply.name}" agregado`, 'success');
    }
    setQuickSupplySearch('');
    setIsQuickSearchOpen(false);
  };

  const handleAddBlankRow = () => {
    if (supplies.length === 0) {
      addToast('No hay insumos registrados en el inventario', 'warning');
      return;
    }
    const firstSupply = supplies[0];
    setIngredients([
      ...ingredients,
      {
        supply_id: firstSupply.id.toString(),
        quantity: '1',
        unit_of_measure: firstSupply.unit_of_measure || 'kg'
      }
    ]);
  };

  const handleRemoveIngredientRow = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;

    if (field === 'supply_id') {
      const selectedSup = supplies.find(s => s.id.toString() === value.toString());
      if (selectedSup) {
        newIngredients[index].unit_of_measure = selectedSup.unit_of_measure || 'kg';
      }
    }

    setIngredients(newIngredients);
  };

  const handleAdjustQuantity = (index, delta) => {
    const newIngredients = [...ingredients];
    const currentQty = parseFloat(newIngredients[index].quantity) || 0;
    const nextQty = Math.max(0.01, +(currentQty + delta).toFixed(4));
    newIngredients[index].quantity = nextQty.toString();
    setIngredients(newIngredients);
  };

  const calculateFormCost = () => {
    let cost = 0;
    ingredients.forEach(ing => {
      const sup = supplies.find(s => s.id.toString() === ing.supply_id.toString());
      if (sup) {
        cost += (parseFloat(ing.quantity) || 0) * (parseFloat(sup.cost_price) || 0);
      }
    });
    return cost;
  };

  const selectedProductObj = products.find(p => p.id.toString() === productId.toString());
  const formCost = calculateFormCost();
  const formPrice = selectedProductObj ? parseFloat(selectedProductObj.price || 0) : 0;
  const parsedYield = parseFloat(yieldQuantity) || 1;
  const costPerPortion = parsedYield > 0 ? formCost / parsedYield : formCost;
  const formProfit = formPrice - costPerPortion;
  const formMargin = formPrice > 0 ? ((formProfit / formPrice) * 100).toFixed(1) : '0';

  // Filtrado de insumos en la barra rápida
  const quickFilteredSupplies = useMemo(() => {
    if (!quickSupplySearch.trim()) return [];
    const q = quickSupplySearch.toLowerCase().trim();
    return supplies.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.sku && s.sku.toLowerCase().includes(q)) ||
      (s.category_name && s.category_name.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [supplies, quickSupplySearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || ingredients.length === 0) {
      addToast('Selecciona el producto y agrega al menos un insumo requerido', 'warning');
      return;
    }

    for (let i = 0; i < ingredients.length; i++) {
      if (!ingredients[i].supply_id) {
        addToast(`Selecciona un insumo válido en la fila #${i + 1}`, 'warning');
        return;
      }
      const q = parseFloat(ingredients[i].quantity);
      if (isNaN(q) || q <= 0) {
        addToast(`Ingresa una cantidad mayor a 0 en la fila #${i + 1}`, 'warning');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        product_id: parseInt(productId, 10),
        yield_quantity: parseFloat(yieldQuantity) || 1,
        notes: notes || null,
        ingredients: ingredients.map(ing => ({
          supply_id: parseInt(ing.supply_id, 10),
          quantity: parseFloat(ing.quantity) || 0,
          unit_of_measure: ing.unit_of_measure || 'kg'
        }))
      };

      if (editingRecipe) {
        await api.put(`/inventory/recipes/${editingRecipe.id}`, payload);
        addToast('Ficha técnica / Receta actualizada exitosamente', 'success');
      } else {
        await api.post('/inventory/recipes', payload);
        addToast('Ficha técnica / Receta creada exitosamente', 'success');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al guardar receta', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recipe) => {
    if (!window.confirm(`¿Estás seguro de eliminar la receta de "${recipe.product_name}"?`)) return;
    try {
      await api.delete(`/inventory/recipes/${recipe.id}`);
      addToast('Receta eliminada exitosamente', 'success');
      fetchData();
    } catch (err) {
      addToast(err.message || 'Error al eliminar receta', 'danger');
    }
  };

  const filteredRecipes = recipes.filter(r =>
    r.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UtensilsCrossed size={24} color="var(--accent-secondary)" /> Fichas Técnicas & Recetas (BOM)
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Define los <strong>insumos y materias primas</strong> que componen cada plato o bebida para descontar stock y costear con precisión.
          </p>
        </div>
        <Button onClick={handleOpenNew} icon={<Plus size={16} />}>
          Nueva Ficha Técnica
        </Button>
      </div>

      {/* Barra de Búsqueda */}
      <Card style={{ padding: '10px 14px', marginBottom: '14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <Input
            placeholder="Buscar fichas técnicas por nombre de producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', marginBottom: 0, fontSize: '12px' }}
          />
        </div>
      </Card>

      {/* Grid de Recetas */}
      {loading ? (
        <Card style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          Cargando fichas técnicas...
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          No hay fichas técnicas registradas. Haz clic en "Nueva Ficha Técnica" para enlazar un plato con sus insumos.
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
          {filteredRecipes.map((r) => {
            const margin = parseFloat(r.profit_margin || 0).toFixed(1);
            const isHealthyMargin = parseFloat(margin) >= 60;

            return (
              <Card key={r.id} style={{ padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{r.product_name}</h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rendimiento: {r.yield_quantity} porción(es)</div>
                    </div>
                    <Badge variant={isHealthyMargin ? 'success' : 'warning'} style={{ fontSize: '10px' }}>
                      Margen: {margin}%
                    </Badge>
                  </div>

                  {/* Bloque Financiero */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Costo Insumos</div>
                      <div style={{ fontWeight: 800, color: 'var(--accent-warning)', fontSize: '12px' }}>{formatCOP(r.total_cost)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Precio Venta</div>
                      <div style={{ fontWeight: 800, fontSize: '12px' }}>{formatCOP(r.price)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Utilidad Bruta</div>
                      <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '12px' }}>{formatCOP(r.price - r.total_cost)}</div>
                    </div>
                  </div>

                  {/* Lista de Insumos Requeridos */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Boxes size={13} color="var(--accent-secondary)" /> Insumos & Materias Primas:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                      {r.ingredients?.map((ing, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ing.supply_name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({ing.quantity} {ing.unit_of_measure})
                            </span>
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {formatCOP(parseFloat(ing.quantity || 0) * parseFloat(ing.unit_cost || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {r.notes && (
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '10px' }}>
                      "{r.notes}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(r)} icon={<Edit2 size={13} />}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDelete(r)} icon={<Trash2 size={13} />}>
                    Eliminar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Receta */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecipe ? `Editar Ficha Técnica: ${editingRecipe.product_name}` : 'Crear Ficha Técnica / Receta'}
        maxWidth="820px"
      >
        <form onSubmit={handleSubmit}>
          {/* Paso 1: Selección Predictiva de Producto Terminado */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              1. Plato / Producto Terminado para la Venta (Menú POS)
            </label>
            <SearchableProductSelect
              products={products}
              selectedId={productId}
              onSelect={(id) => setProductId(id)}
              disabled={!!editingRecipe}
              existingRecipeProductIds={existingRecipeProductIds}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '12px', marginBottom: '16px' }}>
            <Input
              label="Rendimiento (Porciones del plato)"
              type="number"
              min="0.01"
              step="any"
              value={yieldQuantity}
              onChange={(e) => setYieldQuantity(e.target.value)}
              required
              style={{ marginBottom: 0 }}
            />
            <Input
              label="Notas / Indicaciones de Cocina"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Tiempo cocción 8 min, servir con salsa aparte..."
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Paso 2: Buscador Rápido y Tabla de Insumos */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Boxes size={15} color="var(--accent-secondary)" /> 2. Insumos & Materias Primas Requeridas
              </label>
              <Button type="button" size="sm" variant="secondary" onClick={handleAddBlankRow} icon={<Plus size={13} />}>
                Agregar Insumo
              </Button>
            </div>

            {/* Barra de Búsqueda Rápida de Insumos (Quick Add) */}
            <div ref={quickSearchRef} style={{ position: 'relative', marginBottom: '12px', zIndex: 50 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="text"
                  placeholder="Buscar y agregar insumo rápidamente (ej. Fresa, Leche, Queso, Harina, Vaso)..."
                  value={quickSupplySearch}
                  onFocus={() => setIsQuickSearchOpen(true)}
                  onChange={(e) => {
                    setQuickSupplySearch(e.target.value);
                    setIsQuickSearchOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 36px',
                    background: 'rgba(99, 102, 241, 0.05)',
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                {quickSupplySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSupplySearch('');
                      setIsQuickSearchOpen(false);
                    }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Menú flotante de resultados rápidos */}
              {isQuickSearchOpen && quickSupplySearch.trim() && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 14px 36px rgba(0,0,0,0.5)',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    padding: '4px'
                  }}
                >
                  {quickFilteredSupplies.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      No se encontraron insumos para "<strong>{quickSupplySearch}</strong>".
                    </div>
                  ) : (
                    quickFilteredSupplies.map(s => {
                      const stock = parseFloat(s.current_stock || 0);
                      const isAlreadyInRecipe = ingredients.some(i => i.supply_id.toString() === s.id.toString());

                      return (
                        <div
                          key={s.id}
                          onClick={() => handleQuickAddSupply(s)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s ease',
                            marginBottom: '2px',
                            background: isAlreadyInRecipe ? 'rgba(99, 102, 241, 0.08)' : 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = isAlreadyInRecipe ? 'rgba(99, 102, 241, 0.08)' : 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Boxes size={15} color="var(--accent-secondary)" />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                                {s.name}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                                <span>Unidad: <strong>{s.unit_of_measure}</strong></span>
                                <span>·</span>
                                <span style={{ color: stock <= 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                                  Stock disponible: {stock} {s.unit_of_measure}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: 'var(--accent-warning)' }}>
                              {formatCOP(s.cost_price)} / {s.unit_of_measure}
                            </div>
                            <button
                              type="button"
                              style={{
                                padding: '4px 8px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: isAlreadyInRecipe ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {isAlreadyInRecipe ? '+ Sumar' : '+ Agregar'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Cabecera de Columnas de la Tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.2fr 0.8fr 1.1fr 36px', gap: '8px', padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <div>INSUMO (MATERIA PRIMA)</div>
              <div style={{ textAlign: 'center' }}>CANTIDAD</div>
              <div style={{ textAlign: 'center' }}>UNIDAD</div>
              <div style={{ textAlign: 'right' }}>COSTO ESTIMADO</div>
              <div style={{ textAlign: 'center' }}></div>
            </div>

            {/* Lista de Insumos en la Receta */}
            {ingredients.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border-color)' }}>
                <Boxes size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>Usa el buscador de arriba o haz clic en <strong>Agregar Insumo</strong> para añadir materias primas.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px' }}>
                {ingredients.map((ing, index) => {
                  const selectedSup = supplies.find(s => s.id.toString() === ing.supply_id.toString());
                  const rowCost = (parseFloat(ing.quantity) || 0) * (parseFloat(selectedSup?.cost_price) || 0);

                  return (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.2fr 0.8fr 1.1fr 36px', gap: '8px', alignItems: 'center', background: 'var(--bg-elevated)', padding: '4px 6px', borderRadius: '4px' }}>
                      {/* Insumo con Combobox Predictivo */}
                      <SearchableSupplyCombobox
                        supplies={supplies}
                        selectedId={ing.supply_id}
                        onSelect={(id) => handleIngredientChange(index, 'supply_id', id)}
                        placeholder="Seleccionar insumo..."
                      />

                      {/* Cantidad con Stepper +/- */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(index, -0.1)}
                          style={{ width: '22px', height: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '3px 0 0 3px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Restar 0.1"
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          value={ing.quantity}
                          onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                          placeholder="Cant"
                          style={{
                            width: '100%',
                            minWidth: '45px',
                            padding: '6px 4px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '0',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontWeight: 700,
                            textAlign: 'center'
                          }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleAdjustQuantity(index, 0.1)}
                          style={{ width: '22px', height: '28px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0 3px 3px 0', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Sumar 0.1"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Unidad Fija (Automática del Insumo) */}
                      <div style={{
                        padding: '6px 4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 700,
                        textAlign: 'center',
                        userSelect: 'none'
                      }}>
                        {selectedSup?.unit_of_measure || ing.unit_of_measure || 'und'}
                      </div>

                      {/* Subtotal Costo */}
                      <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-warning)', textAlign: 'right' }}>
                        {formatCOP(rowCost)}
                      </div>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientRow(index)}
                        title="Eliminar insumo de la receta"
                        style={{
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-danger)',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen de Costeo y Rentabilidad en Tiempo Real */}
          <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Costo Total Insumos {parsedYield > 1 ? `(Batch de ${parsedYield} porciones)` : '(Porción)'}:</span>
              <strong style={{ color: 'var(--accent-warning)', fontSize: '13px' }}>{formatCOP(formCost)}</strong>
            </div>
            {parsedYield > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Costo Unitario por Porción:</span>
                <strong style={{ color: 'var(--accent-warning)', fontSize: '12.5px' }}>{formatCOP(costPerPortion)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Precio de Venta al Público:</span>
              <strong style={{ fontSize: '13px' }}>{formatCOP(formPrice)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '6px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Margen de Ganancia Bruto:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={parseFloat(formMargin) >= 60 ? 'success' : parseFloat(formMargin) >= 40 ? 'warning' : 'danger'}>
                  {formMargin}%
                </Badge>
                <strong style={{ color: formProfit >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)', fontSize: '14px' }}>
                  ({formatCOP(formProfit)})
                </strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={submitting}>Guardar Ficha Técnica</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default RecipesPage;
