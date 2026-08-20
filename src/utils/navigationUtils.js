// src/utils/navigationUtils.js
import {
  LayoutDashboard, UtensilsCrossed, ChefHat, Wallet, FileText,
  Package, Users, Settings, FileSpreadsheet, Building2,
  Bike, ShoppingBag, Layers, ClipboardList, Percent, Landmark, UserCheck,
  Truck, Boxes, ListOrdered
} from 'lucide-react';

export const MENU_CATEGORIES = [
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

/**
 * Valida si un usuario tiene acceso permitido a una ruta específica.
 */
export const isPathAllowed = (path, user) => {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (path === '/negocios') return user.role === 'super_admin';
  if (user.role === 'admin') return true;

  // Si tiene permisos explícitos asignados en base de datos
  if (Array.isArray(user.permissions)) {
    // Si el array de permisos tiene elementos, se restringe estrictamente a lo que contiene
    if (user.permissions.length > 0) {
      return user.permissions.includes(path);
    }
  }

  // Si no tiene matriz personalizada, validar según los roles por defecto del menú
  for (const cat of MENU_CATEGORIES) {
    const item = cat.items.find(i => i.path === path);
    if (item && item.defaultRoles) {
      return item.defaultRoles.includes(user.role);
    }
  }

  if (path === '/cocina' && user.role === 'cocinero') return true;
  if (path === '/delivery' && user.role === 'repartidor') return true;
  if (path === '/mesas' && user.role === 'mesero') return true;
  if (path === '/caja' && user.role === 'cajero') return true;

  return false;
};

/**
 * Obtiene la primera ruta/sección permitida para el usuario al iniciar sesión o acceder a la raíz.
 * Si tiene acceso a Dashboard ('/'), devuelve '/'.
 * Si NO tiene Dashboard, recorre el menú en orden y devuelve la primera opción accesible.
 */
export const getFirstAllowedPath = (user) => {
  if (!user) return '/login';

  // 1. Si tiene acceso al Dashboard, ese es su inicio
  if (isPathAllowed('/', user)) {
    return '/';
  }

  // 2. Si no tiene dashboard, buscar la primera opción disponible según el orden del menú
  for (const cat of MENU_CATEGORIES) {
    for (const item of cat.items) {
      if (item.path !== '/' && isPathAllowed(item.path, user)) {
        return item.path;
      }
    }
  }

  // 3. Fallbacks por rol estándar
  if (user.role === 'cocinero') return '/cocina';
  if (user.role === 'repartidor') return '/delivery';
  if (user.role === 'mesero') return '/ordenes';
  if (user.role === 'cajero') return '/caja';

  return '/';
};
