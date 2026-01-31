// Tipos para generación de PDFs de calificaciones

import { Locale } from '../i18n';

export type PaperSize = 'A4' | 'LEGAL';
export type EducationSystem =
  | 'RD_POLITECNICO'
  | 'RD_GENERAL'
  | 'RD_PRIMARIA'
  | 'PRIMARIA_DO'
  | 'SECUNDARIA_GENERAL_DO'
  | 'POLITECNICO_DO'
  | 'HAITI'
  | 'PRIMARIA_HT'
  | 'SECUNDARIA_HT';

export interface GradeColors {
  excelente: string;  // 90-100
  bueno: string;      // 80-89
  regular: string;    // 70-79
  deficiente: string; // <70
}

export interface StudentInfo {
  id: string;
  nombre: string;
  apellido: string;
  matricula?: string;
  foto?: string;
  nivel: string;
  seccion?: string;
  fechaNacimiento?: string;
}

export interface SubjectGrade {
  materia: string;
  tipo: 'GENERAL' | 'TECNICA';
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  rp1?: number;
  rp2?: number;
  rp3?: number;
  rp4?: number;
  cpc_30?: number;
  cpex_70?: number;
  promedio?: number;
  final?: number;
  // Para materias técnicas (RA)
  modulosTecnicos?: TechnicalModule[];
}

export interface TechnicalModule {
  codigo: string;
  nombre: string;
  valor: number;
  competencia: 'LOGRADO' | 'EN_PROCESO' | 'NO_LOGRADO';
}

export interface InstitutionInfo {
  nombre: string;
  logoUrl?: string;
  direccion?: string;
  telefono?: string;
  pais: 'DO' | 'HT';
  sistemaEducativo: EducationSystem;
  colorPrimario: string;
  colorSecundario: string;
}

export interface ReportCardData {
  estudiante: StudentInfo;
  institucion: InstitutionInfo;
  cicloLectivo: string;
  calificaciones: SubjectGrade[];
  promedioGeneral: number;
  asistencia: {
    totalDias: number;
    diasPresente: number;
    diasAusente: number;
    diasTarde: number;
    porcentaje: number;
  };
  observaciones?: string;
  estadoFinal: 'PROMOVIDO' | 'REPROBADO' | 'PENDIENTE';
  fechaEmision: string;
  firmas: {
    director?: string;
    docente?: string;
    padre?: string;
  };
}

export interface PDFConfig {
  locale: Locale;
  paperSize: PaperSize;
  gradeColors: GradeColors;
  showTechnicalModules: boolean;
  showAttendance: boolean;
  showObservations: boolean;
  doubleSided: boolean;
}

// Determinar tamaño de papel según sistema educativo
export const getPaperSize = (sistema: EducationSystem, nivel?: string): PaperSize => {
  if (sistema.includes('HT') || sistema === 'HAITI') {
    return 'A4';
  }
  if (sistema.includes('PRIMARIA') || nivel?.toLowerCase().includes('primaria')) {
    return 'A4';
  }
  // RD Secundaria y Politécnico usan Legal
  return 'LEGAL';
};

// Dimensiones en puntos (72 puntos = 1 pulgada)
export const PAPER_DIMENSIONS = {
  A4: { width: 595.28, height: 841.89 },     // 210mm x 297mm
  LEGAL: { width: 612, height: 1008 },        // 8.5" x 14"
} as const;

// Obtener color según nota
export const getGradeColor = (grade: number, colors: GradeColors): string => {
  if (grade >= 90) return colors.excelente;
  if (grade >= 80) return colors.bueno;
  if (grade >= 70) return colors.regular;
  return colors.deficiente;
};

// Obtener estado de competencia para RA
export const getCompetencyStatus = (value: number): 'LOGRADO' | 'EN_PROCESO' | 'NO_LOGRADO' => {
  if (value >= 70) return 'LOGRADO';
  if (value >= 50) return 'EN_PROCESO';
  return 'NO_LOGRADO';
};
