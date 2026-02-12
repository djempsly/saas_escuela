/**
 * Tipos para los datos del boletín
 */

import { SistemaEducativo, Pais } from '@prisma/client';

export interface BoletinDataResponse {
  estudiante: EstudianteInfo;
  institucion: InstitucionInfo;
  ciclo: CicloInfo;
  calificaciones: CalificacionMateria[];
  competencias?: Competencia[];
  modulosTecnicos?: ModuloTecnico[];
  asistencia: AsistenciaResumen;
  evaluacionesExtendidas?: EvaluacionesExtendidas;
  observaciones?: string;
  situacionFinal: string;
  fechaEmision: string;
}

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
  pais: Pais;
}

export interface CicloInfo {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  añoEscolar: string;
}

export interface CalificacionPeriodo {
  periodo: 'P1' | 'P2' | 'P3' | 'P4';
  nota: number | null;
  recuperacion?: number | null;
}

export interface CalificacionMateria {
  materiaId: string;
  materia: string;
  tipo: 'GENERAL' | 'TECNICA';
  periodos: CalificacionPeriodo[];
  promedioFinal: number;
  estado: string;
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

export interface ModuloTecnico {
  codigo: string;
  nombre: string;
  resultadosAprendizaje: ResultadoAprendizaje[];
}

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

export interface AsistenciaResumen {
  totalDias: number;
  diasPresente: number;
  diasAusente?: number;
  diasTarde?: number;
  porcentajeAnual: number;
}

export interface EvaluacionesExtendidas {
  completiva1?: number;
  completiva2?: number;
  completiva3?: number;
  completiva4?: number;
  extraordinaria?: number;
  especial?: number;
}
