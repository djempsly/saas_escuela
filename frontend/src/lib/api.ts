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
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  manualResetPassword: (userId: string) =>
    api.post('/auth/manual-reset-password', { userId }),
};

// Admin API (Super Admin)
export const adminApi = {
  // Usuarios
  getAllUsers: (filters?: { institucionId?: string; role?: string; activo?: string; page?: number; limit?: number }) =>
    api.get('/admin/usuarios', { params: filters }),
  getUserStats: () =>
    api.get('/admin/usuarios/stats'),
  forceResetPassword: (userId: string) =>
    api.post(`/admin/usuarios/${userId}/force-reset`),

  // Directores
  getAllDirectores: () =>
    api.get('/admin/directores'),
  createDirector: (data: { nombre: string; apellido: string; email: string; institucionId?: string }) =>
    api.post('/admin/directores', data),
  reassignDirector: (id: string, data: { newInstitucionId: string; motivo?: string }) =>
    api.put(`/admin/directores/${id}/reasignar`, data),

  // Historial
  getDirectorHistory: (institucionId: string) =>
    api.get(`/admin/instituciones/${institucionId}/historial`),
};

// Instituciones API
export const institucionesApi = {
  getBranding: (id: string) =>
    api.get(`/instituciones/${id}/branding`),
  getBrandingBySlug: (slug: string) =>
    api.get(`/instituciones/slug/${slug}/branding`),
  getBrandingByDominio: (dominio: string) =>
    api.get(`/instituciones/dominio/${dominio}/branding`),
  checkSlug: (slug: string, excludeId?: string) =>
    api.get(`/instituciones/check-slug/${slug}`, { params: { excludeId } }),
  checkDominio: (dominio: string, excludeId?: string) =>
    api.get(`/instituciones/check-dominio/${dominio}`, { params: { excludeId } }),
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
    api.patch(`/instituciones/${id}/config`, data),
  updateSensitive: (id: string, data: any) =>
    api.patch(`/instituciones/${id}/sensitive`, data),
  delete: (id: string) =>
    api.delete(`/instituciones/${id}`),
};

