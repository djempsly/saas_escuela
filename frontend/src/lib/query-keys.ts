export const queryKeys = {
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
  },
  sabana: {
    all: () => ['sabana'] as const,
    niveles: () => ['sabana', 'niveles'] as const,
    ciclosLectivos: () => ['sabana', 'ciclosLectivos'] as const,
    data: (nivelId: string, cicloId: string, page: number) =>
      ['sabana', 'data', nivelId, cicloId, page] as const,
  },
  calificaciones: {
    mis: () => ['calificaciones', 'mis'] as const,
    miBoletin: (cicloId: string) => ['calificaciones', 'miBoletin', cicloId] as const,
    grades: (claseId: string, competencia: string) =>
      ['calificaciones', 'grades', claseId, competencia] as const,
  },
  clases: {
    list: () => ['clases', 'list'] as const,
  },
  inscripciones: {
    byClase: (claseId: string, page: number) =>
      ['inscripciones', 'byClase', claseId, page] as const,
  },
  estudiantes: {
    list: (params?: Record<string, unknown>) => ['estudiantes', 'list', params] as const,
  },
  niveles: {
    list: () => ['niveles', 'list'] as const,
  },
  ciclos: {
    list: () => ['ciclos', 'list'] as const,
  },
  instituciones: {
    branding: (id: string) => ['instituciones', 'branding', id] as const,
  },
  notificaciones: {
    all: () => ['notificaciones'] as const,
    noLeidas: () => ['notificaciones', 'noLeidas'] as const,
    list: (params?: Record<string, unknown>) => ['notificaciones', 'list', params] as const,
  },
  auditLogs: {
    list: (params?: Record<string, unknown>) => ['auditLogs', 'list', params] as const,
  },
  jobs: {
    overview: () => ['jobs', 'overview'] as const,
    status: (id: string) => ['jobs', 'status', id] as const,
  },
};
