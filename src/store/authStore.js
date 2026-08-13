// src/store/authStore.js
import { create } from 'zustand';
import { api } from '../api/client';
import { initSocket, disconnectSocket } from '../api/socket';

const getInitialAuthState = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const activeBranchId = localStorage.getItem('activeBranchId');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (!user || !user.businessId) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeBranchId');
        return { user: null, token: null, activeBranchId: null, isAuthenticated: false };
      }
      return { 
        user, 
        token, 
        activeBranchId: activeBranchId || user.branchId || null, 
        isAuthenticated: true 
      };
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranchId');
    }
  }
  return { user: null, token: null, activeBranchId: null, isAuthenticated: false };
};

const initialState = getInitialAuthState();
if (initialState.isAuthenticated) {
  setTimeout(() => initSocket(), 100);
}

export const useAuthStore = create((set, get) => ({
  user: initialState.user,
  token: initialState.token,
  activeBranchId: initialState.activeBranchId,
  isAuthenticated: initialState.isAuthenticated,
  
  loadFromStorage: () => {
    const state = getInitialAuthState();
    if (state.isAuthenticated) {
      set(state);
      initSocket();
    } else {
      set({ user: null, token: null, activeBranchId: null, isAuthenticated: false });
    }
  },
  
  login: async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    const token = data.accessToken || data.token;
    const activeBranchId = data.user.branchId || (data.user.branches && data.user.branches[0]?.id) || null;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (activeBranchId) {
      localStorage.setItem('activeBranchId', activeBranchId);
    } else {
      localStorage.removeItem('activeBranchId');
    }

    set({ user: data.user, token, activeBranchId, isAuthenticated: true });
    initSocket();
  },

  switchBranch: async (branchId) => {
    try {
      const data = await api.post('/auth/switch-branch', { branchId });
      const newToken = data.accessToken || get().token;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('activeBranchId', branchId);

      const currentUser = get().user;
      const updatedUser = currentUser ? { ...currentUser, branchId } : currentUser;
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      set({ token: newToken, activeBranchId: branchId, user: updatedUser });

      disconnectSocket();
      initSocket();

      window.location.reload();
    } catch (err) {
      console.error('Error al cambiar de sucursal:', err);
      throw err;
    }
  },

  switchBusiness: async (businessId) => {
    try {
      const data = await api.post('/auth/switch-business', { businessId });
      const newToken = data.accessToken || get().token;
      const newBranchId = data.branchId || (data.branches && data.branches[0]?.id) || null;

      localStorage.setItem('token', newToken);
      if (newBranchId) {
        localStorage.setItem('activeBranchId', newBranchId);
      } else {
        localStorage.removeItem('activeBranchId');
      }

      const currentUser = get().user;
      const updatedUser = currentUser ? {
        ...currentUser,
        businessId: data.business.id,
        businessName: data.business.name,
        businessSlug: data.business.slug,
        branchId: newBranchId,
        branches: data.branches
      } : currentUser;

      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      set({ token: newToken, activeBranchId: newBranchId, user: updatedUser });

      disconnectSocket();
      initSocket();

      window.location.reload();
    } catch (err) {
      console.error('Error al cambiar de negocio:', err);
      throw err;
    }
  },
  
  logout: () => {
    disconnectSocket();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeBranchId');
    set({ user: null, token: null, activeBranchId: null, isAuthenticated: false });
  }
}));
