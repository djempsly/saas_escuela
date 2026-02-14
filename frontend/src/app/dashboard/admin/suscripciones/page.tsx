'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminSuscripcionesApi, planesApi, institucionesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {
  Loader2,
  CreditCard,
  Search,
  Building2,
  Receipt,
  Plus,
  DollarSign,
  AlertTriangle,
  Users,
  Ban,
} from 'lucide-react';

interface Plan {
  id: string;
  nombre: string;
  maxEstudiantes: number | null;
  precioMensual: string | number;
  precioAnual: string | number;
  features: string[];
}

interface DashboardSuscripcion {
  id: string;
  planId: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  proximoPago: string | null;
  plan: Plan;
}

interface DashboardItem {
  id: string;
  nombre: string;
  slug: string;
  suscripcion: DashboardSuscripcion | null;
  estudiantes: number;
  maxEstudiantes: number | null;
  ultimoPago: { monto: string | number; fechaPago: string } | null;
}

interface DashboardData {
  items: DashboardItem[];
  ingresosTotales: number;
  ingresosMes: number;
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

type TabFilter = 'todas' | 'sin_suscripcion' | 'activas' | 'atrasadas' | 'canceladas';

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function filterByTab(items: DashboardItem[], tab: TabFilter): DashboardItem[] {
  switch (tab) {
    case 'sin_suscripcion':
      return items.filter((i) => !i.suscripcion);
    case 'activas':
      return items.filter((i) => i.suscripcion?.estado === 'ACTIVA');
    case 'atrasadas':
      return items.filter((i) =>
        i.suscripcion?.estado === 'VENCIDA' || i.suscripcion?.estado === 'PERIODO_GRACIA',
      );
    case 'canceladas':
      return items.filter((i) =>
        i.suscripcion?.estado === 'CANCELADA' || i.suscripcion?.estado === 'SUSPENDIDA',
      );
    default:
      return items;
  }
}

export default function AdminSuscripcionesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [showAsignarDialog, setShowAsignarDialog] = useState(false);
  const [showPagosDialog, setShowPagosDialog] = useState(false);
  const [selectedInstitucionId, setSelectedInstitucionId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [pagosInstitucionId, setPagosInstitucionId] = useState('');

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: queryKeys.suscripciones.adminDashboard(),
    queryFn: async () => {
      const res = await adminSuscripcionesApi.getDashboard();
      return res.data;
    },
  });

  const items = dashboard?.items ?? [];

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
    total: items.length,
    activas: items.filter((i) => i.suscripcion?.estado === 'ACTIVA').length,
    sinSuscripcion: items.filter((i) => !i.suscripcion).length,
    atrasadas: items.filter((i) =>
      i.suscripcion?.estado === 'VENCIDA' || i.suscripcion?.estado === 'PERIODO_GRACIA',
    ).length,
    ingresosTotales: dashboard?.ingresosTotales ?? 0,
    ingresosMes: dashboard?.ingresosMes ?? 0,
  };

  // Filter by tab then search
  const tabFiltered = filterByTab(items, tab);
  const filtered = tabFiltered.filter((i) =>
    !busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suscripciones</h1>
          <p className="text-muted-foreground">Gestiona las suscripciones de todas las instituciones</p>
        </div>
        <Button onClick={() => setShowAsignarDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Asignar plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Instituciones</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Activas</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.activas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-muted-foreground">Sin plan</span>
            </div>
            <div className="text-2xl font-bold text-slate-500">{stats.sinSuscripcion}</div>
          </CardContent>
        </Card>
        <Card className={stats.atrasadas > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Atrasadas</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.atrasadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ingresos totales</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.ingresosTotales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Este mes</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.ingresosMes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
          <TabsList>
            <TabsTrigger value="todas">
              Todas ({items.length})
            </TabsTrigger>
            <TabsTrigger value="sin_suscripcion">
              Sin plan ({stats.sinSuscripcion})
            </TabsTrigger>
            <TabsTrigger value="activas">
              Activas ({stats.activas})
            </TabsTrigger>
            <TabsTrigger value="atrasadas">
              Atrasadas ({stats.atrasadas})
            </TabsTrigger>
            <TabsTrigger value="canceladas">
              Canceladas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por institucion..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No se encontraron instituciones.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Institucion</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estudiantes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ultimo pago</TableHead>
                  <TableHead>Proximo pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-slate-600" />
                        </div>
                        <span className="font-medium">{item.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.suscripcion ? (
                        <span>{item.suscripcion.plan.nombre}</span>
                      ) : (
                        <span className="text-muted-foreground">Sin plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{item.estudiantes}</span>
                        {item.maxEstudiantes !== null && (
                          <span className="text-muted-foreground">/ {item.maxEstudiantes}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.suscripcion ? (
                        <Badge variant={estadoBadge[item.suscripcion.estado]?.variant || 'secondary'}>
                          {estadoBadge[item.suscripcion.estado]?.label || item.suscripcion.estado}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Sin suscripcion</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.ultimoPago ? (
                        <div className="text-sm">
                          <div>{formatCurrency(Number(item.ultimoPago.monto))}</div>
                          <div className="text-muted-foreground">
                            {new Date(item.ultimoPago.fechaPago).toLocaleDateString('es')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.suscripcion?.proximoPago ? (
                        <span className="text-sm">
                          {new Date(item.suscripcion.proximoPago).toLocaleDateString('es')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPagosInstitucionId(item.id);
                            setShowPagosDialog(true);
                          }}
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1" />
                          Pagos
                        </Button>
                        {!item.suscripcion && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInstitucionId(item.id);
                              setShowAsignarDialog(true);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Asignar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Descripcion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        {new Date(pago.fechaPago).toLocaleDateString('es')}
                      </TableCell>
                      <TableCell>{pago.suscripcion?.plan?.nombre || '-'}</TableCell>
                      <TableCell className="text-right">
                        ${Number(pago.monto).toFixed(2)} {pago.moneda}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={pagoBadge[pago.estado]?.variant || 'secondary'}>
                          {pagoBadge[pago.estado]?.label || pago.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pago.descripcion || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
