'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';

interface SocketNotificacion {
  tipo: string;
  titulo: string;
  mensaje: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface SocketMensaje {
  conversacionId: string;
  mensaje: {
    contenido: string;
    remitente?: { nombre: string; apellido: string };
  };
  timestamp: string;
}

export function NotificacionesToast() {
  const { on } = useSocket();

  useEffect(() => {
    const unsubNotif = on('notificacion:nueva', (...args: unknown[]) => {
      const notificacion = args[0] as SocketNotificacion;
      toast.info(notificacion.titulo, {
        description: notificacion.mensaje,
      });
    });

    const unsubMsg = on('mensaje:nuevo', (...args: unknown[]) => {
      const data = args[0] as SocketMensaje;
      const remitente = data.mensaje.remitente;
      const nombre = remitente
        ? `${remitente.nombre} ${remitente.apellido}`
        : 'Nuevo mensaje';
      const contenido = data.mensaje.contenido?.slice(0, 100) || '';

      toast(nombre, {
        description: contenido,
      });
    });

    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [on]);

  return null;
}
