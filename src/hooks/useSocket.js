// src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { getSocket, initSocket } from '../api/socket';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const token = useAuthStore(state => state.token);
  const [isConnected, setIsConnected] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    if (!token) return;

    const currentSocket = initSocket();
    if (!currentSocket) return;

    setIsConnected(currentSocket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    currentSocket.on('connect', onConnect);
    currentSocket.on('disconnect', onDisconnect);

    return () => {
      currentSocket.off('connect', onConnect);
      currentSocket.off('disconnect', onDisconnect);
    };
  }, [token]);

  const emit = (event, data) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  };

  return { socket, isConnected, emit };
};

