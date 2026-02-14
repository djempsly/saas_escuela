import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// URL base del backend (sin /api/v1) para archivos estáticos
export const BACKEND_URL = API_BASE_URL.replace('/api/v1', '');

/**
 * Convierte una URL relativa de uploads a una URL absoluta del backend
 * @param url - URL que puede ser relativa (/uploads/...) o absoluta (https://...)
 * @returns URL absoluta
 */
export const getMediaUrl = (url: string | undefined | null): string => {
  if (!url) return '';

  // Si ya es una URL absoluta (http, https, blob, data), retornarla tal cual
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // URLs de archivos privados (proxy a signed URLs)
  if (url.startsWith('/api/v1/files/')) {
    return `${BACKEND_URL.replace('/api/v1', '')}${url}`;
  }

  // Si es una URL relativa de uploads, prefijar con la URL del backend
  if (url.startsWith('/uploads/')) {
    return `${BACKEND_URL}${url}`;
  }

  // Para cualquier otra URL relativa
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * Resuelve una URL de archivo privado obteniendo una URL firmada temporal.
 * Para URLs publicas, retorna la URL tal cual.
 */
export async function resolveFileUrl(url: string | undefined | null): Promise<string> {
  if (!url) return '';
  if (!url.includes('/api/v1/files/')) return getMediaUrl(url);

  const fullUrl = getMediaUrl(url);
  const apiPath = fullUrl.replace(/.*\/api\/v1\//, '');
  const res = await api.get(apiPath);
  return res.data.url;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ CSRF Token Management ============
let csrfToken: string | null = null;
let lastAuthToken: string | null = null;

const MUTATING_METHODS = ['post', 'put', 'delete', 'patch'];

/**
 * Obtiene un token CSRF del backend.
 * El backend setea la cookie HMAC automaticamente; almacenamos el token
 * completo para enviarlo en el header X-CSRF-Token.
 */
export async function fetchCsrfToken(): Promise<string> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const authToken = localStorage.getItem('token');
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
  }
  const response = await axios.get(`${API_BASE_URL}/auth/csrf-token`, {
    withCredentials: true,
    headers,
  });
  const token: string = response.data.csrfToken;
  csrfToken = token;
  return token;
}

// Interceptor para agregar token de auth + CSRF
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    // Auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF token para requests mutantes
    if (MUTATING_METHODS.includes(config.method?.toLowerCase() || '')) {
      // Invalidar CSRF si el auth token cambió (session identifier cambió)
      if (token !== lastAuthToken) {
        csrfToken = null;
        lastAuthToken = token;
      }
      if (!csrfToken) {
        try {
          await fetchCsrfToken();
        } catch {
          // No bloquear el request si falla el fetch del CSRF token
        }
      }
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
  }
  return config;
});

// ============ Token Refresh Logic ============
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function forceLogout() {
  if (typeof window === 'undefined') return;
  let slug: string | undefined;
  try {
    const stored = localStorage.getItem('institution-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      slug = parsed?.state?.branding?.slug;
    }
  } catch {}

  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage');
  csrfToken = null;
  window.location.href = slug ? `/${slug}` : '/';
}

