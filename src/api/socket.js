// src/api/socket.js
import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  // Si ya existe un socket activo con el mismo token, lo reutilizamos
  if (socket) {
    if (socket.auth && socket.auth.token === token) {
      if (!socket.connected && !socket.active) {
        socket.connect();
      }
      return socket;
    }
    // Si el token cambió, cerramos la conexión previa
    socket.disconnect();
    socket = null;
  }

  const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'https://backendweb-ca9k.onrender.com').replace(/\/api$/, '');

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket conectado:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.warn('Error de conexión en Socket:', err.message);
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

