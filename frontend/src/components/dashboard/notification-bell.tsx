'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificacionesApi } from '@/lib/api';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [noLeidas, setNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNoLeidas = useCallback(async () => {
    try {
      const res = await notificacionesApi.getNoLeidas();
      setNoLeidas(res.data?.count || 0);
    } catch {
      // silently fail
    }
  }, []);

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await notificacionesApi.getAll({ limit: 10 });
      setNotificaciones(res.data?.notificaciones || []);
    } catch {
      // silently fail
    }
  }, []);

  // Polling every 30s for unread count
  useEffect(() => {
    fetchNoLeidas();
    const interval = setInterval(fetchNoLeidas, 30000);
    return () => clearInterval(interval);
  }, [fetchNoLeidas]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotificaciones();
    }
  }, [isOpen, fetchNotificaciones]);

  const handleMarcarLeida = async (id: string) => {
    try {
      await notificacionesApi.marcarComoLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const handleMarcarTodas = async () => {
    try {
      await notificacionesApi.marcarTodasComoLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch {
      // silently fail
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin}m`;
    if (diffHrs < 24) return `Hace ${diffHrs}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {noLeidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
              {noLeidas > 99 ? '99+' : noLeidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          {noLeidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={(e) => {
                e.preventDefault();
                handleMarcarTodas();
              }}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notificaciones.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {notificaciones.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                  !notif.leida ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => {
                  if (!notif.leida) handleMarcarLeida(notif.id);
                }}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <span className={`text-sm font-medium ${!notif.leida ? 'text-slate-900' : 'text-muted-foreground'}`}>
                    {notif.titulo}
                  </span>
                  {!notif.leida && (
                    <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {notif.mensaje}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(notif.createdAt)}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
