'use client';

import { useState, useCallback } from 'react';
import { sabanaApi } from '@/lib/api';
import { toast } from 'sonner';

export function useSabanaPublish(selectedCiclo: string, loadSabana: () => Promise<void>) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublicar = useCallback(async (claseId: string) => {
    if (!selectedCiclo) return;
    if (!confirm('¿Está seguro de publicar estas calificaciones? Los estudiantes podrán ver las notas.')) return;

    setIsPublishing(true);
    try {
      await sabanaApi.publicar(claseId, selectedCiclo);
      toast.success('Calificaciones publicadas exitosamente');
      loadSabana();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al publicar calificaciones');
    } finally {
      setIsPublishing(false);
    }
  }, [selectedCiclo, loadSabana]);

  return { isPublishing, handlePublicar };
}
