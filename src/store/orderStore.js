// src/store/orderStore.js
import { create } from 'zustand';

export const useOrderStore = create((set, get) => ({
  activeOrders: [],
  currentOrder: null,
  kitchenTickets: [],
  
  fetchOrders: async () => {
    // Aquí iría el fetch al backend
    // const orders = await api.get('/orders');
    // set({ activeOrders: orders });
  },
  
  setCurrentOrder: (order) => set({ currentOrder: order }),
  
  addItemToOrder: (item) => set((state) => {
    if (!state.currentOrder) return state;
    
    const existingItem = state.currentOrder.items.find(i => i.product.id === item.product.id);
    let newItems;
    
    if (existingItem) {
      newItems = state.currentOrder.items.map(i => 
        i.product.id === item.product.id 
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      newItems = [...state.currentOrder.items, item];
    }
    
    return {
      currentOrder: {
        ...state.currentOrder,
        items: newItems
      }
    };
  }),
  
  removeItemFromOrder: (index) => set((state) => {
    if (!state.currentOrder) return state;
    const newItems = [...state.currentOrder.items];
    newItems.splice(index, 1);
    
    return {
      currentOrder: {
        ...state.currentOrder,
        items: newItems
      }
    };
  }),
  
  sendToKitchen: async () => {
    // Lógica para enviar a cocina y emitir via socket
    // const state = get();
    // await api.post('/orders/kitchen', state.currentOrder);
  }
}));
