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
  login: (identificador: string, password: string) =>
    api.post('/auth/login', { identificador, password }),
  forgotPassword: (identificador: string) =>
    api.post('/auth/forgot-password', { identificador }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (newPassword: string) =>
    api.post('/auth/change-password', { newPassword }),
};

// Instituciones API
export const institucionesApi = {
  getBranding: (id: string) =>
    api.get(`/instituciones/${id}/branding`),
  getAll: () =>
    api.get('/instituciones'),
  getById: (id: string) =>
    api.get(`/instituciones/${id}`),
  create: (data: FormData) =>
    api.post('/instituciones', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  createJson: (data: any) =>
    api.post('/instituciones', data),
  update: (id: string, data: FormData) =>
    api.put(`/instituciones/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateJson: (id: string, data: any) =>
    api.put(`/instituciones/${id}`, data),
  updateConfig: (id: string, data: FormData) =>
    api.patch(`/instituciones/${id}/config`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) =>
    api.delete(`/instituciones/${id}`),
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

// Usuarios API
export const usersApi = {
  getAll: () =>
    api.get('/users'),
  getById: (id: string) =>
    api.get(`/users/${id}`),
  create: (data: any) =>
    api.post('/users', data),
  update: (id: string, data: any) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) =>
    api.delete(`/users/${id}`),
  resetPasswordManual: (userId: string) =>
    api.post(`/users/${userId}/reset-password`),
  updateProfile: (data: FormData) =>
    api.put('/users/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('foto', file);
    return api.post('/users/upload-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Ciclos Lectivos API
export const ciclosApi = {
  getAll: () => api.get('/cycles'),
  getById: (id: string) => api.get(`/cycles/${id}`),
  create: (data: any) => api.post('/cycles', data),
  update: (id: string, data: any) => api.put(`/cycles/${id}`, data),
  delete: (id: string) => api.delete(`/cycles/${id}`),
  getActivo: () => api.get('/cycles/activo'),
};

// Niveles API
export const nivelesApi = {
  getAll: () => api.get('/levels'),
  getById: (id: string) => api.get(`/levels/${id}`),
  create: (data: any) => api.post('/levels', data),
  update: (id: string, data: any) => api.put(`/levels/${id}`, data),
  delete: (id: string) => api.delete(`/levels/${id}`),
};

// Materias API
export const materiasApi = {
  getAll: () => api.get('/subjects'),
  getById: (id: string) => api.get(`/subjects/${id}`),
  create: (data: any) => api.post('/subjects', data),
  update: (id: string, data: any) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Estudiantes API
export const estudiantesApi = {
  getAll: () => api.get('/users?role=ESTUDIANTE'),
  getById: (id: string) => api.get(`/users/${id}`),
  getByClase: (claseId: string) => api.get(`/inscripciones/clase/${claseId}`),
  getBoletin: (estudianteId: string, cicloId: string) =>
    api.get(`/calificaciones/boletin/${estudianteId}/${cicloId}`),
};

// Docentes API
export const docentesApi = {
  getAll: () => api.get('/users?role=DOCENTE'),
  getById: (id: string) => api.get(`/users/${id}`),
  getClases: (docenteId: string) => api.get(`/clases?docenteId=${docenteId}`),
};

// Upload API
export const uploadApi = {
  uploadImage: (file: File, tipo: 'logo' | 'foto' | 'actividad') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Tipos de roles disponibles
export const ROLES = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  COORDINADOR: 'COORDINADOR',
  COORDINADOR_ACADEMICO: 'COORDINADOR_ACADEMICO',
  DOCENTE: 'DOCENTE',
  ESTUDIANTE: 'ESTUDIANTE',
  SECRETARIA: 'SECRETARIA',
} as const;

export type RoleType = keyof typeof ROLES;

export default api;
