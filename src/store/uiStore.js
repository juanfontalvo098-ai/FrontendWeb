// src/store/uiStore.js
import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  activeModal: null,
  toasts: [],
  loading: false,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  openModal: (name) => set({ activeModal: name }),
  
  closeModal: () => set({ activeModal: null }),
  
  addToast: (message, type = 'info') => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    // Auto remove after 4s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 4000);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  setLoading: (bool) => set({ loading: bool })
}));
