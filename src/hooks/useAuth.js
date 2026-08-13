// src/hooks/useAuth.js
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, activeBranchId, isAuthenticated, loadFromStorage, login, logout, switchBranch, switchBusiness } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const hasRole = (role) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isGlobalAdmin = () => user && ['admin', 'super_admin'].includes(user.role);

  const branches = user?.branches || [];
  const businesses = user?.businesses || [];
  const activeBranch = branches.find(b => b.id === activeBranchId) || branches[0] || null;

  return {
    user,
    token,
    activeBranchId,
    activeBranch,
    branches,
    businesses,
    isAuthenticated,
    hasRole,
    isSuperAdmin,
    isGlobalAdmin,
    login,
    logout,
    switchBranch,
    switchBusiness
  };
};
