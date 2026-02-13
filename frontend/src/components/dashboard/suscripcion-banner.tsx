'use client';

import { useQuery } from '@tanstack/react-query';
import { suscripcionesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Suscripcion {
  estado: string;
  periodoGracia: string | null;
}

export function SuscripcionBanner() {
  const { user } = useAuthStore();

  const { data: suscripcion } = useQuery<Suscripcion | null>({
    queryKey: queryKeys.suscripciones.mi(),
    queryFn: async () => {
      const res = await suscripcionesApi.getMiSuscripcion();
      return res.data || null;
    },
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === 'DIRECTOR',
  });

  if (user?.role !== 'DIRECTOR' || !suscripcion) return null;

  let bgClass = '';
  let textClass = '';
  let mensaje = '';

  if (suscripcion.estado === 'PERIODO_GRACIA') {
    const diasRestantes = suscripcion.periodoGracia
      ? Math.max(0, Math.ceil((new Date(suscripcion.periodoGracia).getTime() - Date.now()) / 86400000))
      : 0;
    bgClass = 'bg-yellow-50 border-yellow-200';
    textClass = 'text-yellow-800';
    mensaje = `Tu suscripcion vencio. Tienes ${diasRestantes} dias para renovar antes de que el sistema pase a solo lectura.`;
  } else if (suscripcion.estado === 'VENCIDA') {
    bgClass = 'bg-orange-50 border-orange-200';
    textClass = 'text-orange-800';
    mensaje = 'Tu suscripcion esta vencida. Actualiza tu metodo de pago.';
  } else if (suscripcion.estado === 'SUSPENDIDA') {
    bgClass = 'bg-red-50 border-red-200';
    textClass = 'text-red-800';
    mensaje = 'Tu suscripcion esta suspendida. El sistema esta en modo solo lectura. Renueva tu plan para continuar.';
  } else {
    return null;
  }

  return (
    <div className={`border rounded-lg px-4 py-3 mx-6 mt-4 flex items-center justify-between ${bgClass}`}>
      <div className={`flex items-center gap-2 ${textClass}`}>
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{mensaje}</span>
      </div>
      <Link
        href="/dashboard/suscripcion"
        className={`text-sm font-medium underline hover:no-underline flex-shrink-0 ${textClass}`}
      >
        Renovar ahora
      </Link>
    </div>
  );
}
