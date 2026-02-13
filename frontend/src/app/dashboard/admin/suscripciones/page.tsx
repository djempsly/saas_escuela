'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { adminSuscripcionesApi, planesApi, institucionesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {
  Loader2,
  CreditCard,
  Search,
  Building2,
  Calendar,
  Receipt,
  Plus,
} from 'lucide-react';

interface Plan {
  id: string;
  nombre: string;
  maxEstudiantes: number | null;
  precioMensual: string | number;
  precioAnual: string | number;
  features: string[];
}

interface Suscripcion {
  id: string;
  institucionId: string;
  planId: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  proximoPago: string | null;
  plan: Plan;
  institucion: { id: string; nombre: string; slug: string };
}

interface Pago {
  id: string;
  monto: string | number;
  moneda: string;
  estado: string;
  fechaPago: string;
  descripcion: string | null;
  suscripcion: { plan: { nombre: string } };
}

interface Institucion {
  id: string;
  nombre: string;
}

const estadoBadge: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  ACTIVA: { label: 'Activa', variant: 'success' },
  VENCIDA: { label: 'Vencida', variant: 'destructive' },
  CANCELADA: { label: 'Cancelada', variant: 'secondary' },
  PERIODO_GRACIA: { label: 'Periodo de Gracia', variant: 'warning' },
  SUSPENDIDA: { label: 'Suspendida', variant: 'destructive' },
};

const pagoBadge: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' }> = {
  EXITOSO: { label: 'Exitoso', variant: 'success' },
  FALLIDO: { label: 'Fallido', variant: 'destructive' },
  REEMBOLSADO: { label: 'Reembolsado', variant: 'warning' },
};

export default function AdminSuscripcionesPage() {
  const queryClient = useQueryClient();
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState('');
  const [showAsignarDialog, setShowAsignarDialog] = useState(false);
  const [showPagosDialog, setShowPagosDialog] = useState(false);
  const [selectedInstitucionId, setSelectedInstitucionId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [pagosInstitucionId, setPagosInstitucionId] = useState('');

  const { data: suscripciones = [], isLoading } = useQuery<Suscripcion[]>({
    queryKey: queryKeys.suscripciones.adminList(filtroEstado || undefined),
    queryFn: async () => {
      const res = await adminSuscripcionesApi.getAll(filtroEstado || undefined);
      return res.data?.data || res.data || [];
    },
  });

  const { data: planes = [] } = useQuery<Plan[]>({
    queryKey: queryKeys.planes.list(),
    queryFn: async () => {
      const res = await planesApi.getAll();
      return res.data?.data || res.data || [];
    },
  });

  const { data: instituciones = [] } = useQuery<Institucion[]>({
    queryKey: ['instituciones', 'list'],
    queryFn: async () => {
      const res = await institucionesApi.getAll();
      return res.data?.data || res.data || [];
    },
    enabled: showAsignarDialog,
  });

  const { data: pagos = [], isLoading: loadingPagos } = useQuery<Pago[]>({
    queryKey: queryKeys.suscripciones.pagos(pagosInstitucionId),
    queryFn: async () => {
      const res = await adminSuscripcionesApi.getPagos(pagosInstitucionId);
      return res.data?.data || res.data || [];
    },
    enabled: !!pagosInstitucionId && showPagosDialog,
  });

  const asignarMutation = useMutation({
    mutationFn: (data: { institucionId: string; planId: string }) =>
      adminSuscripcionesApi.asignarPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suscripciones', 'admin'] });
      setShowAsignarDialog(false);
      setSelectedInstitucionId('');
      setSelectedPlanId('');
    },
  });

  // Stats
  const stats = {
    total: suscripciones.length,
    activas: suscripciones.filter((s) => s.estado === 'ACTIVA').length,
    vencidas: suscripciones.filter((s) => s.estado === 'VENCIDA').length,
    suspendidas: suscripciones.filter((s) => s.estado === 'SUSPENDIDA').length,
  };

  // Filter by search
  const filtered = suscripciones.filter((s) =>
    !busqueda || s.institucion.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Suscripciones</h1>
        <p className="text-muted-foreground">Gestiona las suscripciones de todas las instituciones</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.activas}</div>
            <p className="text-sm text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.vencidas}</div>
            <p className="text-sm text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.suspendidas}</div>
            <p className="text-sm text-muted-foreground">Suspendidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por institucion..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="ACTIVA">Activa</SelectItem>
                <SelectItem value="VENCIDA">Vencida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="PERIODO_GRACIA">Periodo de Gracia</SelectItem>
                <SelectItem value="SUSPENDIDA">Suspendida</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAsignarDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Asignar plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron suscripciones.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{sub.institucion.nombre}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CreditCard className="w-3 h-3" />
                        Plan {sub.plan.nombre}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm hidden md:block">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Inicio: {new Date(sub.fechaInicio).toLocaleDateString('es')}
                      </div>
                      {sub.proximoPago && (
                        <div className="text-muted-foreground">
                          Proximo pago: {new Date(sub.proximoPago).toLocaleDateString('es')}
                        </div>
                      )}
                    </div>
                    <Badge variant={estadoBadge[sub.estado]?.variant || 'secondary'}>
                      {estadoBadge[sub.estado]?.label || sub.estado}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPagosInstitucionId(sub.institucionId);
                        setShowPagosDialog(true);
                      }}
                    >
                      <Receipt className="w-4 h-4 mr-1" />
                      Pagos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Asignar Plan Dialog */}
      <Dialog open={showAsignarDialog} onOpenChange={setShowAsignarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Plan Manual</DialogTitle>
            <DialogDescription>
              Selecciona una institucion y un plan para asignar manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Institucion</label>
              <Select value={selectedInstitucionId} onValueChange={setSelectedInstitucionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar institucion" />
                </SelectTrigger>
                <SelectContent>
                  {instituciones.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Plan</label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {planes.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.nombre} — ${Number(plan.precioMensual).toFixed(2)}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsignarDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                asignarMutation.mutate({
                  institucionId: selectedInstitucionId,
                  planId: selectedPlanId,
                })
              }
              disabled={!selectedInstitucionId || !selectedPlanId || asignarMutation.isPending}
            >
              {asignarMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Historial de Pagos Dialog */}
      <Dialog open={showPagosDialog} onOpenChange={(open) => {
        setShowPagosDialog(open);
        if (!open) setPagosInstitucionId('');
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Pagos</DialogTitle>
            <DialogDescription>
              Pagos registrados para esta institucion.
            </DialogDescription>
          </DialogHeader>

          {loadingPagos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pagos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay pagos registrados.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Fecha</th>
                    <th className="text-left py-2 font-medium">Plan</th>
                    <th className="text-right py-2 font-medium">Monto</th>
                    <th className="text-center py-2 font-medium">Estado</th>
                    <th className="text-left py-2 font-medium">Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b last:border-0">
                      <td className="py-2">
                        {new Date(pago.fechaPago).toLocaleDateString('es')}
                      </td>
                      <td className="py-2">{pago.suscripcion?.plan?.nombre || '-'}</td>
                      <td className="py-2 text-right">
                        ${Number(pago.monto).toFixed(2)} {pago.moneda}
                      </td>
                      <td className="py-2 text-center">
                        <Badge variant={pagoBadge[pago.estado]?.variant || 'secondary'}>
                          {pagoBadge[pago.estado]?.label || pago.estado}
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {pago.descripcion || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
