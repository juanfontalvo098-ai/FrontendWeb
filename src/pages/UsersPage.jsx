// src/pages/UsersPage.jsx
import React, { useState, useEffect } from 'react';
import {
  UserPlus, Edit, Shield, CheckSquare, Square, Trash2,
  Users, UserCheck, ShieldAlert, CheckCircle2, Lock,
  Store, Search, RefreshCw, KeyRound, Sparkles, Building2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';

// Grupos estructurados de todos los módulos del sistema POS & ERP
export const PERMISSION_GROUPS = [
  {
    category: 'Restaurante & Operaciones',
    color: '#6366f1',
    modules: [
      { path: '/', name: 'Dashboard Principal', desc: 'Panel resumen de ventas e indicadores' },
      { path: '/ordenes', name: 'Lista de Órdenes & POS', desc: 'Control de comandas, cobro y facturación' },
      { path: '/mesas', name: 'Mesas & Sala', desc: 'Distribución de salón y estado de mesas' },
      { path: '/cocina', name: 'Comandas Cocina (KDS)', desc: 'Pantalla interactiva de preparación en cocina' },
      { path: '/delivery', name: 'Delivery / Domicilios', desc: 'Gestión de despachos, zonas y repartidores' },
      { path: '/caja', name: 'Caja & Turnos', desc: 'Apertura, movimientos y arqueo de caja' },
    ]
  },
  {
    category: 'Inventario & Abastecimiento',
    color: '#10b981',
    modules: [
      { path: '/productos', name: 'Catálogo de Productos', desc: 'Carta, platos, combos y categorías' },
      { path: '/insumos', name: 'Insumos & Materia Prima', desc: 'Materia prima, compras y unidades de medida' },
      { path: '/inventario', name: 'Control de Stock & Kardex', desc: 'Existencias, movimientos y alertas mínimas' },
      { path: '/recetas', name: 'Fichas Técnicas / Recetas', desc: 'Costeo y explosión de insumos por plato' },
      { path: '/ordenes-compra', name: 'Órdenes de Compra', desc: 'Gestión de compras a proveedores y recepción' },
      { path: '/conteo-stock', name: 'Conteo Físico', desc: 'Auditorías y ajustes de inventario' },
      { path: '/proveedores', name: 'Proveedores', desc: 'Directorio de compras y contactos' },
    ]
  },
  {
    category: 'Comercial & CRM',
    color: '#f59e0b',
    modules: [
      { path: '/clientes', name: 'Clientes (CRM) & Cartera', desc: 'Historial, puntos de fidelidad y crédito CxC' },
      { path: '/descuentos', name: 'Promociones & Cupones', desc: 'Campañas, descuentos por horario y cupones' },
    ]
  },
  {
    category: 'Gestión & Finanzas',
    color: '#ec4899',
    modules: [
      { path: '/contabilidad', name: 'Contabilidad (PUC/P&L)', desc: 'Cuentas contables, balance y cartera' },
      { path: '/rrhh', name: 'RRHH & Nómina', desc: 'Contratos, pagos y control de turnos' },
      { path: '/reportes', name: 'Reportes & BI (Excel)', desc: 'Ventas por turno, insumos y analítica' },
    ]
  },
  {
    category: 'Configuración & Sistema',
    color: '#8b5cf6',
    modules: [
      { path: '/usuarios', name: 'Usuarios & Permisos', desc: 'Gestión de roles y accesos del personal' },
      { path: '/configuracion', name: 'Configuración General', desc: 'Impresoras térmicas, logo, datos del negocio' },
      { path: '/negocios', name: 'Negocios SaaS (Super Admin)', desc: 'Multi-empresa y administración de sucursales' },
    ]
  }
];

export const ALL_MODULES = PERMISSION_GROUPS.flatMap(g => g.modules);

// Plantillas preconfiguradas recomendadas según el rol seleccionado
export const ROLE_PRESET_PERMISSIONS = {
  super_admin: ALL_MODULES.map(m => m.path),
  admin: ALL_MODULES.filter(m => m.path !== '/negocios').map(m => m.path),
  gerente: [
    '/', '/ordenes', '/mesas', '/cocina', '/delivery', '/caja',
    '/productos', '/insumos', '/inventario', '/recetas', '/ordenes-compra', '/conteo-stock', '/proveedores',
    '/clientes', '/descuentos',
    '/contabilidad', '/rrhh', '/reportes',
    '/configuracion'
  ],
  cajero: [
    '/', '/ordenes', '/mesas', '/delivery', '/caja',
    '/clientes', '/descuentos',
    '/reportes'
  ],
  mesero: [
    '/', '/ordenes', '/mesas'
  ],
  cocinero: [
    '/cocina', '/insumos', '/recetas'
  ],
  repartidor: [
    '/delivery'
  ]
};

export const UsersPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mesero');
  const [branchId, setBranchId] = useState('');
  const [isActive, setIsActive] = useState(1);
  const [selectedPermissions, setSelectedPermissions] = useState(['/', '/mesas']);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([
        api.get('/users').catch(() => []),
        api.get('/branches').catch(() => [])
      ]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      addToast('Error al cargar la lista de personal', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('mesero');
    setBranchId('');
    setIsActive(1);
    setSelectedPermissions(ROLE_PRESET_PERMISSIONS.mesero || ['/', '/mesas']);
    setIsModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setPassword('');
    setRole(u.role);
    setBranchId(u.branch_id ? u.branch_id.toString() : '');
    setIsActive(u.is_active);

    if (Array.isArray(u.permissions) && u.permissions.length > 0) {
      setSelectedPermissions(u.permissions);
    } else {
      setSelectedPermissions(ROLE_PRESET_PERMISSIONS[u.role] || ['/', '/mesas']);
    }

    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    // Sugerir permisos automáticos según el rol
    if (ROLE_PRESET_PERMISSIONS[newRole]) {
      setSelectedPermissions(ROLE_PRESET_PERMISSIONS[newRole]);
    }
  };

  const handleApplyRolePreset = () => {
    if (ROLE_PRESET_PERMISSIONS[role]) {
      setSelectedPermissions(ROLE_PRESET_PERMISSIONS[role]);
      addToast(`Permisos restablecidos a la plantilla predeterminada de ${role}`, 'info');
    }
  };

  const togglePermission = (path) => {
    if (selectedPermissions.includes(path)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== path));
    } else {
      setSelectedPermissions([...selectedPermissions, path]);
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions(ALL_MODULES.map(m => m.path));
  };

  const handleDeselectAll = () => {
    setSelectedPermissions([]);
  };

  const handleToggleGroup = (groupModules) => {
    const groupPaths = groupModules.map(m => m.path);
    const allSelected = groupPaths.every(p => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter(p => !groupPaths.includes(p)));
    } else {
      const combined = Array.from(new Set([...selectedPermissions, ...groupPaths]));
      setSelectedPermissions(combined);
    }
  };

  const handleSaveUser = async () => {
    if (!username || !fullName) {
      addToast('El nombre de usuario y nombre completo son obligatorios', 'warning');
      return;
    }

    if (!editingUser && (!password || password.length < 4)) {
      addToast('La contraseña debe tener al menos 4 caracteres', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: fullName,
        role,
        is_active: isActive,
        branch_id: branchId ? parseInt(branchId, 10) : null,
        permissions: selectedPermissions,
        ...(password ? { password } : {})
      };

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        addToast('Usuario y permisos actualizados correctamente', 'success');
      } else {
        await api.post('/users', {
          ...payload,
          username,
          password
        });
        addToast('Usuario registrado y permisos asignados con éxito', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      addToast(err.message || 'Error al guardar usuario', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.is_active ? 0 : 1;
    try {
      await api.put(`/users/${user.id}`, {
        full_name: user.full_name,
        role: user.role,
        is_active: newStatus,
        branch_id: user.branch_id,
        permissions: user.permissions
      });
      addToast(`Usuario ${newStatus ? 'activado' : 'desactivado'} con éxito`, 'info');
      fetchData();
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      addToast('Error al cambiar el estado del usuario', 'danger');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar definitivamente al usuario @${user.username} (${user.full_name})?`)) return;
    try {
      await api.delete(`/users/${user.id}/permanent`);
      addToast('Usuario eliminado del sistema', 'info');
      fetchData();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      addToast(err.message || 'Error al eliminar usuario', 'danger');
    }
  };

  const getRoleBadge = (userRole) => {
    switch (userRole) {
      case 'super_admin':
        return <Badge variant="primary" style={{ background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 800 }}>Super Admin</Badge>;
      case 'admin':
        return <Badge variant="danger" style={{ fontSize: '11px', fontWeight: 800 }}>Administrador</Badge>;
      case 'gerente':
        return <Badge variant="warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid #f59e0b', fontSize: '11px', fontWeight: 700 }}>Gerente</Badge>;
      case 'cajero':
        return <Badge variant="info" style={{ fontSize: '11px', fontWeight: 700 }}>Cajero</Badge>;
      case 'mesero':
        return <Badge variant="success" style={{ fontSize: '11px', fontWeight: 700 }}>Mesero</Badge>;
      case 'cocinero':
        return <Badge variant="secondary" style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c', border: '1px solid #ea580c', fontSize: '11px', fontWeight: 700 }}>Cocinero</Badge>;
      case 'repartidor':
        return <Badge variant="info" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#0891b2', border: '1px solid #0891b2', fontSize: '11px', fontWeight: 700 }}>Repartidor</Badge>;
      default:
        return <Badge variant="secondary" style={{ fontSize: '11px' }}>{userRole}</Badge>;
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em', margin: 0 }}>
            <Users size={24} color="var(--accent-primary)" />
            Usuarios, Personal & Matriz de Permisos
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Control de cuentas de acceso, roles operacionales y permisos granulares para todos los módulos de la plataforma
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />} onClick={fetchData}>
            Actualizar
          </Button>
          <Button variant="primary" icon={<UserPlus size={16} />} onClick={handleOpenNewUser}>
            + Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card style={{ marginBottom: '16px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o rol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Filtrar por Rol:</span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'admin', label: 'Admin' },
              { id: 'gerente', label: 'Gerente' },
              { id: 'cajero', label: 'Cajero' },
              { id: 'mesero', label: 'Mesero' },
              { id: 'cocinero', label: 'Cocinero' },
              { id: 'repartidor', label: 'Repartidor' }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoleFilter(r.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: roleFilter === r.id ? 700 : 500,
                  border: roleFilter === r.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: roleFilter === r.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-primary)',
                  color: roleFilter === r.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabla de Usuarios */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px' }}>EMPLEADO / USUARIO</th>
                <th style={{ padding: '12px 14px' }}>ROL ASIGNADO</th>
                <th style={{ padding: '12px 14px' }}>SUCURSAL</th>
                <th style={{ padding: '12px 14px' }}>ACCESO A MÓDULOS & PERMISOS</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ESTADO</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      No se encontraron usuarios
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {searchQuery ? `No hay coincidencias para "${searchQuery}".` : 'No hay usuarios registrados con el filtro seleccionado.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const hasCustomPerms = Array.isArray(u.permissions) && u.permissions.length > 0;
                  const permsCount = hasCustomPerms ? u.permissions.length : (ROLE_PRESET_PERMISSIONS[u.role] || []).length;
                  const totalModules = ALL_MODULES.length;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Empleado / Usuario */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {u.full_name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            @{u.username}
                          </span>
                        </div>
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '12px 14px' }}>
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Sucursal */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                          <Building2 size={13} color="var(--text-muted)" />
                          <span>{u.branch_name || 'Todas las sucursales'}</span>
                        </div>
                      </td>

                      {/* Permisos & Módulos */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge variant={u.role === 'admin' || u.role === 'super_admin' ? 'danger' : 'info'} style={{ fontSize: '10px', padding: '1px 6px' }}>
                              {u.role === 'super_admin' ? 'Acceso Total SaaS' : u.role === 'admin' ? 'Administrador Total' : `${permsCount} de ${totalModules} módulos`}
                            </Badge>
                            {!hasCustomPerms && u.role !== 'admin' && u.role !== 'super_admin' && (
                              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>(Por Defecto del Rol)</span>
                            )}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', maxWidth: '420px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.role === 'admin' || u.role === 'super_admin' ? (
                              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Todos los módulos operacionales y de gestión habilitados</span>
                            ) : (
                              (hasCustomPerms ? u.permissions : (ROLE_PRESET_PERMISSIONS[u.role] || []))
                                .map(p => ALL_MODULES.find(m => m.path === p)?.name)
                                .filter(Boolean)
                                .join(', ') || 'Sin permisos asignados'
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <Badge variant={u.is_active ? 'success' : 'danger'} style={{ fontSize: '10.5px' }}>
                          {u.is_active ? '✓ Activo' : 'Inactivo'}
                        </Badge>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600 }}
                            title="Editar usuario o permisos"
                          >
                            <Edit size={12} /> Editar
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', color: u.is_active ? 'var(--accent-danger)' : '#10b981', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                            title={u.is_active ? 'Desactivar acceso' : 'Activar acceso'}
                          >
                            <Shield size={12} /> {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', padding: '4px 6px', color: 'var(--accent-danger)', cursor: 'pointer' }}
                            title="Eliminar usuario permanentemente"
                          >
                            <Trash2 size={12} />
                          </button>
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

      {/* Modal Usuario y Asignación de Permisos Granulares */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? `Editar Personal & Permisos — @${editingUser.username}` : 'Registrar Nuevo Miembro de Personal'}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Datos Básicos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {!editingUser ? (
                <Input
                  label="Nombre de Usuario (Login) *"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. mesero_carlos"
                  required
                />
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    Usuario (Login)
                  </label>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    @{editingUser.username}
                  </div>
                </div>
              )}

              <Input
                label="Nombre Completo del Empleado *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label={editingUser ? 'Nueva Contraseña (dejar en blanco para conservar)' : 'Contraseña de Acceso *'}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? '******' : 'Mínimo 4 caracteres'}
              />

              <Select
                label="Rol Principal del Sistema *"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                options={[
                  { value: 'mesero', label: 'Mesero / Servicio' },
                  { value: 'cajero', label: 'Cajero / Facturación' },
                  { value: 'cocinero', label: 'Cocinero / Pantalla Cocina' },
                  { value: 'repartidor', label: 'Repartidor / Delivery' },
                  { value: 'gerente', label: 'Gerente de Sucursal' },
                  { value: 'admin', label: 'Administrador del Negocio' },
                  { value: 'super_admin', label: 'Super Administrador SaaS' }
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Select
                label="Sucursal Asignada"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                options={[
                  { value: '', label: 'Todas las sucursales (Global)' },
                  ...branches.map(b => ({ value: b.id.toString(), label: `Sucursal: ${b.name}` }))
                ]}
              />

              {editingUser && (
                <Select
                  label="Estado de la Cuenta"
                  value={isActive.toString()}
                  onChange={(e) => setIsActive(parseInt(e.target.value, 10))}
                  options={[
                    { value: '1', label: 'Activo' },
                    { value: '0', label: 'Inactivo / Suspendido' }
                  ]}
                />
              )}
            </div>

            {/* Panel de Permisos por Módulo */}
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <KeyRound size={15} color="var(--accent-primary)" />
                    Matriz de Permisos & Módulos Visibles
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Selecciona individualmente qué apartados de la barra lateral puede ver y operar este usuario.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleApplyRolePreset}
                    style={{ padding: '3px 8px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--accent-primary)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Sparkles size={11} /> Cargar Recomendados ({role})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={{ padding: '3px 8px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Marcar Todos
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    style={{ padding: '3px 8px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Categorías de Permisos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                {PERMISSION_GROUPS.map((grp) => {
                  const groupPaths = grp.modules.map(m => m.path);
                  const isGroupAllSelected = groupPaths.every(p => selectedPermissions.includes(p));
                  const isGroupSomeSelected = groupPaths.some(p => selectedPermissions.includes(p));

                  return (
                    <div key={grp.category} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: grp.color }} />
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {grp.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(grp.modules)}
                          style={{ fontSize: '10px', background: 'none', border: 'none', color: isGroupAllSelected ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          {isGroupAllSelected ? 'Deseleccionar grupo' : 'Seleccionar grupo'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                        {grp.modules.map((mod) => {
                          const isSelected = selectedPermissions.includes(mod.path);
                          return (
                            <div
                              key={mod.path}
                              onClick={() => togglePermission(mod.path)}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                transition: 'all 0.1s'
                              }}
                            >
                              <div style={{ marginTop: '2px' }}>
                                {isSelected ? (
                                  <CheckSquare size={15} color="var(--accent-primary)" />
                                ) : (
                                  <Square size={15} color="var(--text-muted)" />
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11.5px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                  {mod.name}
                                </span>
                                <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                                  {mod.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" loading={submitting} onClick={handleSaveUser} icon={<CheckCircle2 size={15} />}>
                Guardar Usuario y Permisos ({selectedPermissions.length} módulos)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
