'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { on } = useSocket();
  const queryClient = useQueryClient();

  const { data: noLeidas = 0 } = useQuery({
    queryKey: queryKeys.notificaciones.noLeidas(),
    queryFn: async () => {
      const res = await notificacionesApi.getNoLeidas();
      return res.data?.count || 0;
    },
    refetchInterval: 30_000,
  });

  const { data: notificaciones = [] } = useQuery({
    queryKey: queryKeys.notificaciones.list({ limit: 10 }),
    queryFn: async () => {
      const res = await notificacionesApi.getAll({ limit: 10 });
      return (res.data?.notificaciones || []) as Notificacion[];
    },
    enabled: isOpen,
  });

  // Socket: invalidate on new notification
  useEffect(() => {
    const unsubNotif = on('notificacion:nueva', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.noLeidas() });
    });
    const unsubMsg = on('mensaje:nuevo', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.noLeidas() });
    });
    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [on, queryClient]);

  const marcarLeidaMutation = useMutation({
    mutationFn: (id: string) => notificacionesApi.marcarComoLeida(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificaciones.all() });
      const prevList = queryClient.getQueryData<Notificacion[]>(queryKeys.notificaciones.list({ limit: 10 }));
      const prevCount = queryClient.getQueryData<number>(queryKeys.notificaciones.noLeidas());

      queryClient.setQueryData<Notificacion[]>(
        queryKeys.notificaciones.list({ limit: 10 }),
        (old) => old?.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
      queryClient.setQueryData<number>(
        queryKeys.notificaciones.noLeidas(),
        (old) => Math.max(0, (old ?? 0) - 1),
      );

      return { prevList, prevCount };
    },
    onError: (_err, _id, context) => {
      if (context?.prevList) {
        queryClient.setQueryData(queryKeys.notificaciones.list({ limit: 10 }), context.prevList);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(queryKeys.notificaciones.noLeidas(), context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.all() });
    },
  });

  const marcarTodasMutation = useMutation({
    mutationFn: () => notificacionesApi.marcarTodasComoLeidas(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificaciones.all() });
      const prevList = queryClient.getQueryData<Notificacion[]>(queryKeys.notificaciones.list({ limit: 10 }));
      const prevCount = queryClient.getQueryData<number>(queryKeys.notificaciones.noLeidas());

      queryClient.setQueryData<Notificacion[]>(
        queryKeys.notificaciones.list({ limit: 10 }),
        (old) => old?.map((n) => ({ ...n, leida: true })),
      );
      queryClient.setQueryData(queryKeys.notificaciones.noLeidas(), 0);

      return { prevList, prevCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevList) {
        queryClient.setQueryData(queryKeys.notificaciones.list({ limit: 10 }), context.prevList);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(queryKeys.notificaciones.noLeidas(), context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificaciones.all() });
    },
  });

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
                marcarTodasMutation.mutate();
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
                  if (!notif.leida) marcarLeidaMutation.mutate(notif.id);
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
