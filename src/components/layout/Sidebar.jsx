import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, ChefHat, Wallet, FileText,
  Package, Users, Settings, LogOut, X, FileSpreadsheet, Building2,
  Bike, ShoppingBag, Layers, ClipboardList, Percent, Landmark, UserCheck,
  Truck, Boxes, ChevronDown, ListOrdered
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUiStore } from '../../store/uiStore';
import { Badge } from '../ui/Badge';

const MENU_CATEGORIES = [
  {
    id: 'principal',
    title: 'Principal',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero', 'mesero'] },
      { path: '/negocios', label: 'Negocios SaaS', icon: Building2, defaultRoles: ['super_admin'] },
    ]
  },
  {
    id: 'restaurante',
    title: 'Restaurante & Operaciones',
    items: [
      { path: '/ordenes', label: 'Lista de Órdenes', icon: ListOrdered, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero', 'mesero'] },
      { path: '/mesas', label: 'Mesas & Sala', icon: UtensilsCrossed, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero', 'mesero'] },
      { path: '/cocina', label: 'Comandas Cocina', icon: ChefHat, defaultRoles: ['super_admin', 'admin', 'gerente', 'cocinero'] },
      { path: '/delivery', label: 'Delivery / Domicilios', icon: Bike, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero'] },
      { path: '/caja', label: 'Caja & Turnos', icon: Wallet, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero'] },
    ]
  },
  {
    id: 'inventario',
    title: 'Inventario & Abastecimiento',
    items: [
      { path: '/productos', label: 'Catálogo de Productos', icon: Package, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/insumos', label: 'Insumos & Materia Prima', icon: Boxes, defaultRoles: ['super_admin', 'admin', 'gerente', 'cocinero'] },
      { path: '/inventario', label: 'Control de Stock', icon: Package, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/recetas', label: 'Fichas Técnicas / Recetas', icon: Layers, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/ordenes-compra', label: 'Órdenes de Compra', icon: ShoppingBag, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/conteo-stock', label: 'Conteo Físico', icon: ClipboardList, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/proveedores', label: 'Proveedores', icon: Truck, defaultRoles: ['super_admin', 'admin', 'gerente'] },
    ]
  },
  {
    id: 'comercial',
    title: 'Comercial & CRM',
    items: [
      { path: '/clientes', label: 'Clientes (CRM)', icon: Users, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero'] },
      { path: '/descuentos', label: 'Promociones & Cupones', icon: Percent, defaultRoles: ['super_admin', 'admin', 'gerente'] },
    ]
  },
  {
    id: 'finanzas',
    title: 'Gestión & Finanzas',
    items: [
      { path: '/contabilidad', label: 'Contabilidad (PUC/P&L)', icon: Landmark, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/rrhh', label: 'RRHH & Nómina', icon: UserCheck, defaultRoles: ['super_admin', 'admin', 'gerente'] },
      { path: '/reportes', label: 'Reportes & BI', icon: FileSpreadsheet, defaultRoles: ['super_admin', 'admin', 'gerente', 'cajero'] },
    ]
  },
  {
    id: 'sistema',
    title: 'Configuración & Sistema',
    items: [
      { path: '/usuarios', label: 'Usuarios & Permisos', icon: Users, defaultRoles: ['super_admin', 'admin'] },
      { path: '/configuracion', label: 'Configuración', icon: Settings, defaultRoles: ['super_admin', 'admin', 'gerente'] },
    ]
  }
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const sidebarOpen = useUiStore(state => state.sidebarOpen);
  const toggleSidebar = useUiStore(state => state.toggleSidebar);

  // Estado de colapsado por categoría
  const [collapsedCategories, setCollapsedCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_sidebar_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  if (!user) return null;

  const isItemAllowed = (item) => {
    if (item.path === '/negocios') return user.role === 'super_admin';
    if (['super_admin', 'admin'].includes(user.role)) return true;
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions.includes(item.path);
    }
    return item.defaultRoles.includes(user.role);
  };

  const filteredCategories = MENU_CATEGORIES.map(category => ({
    ...category,
    items: category.items.filter(isItemAllowed)
  })).filter(category => category.items.length > 0);

  // Asegurar que la categoría que contiene la ruta activa esté siempre desplegada
  useEffect(() => {
    const currentPath = location.pathname;
    filteredCategories.forEach(cat => {
      const hasActiveItem = cat.items.some(item =>
        item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path))
      );
      if (hasActiveItem && collapsedCategories[cat.id]) {
        setCollapsedCategories(prev => {
          const next = { ...prev, [cat.id]: false };
          localStorage.setItem('pos_sidebar_collapsed', JSON.stringify(next));
          return next;
        });
      }
    });
  }, [location.pathname]);

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [catId]: !prev[catId] };
      localStorage.setItem('pos_sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
  };

  const getRoleBadgeVariant = (role) => {
    if (role === 'super_admin') return 'danger';
    if (role === 'admin') return 'danger';
    if (role === 'gerente') return 'warning';
    return 'info';
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
        .sidebar-category-header {
          text-align: left !important;
          justify-content: space-between !important;
        }
        .sidebar-category-header:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary) !important;
        }
      `}</style>

      <aside className="sidebar" style={{ width: sidebarOpen ? '240px' : '0', overflow: 'hidden', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column' }}>
        {/* Header / Logo */}
        <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'var(--accent-primary)', padding: '6px', borderRadius: 'var(--radius-md)' }}>
                <UtensilsCrossed size={16} color="white" />
              </div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>
                JF <span style={{ color: 'var(--accent-secondary)' }}>POS ERP</span>
              </h1>
            </div>
            <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: window.innerWidth <= 768 ? 'block' : 'none' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '32px' }}>
            {user.role === 'super_admin' ? 'Plataforma SaaS Multi-tenant' : 'Gestión Integral Restaurante'}
          </div>
        </div>

        {/* Navigation Categories (Acordeón Plegable) */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {filteredCategories.map((cat) => {
            const isCollapsed = Boolean(collapsedCategories[cat.id]);
            const hasActiveChild = cat.items.some(item =>
              item.path === location.pathname || (item.path !== '/' && location.pathname.startsWith(item.path))
            );

            return (
              <div key={cat.id} style={{ marginBottom: '6px' }}>
                {/* Cabecera de Categoría Clicable para Plegar/Desplegar */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="sidebar-category-header"
                  style={{
                    width: '100%',
                    padding: '6px 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: hasActiveChild ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '0px',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                  title={isCollapsed ? 'Desplegar sección' : 'Plegar sección'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textAlign: 'left', flex: 1 }}>
                    {cat.title}
                  </span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      opacity: 0.8,
                      marginLeft: 'auto'
                    }}
                  />
                </button>

                {/* Lista de Ítems */}
                {!isCollapsed && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {cat.items.map((item) => (
                      <li key={item.path}>
                        <NavLink 
                          to={item.path}
                          onClick={handleLinkClick}
                          style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 16px',
                            fontSize: '12px',
                            color: isActive ? 'white' : 'var(--text-secondary)',
                            background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                            transition: 'all 0.15s ease',
                            fontWeight: isActive ? 700 : 500
                          })}
                        >
                          <item.icon size={15} color={undefined} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>
              {(user.full_name || user.username)?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.full_name || user.username}</div>
              <Badge variant={getRoleBadgeVariant(user.role)} style={{ fontSize: '9px', padding: '1px 5px' }}>{user.role}</Badge>
            </div>
          </div>
          <button 
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '5px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', transition: 'all 0.2s ease' }}
          >
            <LogOut size={13} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
