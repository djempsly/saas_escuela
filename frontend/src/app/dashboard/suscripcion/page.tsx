'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { planesApi, suscripcionesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Loader2, Check, CreditCard, Calendar, Users, Globe, Image, Video, ArrowUpCircle, Receipt, CheckCircle2, XCircle, Smartphone, Landmark } from 'lucide-react';

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

interface PlanFeatures {
  items: string[];
  dominioPropio: boolean;
  maxImagenesActividad: number;
  maxVideosActividad: number;
}

interface Plan {
  id: string;
  nombre: string;
  maxEstudiantes: number | null;
  precioMensual: string | number;
  precioAnual: string | number;
  features: PlanFeatures | string[];
  activo: boolean;
}

/** Normaliza features legacy (array) y nuevo formato (objeto) */
function parsePlanFeatures(features: PlanFeatures | string[] | unknown): PlanFeatures {
  if (!features) return { items: [], dominioPropio: false, maxImagenesActividad: 5, maxVideosActividad: 0 };
  if (Array.isArray(features)) {
    return { items: features as string[], dominioPropio: false, maxImagenesActividad: 5, maxVideosActividad: 0 };
  }
  const obj = features as Record<string, unknown>;
  return {
    items: Array.isArray(obj.items) ? obj.items as string[] : [],
    dominioPropio: typeof obj.dominioPropio === 'boolean' ? obj.dominioPropio : false,
    maxImagenesActividad: typeof obj.maxImagenesActividad === 'number' ? obj.maxImagenesActividad : 5,
    maxVideosActividad: typeof obj.maxVideosActividad === 'number' ? obj.maxVideosActividad : 0,
  };
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

interface PlanCardsProps {
  planes: Plan[];
  frecuenciaAnual: boolean;
  onStripe: (planId: string) => void;
  onPayPal: (planId: string) => void;
  onAzul: (planId: string) => void;
  onMonCash: (planId: string) => void;
  onCardNet: (planId: string) => void;
  isLoading: boolean;
  currentPlanId?: string;
}

function PlanCards({ planes, frecuenciaAnual, onStripe, onPayPal, onAzul, onMonCash, onCardNet, isLoading, currentPlanId }: PlanCardsProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {planes.map((plan) => {
        const precio = frecuenciaAnual ? Number(plan.precioAnual) : Number(plan.precioMensual);
        const isPro = plan.nombre.toLowerCase() === 'pro';
        const isCurrent = currentPlanId === plan.id;
        const f = parsePlanFeatures(plan.features);

        return (
          <Card
            key={plan.id}
            className={
              isCurrent
                ? 'border-2 border-green-500 relative'
                : isPro
                  ? 'border-2 border-blue-500 relative'
                  : ''
            }
          >
            {isCurrent ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600">
                Plan actual
              </Badge>
            ) : isPro && !currentPlanId ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                Recomendado
              </Badge>
            ) : null}
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
              {/* Limits section */}
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {plan.maxEstudiantes ? `Hasta ${plan.maxEstudiantes} estudiantes` : 'Estudiantes ilimitados'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {f.dominioPropio ? (
                    <Globe className="w-4 h-4 flex-shrink-0 text-green-500" />
                  ) : (
                    <Globe className="w-4 h-4 flex-shrink-0 text-muted-foreground/50" />
                  )}
                  {f.dominioPropio ? 'Dominio propio (escuela.edu.do)' : 'Solo subdominio (escuela.plataforma.com)'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Image className="w-4 h-4 flex-shrink-0" />
                  {f.maxImagenesActividad} imagenes por actividad
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Video className="w-4 h-4 flex-shrink-0" />
                  {f.maxVideosActividad > 0
                    ? `${f.maxVideosActividad} videos por actividad`
                    : 'Sin videos en actividades'}
                </div>
              </div>

              {/* Feature list */}
              <ul className="space-y-2">
                {f.items.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {featureLabels[feature] || feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button className="w-full" variant="outline" disabled>
                  <Check className="w-4 h-4 mr-2" />
                  Plan actual
                </Button>
              ) : (
                <div className="space-y-2">
                  {/* Stripe */}
                  <Button
                    className="w-full"
                    variant={isPro ? 'default' : 'outline'}
                    onClick={() => onStripe(plan.id)}
                    disabled={isLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {currentPlanId ? 'Cambiar (Tarjeta)' : 'Pagar con tarjeta'}
                  </Button>
                  {/* PayPal */}
                  <Button
                    className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white"
                    onClick={() => onPayPal(plan.id)}
                    disabled={isLoading}
                  >
                    {currentPlanId ? 'Cambiar (PayPal)' : 'Pagar con PayPal'}
                  </Button>
                  {/* TODO: Habilitar cuando estén configurados */}
                  {/* CARDNET, AZUL, MONCASH desactivados temporalmente */}
                  {/*
                  <Button
                    className="w-full bg-[#003DA5] hover:bg-[#002d7a] text-white"
                    onClick={() => onAzul(plan.id)}
                    disabled={isLoading}
                  >
                    <Landmark className="w-4 h-4 mr-2" />
                    {currentPlanId ? 'Cambiar (AZUL)' : 'Pagar con AZUL'}
                  </Button>
                  <Button
                    className="w-full bg-[#e31937] hover:bg-[#c0152e] text-white"
                    onClick={() => onMonCash(plan.id)}
                    disabled={isLoading}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    {currentPlanId ? 'Cambiar (MonCash)' : 'Pagar con MonCash'}
                  </Button>
                  <Button
                    className="w-full bg-[#1a1a2e] hover:bg-[#16162a] text-white"
                    onClick={() => onCardNet(plan.id)}
                    disabled={isLoading}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {currentPlanId ? 'Cambiar (CardNet)' : 'Pagar con CardNet'}
                  </Button>
                  */}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function SuscripcionPage() {
  const [frecuenciaAnual, setFrecuenciaAnual] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = searchParams.get('status');

  // PayPal return: capture the payment when redirected back with token param
  const paypalToken = searchParams.get('token');
  const [paypalCaptured, setPaypalCaptured] = useState(false);

  // MonCash return: capture when redirected back with transactionId param
  const moncashTxId = searchParams.get('transactionId');
  const [moncashCaptured, setMoncashCaptured] = useState(false);

  useEffect(() => {
    if (paypalToken && !paypalCaptured) {
      setPaypalCaptured(true);
      suscripcionesApi
        .capturarPayPal(paypalToken)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.suscripciones.mi() });
          router.replace('/dashboard/suscripcion?status=exito');
        })
        .catch(() => {
          router.replace('/dashboard/suscripcion?status=cancelado');
        });
    }
  }, [paypalToken, paypalCaptured, queryClient, router]);

  useEffect(() => {
    if (moncashTxId && !moncashCaptured) {
      setMoncashCaptured(true);
      suscripcionesApi
        .capturarMonCash(moncashTxId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.suscripciones.mi() });
          router.replace('/dashboard/suscripcion?status=exito');
        })
        .catch(() => {
          router.replace('/dashboard/suscripcion?status=cancelado');
        });
    }
  }, [moncashTxId, moncashCaptured, queryClient, router]);

  // Show feedback banner and clean up URL
  useEffect(() => {
    if (status === 'exito') {
      queryClient.invalidateQueries({ queryKey: queryKeys.suscripciones.mi() });
    }
    if (status) {
      const timer = setTimeout(() => {
        router.replace('/dashboard/suscripcion');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status, queryClient, router]);

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

  const paypalMutation = useMutation({
    mutationFn: (planId: string) =>
      suscripcionesApi.crearOrdenPayPal({
        planId,
        frecuencia: frecuenciaAnual ? 'anual' : 'mensual',
      }),
    onSuccess: (res) => {
      const approveUrl = res.data?.approveUrl || res.data?.data?.approveUrl;
      if (approveUrl) window.location.href = approveUrl;
    },
  });

  const azulMutation = useMutation({
    mutationFn: (planId: string) =>
      suscripcionesApi.crearPagoAzul({
        planId,
        frecuencia: frecuenciaAnual ? 'anual' : 'mensual',
      }),
    onSuccess: (res) => {
      const url = res.data?.paymentUrl || res.data?.data?.paymentUrl;
      if (url) window.location.href = url;
    },
  });

  const moncashMutation = useMutation({
    mutationFn: (planId: string) =>
      suscripcionesApi.crearPagoMonCash({
        planId,
        frecuencia: frecuenciaAnual ? 'anual' : 'mensual',
      }),
    onSuccess: (res) => {
      const url = res.data?.paymentUrl || res.data?.data?.paymentUrl;
      if (url) window.location.href = url;
    },
  });

  const cardnetMutation = useMutation({
    mutationFn: (planId: string) =>
      suscripcionesApi.crearPagoCardNet({
        planId,
        frecuencia: frecuenciaAnual ? 'anual' : 'mensual',
      }),
    onSuccess: (res) => {
      const url = res.data?.paymentUrl || res.data?.data?.paymentUrl;
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

  const isAnyLoading = checkoutMutation.isPending || paypalMutation.isPending
    || azulMutation.isPending || moncashMutation.isPending || cardnetMutation.isPending;

  const isCapturing = (paypalToken && !paypalCaptured) || (moncashTxId && !moncashCaptured);

  if (loadingSuscripcion || loadingPlanes || isCapturing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        {paypalToken && <p className="text-muted-foreground">Procesando pago de PayPal...</p>}
        {moncashTxId && <p className="text-muted-foreground">Procesando pago de MonCash...</p>}
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

      {/* Payment status feedback */}
      {status === 'exito' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Pago procesado exitosamente</p>
                <p className="text-sm text-green-700">
                  Tu suscripcion ha sido activada. Puede tomar unos segundos en reflejarse.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'cancelado' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Pago cancelado</p>
                <p className="text-sm text-yellow-700">
                  El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            {(() => {
              const f = parsePlanFeatures(suscripcion.plan.features);
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      {f.dominioPropio ? 'Dominio propio' : 'Solo subdominio'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Image className="w-4 h-4" />
                      {f.maxImagenesActividad} img/actividad
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Video className="w-4 h-4" />
                      {f.maxVideosActividad > 0 ? `${f.maxVideosActividad} videos/actividad` : 'Sin videos'}
                    </div>
                  </div>
                  {f.items.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Caracteristicas incluidas:</p>
                      <ul className="grid grid-cols-2 gap-1">
                        {f.items.map((feat) => (
                          <li key={feat} className="flex items-center gap-2 text-sm">
                            <Check className="w-3 h-3 text-green-500" />
                            {featureLabels[feat] || feat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Action buttons */}
            {suscripcion.estado === 'ACTIVA' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {suscripcion.stripeCustomerId ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                    >
                      {portalMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Receipt className="w-4 h-4 mr-2" />
                      )}
                      Gestionar facturacion
                    </Button>
                    <Button
                      variant={showChangePlan ? 'secondary' : 'outline'}
                      onClick={() => setShowChangePlan(!showChangePlan)}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Cambiar plan
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => checkoutMutation.mutate(suscripcion.planId)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Configurar metodo de pago
                    </Button>
                    <Button
                      variant={showChangePlan ? 'secondary' : 'outline'}
                      onClick={() => setShowChangePlan(!showChangePlan)}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Cambiar plan
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan selection — no subscription or expired */}
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
            onStripe={(planId) => checkoutMutation.mutate(planId)}
            onPayPal={(planId) => paypalMutation.mutate(planId)}
            onAzul={(planId) => azulMutation.mutate(planId)}
            onMonCash={(planId) => moncashMutation.mutate(planId)}
            onCardNet={(planId) => cardnetMutation.mutate(planId)}
            isLoading={isAnyLoading}
          />
        </div>
      )}

      {/* Plan selection — change plan on active subscription */}
      {showChangePlan && suscripcion?.estado === 'ACTIVA' && planes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Cambiar plan</h2>

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
            onStripe={(planId) => checkoutMutation.mutate(planId)}
            onPayPal={(planId) => paypalMutation.mutate(planId)}
            onAzul={(planId) => azulMutation.mutate(planId)}
            onMonCash={(planId) => moncashMutation.mutate(planId)}
            onCardNet={(planId) => cardnetMutation.mutate(planId)}
            isLoading={isAnyLoading}
            currentPlanId={suscripcion.planId}
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
