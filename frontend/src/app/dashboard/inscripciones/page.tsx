'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inscripcionesApi } from '@/lib/api';
import { Users, Loader2, Plus, Search, UserPlus, CheckSquare, Square, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useClases, useEstudiantes, useNiveles } from '@/lib/query-hooks';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
}

interface Clase {
  id: string;
  codigo: string;
  materia?: { nombre: string };
  nivel?: { id: string; nombre: string };
}

interface Inscripcion {
  id: string;
  estudianteId: string;
  estudiante?: Estudiante;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DuplicateInscripcion {
  estudiante: Estudiante;
  inscritoExistente: Estudiante;
}

export default function InscripcionesPage() {
  const queryClient = useQueryClient();
  const [selectedClase, setSelectedClase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState({ current: 0, total: 0 });
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateInscripcion[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingInscripcionIds, setPendingInscripcionIds] = useState<string[]>([]);
  const [inscritosPage, setInscritosPage] = useState(1);

  const { data: clases = [], isLoading: isLoadingClases } = useClases() as { data: Clase[] | undefined; isLoading: boolean };
  const { data: estudiantes = [], isLoading: isLoadingEstudiantes } = useEstudiantes({ limit: 200 }) as { data: Estudiante[] | undefined; isLoading: boolean };
  const { isLoading: isLoadingNiveles } = useNiveles();

  const isLoading = isLoadingClases || isLoadingEstudiantes || isLoadingNiveles;

  const { data: inscritosData } = useQuery({
    queryKey: queryKeys.inscripciones.byClase(selectedClase, inscritosPage),
    queryFn: async () => {
      const response = await inscripcionesApi.getByClase(selectedClase, { page: inscritosPage, limit: 50 });
      return response.data;
    },
    enabled: !!selectedClase,
  });

  const inscritos: Inscripcion[] = inscritosData?.data || [];
  const inscritosPagination: Pagination | null = inscritosData?.pagination || null;

  const inscribirMutation = useMutation({
    mutationFn: ({ claseId, estudianteIds }: { claseId: string; estudianteIds: string[] }) =>
      inscripcionesApi.inscribirMasivo(claseId, estudianteIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inscripciones.byClase(selectedClase, 1) });
    },
  });

  const checkDuplicatesForInscripcion = (estudianteIds: string[]): DuplicateInscripcion[] => {
    const matches: DuplicateInscripcion[] = [];
    for (const id of estudianteIds) {
      const est = estudiantes.find((e) => e.id === id);
      if (!est) continue;
      const inscrito = inscritos.find(
        (i) =>
          i.estudiante &&
          i.estudiante.nombre.toLowerCase() === est.nombre.toLowerCase() &&
          i.estudiante.apellido.toLowerCase() === est.apellido.toLowerCase() &&
          i.estudiante.id !== est.id
      );
      if (inscrito?.estudiante) {
        matches.push({ estudiante: est, inscritoExistente: inscrito.estudiante });
      }
    }
    return matches;
  };

  const handleSelectClase = (claseId: string) => {
    setSelectedClase(claseId);
    setInscritosPage(1);
    setSelectedStudents(new Set());
  };

  const handleInscribir = async (estudianteId: string) => {
    if (!selectedClase) {
      alert('Selecciona una clase primero');
      return;
    }

    const matches = checkDuplicatesForInscripcion([estudianteId]);
    if (matches.length > 0) {
      setDuplicateMatches(matches);
      setPendingInscripcionIds([estudianteId]);
      setShowDuplicateWarning(true);
      return;
    }

    try {
      await inscribirMutation.mutateAsync({ claseId: selectedClase, estudianteIds: [estudianteId] });
      setInscritosPage(1);
      queryClient.invalidateQueries({ queryKey: queryKeys.inscripciones.byClase(selectedClase, 1) });
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al inscribir');
    }
  };

  const handleInscribirSeleccionados = async () => {
    if (!selectedClase || selectedStudents.size === 0) return;

    const ids = Array.from(selectedStudents);
    const matches = checkDuplicatesForInscripcion(ids);
    if (matches.length > 0) {
      setDuplicateMatches(matches);
      setPendingInscripcionIds(ids);
      setShowDuplicateWarning(true);
      return;
    }

    await proceedWithInscripcion(ids);
  };

  const proceedWithInscripcion = async (ids: string[]) => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    setPendingInscripcionIds([]);

