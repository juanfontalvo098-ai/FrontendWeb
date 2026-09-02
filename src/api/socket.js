// src/api/socket.js
import { io } from 'socket.io-client';

let socket = null;
let warnedServerless = false;

export const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL.replace(/\/+api\/?$/, '');
    // Si el cliente navega desde un teléfono/tablet en la red local (IP en lugar de localhost)
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const currentHost = window.location.hostname;
      if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
        url = url.replace(/localhost|127\.0\.0\.1/g, currentHost);
      }
    }
    return url;
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  return undefined;
};

export const initSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    if (socket && typeof socket.disconnect === 'function') {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  const SOCKET_URL = resolveSocketUrl();

  // Si estamos en un backend serverless en Vercel y no hay servidor WebSocket dedicado especificado
  const isVercelServerless = typeof SOCKET_URL === 'string' && SOCKET_URL.includes('vercel.app') && !import.meta.env.VITE_SOCKET_URL;
  if (isVercelServerless) {
    if (!socket) {
      if (!warnedServerless) {
        console.info('ℹ️ [SocketIO] Entorno Serverless (Vercel) detectado: el sistema opera con Auto-Sincronización y Smart Polling de alta velocidad.');
        warnedServerless = true;
      }
      socket = {
        connected: false,
        active: false,
        on: () => {},
        off: () => {},
        emit: () => {},
        disconnect: () => {}
      };
    }
    return socket;
  }

  // Si ya existe un socket activo con el mismo token, lo reutilizamos
  if (socket && socket.auth) {
    if (socket.auth.token === token) {
      if (!socket.connected && !socket.active) {
        socket.connect();
      }
      return socket;
    }
    // Si el token cambió, cerramos la conexión previa
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token },
    query: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('✅ [SocketIO] Conectado exitosamente en:', SOCKET_URL);
  });

  socket.on('connect_error', (err) => {
    console.warn('⚠️ [SocketIO] Conexión en espera (operando con sincronización de respaldo):', err.message);
  });

  socket.on('reconnect', (attempt) => {
    console.log('🔄 [SocketIO] Reconectado exitosamente en intento:', attempt);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

