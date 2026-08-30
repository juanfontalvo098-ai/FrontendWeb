// src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { getSocket, initSocket } from '../api/socket';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const token = useAuthStore(state => state.token);
  const [socketInstance, setSocketInstance] = useState(() => getSocket());
  const [isConnected, setIsConnected] = useState(() => !!socketInstance?.connected);

  useEffect(() => {
    if (!token) {
      setSocketInstance(null);
      setIsConnected(false);
      return;
    }

    const currentSocket = initSocket();
    setSocketInstance(currentSocket);
    if (!currentSocket) return;

    setIsConnected(currentSocket.connected);

    const onConnect = () => {
      setIsConnected(true);
      setSocketInstance(currentSocket);
    };
    const onDisconnect = () => setIsConnected(false);

    currentSocket.on('connect', onConnect);
    currentSocket.on('disconnect', onDisconnect);

    return () => {
      currentSocket.off('connect', onConnect);
      currentSocket.off('disconnect', onDisconnect);
    };
  }, [token]);

  const emit = (event, data) => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(event, data);
    }
  };

  return { socket: socketInstance, isConnected, emit };
};

