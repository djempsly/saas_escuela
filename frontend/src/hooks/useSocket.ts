'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = API_BASE_URL.replace('/api/v1', '');

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
  if (socketInstance?.connected) return socketInstance;

  socketInstance?.disconnect();

  socketInstance = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export function useSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = getSocket(token);
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      // Don't disconnect on unmount — singleton stays alive
    };
  }, [isAuthenticated, token]);

  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    [],
  );

  return {
    socket: socketRef.current,
    connected: socketRef.current?.connected ?? false,
    on,
  };
}
