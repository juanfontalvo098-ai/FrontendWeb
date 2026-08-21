// src/store/uiStore.js
import { create } from 'zustand';

const initialTheme = (() => {
  try {
    const saved = localStorage.getItem('pos_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) {}
  return 'dark';
})();

// Aplicar atributo al cargar el módulo
if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', initialTheme);
}

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  activeModal: null,
  toasts: [],
  loading: false,
  theme: initialTheme,

  setTheme: (newTheme) => {
    const validTheme = newTheme === 'light' ? 'light' : 'dark';
    try {
      localStorage.setItem('pos_theme', validTheme);
    } catch (e) {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', validTheme);
    }
    set({ theme: validTheme });
  },

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('pos_theme', nextTheme);
    } catch (e) {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
    return { theme: nextTheme };
  }),
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  openModal: (name) => set({ activeModal: name }),
  
  closeModal: () => set({ activeModal: null }),
  
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    // Auto remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, duration);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),
  
  setLoading: (bool) => set({ loading: bool })
}));
