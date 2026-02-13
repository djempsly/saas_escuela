import { useQuery } from '@tanstack/react-query';
import { clasesApi, ciclosApi, nivelesApi, estudiantesApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useClases() {
  return useQuery({
    queryKey: queryKeys.clases.list(),
    queryFn: async () => {
      const res = await clasesApi.getAll();
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCiclosLectivos() {
  return useQuery({
    queryKey: queryKeys.ciclos.list(),
    queryFn: async () => {
      const res = await ciclosApi.getAll();
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useNiveles() {
  return useQuery({
    queryKey: queryKeys.niveles.list(),
    queryFn: async () => {
      const res = await nivelesApi.getAll();
      return res.data || [];
    },
  });
}

export function useEstudiantes(params?: { limit?: number }) {
  return useQuery({
    queryKey: queryKeys.estudiantes.list(params),
    queryFn: async () => {
      const res = await estudiantesApi.getAll(params);
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    },
  });
}
