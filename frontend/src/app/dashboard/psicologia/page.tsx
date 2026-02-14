'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { psicologiaApi, sabanaApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Brain,
  Trash2,
  Send,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MateriaReprobada {
  materiaId: string;
  materiaNombre: string;
  claseId: string;
  promedioFinal: number | null;
  situacion: string | null;
}

interface EstudianteNotaBaja {
  estudiante: {
    id: string;
    nombre: string;
    segundoNombre?: string | null;
    apellido: string;
    segundoApellido?: string | null;
    nivelActual?: { id: string; nombre: string } | null;
  };
  materiasReprobadas: MateriaReprobada[];
  promedioGeneral: number;
}

interface Observacion {
  id: string;
  texto: string;
  createdAt: string;
  psicologo: {
    id: string;
    nombre: string;
    apellido: string;
  };
}

interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function PsicologiaPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstudiante, setSelectedEstudiante] = useState<EstudianteNotaBaja | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevaObservacion, setNuevaObservacion] = useState('');

  // Fetch ciclos lectivos
  const { data: ciclos = [] } = useQuery({
    queryKey: queryKeys.sabana.ciclosLectivos(),
    queryFn: async () => {
      const res = await sabanaApi.getCiclosLectivos();
      const data = res.data as CicloLectivo[];
      // Auto-select active ciclo
      if (!selectedCiclo && data.length > 0) {
        const activo = data.find((c) => c.activo);
        if (activo) setSelectedCiclo(activo.id);
      }
      return data;
    },
  });

  // Fetch notas bajas
  const { data: estudiantes = [], isLoading } = useQuery({
    queryKey: queryKeys.psicologia.notasBajas(selectedCiclo),
    queryFn: async () => {
      const res = await psicologiaApi.getNotasBajas(selectedCiclo);
      return res.data as EstudianteNotaBaja[];
    },
    enabled: !!selectedCiclo,
  });

  // Fetch observaciones for selected student
  const { data: observaciones = [], isLoading: loadingObs } = useQuery({
    queryKey: queryKeys.psicologia.observaciones(selectedEstudiante?.estudiante.id || ''),
    queryFn: async () => {
      const res = await psicologiaApi.getObservaciones(selectedEstudiante!.estudiante.id);
      return res.data as Observacion[];
    },
    enabled: !!selectedEstudiante,
  });

  // Create observacion mutation
  const crearMutation = useMutation({
    mutationFn: (data: { estudianteId: string; texto: string }) =>
      psicologiaApi.crearObservacion(data),
    onSuccess: () => {
      toast.success('Observacion guardada');
      setNuevaObservacion('');
      queryClient.invalidateQueries({
        queryKey: queryKeys.psicologia.observaciones(selectedEstudiante!.estudiante.id),
      });
    },
    onError: () => {
      toast.error('Error al guardar observacion');
    },
  });

  // Delete observacion mutation
  const eliminarMutation = useMutation({
    mutationFn: (id: string) => psicologiaApi.eliminarObservacion(id),
    onSuccess: () => {
      toast.success('Observacion eliminada');
      queryClient.invalidateQueries({
        queryKey: queryKeys.psicologia.observaciones(selectedEstudiante!.estudiante.id),
      });
    },
    onError: () => {
      toast.error('Error al eliminar observacion');
    },
  });

  const handleSubmitObservacion = () => {
    if (!nuevaObservacion.trim() || !selectedEstudiante) return;
    crearMutation.mutate({
      estudianteId: selectedEstudiante.estudiante.id,
      texto: nuevaObservacion.trim(),
    });
  };

  const handleOpenDetail = (est: EstudianteNotaBaja) => {
    setSelectedEstudiante(est);
    setDialogOpen(true);
    setNuevaObservacion('');
  };

  const filtered = estudiantes.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${e.estudiante.nombre} ${e.estudiante.segundoNombre || ''} ${e.estudiante.apellido} ${e.estudiante.segundoApellido || ''}`.toLowerCase();
    return fullName.includes(term);
  });

  const fullName = (est: EstudianteNotaBaja['estudiante']) => {
    return [est.nombre, est.segundoNombre, est.apellido, est.segundoApellido]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Estudiantes con Notas Bajas
        </h1>
        <p className="text-muted-foreground">
          Estudiantes con promedio menor a 70 o situacion REPROBADO
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <select
                value={selectedCiclo}
                onChange={(e) => setSelectedCiclo(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
              >
                <option value="">Seleccionar ciclo lectivo</option>
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.activo ? '(Activo)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!selectedCiclo ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Selecciona un ciclo lectivo para ver resultados</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'No se encontraron estudiantes' : 'No hay estudiantes con notas bajas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Estudiante</th>
                <th className="text-left p-3 font-medium">Nivel</th>
                <th className="text-center p-3 font-medium">Promedio</th>
                <th className="text-center p-3 font-medium">Materias Reprobadas</th>
                <th className="text-center p-3 font-medium">Estado</th>
                <th className="text-center p-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const tieneReprobado = item.materiasReprobadas.some(
                  (m) => m.situacion === 'REPROBADO'
                );
                return (
                  <tr key={item.estudiante.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                          {item.estudiante.nombre[0]}{item.estudiante.apellido[0]}
                        </div>
                        <span className="font-medium">{fullName(item.estudiante)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {item.estudiante.nivelActual?.nombre || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-mono font-bold ${item.promedioGeneral < 60 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {item.promedioGeneral}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary">{item.materiasReprobadas.length}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      {tieneReprobado ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Reprobado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                          Bajo rendimiento
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(item)}
                      >
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedEstudiante && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                    {selectedEstudiante.estudiante.nombre[0]}{selectedEstudiante.estudiante.apellido[0]}
                  </div>
                  <div>
                    <p>{fullName(selectedEstudiante.estudiante)}</p>
                    <p className="text-sm font-normal text-muted-foreground">
                      {selectedEstudiante.estudiante.nivelActual?.nombre || 'Sin nivel'}
                      {' - '}Promedio: <span className="font-mono font-bold">{selectedEstudiante.promedioGeneral}</span>
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Materias reprobadas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Materias con bajo rendimiento</h3>
                <div className="space-y-2">
                  {selectedEstudiante.materiasReprobadas.map((mat) => (
                    <div
                      key={`${mat.materiaId}-${mat.claseId}`}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                    >
                      <span className="text-sm">{mat.materiaNombre}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${(mat.promedioFinal ?? 0) < 60 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {mat.promedioFinal ?? 0}
                        </span>
                        {mat.situacion === 'REPROBADO' && (
                          <Badge variant="destructive" className="text-xs">Reprobado</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-3 mt-4">
                <h3 className="font-semibold text-sm">
                  Observaciones ({observaciones.length})
                </h3>

                {/* Nueva observacion */}
                <div className="flex gap-2">
                  <textarea
                    value={nuevaObservacion}
                    onChange={(e) => setNuevaObservacion(e.target.value)}
                    placeholder="Escribir observacion..."
                    className="flex-1 min-h-[80px] p-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitObservacion}
                    disabled={!nuevaObservacion.trim() || crearMutation.isPending}
                    className="self-end"
                  >
                    {crearMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Lista de observaciones */}
                {loadingObs ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : observaciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin observaciones registradas
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {observaciones.map((obs) => (
                      <div key={obs.id} className="p-3 border rounded-md space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {obs.psicologo.nombre} {obs.psicologo.apellido} -{' '}
                            {new Date(obs.createdAt).toLocaleDateString('es-DO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {obs.psicologo.id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => eliminarMutation.mutate(obs.id)}
                              disabled={eliminarMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{obs.texto}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