    setIsEnrolling(true);
    setEnrollProgress({ current: 0, total: ids.length });

    let enrolled = 0;

    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      try {
        await inscribirMutation.mutateAsync({ claseId: selectedClase, estudianteIds: batch });
        enrolled += batch.length;
        setEnrollProgress({ current: enrolled, total: ids.length });
      } catch (error) {
        const apiError = error as ApiError;
        console.error('Error enrolling batch:', apiError);
      }
    }

    setSelectedStudents(new Set());
    setIsEnrolling(false);
    setInscritosPage(1);
    queryClient.invalidateQueries({ queryKey: queryKeys.inscripciones.byClase(selectedClase, 1) });
  };

  const estudiantesNoInscritos = estudiantes.filter(
    (e) => !inscritos.some((i) => i.estudianteId === e.id || i.estudiante?.id === e.id)
  );

  const filteredEstudiantes = estudiantesNoInscritos.filter((e) => {
    const matchesSearch =
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const toggleStudentSelection = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredEstudiantes.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredEstudiantes.map((e) => e.id)));
    }
  };

  const selectedClaseData = clases.find((c) => c.id === selectedClase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inscripciones</h1>
        <p className="text-muted-foreground">Gestiona las inscripciones de estudiantes a clases</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar Clase</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedClase}
            onChange={(e) => handleSelectClase(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">-- Seleccionar clase --</option>
            {clases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.materia?.nombre} - {c.nivel?.nombre} ({c.codigo})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : selectedClase ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Estudiantes Inscritos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5" />
                Inscritos ({inscritosPagination ? inscritosPagination.total : inscritos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inscritos.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {inscritos.map((i) => (
                    <div
                      key={i.id}
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                        {i.estudiante?.nombre?.[0]}{i.estudiante?.apellido?.[0]}
                      </div>
                      <span className="text-sm">
                        {i.estudiante?.nombre} {i.estudiante?.apellido}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No hay estudiantes inscritos
                </p>
              )}
              {inscritosPagination && inscritosPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Página {inscritosPagination.page} de {inscritosPagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={inscritosPagination.page <= 1}
                      onClick={() => {
                        const p = inscritosPage - 1;
                        setInscritosPage(p);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={inscritosPagination.page >= inscritosPagination.totalPages}
                      onClick={() => {
                        const p = inscritosPage + 1;
                        setInscritosPage(p);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estudiantes Disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Disponibles ({filteredEstudiantes.length})
                </div>
                {selectedStudents.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleInscribirSeleccionados}
                    disabled={isEnrolling}
                  >
                    {isEnrolling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        {enrollProgress.current}/{enrollProgress.total}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Inscribir ({selectedStudents.size})
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredEstudiantes.length > 0 && (
                <div className="mb-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    {selectedStudents.size === filteredEstudiantes.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedStudents.size === filteredEstudiantes.length
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </button>
                </div>
              )}

              {filteredEstudiantes.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-auto">
                  {filteredEstudiantes.map((e) => (
                    <div
                      key={e.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        selectedStudents.has(e.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => toggleStudentSelection(e.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedStudents.has(e.id)
                            ? 'bg-primary border-primary text-white'
                            : 'border-slate-300'
                        }`}>
                          {selectedStudents.has(e.id) && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">
                          {e.nombre[0]}{e.apellido[0]}
                        </div>
                        <span className="text-sm">{e.nombre} {e.apellido}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleInscribir(e.id);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {searchTerm ? 'Sin resultados' : 'Todos los estudiantes estan inscritos'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Selecciona una clase para gestionar inscripciones
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de advertencia de duplicados */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="w-5 h-5" />
              Posible inscripcion duplicada
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Se encontraron <strong>{duplicateMatches.length}</strong> estudiante(s) con el mismo nombre y apellido que otros ya inscritos en esta clase:
                </p>
                <div className="max-h-52 overflow-auto space-y-2">
                  {duplicateMatches.map((match, idx) => (
                    <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <p className="font-medium text-foreground">
                        {match.estudiante.nombre} {match.estudiante.apellido}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ya inscrito con ese nombre: <strong>{match.inscritoExistente.nombre} {match.inscritoExistente.apellido}</strong>
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm">Deseas inscribir de todas formas?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => proceedWithInscripcion(pendingInscripcionIds)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Continuar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
