import React, { useState, useEffect } from 'react';
import { Plus, Minus, Check, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

export const ProductModifiersModal = ({ isOpen, onClose, product, onConfirm, initialModifiers = [] }) => {
  const addToast = useUiStore((state) => state.addToast);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selections, setSelections] = useState({}); // { [groupId]: { [optionId]: quantity } }

  useEffect(() => {
    if (isOpen && product) {
      loadModifiers();
    } else {
      setGroups([]);
      setSelections({});
    }
  }, [isOpen, product]);

  const loadModifiers = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/modifiers/products/${product.id}`);
      const activeGroups = (Array.isArray(data) ? data : []).filter(g => g.options && g.options.length > 0);

      if (activeGroups.length === 0) {
        // No tiene modificadores, agregar directamente
        onConfirm(product, []);
        onClose();
        return;
      }

      setGroups(activeGroups);

      // Inicializar selecciones pre-llenando si se recibieron initialModifiers
      const initial = {};
      activeGroups.forEach(g => {
        initial[g.id] = {};
      });

      if (Array.isArray(initialModifiers) && initialModifiers.length > 0) {
        initialModifiers.forEach(im => {
          for (const g of activeGroups) {
            if (im.group_id && g.id === im.group_id) {
              initial[g.id][im.option_id] = im.quantity || 1;
            } else {
              const opt = (g.options || []).find(o => o.id === im.option_id || o.name?.toLowerCase() === im.name?.toLowerCase());
              if (opt) {
                initial[g.id][opt.id] = im.quantity || 1;
              }
            }
          }
        });
      }

      setSelections(initial);
    } catch (err) {
      console.error('Error al cargar modificadores:', err);
      // En caso de error, permitir agregar el producto base
      onConfirm(product, []);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOption = (group, option) => {
    if (!option.is_available) {
      addToast(`${option.name} se encuentra agotado`, 'warning');
      return;
    }

    const currentGroupSelections = { ...(selections[group.id] || {}) };
    const currentQty = currentGroupSelections[option.id] || 0;
    const totalSelectedInGroup = Object.values(currentGroupSelections).reduce((sum, q) => sum + q, 0);

    if (group.is_multiple) {
      // Selección con cantidades
      if (currentQty > 0) {
        delete currentGroupSelections[option.id];
      } else {
        if (totalSelectedInGroup >= group.max_selectable) {
          addToast(`Máximo ${group.max_selectable} opciones permitidas en ${group.name}`, 'warning');
          return;
        }
        currentGroupSelections[option.id] = 1;
      }
    } else {
      // Selección única (radio)
      if (currentQty > 0 && !group.is_required) {
        delete currentGroupSelections[option.id];
      } else {
        // Limpiar otros y seleccionar este
        Object.keys(currentGroupSelections).forEach(k => delete currentGroupSelections[k]);
        currentGroupSelections[option.id] = 1;
      }
    }

    setSelections({
      ...selections,
      [group.id]: currentGroupSelections
    });
  };

  const handleAdjustQty = (group, option, delta, e) => {
    if (e) e.stopPropagation();
    if (!option.is_available && delta > 0) {
      addToast(`${option.name} se encuentra agotado`, 'warning');
      return;
    }

    const currentGroupSelections = { ...(selections[group.id] || {}) };
    const currentQty = currentGroupSelections[option.id] || 0;
    const totalSelectedInGroup = Object.values(currentGroupSelections).reduce((sum, q) => sum + q, 0);

    if (delta > 0 && totalSelectedInGroup >= group.max_selectable) {
      addToast(`Máximo ${group.max_selectable} opciones permitidas en ${group.name}`, 'warning');
      return;
    }

    const newQty = currentQty + delta;
    if (newQty <= 0) {
      delete currentGroupSelections[option.id];
    } else {
      currentGroupSelections[option.id] = newQty;
    }

    setSelections({
      ...selections,
      [group.id]: currentGroupSelections
    });
  };

  // Calcular precio adicional y validar
  const calculateTotals = () => {
    let extraTotal = 0;
    const selectedList = [];
    let isValid = true;
    const validationErrors = [];

    groups.forEach(g => {
      const groupSelections = selections[g.id] || {};
      const count = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);

      if (g.is_required && count < (g.min_selectable || 1)) {
        isValid = false;
        validationErrors.push(`Debes seleccionar al menos ${g.min_selectable || 1} en "${g.name}"`);
      } else if (count < (g.min_selectable || 0)) {
        isValid = false;
        validationErrors.push(`Debes seleccionar al menos ${g.min_selectable} en "${g.name}"`);
      }

      Object.entries(groupSelections).forEach(([optId, qty]) => {
        const opt = g.options.find(o => o.id.toString() === optId.toString());
        if (opt) {
          const priceMod = parseFloat(opt.price_modifier || 0);
          extraTotal += priceMod * qty;
          selectedList.push({
            group_id: g.id,
            group_name: g.name,
            option_id: opt.id,
            name: opt.name,
            price_modifier: priceMod,
            quantity: qty,
            supply_id: opt.supply_id,
            supply_quantity: opt.supply_quantity,
            unit_of_measure: opt.unit_of_measure
          });
        }
      });
    });

    const basePrice = parseFloat(product?.price || 0);
    const finalUnitPrice = basePrice + extraTotal;

    return { extraTotal, finalUnitPrice, selectedList, isValid, validationErrors };
  };

  const { extraTotal, finalUnitPrice, selectedList, isValid, validationErrors } = calculateTotals();

  const handleConfirm = () => {
    if (!isValid) {
      addToast(validationErrors[0] || 'Por favor completa las opciones requeridas', 'warning');
      return;
    }
    onConfirm(product, selectedList, finalUnitPrice);
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🍨 Personalizar: ${product.name}`}
      maxWidth="620px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Cabecera del Producto */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>{product.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Precio base: {formatCOP(product.price)}</div>
          </div>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }} />
          )}
        </div>

        {/* Grupos de Modificadores */}
        {groups.map(group => {
          const groupSelections = selections[group.id] || {};
          const selectedCount = Object.values(groupSelections).reduce((sum, q) => sum + q, 0);
          const isGroupComplete = selectedCount >= (group.min_selectable || 0) && selectedCount <= group.max_selectable;

          return (
            <div
              key={group.id}
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: '8px',
                border: isGroupComplete ? '1px solid var(--border-color)' : '1px solid var(--accent-warning)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Header del grupo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {group.name}
                    {group.is_required && (
                      <span style={{ color: 'var(--accent-danger)', marginLeft: '4px', fontSize: '12px' }}>* Requerido</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {group.min_selectable === group.max_selectable
                      ? `Elige exactamente ${group.max_selectable}`
                      : `Elige de ${group.min_selectable || 0} a ${group.max_selectable}`}
                  </div>
                </div>

                <div style={{
                  padding: '3px 8px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  background: isGroupComplete ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isGroupComplete ? 'var(--accent-success)' : 'var(--accent-warning)'
                }}>
                  {selectedCount} / {group.max_selectable}
                </div>
              </div>

              {/* Lista de Opciones */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                {group.options.map(option => {
                  const qty = groupSelections[option.id] || 0;
                  const isSelected = qty > 0;
                  const priceMod = parseFloat(option.price_modifier || 0);

                  return (
                    <div
                      key={option.id}
                      onClick={() => handleToggleOption(group, option)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-secondary)',
                        cursor: option.is_available ? 'pointer' : 'not-allowed',
                        opacity: option.is_available ? 1 : 0.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: group.is_multiple ? '4px' : '50%',
                          border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isSelected && <Check size={13} color="white" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {option.name}
                          </div>
                          {!option.is_available && (
                            <div style={{ fontSize: '10px', color: 'var(--accent-danger)', fontWeight: 700 }}>AGOTADO</div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {priceMod > 0 && (
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            +{formatCOP(priceMod)}
                          </span>
                        )}

                        {group.is_multiple && isSelected && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-elevated)', borderRadius: '4px', padding: '2px 4px' }}>
                            <button
                              onClick={(e) => handleAdjustQty(group, option, -1, e)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 800, minWidth: '14px', textAlign: 'center' }}>
                              {qty}
                            </span>
                            <button
                              onClick={(e) => handleAdjustQty(group, option, 1, e)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Resumen & Botón de Confirmación */}
        <div style={{
          padding: '14px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Precio Final con Sabores & Toppings</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-primary)' }}>
              {formatCOP(finalUnitPrice)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              icon={<ShoppingBag size={18} />}
              disabled={!isValid}
              onClick={handleConfirm}
              style={{ fontWeight: 800, padding: '10px 18px' }}
            >
              Agregar a la Orden
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
