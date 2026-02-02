/**
 * Tipos para el sistema de generación de boletines multi-tenant
 * Soporta múltiples sistemas educativos (RD y Haití)
 */

// Sistemas educativos soportados
export type SistemaEducativo =
  | 'PRIMARIA_DO'
  | 'SECUNDARIA_GENERAL_DO'
  | 'POLITECNICO_DO'
  | 'PRIMARIA_HT'
  | 'SECUNDARIA_HT';

// Estado final del estudiante
export type EstadoFinal = 'APROBADO' | 'REPROBADO' | 'EN_PROCESO' | 'PROMOVIDO' | 'APLAZANTE';

// Información del estudiante
export interface EstudianteInfo {
  id: string;
  nombre: string;
  apellido: string;
  matricula: string;
  grado: string;
  seccion: string;
  foto?: string;
  fechaNacimiento?: string;
}

// Información de la institución
export interface InstitucionInfo {
  id: string;
  nombre: string;
  logoUrl?: string;
  direccion?: string;
  telefono?: string;
  codigoCentro?: string;
  sistemaEducativo: SistemaEducativo;
  colorPrimario: string;
  colorSecundario?: string;
  pais: 'DO' | 'HT';
}

// Información del ciclo lectivo
export interface CicloInfo {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  añoEscolar: string; // e.g., "2024-2025"
}

// Calificación por período
export interface CalificacionPeriodo {
  periodo: 'P1' | 'P2' | 'P3' | 'P4';
  nota: number | null;
  recuperacion?: number | null; // RP1, RP2, RP3, RP4
}

// Calificación por materia
export interface CalificacionMateria {
  materiaId: string;
  materia: string;
  tipo: 'GENERAL' | 'TECNICA';
  periodos: CalificacionPeriodo[];
  promedioFinal: number;
  estado: EstadoFinal;
  // Evaluaciones de recuperación extendida (solo para algunos sistemas)
  completiva?: {
    cf50?: number;
    cec?: number;
    cec50?: number;
    ccf?: number;
  };
  extraordinaria?: {
    cf30?: number;
    ceEx?: number;
    ceEx70?: number;
    cexf?: number;
  };
  especial?: {
    cf?: number;
    ce?: number;
  };
}

// Competencia (para sistemas por competencias como POLITECNICO_DO)
export interface Competencia {
  codigo: string;
  nombre: string;
  tipo: 'FUNDAMENTAL' | 'ESPECIFICA';
  calificaciones: {
    p1?: number;
    p2?: number;
    p3?: number;
    p4?: number;
    rp1?: number;
    rp2?: number;
    rp3?: number;
    rp4?: number;
  };
  promedio: number;
}

// Módulo técnico (para politécnico)
export interface ModuloTecnico {
  codigo: string;
  nombre: string;
  resultadosAprendizaje: ResultadoAprendizaje[];
}

// Resultado de aprendizaje (RA)
export interface ResultadoAprendizaje {
  codigo: string;
  descripcion: string;
  calificaciones: {
    p1?: number;
    p2?: number;
    p3?: number;
    p4?: number;
    rp1?: number;
    rp2?: number;
    rp3?: number;
    rp4?: number;
  };
  estado: 'LOGRADO' | 'EN_PROCESO' | 'NO_LOGRADO';
}

// Resumen de asistencia
export interface AsistenciaResumen {
  totalDias: number;
  diasPresente: number;
  diasAusente?: number;
  diasTarde?: number;
  porcentajeAnual: number;
}

// Evaluaciones extendidas de recuperación
export interface EvaluacionesExtendidas {
  completiva1?: number;
  completiva2?: number;
  completiva3?: number;
  completiva4?: number;
  extraordinaria?: number;
  especial?: number;
}

// Datos completos del boletín
export interface BoletinData {
  estudiante: EstudianteInfo;
  institucion: InstitucionInfo;
  ciclo: CicloInfo;
  calificaciones: CalificacionMateria[];
  competencias?: Competencia[];
  modulosTecnicos?: ModuloTecnico[];
  asistencia: AsistenciaResumen;
  evaluacionesExtendidas?: EvaluacionesExtendidas;
  observaciones?: string;
  situacionFinal: EstadoFinal;
  fechaEmision: string;
}

// Metadata del template
export interface TemplateMetadata {
  sistemaEducativo: SistemaEducativo;
  nombre: string;
  descripcion: string;
  orientacion: 'portrait' | 'landscape';
  tamañoPagina: 'A4' | 'LETTER' | 'LEGAL';
  paginas: number; // número estimado de páginas
}

// Configuración de colores para notas
export interface ColorNotasConfig {
  excelente: string;  // >= 90
  bueno: string;      // 80-89
  regular: string;    // 70-79
  deficiente: string; // < 70
}

// Configuración de colores por grado
export interface GradeColorsConfig {
  [grado: string]: string;
  default: string;
}

// Configuración del template
export interface TemplateConfig {
  locale: 'es' | 'fr' | 'en' | 'ht';
  colorNotas: ColorNotasConfig;
  gradeColors: GradeColorsConfig;
}
