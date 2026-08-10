// src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, ChefHat, Wallet, FileText, Package, Users, Settings, LogOut, X, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUiStore } from '../../store/uiStore';
import { Badge } from '../ui/Badge';

const MENU_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, defaultRoles: ['admin', 'cajero', 'mesero'] },
  { path: '/mesas', label: 'Mesas', icon: UtensilsCrossed, defaultRoles: ['admin', 'cajero', 'mesero'] },
  { path: '/cocina', label: 'Cocina', icon: ChefHat, defaultRoles: ['admin', 'cocinero'] },
  { path: '/caja', label: 'Caja', icon: Wallet, defaultRoles: ['admin', 'cajero'] },
  { path: '/facturacion', label: 'Facturación', icon: FileText, defaultRoles: ['admin', 'cajero'] },
  { path: '/reportes', label: 'Reportes Z & Excel', icon: FileSpreadsheet, defaultRoles: ['admin', 'cajero'] },
  { path: '/productos', label: 'Productos', icon: Package, defaultRoles: ['admin'] },
  { path: '/usuarios', label: 'Usuarios / Personal', icon: Users, defaultRoles: ['admin'] },
  { path: '/configuracion', label: 'Configuración', icon: Settings, defaultRoles: ['admin'] },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const sidebarOpen = useUiStore(state => state.sidebarOpen);
  const toggleSidebar = useUiStore(state => state.toggleSidebar);

  if (!user) return null;

  const allowedItems = MENU_ITEMS.filter(item => {
    if (user.role === 'admin') return true;
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions.includes(item.path);
    }
    return item.defaultRoles.includes(user.role);
  });

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  };

  return (
    <>
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          style={{
            display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99
          }}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-backdrop { display: block !important; }
          .sidebar {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            z-index: 100 !important;
            box-shadow: 4px 0 20px rgba(0,0,0,0.5) !important;
          }
        }
      `}</style>

      <aside className="sidebar" style={{ width: sidebarOpen ? '260px' : '0', overflow: 'hidden', transition: 'all 0.3s ease' }}>
        <div style={{ padding: 'var(--space-4) var(--space-6)', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ background: 'var(--accent-primary)', padding: '8px', borderRadius: 'var(--radius-md)' }}>
                <UtensilsCrossed size={20} color="white" />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
                JF <span style={{ color: 'var(--accent-secondary)' }}>POS</span>
              </h1>
            </div>
            <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: window.innerWidth <= 768 ? 'block' : 'none' }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '44px' }}>
            Control total. Operación impecable.
          </div>
        </div>

        <nav style={{ flex: 1, padding: 'var(--space-4) 0', overflowY: 'auto' }}>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {allowedItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path}
                  onClick={handleLinkClick}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-6)',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    background: isActive ? 'var(--bg-hover)' : 'transparent',
                    borderRight: isActive ? '4px solid var(--accent-secondary)' : '4px solid transparent',
                    transition: 'all 0.2s ease',
                    fontWeight: isActive ? 700 : 400
                  })}
                >
                  <item.icon size={20} color={undefined} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {(user.full_name || user.name || user.username)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.full_name || user.name || user.username}</div>
              <Badge variant={user.role === 'admin' ? 'danger' : 'info'} className="mt-1">{user.role}</Badge>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', padding: 'var(--space-2)', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
