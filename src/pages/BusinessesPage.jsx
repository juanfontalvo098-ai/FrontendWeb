// src/pages/BusinessesPage.jsx — SaaS Platform Admin (Gestión de Clientes, Negocios y Sucursales)
import React, { useState, useEffect } from 'react';
import { Building2, Plus, Store, Users, MapPin, Eye, Edit2, Trash2, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';

export const BusinessesPage = () => {
  const addToast = useUiStore(state => state.addToast);
  const { user, switchBusiness, isSuperAdmin } = useAuth();

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Nuevo / Editar Negocio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [nit, setNit] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [plan, setPlan] = useState('pro');
  const [maxBranches, setMaxBranches] = useState('3');
  const [isActive, setIsActive] = useState(true);

  // Campos para nuevo negocio
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Modal Gestión de Sucursales
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // Confirmar eliminación
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null); // { type: 'business'|'branch', item }

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const data = await api.get('/businesses');
      setBusinesses(data);
    } catch (err) {
      addToast(err.message || 'Error al cargar negocios', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleOpenNewModal = () => {
    setEditingBusiness(null);
    setName(''); setNit(''); setBusinessType('restaurant');
    setPlan('pro'); setMaxBranches('3'); setIsActive(true);
    setAdminUsername(''); setAdminPassword('admin123');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (biz) => {
    setEditingBusiness(biz);
    setName(biz.name);
    setNit(biz.nit || '');
    setBusinessType(biz.business_type || 'restaurant');
    setPlan(biz.plan || 'pro');
    setMaxBranches((biz.max_branches || 3).toString());
    setIsActive(biz.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSaveBusiness = async () => {
    if (!name) {
      addToast('El nombre del negocio es obligatorio', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      if (editingBusiness) {
        // Actualizar Negocio
        await api.put(`/businesses/${editingBusiness.id}`, {
          name,
          nit,
          business_type: businessType,
          plan,
          max_branches: parseInt(maxBranches, 10),
          is_active: isActive
        });
        addToast('Negocio actualizado exitosamente', 'success');
      } else {
        // Crear Nuevo Negocio + Provisionar
        await api.post('/businesses', {
          name,
          nit,
          business_type: businessType,
          plan,
          max_branches: parseInt(maxBranches, 10),
          admin_username: adminUsername || undefined,
          admin_password: adminPassword || undefined
        });
        addToast(`🎉 ¡Negocio "${name}" provisionado exitosamente!`, 'success', 6000);
      }

      setIsModalOpen(false);
      fetchBusinesses();
    } catch (err) {
      addToast(err.message || 'Error al guardar negocio', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBusiness = async (biz) => {
    try {
      await api.delete(`/businesses/${biz.id}/permanent`);
      addToast(`Negocio "${biz.name}" eliminado definitivamente`, 'info');
      setDeleteConfirmTarget(null);
      fetchBusinesses();
    } catch (err) {
      addToast(err.message || 'Error al eliminar negocio', 'danger');
    }
  };

  // --- GESTIÓN DE SUCURSALES ---
  const handleOpenBranchesModal = async (biz) => {
    setSelectedBusiness(biz);
    setEditingBranch(null);
    setBranchName(''); setBranchCode(''); setBranchAddress(''); setBranchPhone('');
    setIsBranchModalOpen(true);
    fetchBranches(biz.id);
  };

  const fetchBranches = async (businessId) => {
    try {
      const data = await api.get(`/businesses/${businessId}/branches`);
      setBranches(data);
    } catch (err) {
      setBranches([]);
    }
  };

  const handleSaveBranch = async () => {
    if (!branchName || !branchCode) {
      addToast('Nombre y código (ej: MDE-01) son obligatorios', 'warning');
      return;
    }

    try {
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, {
          name: branchName,
          code: branchCode,
          address: branchAddress,
          phone: branchPhone
        });
        addToast('Sucursal actualizada', 'success');
      } else {
        await api.post(`/businesses/${selectedBusiness.id}/branches`, {
          name: branchName,
          code: branchCode,
          address: branchAddress,
          phone: branchPhone
        });
        addToast('Sucursal creada exitosamente', 'success');
      }

      setEditingBranch(null);
      setBranchName(''); setBranchCode(''); setBranchAddress(''); setBranchPhone('');
      fetchBranches(selectedBusiness.id);
      fetchBusinesses();
    } catch (err) {
      addToast(err.message || 'Error al guardar sucursal', 'danger');
    }
  };

  const handleStartEditBranch = (b) => {
    setEditingBranch(b);
    setBranchName(b.name);
    setBranchCode(b.code);
    setBranchAddress(b.address || '');
    setBranchPhone(b.phone || '');
  };

  const handleDeleteBranch = async (branchId) => {
    try {
      await api.delete(`/branches/${branchId}/permanent`);
      addToast('Sucursal eliminada definitivamente', 'info');
      fetchBranches(selectedBusiness.id);
      fetchBusinesses();
    } catch (err) {
      addToast(err.message || 'Error al eliminar sucursal', 'danger');
    }
  };

  const getPlanBadgeVariant = (planName) => {
    if (planName === 'enterprise') return 'danger';
    if (planName === 'pro') return 'primary';
    return 'info';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={28} color="var(--accent-primary)" /> Plataforma SaaS — Clientes & Negocios
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Edita, gestiona sucursales o elimina establecimientos cliente de la plataforma.
          </p>
        </div>

        {isSuperAdmin() && (
          <Button onClick={handleOpenNewModal} variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Nuevo Cliente / Negocio
          </Button>
        )}
      </div>

      {/* Lista de Negocios */}
      {loading ? (
        <Card style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando empresas cliente...
        </Card>
      ) : businesses.length === 0 ? (
        <Card style={{ padding: '40px', textAlign: 'center' }}>
          <Building2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3>No hay clientes registrados</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Haz clic en "Nuevo Cliente / Negocio" para dar de alta un restaurante o bar.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {businesses.map((biz) => {
            const isCurrentActive = user?.businessId === biz.id;
            return (
              <Card 
                key={biz.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  padding: '20px',
                  border: isCurrentActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  opacity: biz.is_active ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px', color: 'var(--accent-secondary)' }}>
                      {biz.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{biz.name}</h3>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NIT: {biz.nit || 'Sin NIT'} • {biz.slug}</div>
                    </div>
                  </div>

                  {isSuperAdmin() && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={() => handleOpenEditModal(biz)}
                        style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }} 
                        title="Editar Negocio"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmTarget({ type: 'business', item: biz })}
                        style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '6px', color: 'var(--accent-danger)', cursor: 'pointer', padding: '6px' }} 
                        title="Eliminar Negocio"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Badge variant={getPlanBadgeVariant(biz.plan)}>Plan: {biz.plan?.toUpperCase()}</Badge>
                  <Badge variant="info">Tipo: {biz.business_type}</Badge>
                  <Badge variant="warning">{biz.branches_count || 1} / {biz.max_branches} Sucursales</Badge>
                  {!biz.is_active && <Badge variant="danger">Inactivo</Badge>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={14} /> {biz.users_count || 1} Usuarios
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleOpenBranchesModal(biz)}
                      style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <MapPin size={12} /> Sucursales ({biz.branches_count || 1})
                    </Button>
                    
                    {isSuperAdmin() && !isCurrentActive && (
                      <Button 
                        size="sm" 
                        variant="primary" 
                        onClick={() => switchBusiness(biz.id)}
                        style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> Ingresar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR NEGOCIO */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingBusiness ? `✏️ Editar Negocio — ${editingBusiness.name}` : '➕ Alta de Nuevo Cliente / Negocio'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Nombre del Restaurante / Negocio *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Restaurante El Rancherito" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>NIT / Identificación Fiscal</label>
              <Input value={nit} onChange={e => setNit(e.target.value)} placeholder="900.888.777-1" />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Tipo de Establecimiento</label>
              <select 
                value={businessType} 
                onChange={e => setBusinessType(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="restaurant">Restaurante</option>
                <option value="bar">Bar / Discoteca</option>
                <option value="fast_food">Comida Rápida</option>
                <option value="cafe">Cafetería</option>
                <option value="food_truck">Food Truck</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Plan SaaS</label>
              <select 
                value={plan} 
                onChange={e => setPlan(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="free">Básico / Demo (1 Sucursal)</option>
                <option value="pro">Pro (hasta 5 Sucursales)</option>
                <option value="enterprise">Enterprise (Sucursales Ilimitadas)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Máx. Sucursales Permitidas</label>
              <Input type="number" value={maxBranches} onChange={e => setMaxBranches(e.target.value)} />
            </div>
          </div>

          {editingBusiness && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> Negocio Activo en Plataforma
              </label>
            </div>
          )}

          {!editingBusiness && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--accent-secondary)' }}>
                👤 Cuenta Administrador para el Cliente
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Usuario Admin</label>
                  <Input value={adminUsername} onChange={e => setAdminUsername(e.target.value)} placeholder="Auto-generado si vacío" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Contraseña Inicial</label>
                  <Input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveBusiness} disabled={submitting}>
              {submitting ? 'Guardando...' : editingBusiness ? 'Guardar Cambios' : 'Crear y Provisionar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL GESTIÓN DE SUCURSALES */}
      <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title={`🏢 Sucursales — ${selectedBusiness?.name || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Formulario Agregar / Editar Sucursal */}
          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700 }}>
              {editingBranch ? `✏️ Modificar Sucursal: ${editingBranch.name}` : '+ Agregar Nueva Sucursal'}
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <Input placeholder="Nombre (ej: Sucursal Poblado)" value={branchName} onChange={e => setBranchName(e.target.value)} />
              <Input placeholder="Código (ej: POB-01)" value={branchCode} onChange={e => setBranchCode(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <Input placeholder="Dirección" value={branchAddress} onChange={e => setBranchAddress(e.target.value)} />
              <Input placeholder="Teléfono" value={branchPhone} onChange={e => setBranchPhone(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {editingBranch && (
                <Button size="sm" variant="secondary" onClick={() => { setEditingBranch(null); setBranchName(''); setBranchCode(''); }}>
                  Cancelar Edición
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={handleSaveBranch}>
                {editingBranch ? 'Guardar Sucursal' : 'Agregar Sucursal'}
              </Button>
            </div>
          </div>

          {/* Lista de Sucursales Existentes */}
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {branches.map(b => (
              <div 
                key={b.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '10px 12px', 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)' 
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Código: <span style={{ fontWeight: 700 }}>{b.code}</span> • {b.address || 'Sin dirección'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => handleStartEditBranch(b)}
                    style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
                    title="Editar Sucursal"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmTarget({ type: 'branch', item: b })}
                    style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', color: 'var(--accent-danger)', cursor: 'pointer', padding: '6px' }}
                    title="Eliminar Sucursal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      <Modal isOpen={!!deleteConfirmTarget} onClose={() => setDeleteConfirmTarget(null)} title="⚠️ Confirmar Eliminación">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            ¿Estás seguro de que deseas eliminar definitivamente {deleteConfirmTarget?.type === 'business' ? `el negocio "${deleteConfirmTarget?.item.name}"` : `la sucursal "${deleteConfirmTarget?.item.name}"`}?
          </p>
          <div style={{ fontSize: '12px', color: 'var(--accent-danger)', background: 'rgba(225,29,72,0.1)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            ⚠️ Esta acción es irreversible y eliminará todos los datos asociados en la base de datos.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="secondary" onClick={() => setDeleteConfirmTarget(null)}>Cancelar</Button>
            <Button 
              variant="danger" 
              onClick={() => {
                if (deleteConfirmTarget.type === 'business') {
                  handleDeleteBusiness(deleteConfirmTarget.item);
                } else {
                  handleDeleteBranch(deleteConfirmTarget.item.id);
                  setDeleteConfirmTarget(null);
                }
              }}
            >
              Sí, Eliminar Definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
