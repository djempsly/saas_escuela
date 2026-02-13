'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { planesApi, suscripcionesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Loader2, Check, CreditCard, Calendar, Users } from 'lucide-react';

const featureLabels: Record<string, string> = {
  gestion_academica: 'Gestion Academica',
  calificaciones: 'Calificaciones',
  asistencia: 'Control de Asistencia',
  mensajeria: 'Mensajeria Interna',
  tareas: 'Gestion de Tareas',
  reportes: 'Reportes Avanzados',
  exportar_excel: 'Exportar a Excel',
  cobros: 'Sistema de Cobros',
  api_access: 'Acceso a API',
  soporte_prioritario: 'Soporte Prioritario',
};

interface Plan {
  id: string;
  nombre: string;
  maxEstudiantes: number | null;
  precioMensual: string | number;
  precioAnual: string | number;
  features: string[];
  activo: boolean;
}

interface Suscripcion {
  id: string;
  institucionId: string;
  planId: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  proximoPago: string | null;
  periodoGracia: string | null;
  stripeCustomerId: string | null;
  plan: Plan;
}

const estadoBadge: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  ACTIVA: { label: 'Activa', variant: 'success' },
  VENCIDA: { label: 'Vencida', variant: 'destructive' },
  CANCELADA: { label: 'Cancelada', variant: 'secondary' },
  PERIODO_GRACIA: { label: 'Periodo de Gracia', variant: 'warning' },
  SUSPENDIDA: { label: 'Suspendida', variant: 'destructive' },
};

function PlanCards({ planes, frecuenciaAnual, onSuscribirse, isCheckoutLoading }: {
  planes: Plan[];
  frecuenciaAnual: boolean;
  onSuscribirse: (planId: string) => void;
  isCheckoutLoading: boolean;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {planes.map((plan) => {
        const precio = frecuenciaAnual ? Number(plan.precioAnual) : Number(plan.precioMensual);
        const isPro = plan.nombre.toLowerCase().includes('pro');
        const features = Array.isArray(plan.features) ? plan.features : [];

        return (
          <Card
            key={plan.id}
            className={isPro ? 'border-2 border-blue-500 relative' : ''}
          >
            {isPro && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                Recomendado
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.nombre}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">
                  ${precio.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  /{frecuenciaAnual ? 'ano' : 'mes'}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {plan.maxEstudiantes ? `Hasta ${plan.maxEstudiantes} estudiantes` : 'Estudiantes ilimitados'}
              </div>

              <ul className="space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {featureLabels[feature] || feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={isPro ? 'default' : 'outline'}
                onClick={() => onSuscribirse(plan.id)}
                disabled={isCheckoutLoading}
              >
                {isCheckoutLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Suscribirse
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SuscripcionPage() {
  const [frecuenciaAnual, setFrecuenciaAnual] = useState(false);

  const { data: suscripcion, isLoading: loadingSuscripcion } = useQuery<Suscripcion | null>({
    queryKey: queryKeys.suscripciones.mi(),
    queryFn: async () => {
      const res = await suscripcionesApi.getMiSuscripcion();
      return res.data || null;
    },
  });

  const { data: planes = [], isLoading: loadingPlanes } = useQuery<Plan[]>({
    queryKey: queryKeys.planes.list(),
    queryFn: async () => {
      const res = await planesApi.getAll();
      return res.data?.data || res.data || [];
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) =>
      suscripcionesApi.crearCheckout({
        planId,
        frecuencia: frecuenciaAnual ? 'anual' : 'mensual',
      }),
    onSuccess: (res) => {
      const url = res.data?.url || res.data?.data?.url;
      if (url) window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => suscripcionesApi.crearPortal(),
    onSuccess: (res) => {
      const url = res.data?.url || res.data?.data?.url;
      if (url) window.location.href = url;
    },
  });

  if (loadingSuscripcion || loadingPlanes) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showPlans = !suscripcion || suscripcion.estado === 'VENCIDA' || suscripcion.estado === 'SUSPENDIDA' || suscripcion.estado === 'CANCELADA';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Suscripcion</h1>
        <p className="text-muted-foreground">
          Gestiona tu plan y facturacion
        </p>
      </div>

      {/* Current subscription info */}
      {suscripcion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Plan {suscripcion.plan.nombre}
              </CardTitle>
              <Badge variant={estadoBadge[suscripcion.estado]?.variant || 'secondary'}>
                {estadoBadge[suscripcion.estado]?.label || suscripcion.estado}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha de inicio</span>
                <p className="font-medium">
                  {new Date(suscripcion.fechaInicio).toLocaleDateString('es')}
                </p>
              </div>
              {suscripcion.proximoPago && (
                <div>
                  <span className="text-muted-foreground">Proximo pago</span>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(suscripcion.proximoPago).toLocaleDateString('es')}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Estudiantes</span>
                <p className="font-medium">
                  {suscripcion.plan.maxEstudiantes ? `Hasta ${suscripcion.plan.maxEstudiantes}` : 'Ilimitados'}
                </p>
              </div>
            </div>

            {/* Features */}
            {Array.isArray(suscripcion.plan.features) && suscripcion.plan.features.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Caracteristicas incluidas:</p>
                <ul className="grid grid-cols-2 gap-1">
                  {(suscripcion.plan.features as string[]).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-3 h-3 text-green-500" />
                      {featureLabels[f] || f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {suscripcion.stripeCustomerId && suscripcion.estado === 'ACTIVA' && (
              <Button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
              >
                {portalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Gestionar suscripcion
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan selection */}
      {showPlans && planes.length > 0 && (
        <div className="space-y-4">
          {suscripcion && (
            <h2 className="text-lg font-semibold">Elige un plan para continuar</h2>
          )}

          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!frecuenciaAnual ? 'font-semibold' : 'text-muted-foreground'}`}>
              Mensual
            </span>
            <Switch
              checked={frecuenciaAnual}
              onCheckedChange={setFrecuenciaAnual}
            />
            <span className={`text-sm ${frecuenciaAnual ? 'font-semibold' : 'text-muted-foreground'}`}>
              Anual
            </span>
            {frecuenciaAnual && (
              <Badge variant="success" className="ml-1">Ahorra hasta 20%</Badge>
            )}
          </div>

          <PlanCards
            planes={planes}
            frecuenciaAnual={frecuenciaAnual}
            onSuscribirse={(planId) => checkoutMutation.mutate(planId)}
            isCheckoutLoading={checkoutMutation.isPending}
          />
        </div>
      )}

      {/* No plans and no subscription */}
      {!suscripcion && planes.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay planes disponibles en este momento.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