// Actividades API (público)
export const actividadesApi = {
  getAll: (limit?: number) =>
    api.get('/actividades', { params: { limit } }),
  getById: (id: string) =>
    api.get(`/actividades/${id}`),
  search: (q: string, institucionId?: string) =>
    api.get('/actividades/search', { params: { q, institucionId } }),
  getBySlug: (slug: string, limit?: number) =>
    api.get(`/actividades/institucion/${slug}`, { params: { limit } }),
  getByInstitucionId: (id: string, limit?: number) =>
    api.get(`/actividades/institucion-id/${id}`, { params: { limit } }),
  create: (data: FormData) =>
    api.post('/actividades', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, data: FormData) =>
    api.put(`/actividades/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) =>
    api.delete(`/actividades/${id}`),
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

// Tareas API
export const tareasApi = {
  getAll: (claseId?: string) =>
    api.get('/tareas', { params: { claseId } }),
  getById: (id: string) =>
    api.get(`/tareas/${id}`),
  create: (data: {
    titulo: string;
    descripcion: string;
    instrucciones?: string;
    fechaPublicacion?: string;
    fechaVencimiento: string;
    puntajeMaximo?: number;
    estado?: string;
    claseId: string;
  }) => api.post('/tareas', data),
  update: (id: string, data: Partial<{
    titulo: string;
    descripcion: string;
    instrucciones?: string;
    fechaPublicacion?: string;
    fechaVencimiento: string;
    puntajeMaximo?: number;
    estado?: string;
  }>) => api.put(`/tareas/${id}`, data),
  delete: (id: string) =>
    api.delete(`/tareas/${id}`),
  agregarRecurso: (tareaId: string, recurso: { tipo: string; titulo: string; url: string }) =>
    api.post(`/tareas/${tareaId}/recursos`, recurso),
  getEntregas: (tareaId: string) =>
    api.get(`/tareas/${tareaId}/entregas`),
  entregar: (tareaId: string, data: {
    contenido?: string;
    comentarioEstudiante?: string;
    archivos?: { nombre: string; url: string; tipo: string }[];
  }) => api.post(`/tareas/${tareaId}/entregar`, data),
  calificar: (tareaId: string, entregaId: string, data: {
    calificacion: number;
    comentarioDocente?: string;
  }) => api.put(`/tareas/${tareaId}/entregas/${entregaId}/calificar`, data),
};

// Eventos API
export const eventosApi = {
  getAll: (params?: { fechaInicio?: string; fechaFin?: string; claseId?: string }) =>
    api.get('/eventos', { params }),
  getById: (id: string) =>
    api.get(`/eventos/${id}`),
  getTipos: () =>
    api.get('/eventos/tipos'),
  create: (data: {
    titulo: string;
    descripcion?: string;
    ubicacion?: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    todoElDia?: boolean;
    color?: string;
    claseId?: string;
  }) => api.post('/eventos', data),
  update: (id: string, data: Partial<{
    titulo: string;
    descripcion?: string;
    ubicacion?: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    todoElDia?: boolean;
    color?: string;
    claseId?: string;
  }>) => api.put(`/eventos/${id}`, data),
  delete: (id: string) =>
    api.delete(`/eventos/${id}`),
};

// Mensajes API
export const mensajesApi = {
  getUsuariosDisponibles: () =>
    api.get('/mensajes/usuarios'),
  getNoLeidos: () =>
    api.get('/mensajes/no-leidos'),
  getConversaciones: () =>
    api.get('/mensajes/conversaciones'),
  crearConversacion: (data: {
    titulo?: string;
    esGrupal?: boolean;
    participanteIds: string[];
  }) => api.post('/mensajes/conversaciones', data),
  getMensajes: (conversacionId: string, params?: { limit?: number; cursor?: string }) =>
    api.get(`/mensajes/conversaciones/${conversacionId}`, { params }),
  getMensajesNuevos: (conversacionId: string, desde: string) =>
    api.get(`/mensajes/conversaciones/${conversacionId}/nuevos`, { params: { desde } }),
  enviarMensaje: (conversacionId: string, data: {
    contenido: string;
    archivos?: { nombre: string; url: string; tipo: string }[];
  }) => api.post(`/mensajes/conversaciones/${conversacionId}/mensajes`, data),
  marcarComoLeida: (conversacionId: string) =>
    api.put(`/mensajes/conversaciones/${conversacionId}/leer`),
};

// Cobros API
export const cobrosApi = {
  getConceptos: () =>
    api.get('/cobros/conceptos'),
  getMetodosPago: () =>
    api.get('/cobros/metodos-pago'),
  getMisCobros: () =>
    api.get('/cobros/mis-cobros'),
  getAll: (params?: { estado?: string; concepto?: string; estudianteId?: string; cicloLectivoId?: string }) =>
    api.get('/cobros', { params }),
  getPendientes: () =>
    api.get('/cobros/pendientes'),
  getReporte: (fechaInicio: string, fechaFin: string) =>
    api.get('/cobros/reporte', { params: { fechaInicio, fechaFin } }),
  getEstadisticas: (cicloLectivoId?: string) =>
    api.get('/cobros/estadisticas', { params: { cicloLectivoId } }),
  getByEstudiante: (estudianteId: string) =>
    api.get(`/cobros/estudiante/${estudianteId}`),
  getById: (id: string) =>
    api.get(`/cobros/${id}`),
  create: (data: {
    concepto: string;
    descripcion?: string;
    monto: number;
    fechaVencimiento: string;
    estudianteId: string;
    cicloLectivoId: string;
  }) => api.post('/cobros', data),
  createMasivo: (data: {
    concepto: string;
    descripcion?: string;
    monto: number;
    fechaVencimiento: string;
    estudianteIds: string[];
    cicloLectivoId: string;
  }) => api.post('/cobros/masivo', data),
  registrarPago: (cobroId: string, data: {
    monto: number;
    metodoPago: string;
    referencia?: string;
    comprobanteUrl?: string;
  }) => api.post(`/cobros/${cobroId}/pagar`, data),
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
