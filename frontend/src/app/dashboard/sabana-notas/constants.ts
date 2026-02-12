const FORMATOS_POLITECNICO = ['POLITECNICO_DO'];
const FORMATOS_PRIMARIA = ['PRIMARIA_DO', 'PRIMARIA_HT'];
const FORMATOS_INICIAL = ['INICIAL_DO', 'INICIAL_HT'];
const FORMATOS_SECUNDARIA = ['SECUNDARIA_DO', 'SECUNDARIA_HT'];

export const RAS_DISPLAY = ['RA1', 'RA2', 'RA3', 'RA4', 'RA5', 'RA6', 'RA7', 'RA8', 'RA9', 'RA10'];
export const RA_SUBCOLS = [
  { key: '', label: 'C.R.A' },
  { key: '_RP1', label: 'RP1' },
  { key: '_RP2', label: 'RP2' },
];
export const TOTAL_MODULO_ROWS = 5;

export const getFormatoSabana = (formatoSabana: string): 'politecnico' | 'secundaria' | 'primaria' | 'inicial' => {
  if (FORMATOS_POLITECNICO.includes(formatoSabana)) return 'politecnico';
  if (FORMATOS_SECUNDARIA.includes(formatoSabana)) return 'secundaria';
  if (FORMATOS_PRIMARIA.includes(formatoSabana)) return 'primaria';
  if (FORMATOS_INICIAL.includes(formatoSabana)) return 'inicial';
  return 'secundaria';
};

export const COMPETENCIAS = [
  { id: 'COMUNICATIVA', nombre: 'Comunicativa', corto: 'COM' },
  { id: 'LOGICO', nombre: 'Pensamiento Lógico, Creativo y Crítico', corto: 'PLC' },
  { id: 'CIENTIFICO', nombre: 'Científica y Tecnológica', corto: 'CYT' },
  { id: 'ETICO', nombre: 'Ética y Ciudadana', corto: 'EYC' },
  { id: 'DESARROLLO', nombre: 'Desarrollo Personal y Espiritual', corto: 'DPE' },
];

export const PERIODOS = ['P1', 'RP1', 'P2', 'RP2', 'P3', 'RP3', 'P4', 'RP4'];

export const ASIGNATURAS_GENERALES_MINERD = [
  { codigo: 'LE', nombre: 'Lengua Española' },
  { codigo: 'LE-IN', nombre: 'Lengua Extranjera (Inglés)' },
  { codigo: 'MAT', nombre: 'Matemática' },
  { codigo: 'CS', nombre: 'Ciencias Sociales' },
  { codigo: 'CN', nombre: 'Ciencias de la Naturaleza' },
  { codigo: 'EA', nombre: 'Educación Artística' },
  { codigo: 'EF', nombre: 'Educación Física' },
  { codigo: 'FIHR', nombre: 'Formación Integral Humana y Religiosa' },
];
