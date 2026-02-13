'use client';

import { useQuery } from '@tanstack/react-query';
import { mantenimientoApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { Info, Wrench } from 'lucide-react';

interface AvisoMantenimiento {
  id: string;
  titulo: string;
  mensaje: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MantenimientoBanner() {
  const { user } = useAuthStore();

  const { data: aviso } = useQuery<AvisoMantenimiento | null>({
    queryKey: queryKeys.mantenimiento.activo(),
    queryFn: async () => {
      const res = await mantenimientoApi.getActivo();
      return res.data || null;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (!aviso) return null;

  const now = Date.now();
  const inicio = new Date(aviso.fechaInicio).getTime();
  const fin = new Date(aviso.fechaFin).getTime();
  const enMantenimiento = now >= inicio && now <= fin;

  // During maintenance: show full page for non-admins
  if (enMantenimiento && user?.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center px-6">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <Wrench className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3">{aviso.titulo}</h1>
          <p className="text-slate-600 mb-6">{aviso.mensaje}</p>
          <div className="text-sm text-slate-500 space-y-1">
            <p>Inicio: {formatFecha(aviso.fechaInicio)}</p>
            <p>Fin estimado: {formatFecha(aviso.fechaFin)}</p>
          </div>
        </div>
      </div>
    );
  }

  // During maintenance for admin: show a small banner
  if (enMantenimiento && user?.role === 'ADMIN') {
    return (
      <div className="border rounded-lg px-4 py-3 mx-6 mt-4 flex items-center gap-2 bg-orange-50 border-orange-200 text-orange-800">
        <Wrench className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">
          Mantenimiento en curso: {aviso.titulo} — hasta {formatFecha(aviso.fechaFin)}
        </span>
      </div>
    );
  }

  // Upcoming maintenance: info banner for everyone
  return (
    <div className="border rounded-lg px-4 py-3 mx-6 mt-4 flex items-center gap-2 bg-blue-50 border-blue-200 text-blue-800">
      <Info className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">
        Mantenimiento programado: {aviso.titulo} — {formatFecha(aviso.fechaInicio)} a {formatFecha(aviso.fechaFin)}
      </span>
    </div>
  );
}
