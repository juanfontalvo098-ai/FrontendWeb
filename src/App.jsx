// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';
import { useUiStore } from './store/uiStore';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TablesPage } from './pages/TablesPage';
import { OrderPage } from './pages/OrderPage';
import { KitchenPage } from './pages/KitchenPage';
import { CashPage } from './pages/CashPage';
import { BillingPage } from './pages/BillingPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrintingConfigPage } from './pages/PrintingConfigPage';
import { BusinessesPage } from './pages/BusinessesPage';

// ERP Pages
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { SuppliesPage } from './pages/SuppliesPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { RecipesPage } from './pages/RecipesPage';
import { StockCountPage } from './pages/StockCountPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { AccountingPage } from './pages/AccountingPage';
import { HRPage } from './pages/HRPage';
import { AutoPrintManager } from './components/common/AutoPrintManager';

function App() {
  const theme = useUiStore(state => state.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AutoPrintManager />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rutas con Layout (Sidebar + Header) */}
        <Route element={<ProtectedRoute layout={true} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/negocios" element={<BusinessesPage />} />
          <Route path="/ordenes" element={<OrdersListPage />} />
          <Route path="/mesas" element={<TablesPage />} />
          <Route path="/mesas/:id/orden" element={<OrderPage />} />
          <Route path="/caja" element={<CashPage />} />
          <Route path="/facturacion" element={<OrdersListPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/configuracion-impresion" element={<PrintingConfigPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />

          {/* Rutas ERP */}
          <Route path="/clientes" element={<CustomersPage />} />
          <Route path="/proveedores" element={<SuppliersPage />} />
          <Route path="/insumos" element={<SuppliesPage />} />
          <Route path="/inventario" element={<InventoryPage />} />
          <Route path="/ordenes-compra" element={<PurchaseOrdersPage />} />
          <Route path="/recetas" element={<RecipesPage />} />
          <Route path="/conteo-stock" element={<StockCountPage />} />
          <Route path="/descuentos" element={<DiscountsPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/contabilidad" element={<AccountingPage />} />
          <Route path="/rrhh" element={<HRPage />} />
        </Route>
        
        {/* Rutas sin Layout standard (ej. Cocina es full screen) */}
        <Route element={<ProtectedRoute layout={false} />}>
          <Route path="/cocina" element={<KitchenPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
