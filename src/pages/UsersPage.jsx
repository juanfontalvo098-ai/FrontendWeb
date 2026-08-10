// src/pages/UsersPage.jsx
import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Shield, CheckSquare, Square, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { api } from '../api/client';
import { useUiStore } from '../store/uiStore';

const MODULES_LIST = [
  { path: '/', name: 'Dashboard' },
  { path: '/mesas', name: 'Mesas' },
  { path: '/cocina', name: 'Cocina' },
  { path: '/caja', name: 'Caja' },
  { path: '/facturacion', name: 'Facturación' },
  { path: '/reportes', name: 'Reportes Z & Excel' },
  { path: '/productos', name: 'Productos' },
  { path: '/usuarios', name: 'Usuarios / Personal' },
  { path: '/configuracion', name: 'Configuración' }
];

export const UsersPage = () => {
  const addToast = useUiStore((state) => state.addToast);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('mesero');
  const [isActive, setIsActive] = useState(1);
  const [selectedPermissions, setSelectedPermissions] = useState(['/', '/mesas']);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/users');
      setUsers(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('mesero');
    setIsActive(1);
    setSelectedPermissions(['/', '/mesas']);
    setIsModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setPassword('');
    setRole(u.role);
    setIsActive(u.is_active);
    
    if (Array.isArray(u.permissions) && u.permissions.length > 0) {
      setSelectedPermissions(u.permissions);
    } else {
      if (u.role === 'admin') setSelectedPermissions(MODULES_LIST.map(m => m.path));
      else if (u.role === 'cajero') setSelectedPermissions(['/', '/mesas', '/caja', '/facturacion', '/reportes']);
      else if (u.role === 'cocinero') setSelectedPermissions(['/cocina']);
      else setSelectedPermissions(['/', '/mesas']);
    }
    
    setIsModalOpen(true);
  };

  const togglePermission = (path) => {
    if (selectedPermissions.includes(path)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== path));
    } else {
      setSelectedPermissions([...selectedPermissions, path]);
    }
  };

  const handleSaveUser = async () => {
    if (!username || !fullName) {
      addToast('Nombre de usuario y nombre completo son obligatorios', 'warning');
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
        permissions: selectedPermissions,
        ...(password ? { password } : {})
      };

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        addToast('Usuario actualizado correctamente', 'success');
      } else {
        await api.post('/users', {
          ...payload,
          username,
          password
        });
        addToast('Usuario registrado correctamente', 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
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
        permissions: user.permissions
      });
      addToast(`Usuario ${newStatus ? 'activado' : 'desactivado'}`, 'info');
      fetchUsers();
    } catch (err) {
      addToast('Error al cambiar estado del usuario', 'danger');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente al usuario @${user.username}?`)) return;
    try {
      await api.delete(`/users/${user.id}/permanent`);
      addToast('Usuario eliminado definitivamente', 'info');
      fetchUsers();
    } catch (err) {
      addToast(err.message || 'Error al eliminar usuario', 'danger');
    }
  };

  if (loading) {
    return <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Cargando equipo de usuarios...</div>;
  }

  return (
    <div>
      <Card header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Gestión de Personal y Asignación de Permisos</span>
          <Button size="sm" icon={<UserPlus size={16} />} onClick={handleOpenNewUser}>
            Nuevo Usuario
          </Button>
        </div>
      }>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 8px' }}>Nombre Completo</th>
              <th style={{ padding: '12px 8px' }}>Usuario Login</th>
              <th style={{ padding: '12px 8px' }}>Rol Asignado</th>
              <th style={{ padding: '12px 8px' }}>Apartados Permitidos</th>
              <th style={{ padding: '12px 8px' }}>Estado</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{u.full_name}</td>
                <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>@{u.username}</td>
                <td style={{ padding: '12px 8px', textTransform: 'capitalize' }}>
                  <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'cajero' ? 'warning' : u.role === 'mesero' ? 'success' : 'info'}>
                    {u.role}
                  </Badge>
                </td>
                <td style={{ padding: '12px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {u.role === 'admin' ? 'Acceso Total (Administrador)' : (
                    Array.isArray(u.permissions) && u.permissions.length > 0 
                      ? u.permissions.map(p => MODULES_LIST.find(m => m.path === p)?.name).filter(Boolean).join(', ')
                      : 'Permisos por Defecto del Rol'
                  )}
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <Badge variant={u.is_active ? 'success' : 'danger'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  <button onClick={() => handleOpenEditUser(u)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: '10px' }} title="Editar rol o permisos">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleToggleStatus(u)} style={{ background: 'none', border: 'none', color: u.is_active ? 'var(--accent-danger)' : 'var(--accent-primary)', cursor: 'pointer', marginRight: '10px' }} title={u.is_active ? 'Desactivar' : 'Activar'}>
                    <Shield size={16} />
                  </button>
                  <button onClick={() => handleDeleteUser(u)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} title="Eliminar definitivamente">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal Usuario y Asignación de Permisos */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? `Editar Usuario @${editingUser.username}` : 'Registrar Nuevo Usuario'}>
        <div>
          {!editingUser && (
            <Input 
              label="Nombre de usuario (Login)" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Ej. mesero_carlos" 
            />
          )}
          <Input 
            label="Nombre completo del empleado" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            placeholder="Ej. Carlos Mendoza" 
          />
          
          <Input 
            label={editingUser ? "Nueva contraseña (dejar en blanco para conservar)" : "Contraseña de acceso"} 
            type="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="******" 
          />

          <Select 
            label="Rol Principal" 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: 'mesero', label: 'Mesero' },
              { value: 'cajero', label: 'Cajero' },
              { value: 'cocinero', label: 'Cocinero' },
              { value: 'admin', label: 'Administrador' }
            ]}
          />

          <div style={{ marginTop: '12px', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px' }}>
            <label style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>
              Asignación Personalizada de Apartados Visibles:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {MODULES_LIST.map(mod => {
                const isSelected = selectedPermissions.includes(mod.path);
                return (
                  <div 
                    key={mod.path}
                    onClick={() => togglePermission(mod.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                      padding: '6px 8px', borderRadius: '4px', background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      border: '1px solid var(--border-color)', fontSize: '12px', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {isSelected ? <CheckSquare size={16} color="var(--accent-primary)" /> : <Square size={16} />}
                    <span>{mod.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {editingUser && (
            <Select 
              label="Estado de la cuenta" 
              value={isActive.toString()} 
              onChange={(e) => setIsActive(parseInt(e.target.value, 10))}
              options={[
                { value: '1', label: 'Activo' },
                { value: '0', label: 'Inactivo / Suspendido' }
              ]}
            />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button loading={submitting} onClick={handleSaveUser}>Guardar Usuario y Permisos</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
