import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Instituciones API
export const institucionesApi = {
  getBranding: (id: string) =>
    api.get(`/instituciones/${id}/branding`),
  getAll: () =>
    api.get('/instituciones'),
  getById: (id: string) =>
    api.get(`/instituciones/${id}`),
};

// Actividades API (público)
export const actividadesApi = {
  getAll: (limit?: number) =>
    api.get('/actividades', { params: { limit } }),
  getById: (id: string) =>
    api.get(`/actividades/${id}`),
  search: (q: string) =>
    api.get('/actividades/search', { params: { q } }),
};

// Clases API
export const clasesApi = {
  getAll: () => api.get('/clases'),
  getById: (id: string) => api.get(`/clases/${id}`),
  create: (data: any) => api.post('/clases', data),
  update: (id: string, data: any) => api.put(`/clases/${id}`, data),
  delete: (id: string) => api.delete(`/clases/${id}`),
};

// Inscripciones API
export const inscripcionesApi = {
  inscribirPorCodigo: (codigo: string) =>
    api.post('/inscripciones/por-codigo', { codigo }),
  getMisClases: () =>
    api.get('/inscripciones/mis-clases'),
  getByClase: (claseId: string) =>
    api.get(`/inscripciones/clase/${claseId}`),
  inscribirMasivo: (claseId: string, estudianteIds: string[]) =>
    api.post('/inscripciones/masivo', { claseId, estudianteIds }),
};

// Asistencia API
export const asistenciaApi = {
  tomar: (claseId: string, fecha: string, asistencias: any[]) =>
    api.post('/asistencia/tomar', { claseId, fecha, asistencias }),
  getByClase: (claseId: string, fecha: string) =>
    api.get(`/asistencia/clase/${claseId}`, { params: { fecha } }),
  getMiAsistencia: () =>
    api.get('/asistencia/mi-asistencia'),
  getReporteClase: (claseId: string, fechaInicio: string, fechaFin: string) =>
    api.get('/asistencia/reporte/clase', { params: { claseId, fechaInicio, fechaFin } }),
};

// Calificaciones API
export const calificacionesApi = {
  guardar: (data: any) =>
    api.post('/calificaciones', data),
  guardarTecnica: (data: any) =>
    api.post('/calificaciones/tecnica', data),
  getByClase: (claseId: string) =>
    api.get(`/calificaciones/clase/${claseId}`),
  getMisCalificaciones: () =>
    api.get('/calificaciones/mis-calificaciones'),
  getMiBoletin: (cicloLectivoId: string) =>
    api.get(`/calificaciones/mi-boletin/${cicloLectivoId}`),
  getBoletin: (estudianteId: string, cicloLectivoId: string) =>
    api.get(`/calificaciones/boletin/${estudianteId}/${cicloLectivoId}`),
};

export default api;
