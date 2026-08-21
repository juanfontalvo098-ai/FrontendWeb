import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, ChefHat, Wallet, FileText,
  Package, Users, Settings, LogOut, X, FileSpreadsheet, Building2,
  Bike, ShoppingBag, Layers, ClipboardList, Percent, Landmark, UserCheck,
  Truck, Boxes, ChevronDown, ListOrdered, Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUiStore } from '../../store/uiStore';
import { Badge } from '../ui/Badge';
import { KamiaLogo } from '../common/KamiaLogo';
import { MENU_CATEGORIES, isPathAllowed } from '../../utils/navigationUtils';

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

  const filteredCategories = MENU_CATEGORIES.map(category => ({
    ...category,
    items: category.items.filter(item => isPathAllowed(item.path, user))
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

  const toggleCategory = (categoryId) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [categoryId]: !prev[categoryId] };
      try {
        localStorage.setItem('pos_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {
        console.error('Error al guardar colapsado de sidebar:', e);
      }
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
            box-shadow: 4px 0 24px rgba(0,0,0,0.6) !important;
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
        {/* Header / Logo KAMIA by JF */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <KamiaLogo variant="sidebar" size="md" showSlogan={false} />
            <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: window.innerWidth <= 768 ? 'block' : 'none' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em', paddingLeft: '4px' }}>
            Todo tu negocio, conectado.
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
                    fontSize: '9.5px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: hasActiveChild ? 'var(--accent-electric)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color var(--transition-fast)'
                  }}
                >
                  <span>{cat.title}</span>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      opacity: 0.7
                    }}
                  />
                </button>

                {/* Lista de Enlaces de la Categoría */}
                {!isCollapsed && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '2px 0 0 0' }}>
                    {cat.items.map((item) => (
                      <li key={item.path}>
                        <NavLink 
                          to={item.path}
                          onClick={handleLinkClick}
                          style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6.5px 16px',
                            fontSize: '12px',
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            background: isActive
                              ? 'rgba(99, 102, 241, 0.12)'
                              : 'transparent',
                            borderLeft: isActive ? '3px solid var(--accent-electric)' : '3px solid transparent',
                            boxShadow: isActive ? 'inset 0 0 14px rgba(99, 102, 241, 0.08)' : 'none',
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
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
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
