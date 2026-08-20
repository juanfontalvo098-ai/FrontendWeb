// src/components/layout/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { isPathAllowed, getFirstAllowedPath } from '../../utils/navigationUtils';

export const ProtectedRoute = ({ roles = [], layout = true, title = 'KAMIA by JF' }) => {
  const { user, isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !hasRole(roles)) {
    return <Navigate to={getFirstAllowedPath(user)} replace />;
  }

  // Si el usuario no tiene permiso sobre la ruta actual, redirigir a su primera sección permitida
  if (user && !isPathAllowed(location.pathname, user)) {
    const isSubPathAllowed = 
      (location.pathname.startsWith('/mesas/') && (isPathAllowed('/mesas', user) || isPathAllowed('/ordenes', user))) ||
      (location.pathname === '/facturacion' && isPathAllowed('/ordenes', user));

    if (!isSubPathAllowed) {
      return <Navigate to={getFirstAllowedPath(user)} replace />;
    }
  }

  if (!layout) {
    return (
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header title={title} />
        <main className="page-content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
