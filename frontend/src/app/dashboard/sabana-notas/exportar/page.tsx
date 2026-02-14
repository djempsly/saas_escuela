'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sabanaApi, jobsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Layers,
} from 'lucide-react';

interface Nivel {
  id: string;
  nombre: string;
}

interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface JobStatus {
  id: string;
  queue: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number | Record<string, unknown>;
  result: { url?: string; fileName?: string; totalNiveles?: number } | null;
  failedReason: string | null;
}

interface ApiError {
  response?: { data?: { message?: string; error?: string } };
  message?: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  waiting: { label: 'En espera', color: 'bg-yellow-100 text-yellow-800' },
  active: { label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completado', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-800' },
  delayed: { label: 'Retrasado', color: 'bg-orange-100 text-orange-800' },
};

export default function ExportarSabanaPage() {
  const [nivelId, setNivelId] = useState('');
  const [cicloId, setCicloId] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingTodo, setIsSubmittingTodo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const { data: niveles = [] } = useQuery({
    queryKey: queryKeys.sabana.niveles(),
    queryFn: async () => {
      const res = await sabanaApi.getNiveles();
      return (res.data || []) as Nivel[];
    },
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: queryKeys.sabana.ciclosLectivos(),
    queryFn: async () => {
      const res = await sabanaApi.getCiclosLectivos();
      return (res.data || []) as CicloLectivo[];
    },
  });

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const res = await jobsApi.getStatus(jobId);
        const data = res.data as JobStatus;
        setJobStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        // Job may not be found yet, keep polling
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobId]);

  const handleExport = async () => {
    setIsSubmitting(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const res = await sabanaApi.exportarExcel(nivelId, cicloId);
      setJobId(res.data.jobId);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.message || apiErr.response?.data?.error || 'Error al iniciar exportacion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTodo = async () => {
    setIsSubmittingTodo(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const res = await sabanaApi.exportarTodo(cicloId);
      setJobId(res.data.jobId);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.response?.data?.message || apiErr.response?.data?.error || 'Error al iniciar exportacion');
    } finally {
      setIsSubmittingTodo(false);
    }
  };

  const handleReset = () => {
    setJobId(null);
    setJobStatus(null);
    setError(null);
  };

  const selectedNivel = niveles.find((n: Nivel) => n.id === nivelId);
  const selectedCiclo = ciclos.find((c: CicloLectivo) => c.id === cicloId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-8 w-8 text-slate-600" />
        <div>
          <h1 className="text-2xl font-bold">Exportar Sabana de Notas</h1>
          <p className="text-sm text-muted-foreground">
            Genera un archivo Excel con la sabana de notas completa
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Exportacion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nivel</Label>
              <Select value={nivelId} onValueChange={(v) => { setNivelId(v); handleReset(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  {niveles.map((n: Nivel) => (
                    <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ciclo Lectivo</Label>
              <Select value={cicloId} onValueChange={(v) => { setCicloId(v); handleReset(); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {ciclos.map((c: CicloLectivo) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.activo ? '(Activo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedNivel && selectedCiclo && (
            <p className="text-sm text-muted-foreground">
              Se exportara la sabana de <strong>{selectedNivel.nombre}</strong>{' '}
              del ciclo <strong>{selectedCiclo.nombre}</strong>
            </p>
          )}

          {!jobId && (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExport}
                disabled={!nivelId || !cicloId || isSubmitting || isSubmittingTodo}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Exportar Nivel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportTodo}
                disabled={!cicloId || isSubmitting || isSubmittingTodo}
              >
                {isSubmittingTodo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Layers className="h-4 w-4 mr-2" />
                )}
                Exportar Todos los Niveles
              </Button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-lg p-4 flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Status */}
      {jobId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Estado de la Exportacion
              {jobStatus && (
                <Badge
                  variant="secondary"
                  className={statusLabels[jobStatus.status]?.color || ''}
                >
                  {statusLabels[jobStatus.status]?.label || jobStatus.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!jobStatus || jobStatus.status === 'waiting' || jobStatus.status === 'active' ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div>
                  <p className="font-medium">
                    {jobStatus?.status === 'active' ? 'Procesando...' : 'En cola de espera...'}
                  </p>
                  <p className="text-sm">La exportacion se esta generando en segundo plano.</p>
                </div>
              </div>
            ) : jobStatus.status === 'completed' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    Exportacion completada
                    {jobStatus.result?.totalNiveles
                      ? ` (${jobStatus.result.totalNiveles} niveles)`
                      : ''}
                  </span>
                </div>
                {jobStatus.result?.url ? (
                  <Button asChild>
                    <a href={jobStatus.result.url} download={jobStatus.result.fileName || 'sabana.xlsx'}>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Excel
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    La exportacion fue completada. El archivo estara disponible en sus notificaciones.
                  </p>
                )}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Nueva exportacion
                </Button>
              </div>
            ) : jobStatus.status === 'failed' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Error en la exportacion</span>
                </div>
                {jobStatus.failedReason && (
                  <p className="text-sm text-red-500">{jobStatus.failedReason}</p>
                )}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>Estado: {jobStatus.status}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Job ID: {jobId}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