// Interceptor para manejar errores de autenticación y CSRF
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // CSRF token expirado/invalido — refrescar y reintentar una vez
    const errData = error.response?.data;
    const csrfErrorMsg =
      (typeof errData?.error === 'string' && errData.error) ||
      (typeof errData?.message === 'string' && errData.message) ||
      '';
    if (
      error.response?.status === 403 &&
      csrfErrorMsg.includes('CSRF') &&
      !originalRequest._csrfRetried
    ) {
      originalRequest._csrfRetried = true;
      try {
        await fetchCsrfToken();
        if (csrfToken) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
        }
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // Error de autenticación — intentar refresh antes de logout
    if (error.response?.status === 401 && !originalRequest._authRetried) {
      originalRequest._authRetried = true;

      const storedRefreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

      console.log('[auth] 401 intercepted, attempting refresh...', {
        hasRefreshToken: !!storedRefreshToken,
        url: originalRequest.url,
      });

      if (!storedRefreshToken) {
        console.log('[auth] No refresh token found, logging out');
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is in progress — wait for it
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { withCredentials: true },
        );
        const { accessToken, refreshToken: newRefreshToken } = res.data;

        console.log('[auth] Refresh successful, retrying request');

        // Update localStorage
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update zustand store (persisted storage)
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.state.token = accessToken;
            parsed.state.refreshToken = newRefreshToken;
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          }
        } catch {}

        // Invalidate CSRF since auth token changed
        csrfToken = null;
        lastAuthToken = accessToken;

        isRefreshing = false;
        onTokenRefreshed(accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.log('[auth] Refresh failed, logging out', refreshError);
        isRefreshing = false;
        refreshSubscribers = [];
        forceLogout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// API pública (sin autenticación) - para landing pages
const publicApiBaseUrl = API_BASE_URL.replace('/api/v1', '/api/public');
export const publicApi = axios.create({
  baseURL: publicApiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public API endpoints (no authentication required)
export const publicEndpoints = {
  getInstituciones: () => publicApi.get('/instituciones'),
  getActividades: (limit?: number) => publicApi.get('/actividades', { params: { limit } }),
  getLanding: () => publicApi.get('/landing'),
  getBranding: () => publicApi.get('/branding'),
};

// Auth API
export const authApi = {
  login: (identificador: string, password: string, slug?: string) =>
    api.post('/auth/login', { identificador, password, slug }),
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

  // Configuración del sistema
  getSettings: () =>
    api.get('/admin/settings'),
  updateSettings: (data: {
    maintenanceMode?: boolean;
    allowPublicRegistration?: boolean;
    maxInstitutionsPerPlan?: number;
    defaultSessionTimeout?: number;
  }) => api.put('/admin/settings', data),
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
  createJson: (data: Record<string, unknown>) =>
    api.post('/instituciones', data),
  update: (id: string, data: FormData) =>
    api.put(`/instituciones/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateJson: (id: string, data: Record<string, unknown>) =>
    api.put(`/instituciones/${id}`, data),
  updateConfig: (id: string, data: FormData) =>
    api.patch(`/instituciones/${id}/config`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateDirectorConfig: (id: string, data: Record<string, unknown>) =>
    api.patch(`/instituciones/${id}/config-director`, data),
  updateSensitive: (id: string, data: Record<string, unknown>) =>
    api.patch(`/instituciones/${id}/sensitive`, data),
  updateSistemasEducativos: (id: string, sistemasEducativos: string[]) =>
    api.patch(`/instituciones/${id}/sistemas-educativos`, { sistemasEducativos }),
  delete: (id: string) =>
    api.delete(`/instituciones/${id}`),
  // Uploads específicos de branding
  uploadLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post(`/instituciones/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadFavicon: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('favicon', file);
    return api.post(`/instituciones/${id}/favicon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadHeroImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('hero', file);
    return api.post(`/instituciones/${id}/hero`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadLoginBg: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('loginBg', file);
    return api.post(`/instituciones/${id}/login-bg`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadLoginLogo: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('loginLogo', file);
    return api.post(`/instituciones/${id}/login-logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Dominios API (gestión de dominios personalizados)
// Dominios API
export const dominiosApi = {
  getByInstitucion: (institucionId: string) =>
    api.get('/admin/dominios', { params: { institucionId } }),
  create: (dominio: string, institucionId?: string) =>
    api.post('/admin/dominios', { dominio, institucionId }),
  verificar: (id: string) =>
    api.post(`/admin/dominios/${id}/verificar`),
  delete: (id: string) =>
    api.delete(`/admin/dominios/${id}`),
};

// Actividades API (público)
export const actividadesApi = {
  getAll: (limit?: number) =>
    api.get('/actividades', { params: { limit } }),
  getAllAdmin: (limit?: number) =>
    api.get('/actividades/admin', { params: { limit } }),
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
  create: (data: Record<string, unknown>) => api.post('/clases', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/clases/${id}`, data),
  delete: (id: string) => api.delete(`/clases/${id}`),
};

// Inscripciones API
export const inscripcionesApi = {
  inscribirPorCodigo: (codigo: string) =>
    api.post('/inscripciones/por-codigo', { codigo }),
  getMisClases: () =>
    api.get('/inscripciones/mis-clases'),
  getByClase: (claseId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/inscripciones/clase/${claseId}`, { params }),
  inscribirMasivo: (claseId: string, estudianteIds: string[]) =>
    api.post('/inscripciones/masivo', { claseId, estudianteIds }),
  promoverMasivo: (data: { nivelOrigenId: string; nivelDestinoId: string; cicloDestinoId: string }) =>
    api.post('/inscripciones/promover-masivo', data),
  promoverIndividual: (data: { estudianteId: string; nivelDestinoId: string; cicloDestinoId: string }) =>
    api.post('/inscripciones/promover-individual', data),
  desinscribir: (data: { estudianteId: string; nivelId: string; motivo?: string }) =>
    api.post('/inscripciones/desinscribir', data),
  desinscribirMasivo: (data: { estudianteIds: string[]; nivelId: string; motivo?: string }) =>
    api.post('/inscripciones/desinscribir-masivo', data),
  reactivar: (data: { estudianteId: string; nivelId: string }) =>
    api.post('/inscripciones/reactivar', data),
};

// Asistencia API
export const asistenciaApi = {
  tomar: (claseId: string, fecha: string, asistencias: Record<string, unknown>[]) =>
    api.post('/asistencia/tomar', { claseId, fecha, asistencias }),
  getByClase: (claseId: string, fecha: string) =>
    api.get(`/asistencia/clase/${claseId}`, { params: { fecha } }),
  getMiAsistencia: () =>
    api.get('/asistencia/mi-asistencia'),
  getReporteClase: (claseId: string, fechaInicio: string, fechaFin: string) =>
    api.get('/asistencia/reporte/clase', { params: { claseId, fechaInicio, fechaFin } }),
  // Dias laborables
  getDiasLaborables: (claseId: string, cicloLectivoId: string) =>
    api.get(`/asistencia/dias-laborables/${claseId}`, { params: { cicloLectivoId } }),
  saveDiasLaborables: (claseId: string, cicloLectivoId: string, dias: {
    agosto?: number;
    septiembre?: number;
    octubre?: number;
    noviembre?: number;
    diciembre?: number;
    enero?: number;
    febrero?: number;
    marzo?: number;
    abril?: number;
    mayo?: number;
    junio?: number;
  }) => api.post(`/asistencia/dias-laborables/${claseId}`, { cicloLectivoId, ...dias }),
  // Estadisticas con porcentaje
  getEstadisticas: (claseId: string, cicloLectivoId: string) =>
    api.get(`/asistencia/estadisticas/${claseId}`, { params: { cicloLectivoId } }),
};

// Calificaciones API
export const calificacionesApi = {
  guardar: (data: Record<string, unknown>) =>
    api.post('/calificaciones', data),
  guardarTecnica: (data: Record<string, unknown>) =>
    api.post('/calificaciones/tecnica', data),
  getByClase: (claseId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/calificaciones/clase/${claseId}`, { params }),
  getMisCalificaciones: () =>
    api.get('/calificaciones/mis-calificaciones'),
  getMiBoletin: (cicloLectivoId: string) =>
    api.get(`/calificaciones/mi-boletin/${cicloLectivoId}`),
  getBoletin: (estudianteId: string, cicloLectivoId: string) =>
    api.get(`/calificaciones/boletin/${estudianteId}/${cicloLectivoId}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Boletines API (datos estructurados para PDF en frontend)
export const boletinesApi = {
  // Obtener datos de boletín para un estudiante (genera JSON para PDF en frontend)
  getBoletinData: (estudianteId: string, cicloId: string) =>
    api.get(`/boletines/data/${estudianteId}/${cicloId}`),
  // Obtener datos de boletines para todos los estudiantes de una clase
  getBoletinesClaseData: (claseId: string, cicloId: string) =>
    api.get(`/boletines/data/clase/${claseId}/${cicloId}`),
  // Descargar plantilla vacía (DOCX)
  getPlantilla: (grado: string) =>
    api.get(`/boletines/plantilla/${grado}`, { responseType: 'blob' }),
  // Generar boletín personalizado (DOCX)
  generarPersonalizado: (data: { config?: Record<string, unknown>; datosEstudiante?: Record<string, unknown>; calificaciones?: Record<string, unknown>[] }) =>
    api.post('/boletines/generar', data, { responseType: 'blob' }),
};

// Usuarios API
export const usersApi = {
  getAll: (filters?: { role?: string; nivelId?: string; page?: number; limit?: number }) =>
    api.get('/users', { params: filters }),
  getStaff: () =>
    api.get('/users/staff'),
  getById: (id: string) =>
    api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
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
  create: (data: Record<string, unknown>) => api.post('/cycles', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/cycles/${id}`, data),
  delete: (id: string) => api.delete(`/cycles/${id}`),
  getActivo: () => api.get('/cycles/activo'),
};

// Niveles API
export const nivelesApi = {
  getAll: () => api.get('/levels'),
  getById: (id: string) => api.get(`/levels/${id}`),
  create: (data: Record<string, unknown>) => api.post('/levels', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/levels/${id}`, data),
  delete: (id: string) => api.delete(`/levels/${id}`),
};

// Ciclos Educativos API (Educational Cycles - different from CicloLectivo/academic year)
export const ciclosEducativosApi = {
  getAll: () => api.get('/ciclos-educativos'),
  getById: (id: string) => api.get(`/ciclos-educativos/${id}`),
  create: (data: { nombre: string; descripcion?: string; orden?: number }) =>
    api.post('/ciclos-educativos', data),
  update: (id: string, data: { nombre?: string; descripcion?: string; orden?: number }) =>
    api.put(`/ciclos-educativos/${id}`, data),
  delete: (id: string) => api.delete(`/ciclos-educativos/${id}`),
  assignNiveles: (id: string, nivelIds: string[]) =>
    api.post(`/ciclos-educativos/${id}/niveles`, { nivelIds }),
  assignCoordinadores: (id: string, coordinadorIds: string[]) =>
    api.post(`/ciclos-educativos/${id}/coordinadores`, { coordinadorIds }),
  generarEstructura: (tipo: string) =>
    api.post('/ciclos-educativos/generar-estructura', { tipo }),
};

// Import API (bulk student import)
export const importApi = {
  downloadPlantilla: () =>
    api.get('/import/estudiantes/plantilla', { responseType: 'blob' }),
  importEstudiantes: (file: File, nivelId?: string, autoEnroll?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    if (nivelId) formData.append('nivelId', nivelId);
    if (autoEnroll) formData.append('autoEnroll', 'true');
    return api.post('/import/estudiantes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Coordinadores API
export const coordinadoresApi = {
  getAll: () => api.get('/users/coordinadores'),
  getInfo: (id: string) => api.get(`/users/coordinadores/${id}/info`),
  assignCiclos: (id: string, cicloIds: string[]) =>
    api.post(`/users/coordinadores/${id}/ciclos`, { cicloIds }),
  assignNiveles: (id: string, nivelIds: string[]) =>
    api.post(`/users/coordinadores/${id}/niveles`, { nivelIds }),
};

// Materias API
export const materiasApi = {
  getAll: () => api.get('/subjects'),
  getById: (id: string) => api.get(`/subjects/${id}`),
  create: (data: Record<string, unknown>) => api.post('/subjects', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

// Estudiantes API
export const estudiantesApi = {
  getAll: (filters?: { nivelId?: string; page?: number; limit?: number }) =>
    usersApi.getAll({ role: ROLES.ESTUDIANTE, ...filters }),
  getById: (id: string) => api.get(`/users/${id}`),
  getByClase: (claseId: string) => api.get(`/inscripciones/clase/${claseId}`),
  getBoletin: (estudianteId: string, cicloId: string) =>
    api.get(`/calificaciones/boletin/${estudianteId}/${cicloId}`),
};

// Docentes API
export const docentesApi = {
  getAll: () => usersApi.getAll({ role: ROLES.DOCENTE }),
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
  getFeriados: (fechaInicio: string, fechaFin: string) =>
    api.get('/eventos/feriados', { params: { fechaInicio, fechaFin } }),
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

// Notificaciones API
export const notificacionesApi = {
  getAll: (params?: { limit?: number; offset?: number }) =>
    api.get('/notificaciones', { params }),
  getNoLeidas: () =>
    api.get('/notificaciones/no-leidas'),
  marcarComoLeida: (id: string) =>
    api.put(`/notificaciones/${id}/leer`),
  marcarTodasComoLeidas: () =>
    api.put('/notificaciones/leer-todas'),
};

// Cobros API
export const cobrosApi = {
  getConceptos: () =>
    api.get('/cobros/conceptos'),
  getMetodosPago: () =>
    api.get('/cobros/metodos-pago'),
  getMisCobros: () =>
    api.get('/cobros/mis-cobros'),
  getAll: (params?: { estado?: string; concepto?: string; estudianteId?: string; cicloLectivoId?: string; nivelId?: string }) =>
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

// Sábana de Notas API
export const sabanaApi = {
  getNiveles: () =>
    api.get('/sabana/niveles'),
  getCiclosLectivos: () =>
    api.get('/sabana/ciclos-lectivos'),
  getSabana: (nivelId: string, cicloLectivoId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/sabana/${nivelId}/${cicloLectivoId}`, { params }),
  updateCalificacion: (data: {
    claseId: string;
    estudianteId: string;
    periodo: string; // Permitir p1..p4, rp1..rp4, RA1..RA10, observaciones
    valor?: number | null;
    competenciaId?: string;
    valorTexto?: string;
  }) => api.patch('/sabana/calificacion', data),
  publicar: (claseId: string, cicloLectivoId: string) =>
    api.patch('/sabana/publicar', { claseId, cicloLectivoId }),
  exportarExcel: (nivelId: string, cicloLectivoId: string) =>
    api.get(`/sabana/${nivelId}/${cicloLectivoId}/exportar-excel`),
  exportarTodo: (cicloLectivoId: string) =>
    api.get(`/sabana/${cicloLectivoId}/exportar-todo`),
};

// Audit Logs API (Historial)
export const auditLogsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    usuarioId?: string;
    entidad?: string;
    accion?: string;
  }) => api.get('/audit-logs', { params }),
};

// Jobs API (BullMQ monitoring)
export const jobsApi = {
  getStatus: (id: string) =>
    api.get(`/jobs/${id}/status`),
  getOverview: () =>
    api.get('/jobs/admin/overview'),
};

// Planes API
export const planesApi = {
  getAll: () => api.get('/planes'),
};

// Suscripciones API (para DIRECTOR)
export const suscripcionesApi = {
  getMiSuscripcion: () => api.get('/suscripciones/mi-suscripcion'),
  crearCheckout: (data: { planId: string; frecuencia: 'mensual' | 'anual' }) =>
    api.post('/suscripciones/checkout', data),
  crearPortal: () => api.post('/suscripciones/portal'),
  crearOrdenPayPal: (data: { planId: string; frecuencia: 'mensual' | 'anual' }) =>
    api.post('/suscripciones/paypal/crear-orden', data),
  capturarPayPal: (orderId: string) =>
    api.post('/suscripciones/paypal/capturar', { orderId }),
  crearPagoAzul: (data: { planId: string; frecuencia: 'mensual' | 'anual' }) =>
    api.post('/suscripciones/azul/crear-pago', data),
  crearPagoMonCash: (data: { planId: string; frecuencia: 'mensual' | 'anual' }) =>
    api.post('/suscripciones/moncash/crear-pago', data),
  capturarMonCash: (transactionId: string) =>
    api.post('/suscripciones/moncash/capturar', { transactionId }),
  crearPagoCardNet: (data: { planId: string; frecuencia: 'mensual' | 'anual' }) =>
    api.post('/suscripciones/cardnet/crear-pago', data),
};

// Admin Suscripciones API
export const adminSuscripcionesApi = {
  getAll: (estado?: string) =>
    api.get('/admin/suscripciones', { params: estado ? { estado } : {} }),
  getDashboard: () =>
    api.get('/admin/suscripciones/dashboard'),
  asignarPlan: (data: { institucionId: string; planId: string }) =>
    api.post('/admin/suscripciones/asignar', data),
  getPagos: (institucionId: string) =>
    api.get(`/admin/suscripciones/${institucionId}/pagos`),
  registrarPago: (data: {
    institucionId: string;
    monto: number;
    moneda: string;
    metodo: string;
    referencia?: string;
    descripcion?: string;
  }) => api.post('/admin/suscripciones/registrar-pago', data),
};

// Mantenimiento API
export const mantenimientoApi = {
  getActivo: () => api.get('/mantenimiento'),
  getAll: () => api.get('/admin/mantenimiento'),
  crear: (data: { titulo: string; mensaje: string; fechaInicio: string; fechaFin: string }) =>
    api.post('/admin/mantenimiento', data),
  cancelar: (id: string) => api.delete(`/admin/mantenimiento/${id}`),
};

// Psicología API
export const psicologiaApi = {
  getNotasBajas: (cicloLectivoId: string) =>
    api.get('/psicologia/notas-bajas', { params: { cicloLectivoId } }),
  getObservaciones: (estudianteId: string) =>
    api.get(`/psicologia/observaciones/${estudianteId}`),
  crearObservacion: (data: { estudianteId: string; texto: string }) =>
    api.post('/psicologia/observaciones', data),
  eliminarObservacion: (id: string) =>
    api.delete(`/psicologia/observaciones/${id}`),
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
  BIBLIOTECARIO: 'BIBLIOTECARIO',
  DIGITADOR: 'DIGITADOR',
  PSICOLOGO: 'PSICOLOGO',
} as const;

export type RoleType = keyof typeof ROLES;

export default api;
