export interface Materia {
  id: string;
  nombre: string;
  codigo: string | null;
  esOficial: boolean;
  orden: number;
  tipo: string;
}

export interface Calificacion {
  p1: number | null;
  p2: number | null;
  p3: number | null;
  p4: number | null;
  rp1: number | null;
  rp2: number | null;
  rp3: number | null;
  rp4: number | null;
  promedio: number | null;
  cpc30: number | null;
  cpcNota: number | null;
  cpcTotal: number | null;
  cc: number | null;
  cpex30: number | null;
  cpexNota: number | null;
  cpex70: number | null;
  cex: number | null;
  promedioFinal: number | null;
  situacion: string | null;

  competencias?: {
    [competenciaId: string]: {
      p1: number | null;
      p2: number | null;
      p3: number | null;
      p4: number | null;
      rp1: number | null;
      rp2: number | null;
      rp3: number | null;
      rp4: number | null;
    };
  };

  ras?: { [key: string]: number };

  claseId: string | null;
  docenteId: string | null;
  docenteNombre: string | null;
  publicado?: boolean;
  observaciones?: string | null;
}

export interface Estudiante {
  id: string;
  nombre: string;
  segundoNombre: string | null;
  apellido: string;
  segundoApellido: string | null;
  fotoUrl: string | null;
  calificaciones: {
    [materiaId: string]: Calificacion;
  };
}

export interface SabanaData {
  nivel: {
    id: string;
    nombre: string;
    gradoNumero: number | null;
  };
  cicloLectivo: {
    id: string;
    nombre: string;
  };
  formatoSabana: string;
  numeroPeriodos: number;
  materias: Materia[];
  estudiantes: Estudiante[];
  metadatos: {
    totalEstudiantes: number;
    totalMaterias: number;
    fechaGeneracion: string;
    pais: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Nivel {
  id: string;
  nombre: string;
  gradoNumero: number | null;
  cicloEducativo?: {
    id: string;
    nombre: string;
  };
}

export interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

export type ViewMode = 'list' | 'boletin';

export interface EditableCell {
  cellId: string;
  claseId: string | null;
  periodo: string;
  asignaturaIndex: number;
  competenciaIndex: number;
  periodoIndex: number;
}

export interface SabanaEditState {
  editingCell: string | null;
  tempValue: string;
  isSaving: boolean;
  handleCellClick: (cellId: string, currentValue: number | null, canEdit: boolean) => void;
  handleCellBlur: (claseId: string | null, periodo: string, cellId: string) => void;
  handleCellKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, claseId: string | null, periodo: string, cellId: string) => void;
  setTempValue: (value: string) => void;
}

export interface InstitucionInfo {
  nombre: string;
  lema: string | null;
  logoUrl: string | null;
  colorPrimario: string;
  direccion: string | null;
  codigoCentro: string | null;
  distritoEducativo: string | null;
  regionalEducacion: string | null;
  sabanaColores?: {
    colores?: Record<string, string>;
    sombras?: Record<string, string>;
    franja?: Record<string, string>;
  } | null;
}
