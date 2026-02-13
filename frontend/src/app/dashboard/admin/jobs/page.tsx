'use client';

import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Pause,
} from 'lucide-react';

interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

type OverviewData = Record<string, QueueCounts>;

const queueLabels: Record<string, string> = {
  'generar-boletin': 'Generar Boletines',
  'exportar-excel': 'Exportar Excel',
  'notificaciones-masivas': 'Notificaciones Masivas',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  waiting: { label: 'En espera', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  active: { label: 'Activos', color: 'bg-blue-100 text-blue-800', icon: Play },
  completed: { label: 'Completados', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { label: 'Fallidos', color: 'bg-red-100 text-red-800', icon: XCircle },
  delayed: { label: 'Retrasados', color: 'bg-orange-100 text-orange-800', icon: Clock },
  paused: { label: 'Pausados', color: 'bg-gray-100 text-gray-800', icon: Pause },
};

export default function AdminJobsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: queryKeys.jobs.overview(),
    queryFn: async () => {
      const res = await jobsApi.getOverview();
      return res.data as OverviewData;
    },
    refetchInterval: 10_000,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-16 w-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold mb-2">Acceso restringido</h2>
        <p>Solo administradores pueden acceder a esta seccion.</p>
      </div>
    );
  }

  const queues = data ? Object.entries(data) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold">Monitor de Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Estado de las colas de procesamiento en segundo plano
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : queues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No se encontraron colas activas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {queues.map(([queueName, counts]) => (
            <QueueCard key={queueName} name={queueName} counts={counts} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Se actualiza automaticamente cada 10 segundos
      </p>
    </div>
  );
}

function QueueCard({ name, counts }: { name: string; counts: QueueCounts }) {
  const total = counts.waiting + counts.active + counts.completed + counts.failed;
  const statuses = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'] as const;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>{queueLabels[name] || name}</span>
          <Badge variant="outline" className="font-mono text-xs">
            {name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statuses.map((status) => {
            const config = statusConfig[status];
            const count = counts[status] || 0;
            const Icon = config.icon;
            return (
              <div
                key={status}
                className="flex flex-col items-center p-3 rounded-lg border"
              >
                <Icon className="h-5 w-5 mb-1 text-muted-foreground" />
                <span className="text-2xl font-bold">{count}</span>
                <Badge variant="secondary" className={`${config.color} text-xs mt-1`}>
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
        {total > 0 && (
          <div className="mt-4 pt-3 border-t text-sm text-muted-foreground">
            Total procesados: <span className="font-medium">{total}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
