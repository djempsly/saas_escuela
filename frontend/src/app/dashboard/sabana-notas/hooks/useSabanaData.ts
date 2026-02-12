'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { sabanaApi, institucionesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import type { Nivel, CicloLectivo, SabanaData, Calificacion, InstitucionInfo } from '../types';

export function useSabanaData() {
  const { user } = useAuthStore();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [ciclosLectivos, setCiclosLectivos] = useState<CicloLectivo[]>([]);
  const [selectedNivel, setSelectedNivel] = useState('');
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [selectedMateriaId, setSelectedMateriaId] = useState('all');
  const [sabanaData, setSabanaData] = useState<SabanaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [institucion, setInstitucion] = useState<InstitucionInfo | null>(null);

  const isDocente = user?.role === 'DOCENTE';
  const isReadOnly = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' ||
    user?.role === 'COORDINADOR' || user?.role === 'COORDINADOR_ACADEMICO';

  const materiasDocente = useMemo(() => {
    if (!sabanaData || !isDocente) return [];
    return sabanaData.materias.filter(m =>
      sabanaData.estudiantes.some(est => {
        const cal = est.calificaciones[m.id];
        return cal && cal.docenteId === user?.id;
      }),
    );
  }, [sabanaData, isDocente, user?.id]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [nivelesRes, ciclosRes] = await Promise.all([
          sabanaApi.getNiveles(),
          sabanaApi.getCiclosLectivos(),
        ]);
        setNiveles(nivelesRes.data);
        setCiclosLectivos(ciclosRes.data);
        const cicloActivo = ciclosRes.data.find((c: CicloLectivo) => c.activo);
        if (cicloActivo) setSelectedCiclo(cicloActivo.id);

        if (user?.institucionId) {
          try {
            const instRes = await institucionesApi.getBranding(user.institucionId);
            const inst = instRes.data;
            setInstitucion({
              nombre: inst.nombre,
              lema: inst.lema || null,
              logoUrl: inst.logoUrl || null,
              colorPrimario: inst.colorPrimario || '#1a56db',
              direccion: inst.direccion || null,
              codigoCentro: inst.codigoCentro || null,
              distritoEducativo: inst.distritoEducativo || null,
              regionalEducacion: inst.regionalEducacion || null,
              sabanaColores: inst.sabanaColores || null,
            });
          } catch {
            console.error('Error cargando institución');
          }
        }
      } catch {
        toast.error('Error al cargar datos iniciales');
      } finally {
        setLoadingData(false);
      }
    };
    loadInitialData();
  }, []);

  const loadSabana = useCallback(async () => {
    if (!selectedNivel || !selectedCiclo) return;
    setLoading(true);
    try {
      const response = await sabanaApi.getSabana(selectedNivel, selectedCiclo);
      setSabanaData(response.data);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || (error instanceof Error ? error.message : 'Error al cargar datos'));
      setSabanaData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNivel, selectedCiclo]);

  useEffect(() => { loadSabana(); }, [loadSabana]);

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

  const handleSaveCalificacion = useCallback(async (
    claseId: string, estudianteId: string, periodo: string,
    valor: number | null, competenciaId?: string,
  ) => {
    await sabanaApi.updateCalificacion({ claseId, estudianteId, periodo, valor, competenciaId });
    toast.success('Calificación guardada');
    loadSabana();
  }, [loadSabana]);

  return {
    user,
    niveles, ciclosLectivos, sabanaData, institucion,
    selectedNivel, setSelectedNivel,
    selectedCiclo, setSelectedCiclo,
    selectedMateriaId, setSelectedMateriaId,
    loading, loadingData,
    isDocente, isReadOnly, materiasDocente, canEditMateria,
    loadSabana, handleSaveCalificacion,
  };
}
