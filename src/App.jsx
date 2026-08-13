// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { ToastContainer } from './components/ui/Toast';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TablesPage } from './pages/TablesPage';
import { OrderPage } from './pages/OrderPage';
import { KitchenPage } from './pages/KitchenPage';
import { CashPage } from './pages/CashPage';
import { BillingPage } from './pages/BillingPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { BusinessesPage } from './pages/BusinessesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rutas con Layout (Sidebar + Header) */}
        <Route element={<ProtectedRoute layout={true} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/negocios" element={<BusinessesPage />} />
          <Route path="/mesas" element={<TablesPage />} />
          <Route path="/mesas/:id/orden" element={<OrderPage />} />
          <Route path="/caja" element={<CashPage />} />
          <Route path="/facturacion" element={<BillingPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
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
