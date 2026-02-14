'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { sabanaApi, institucionesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Nivel, CicloLectivo, SabanaData, Calificacion, InstitucionInfo } from '../types';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useSabanaData() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedNivel, setSelectedNivel] = useState('');
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [selectedMateriaId, setSelectedMateriaId] = useState('all');
  const [page, setPage] = useState(1);

  const isDocente = user?.role === 'DOCENTE';
  const isReadOnly = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' ||
    user?.role === 'COORDINADOR' || user?.role === 'COORDINADOR_ACADEMICO' ||
    user?.role === 'ESTUDIANTE' || user?.role === 'PSICOLOGO';

  // Queries
  const { data: niveles = [], isLoading: isLoadingNiveles } = useQuery({
    queryKey: queryKeys.sabana.niveles(),
    queryFn: async () => {
      const res = await sabanaApi.getNiveles();
      return res.data as Nivel[];
    },
  });

  const { data: ciclosLectivos = [], isLoading: isLoadingCiclos } = useQuery({
    queryKey: queryKeys.sabana.ciclosLectivos(),
    queryFn: async () => {
      const res = await sabanaApi.getCiclosLectivos();
      return res.data as CicloLectivo[];
    },
  });

  const { data: institucion = null } = useQuery({
    queryKey: queryKeys.instituciones.branding(user?.institucionId || ''),
    queryFn: async () => {
      const instRes = await institucionesApi.getBranding(user!.institucionId!);
      const inst = instRes.data;
      return {
        nombre: inst.nombre,
        lema: inst.lema || null,
        logoUrl: inst.logoUrl || null,
        colorPrimario: inst.colorPrimario || '#1a56db',
        direccion: inst.direccion || null,
        codigoCentro: inst.codigoCentro || null,
        distritoEducativo: inst.distritoEducativo || null,
        regionalEducacion: inst.regionalEducacion || null,
        sabanaColores: inst.sabanaColores || null,
      } as InstitucionInfo;
    },
    enabled: !!user?.institucionId,
  });

  const { data: sabanaResponse, isLoading: loading } = useQuery({
    queryKey: queryKeys.sabana.data(selectedNivel, selectedCiclo, page),
    queryFn: async () => {
      const response = await sabanaApi.getSabana(selectedNivel, selectedCiclo, { page, limit: 50 });
      return response.data as SabanaData;
    },
    enabled: !!selectedNivel && !!selectedCiclo,
  });

  const sabanaData = sabanaResponse || null;
  const pagination: PaginationState | null = sabanaResponse?.pagination || null;
  const loadingData = isLoadingNiveles || isLoadingCiclos;

  // Auto-select active ciclo when data arrives
  useEffect(() => {
    if (ciclosLectivos.length > 0 && !selectedCiclo) {
      const cicloActivo = ciclosLectivos.find((c) => c.activo);
      if (cicloActivo) setSelectedCiclo(cicloActivo.id);
    }
  }, [ciclosLectivos, selectedCiclo]);

  const materiasDocente = useMemo(() => {
    if (!sabanaData || !isDocente) return [];
    return sabanaData.materias.filter(m =>
      sabanaData.estudiantes.some(est => {
        const cal = est.calificaciones[m.id];
        return cal && cal.docenteId === user?.id;
      }),
    );
  }, [sabanaData, isDocente, user?.id]);

  // Reset page when nivel/ciclo changes
  const handleSetSelectedNivel = useCallback((v: string) => {
    setSelectedNivel(v);
    setPage(1);
  }, []);

  const handleSetSelectedCiclo = useCallback((v: string) => {
    setSelectedCiclo(v);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const canEditMateria = useCallback((materiaId: string, cal: Calificacion | undefined) => {
    console.log('canEditMateria check:', {
      materiaId, userRole: user?.role, userId: user?.id,
      isDocente, calExists: !!cal, calDocenteId: cal?.docenteId,
      calClaseId: cal?.claseId, match: cal?.docenteId === user?.id,
    });
    if (!isDocente) return false;
    if (!cal || !cal.docenteId) return false;
    return cal.docenteId === user?.id;
  }, [isDocente, user?.id, user?.role]);

  // Mutation for saving calificacion
  const saveCalificacionMutation = useMutation({
    mutationFn: (params: {
      claseId: string; estudianteId: string; periodo: string;
      valor: number | null; competenciaId?: string;
    }) => sabanaApi.updateCalificacion(params),
    onSuccess: () => {
      toast.success('Calificación guardada');
      queryClient.invalidateQueries({ queryKey: queryKeys.sabana.data(selectedNivel, selectedCiclo, page) });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || (error instanceof Error ? error.message : 'Error al guardar'));
    },
  });

  const handleSaveCalificacion = useCallback(async (
    claseId: string, estudianteId: string, periodo: string,
    valor: number | null, competenciaId?: string,
  ) => {
    await saveCalificacionMutation.mutateAsync({ claseId, estudianteId, periodo, valor, competenciaId });
  }, [saveCalificacionMutation]);

  // loadSabana for compatibility with useSabanaPublish
  const loadSabana = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sabana.data(selectedNivel, selectedCiclo, page) });
  }, [queryClient, selectedNivel, selectedCiclo, page]);

  return {
    user,
    niveles, ciclosLectivos, sabanaData, institucion,
    selectedNivel, setSelectedNivel: handleSetSelectedNivel,
    selectedCiclo, setSelectedCiclo: handleSetSelectedCiclo,
    selectedMateriaId, setSelectedMateriaId,
    loading, loadingData,
    isDocente, isReadOnly, materiasDocente, canEditMateria,
    loadSabana, handleSaveCalificacion,
    pagination, onPageChange: handlePageChange,
  };
}
