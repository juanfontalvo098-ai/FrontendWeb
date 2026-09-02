import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Layers, CheckCircle2, AlertCircle, Save, Sparkles, Package, Download, Bookmark, Search, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { api, formatCOP } from '../api/client';
import { useUiStore } from '../store/uiStore';

// Componente de selector simple y buscable de insumos
const SearchableSupplySelect = ({ value, onChange, supplies = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedSupply = (supplies || []).find(s => s.id?.toString() === value?.toString());

  const filteredSupplies = (supplies || []).filter(s => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (s.name || '').toLowerCase().includes(term) || (s.category || '').toLowerCase().includes(term);
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {selectedSupply ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-input)',
          border: '1px solid var(--accent-primary)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          color: 'var(--text-primary)'
        }}>
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>
            📦 {selectedSupply.name} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({selectedSupply.unit_of_measure || 'und'})</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px' }}
            title="Quitar insumo"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div>
          <div
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '5px 8px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Vincular Insumo (Opcional)...</span>
            <Search size={12} color="var(--text-muted)" />
          </div>

          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 9999,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
              marginTop: '4px',
              maxHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '6px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Escribe para buscar insumo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <em>Ninguno (Sin descuento de inventario)</em>
                </div>

                {filteredSupplies.length === 0 ? (
                  <div style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No se encontraron insumos
                  </div>
                ) : (
                  filteredSupplies.map(sup => (
                    <div
                      key={sup.id}
                      onClick={() => {
                        onChange(sup.id.toString());
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.03)'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sup.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sup.unit_of_measure || 'und'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ProductModifiersConfigModal = ({ isOpen, onClose, product, supplies = [], onSaved }) => {
  const addToast = useUiStore((state) => state.addToast);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);

  // Plantillas reutilizables
  const [templates, setTemplates] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      loadModifiers();
    }
  }, [isOpen, product]);

  const loadModifiers = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/modifiers/products/${product.id}`);
      const sanitized = (Array.isArray(data) ? data : []).map(g => ({
        ...g,
        options: (g.options || []).map(opt => ({
          ...opt,
          price_modifier: opt.price_modifier !== undefined && opt.price_modifier !== null
            ? parseFloat(parseFloat(opt.price_modifier).toFixed(0))
            : 0,
          supply_quantity: opt.supply_quantity !== undefined && opt.supply_quantity !== null
            ? parseFloat(parseFloat(opt.supply_quantity).toFixed(1))
            : 0
        }))
      }));
      setGroups(sanitized);
    } catch (err) {
      console.error('Error al cargar modificadores:', err);
      addToast('Error al cargar modificadores del producto', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await api.get('/modifiers/templates');
      const sanitized = (Array.isArray(data) ? data : []).map(g => ({
        ...g,
        options: (g.options || []).map(opt => ({
          ...opt,
          price_modifier: opt.price_modifier !== undefined && opt.price_modifier !== null
            ? parseFloat(parseFloat(opt.price_modifier).toFixed(0))
            : 0,
          supply_quantity: opt.supply_quantity !== undefined && opt.supply_quantity !== null
            ? parseFloat(parseFloat(opt.supply_quantity).toFixed(1))
            : 0
        }))
      }));
      setTemplates(sanitized);
      setIsImportModalOpen(true);
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
      addToast('Error al cargar la biblioteca de plantillas', 'danger');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Agregar nuevo grupo completamente en blanco (sin sabores por defecto)
  const handleAddGroup = () => {
    setGroups([
      ...groups,
      {
        name: '',
        min_selectable: 0,
        max_selectable: 1,
        is_required: false,
        is_multiple: false,
        options: [
          { name: '', price_modifier: 0, supply_id: '', supply_quantity: 0, unit_of_measure: 'unidad', is_available: true }
        ]
      }
    ]);
  };

  const handleRemoveGroup = (index) => {
    const updated = [...groups];
    updated.splice(index, 1);
    setGroups(updated);
  };

  const handleUpdateGroupField = (groupIndex, field, val) => {
    const updated = [...groups];
    updated[groupIndex][field] = val;
    setGroups(updated);
  };

  const handleAddOption = (groupIndex) => {
    const updated = [...groups];
    if (!updated[groupIndex].options) updated[groupIndex].options = [];
    updated[groupIndex].options.push({
      name: '',
      price_modifier: 0,
      supply_id: '',
      supply_quantity: 0,
      unit_of_measure: 'unidad',
      is_available: true
    });
    setGroups(updated);
  };

  const handleRemoveOption = (groupIndex, optionIndex) => {
    const updated = [...groups];
    updated[groupIndex].options.splice(optionIndex, 1);
    setGroups(updated);
  };

  const handleUpdateOptionField = (groupIndex, optionIndex, field, val) => {
    const updated = [...groups];
    const option = updated[groupIndex].options[optionIndex];
    option[field] = val;

    // Si se selecciona un insumo, auto-completar unidad de medida
    if (field === 'supply_id' && val) {
      const selectedSup = supplies.find(s => s.id?.toString() === val?.toString());
      if (selectedSup) {
        option.unit_of_measure = selectedSup.unit_of_measure || 'unidad';
      }
    }

    setGroups(updated);
  };

  // Guardar un grupo como plantilla permanente
  const handleSaveAsTemplate = async (group) => {
    if (!group.name || !group.name.trim()) {
      addToast('Asigna un nombre al grupo antes de guardarlo como plantilla', 'warning');
      return;
    }

    try {
      await api.post('/modifiers/templates', { group });
      addToast(`Grupo "${group.name}" guardado en la biblioteca de plantillas`, 'success');
    } catch (err) {
      console.error('Error al guardar plantilla:', err);
      addToast(err.message || 'Error al guardar plantilla', 'danger');
    }
  };

  // Importar una plantilla al producto actual
  const handleImportTemplate = (templateGroup) => {
    const importedGroup = {
      name: templateGroup.name,
      min_selectable: templateGroup.min_selectable || 0,
      max_selectable: templateGroup.max_selectable || 1,
      is_required: Boolean(templateGroup.is_required),
      is_multiple: Boolean(templateGroup.is_multiple),
      options: (templateGroup.options || []).map(opt => ({
        name: opt.name,
        price_modifier: parseFloat(opt.price_modifier || 0),
        supply_id: opt.supply_id ? opt.supply_id.toString() : '',
        supply_quantity: parseFloat(opt.supply_quantity || 0),
        unit_of_measure: opt.unit_of_measure || 'unidad',
        is_available: opt.is_available !== undefined ? opt.is_available : true
      }))
    };

    setGroups([...groups, importedGroup]);
    setIsImportModalOpen(false);
    addToast(`Grupo "${templateGroup.name}" agregado al producto`, 'success');
  };

  const handleDeleteTemplate = async (templateId, templateName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Deseas eliminar la plantilla "${templateName}"?`)) return;

    try {
      await api.delete(`/modifiers/templates/${templateId}`);
      setTemplates(templates.filter(t => t.id !== templateId));
      addToast('Plantilla eliminada', 'info');
    } catch (err) {
      addToast('Error al eliminar plantilla', 'danger');
    }
  };

  const handleSave = async () => {
    // Validar nombres
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!g.name.trim()) {
        addToast(`El grupo #${i + 1} debe tener un nombre`, 'warning');
        return;
      }
      if (!g.options || g.options.length === 0) {
        addToast(`El grupo "${g.name}" debe tener al menos una opción o sabor`, 'warning');
        return;
      }
      for (let j = 0; j < g.options.length; j++) {
        if (!g.options[j].name.trim()) {
          addToast(`La opción #${j + 1} en "${g.name}" necesita un nombre`, 'warning');
          return;
        }
      }
    }

    try {
      setSaving(true);
      await api.post(`/modifiers/products/${product.id}`, { groups });
      addToast('Modificadores del producto guardados exitosamente', 'success');
      if (typeof onSaved === 'function') onSaved();
      onClose();
    } catch (err) {
      console.error('Error al guardar modificadores:', err);
      addToast(err.message || 'Error al guardar modificadores', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`🍨 Sabores, Toppings & Modificadores: ${product?.name || ''}`}
      maxWidth="880px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Barra Superior con Acciones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Personaliza los grupos de opciones o sabores para este producto.
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={loadTemplates}
              loading={loadingTemplates}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Plantillas & Grupos Guardados
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={handleAddGroup}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              Nuevo Grupo en Blanco
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Cargando modificadores...
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
            <Layers size={36} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Este producto aún no tiene modificadores
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Puedes agregar un grupo en blanco o importar una plantilla reutilizable con 1 clic.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <Button icon={<Download size={15} />} variant="secondary" onClick={loadTemplates}>
                Importar Plantilla Guardada
              </Button>
              <Button icon={<Plus size={15} />} onClick={handleAddGroup}>
                Crear Grupo en Blanco
              </Button>
            </div>
          </div>
        ) : (
          groups.map((group, gIdx) => (
            <div
              key={gIdx}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Header del Grupo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                    Nombre del Grupo #{gIdx + 1}
                  </label>
                  <input
                    type="text"
                    value={group.name}
                    onChange={(e) => handleUpdateGroupField(gIdx, 'name', e.target.value)}
                    placeholder="Ej. Sabores de Helado, Toppings, Tipo de Cono..."
                    style={{
                      width: '100%',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={group.min_selectable}
                      onChange={(e) => handleUpdateGroupField(gIdx, 'min_selectable', parseInt(e.target.value, 10) || 0)}
                      style={{ width: '60px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Máximo</label>
                    <input
                      type="number"
                      min="1"
                      value={group.max_selectable}
                      onChange={(e) => handleUpdateGroupField(gIdx, 'max_selectable', parseInt(e.target.value, 10) || 1)}
                      style={{ width: '60px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', color: 'var(--text-primary)', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={group.is_required}
                        onChange={(e) => handleUpdateGroupField(gIdx, 'is_required', e.target.checked)}
                      />
                      Obligatorio
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)', marginLeft: '6px' }}>
                      <input
                        type="checkbox"
                        checked={group.is_multiple}
                        onChange={(e) => handleUpdateGroupField(gIdx, 'is_multiple', e.target.checked)}
                      />
                      Repetir opción
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '14px' }}>
                    <button
                      type="button"
                      onClick={() => handleSaveAsTemplate(group)}
                      style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                      title="Guardar este grupo como plantilla reutilizable"
                    >
                      <Bookmark size={13} /> Guardar Plantilla
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(gIdx)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '6px' }}
                      title="Eliminar este grupo"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Opciones dentro del Grupo */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr 1.8fr 0.8fr 32px', gap: '6px', marginBottom: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  <span>Nombre Opción / Sabor</span>
                  <span>Precio Adic. ($)</span>
                  <span>Insumo de Inventario (Búsqueda)</span>
                  <span>Porción</span>
                  <span></span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(group.options || []).map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 0.9fr 1.8fr 0.8fr 32px',
                        gap: '6px',
                        alignItems: 'center',
                        background: 'var(--bg-secondary)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {/* Nombre de la opción */}
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => handleUpdateOptionField(gIdx, oIdx, 'name', e.target.value)}
                        placeholder="Ej. Fresa, Chispas..."
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '5px 8px',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          fontWeight: 600
                        }}
                      />

                      {/* Precio adicional */}
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={opt.price_modifier}
                        onChange={(e) => handleUpdateOptionField(gIdx, oIdx, 'price_modifier', e.target.value)}
                        placeholder="+$0"
                        style={{
                          width: '100%',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '5px 8px',
                          fontSize: '12px',
                          color: parseFloat(opt.price_modifier || 0) > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                          fontWeight: 700
                        }}
                      />

                      {/* Selector buscador de Insumo */}
                      <SearchableSupplySelect
                        value={opt.supply_id ? opt.supply_id.toString() : ''}
                        onChange={(val) => handleUpdateOptionField(gIdx, oIdx, 'supply_id', val)}
                        supplies={supplies}
                      />

                      {/* Cantidad de insumo por porción */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          disabled={!opt.supply_id}
                          value={opt.supply_quantity === '' ? '' : (opt.supply_quantity !== undefined && opt.supply_quantity !== null ? opt.supply_quantity : '')}
                          onChange={(e) => handleUpdateOptionField(gIdx, oIdx, 'supply_quantity', e.target.value)}
                          placeholder="0.0"
                          style={{
                            width: '100%',
                            background: opt.supply_id ? 'var(--bg-input)' : 'transparent',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '5px 6px',
                            fontSize: '12px',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px' }}>
                          {opt.unit_of_measure || 'und'}
                        </span>
                      </div>

                      {/* Eliminar opción */}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(gIdx, oIdx)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                        title="Eliminar opción"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => handleAddOption(gIdx)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    Añadir Fila de Opción / Sabor
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
          <div>
            {groups.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={15} />}
                onClick={handleAddGroup}
              >
                Agregar Otro Grupo
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button icon={<Save size={16} />} loading={saving} onClick={handleSave}>
              Guardar Modificadores del Producto
            </Button>
          </div>
        </div>
      </div>

      {/* Submodal para Importar Plantilla Guardada */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="📥 Biblioteca de Plantillas Guardadas"
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Selecciona una plantilla guardada para importarla a este producto con todos sus sabores, precios e insumos.
            </p>

            {templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 14px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <Bookmark size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No tienes plantillas guardadas
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Configura un grupo de modificadores en cualquier producto y haz clic en <strong>"⭐ Guardar Plantilla"</strong> para tenerlo siempre disponible aquí.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {tmpl.name}
                        <span style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                          Plantilla Guardada
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {(tmpl.options || []).length} opciones ({ (tmpl.options || []).map(o => o.name).slice(0, 4).join(', ') }{(tmpl.options || []).length > 4 ? '...' : ''})
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={(e) => handleDeleteTemplate(tmpl.id, tmpl.name, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                        title="Eliminar plantilla"
                      >
                        <Trash2 size={16} />
                      </button>
                      <Button
                        size="sm"
                        icon={<Download size={14} />}
                        onClick={() => handleImportTemplate(tmpl)}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        Importar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
