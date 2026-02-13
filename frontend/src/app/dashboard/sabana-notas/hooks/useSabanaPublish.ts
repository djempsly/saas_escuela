'use client';

import { useCallback } from 'react';
import { sabanaApi } from '@/lib/api';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function useSabanaPublish(selectedCiclo: string) {
  const queryClient = useQueryClient();

  const publishMutation = useMutation({
    mutationFn: (claseId: string) => sabanaApi.publicar(claseId, selectedCiclo),
    onSuccess: () => {
      toast.success('Calificaciones publicadas exitosamente');
      queryClient.invalidateQueries({ queryKey: queryKeys.sabana.all() });
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      toast.error(axiosErr.response?.data?.error || (error instanceof Error ? error.message : 'Error al publicar calificaciones'));
    },
  });

  const handlePublicar = useCallback(async (claseId: string) => {
    if (!selectedCiclo) return;
    if (!confirm('¿Está seguro de publicar estas calificaciones? Los estudiantes podrán ver las notas.')) return;
    publishMutation.mutate(claseId);
  }, [selectedCiclo, publishMutation]);

  return { isPublishing: publishMutation.isPending, handlePublicar };
}
