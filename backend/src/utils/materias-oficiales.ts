/**
 * Materias oficiales según MINERD (República Dominicana) y MENFP (Haití)
 * Estas materias se crean automáticamente cuando una institución activa un sistema educativo
 */

import { SistemaEducativo, TipoMateria } from '@prisma/client';

export interface MateriaOficial {
  nombre: string;
  codigo: string;
  descripcion?: string;
  tipo: TipoMateria;
  orden: number;
}

// ========== MINERD - República Dominicana ==========

// Primaria DO (1ro a 6to grado)
export const MATERIAS_PRIMARIA_DO: MateriaOficial[] = [
  { nombre: 'Lengua Española', codigo: 'LE', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Matemática', codigo: 'MA', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Ciencias Sociales', codigo: 'CS', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Ciencias de la Naturaleza', codigo: 'CN', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Formación Integral Humana y Religiosa', codigo: 'FIHR', tipo: 'GENERAL', orden: 5 },
  { nombre: 'Educación Artística', codigo: 'EA', tipo: 'GENERAL', orden: 6 },
  { nombre: 'Educación Física', codigo: 'EF', tipo: 'GENERAL', orden: 7 },
];

// Secundaria General DO (1ro a 4to de secundaria)
export const MATERIAS_SECUNDARIA_DO: MateriaOficial[] = [
  { nombre: 'Lengua Española', codigo: 'LE', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Matemática', codigo: 'MA', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Ciencias Sociales', codigo: 'CS', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Ciencias de la Naturaleza', codigo: 'CN', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Formación Integral Humana y Religiosa', codigo: 'FIHR', tipo: 'GENERAL', orden: 5 },
  { nombre: 'Educación Artística', codigo: 'EA', tipo: 'GENERAL', orden: 6 },
  { nombre: 'Educación Física', codigo: 'EF', tipo: 'GENERAL', orden: 7 },
  { nombre: 'Lengua Extranjera (Inglés)', codigo: 'IN', tipo: 'GENERAL', orden: 8 },
  { nombre: 'Lengua Extranjera (Francés)', codigo: 'FR', tipo: 'GENERAL', orden: 9 },
];

// Politécnico DO - Materias académicas base
export const MATERIAS_POLITECNICO_BASE_DO: MateriaOficial[] = [
  { nombre: 'Lengua Española', codigo: 'LE', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Matemática', codigo: 'MA', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Ciencias Sociales', codigo: 'CS', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Ciencias de la Naturaleza', codigo: 'CN', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Formación Integral Humana y Religiosa', codigo: 'FIHR', tipo: 'GENERAL', orden: 5 },
  { nombre: 'Educación Física', codigo: 'EF', tipo: 'GENERAL', orden: 6 },
  { nombre: 'Lengua Extranjera (Inglés)', codigo: 'IN', tipo: 'GENERAL', orden: 7 },
];

// Ejemplo de módulos técnicos para Politécnico (varían según especialidad)
export const MATERIAS_POLITECNICO_TECNICAS_DO: MateriaOficial[] = [
  { nombre: 'Introducción a la Especialidad', codigo: 'IE', tipo: 'TECNICA', orden: 10, descripcion: 'Módulo técnico introductorio' },
  { nombre: 'Tecnología Aplicada', codigo: 'TA', tipo: 'TECNICA', orden: 11, descripcion: 'Módulo técnico' },
  { nombre: 'Práctica Profesional', codigo: 'PP', tipo: 'TECNICA', orden: 12, descripcion: 'Módulo técnico práctico' },
];

// Inicial DO (Preescolar)
export const MATERIAS_INICIAL_DO: MateriaOficial[] = [
  { nombre: 'Desarrollo Personal y Social', codigo: 'DPS', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Comunicación y Expresión', codigo: 'CE', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Pensamiento Lógico', codigo: 'PL', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Exploración del Entorno', codigo: 'EE', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Educación Artística', codigo: 'EA', tipo: 'GENERAL', orden: 5 },
  { nombre: 'Educación Física', codigo: 'EF', tipo: 'GENERAL', orden: 6 },
];

// ========== MENFP - Haití (Provisional) ==========

// Primaria HT (1ère à 6ème année)
export const MATERIAS_PRIMARIA_HT: MateriaOficial[] = [
  { nombre: 'Français', codigo: 'FR', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Créole', codigo: 'CR', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Mathématiques', codigo: 'MA', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Sciences Sociales', codigo: 'SS', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Sciences Expérimentales', codigo: 'SE', tipo: 'GENERAL', orden: 5 },
  { nombre: 'Éducation Artistique', codigo: 'EA', tipo: 'GENERAL', orden: 6 },
  { nombre: 'Éducation Physique', codigo: 'EP', tipo: 'GENERAL', orden: 7 },
];

// Secundaria HT (7ème à 13ème année)
export const MATERIAS_SECUNDARIA_HT: MateriaOficial[] = [
  { nombre: 'Français', codigo: 'FR', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Créole', codigo: 'CR', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Mathématiques', codigo: 'MA', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Histoire', codigo: 'HI', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Géographie', codigo: 'GE', tipo: 'GENERAL', orden: 5 },
  { nombre: 'Physique', codigo: 'PH', tipo: 'GENERAL', orden: 6 },
  { nombre: 'Chimie', codigo: 'CH', tipo: 'GENERAL', orden: 7 },
  { nombre: 'Biologie', codigo: 'BI', tipo: 'GENERAL', orden: 8 },
  { nombre: 'Anglais', codigo: 'AN', tipo: 'GENERAL', orden: 9 },
  { nombre: 'Espagnol', codigo: 'ES', tipo: 'GENERAL', orden: 10 },
  { nombre: 'Philosophie', codigo: 'PL', tipo: 'GENERAL', orden: 11 },
  { nombre: 'Éducation Physique', codigo: 'EP', tipo: 'GENERAL', orden: 12 },
];

// Inicial HT (Préscolaire)
export const MATERIAS_INICIAL_HT: MateriaOficial[] = [
  { nombre: 'Communication et Langage', codigo: 'CL', tipo: 'GENERAL', orden: 1 },
  { nombre: 'Éveil Mathématique', codigo: 'EM', tipo: 'GENERAL', orden: 2 },
  { nombre: 'Découverte du Monde', codigo: 'DM', tipo: 'GENERAL', orden: 3 },
  { nombre: 'Expression Artistique', codigo: 'EA', tipo: 'GENERAL', orden: 4 },
  { nombre: 'Activités Physiques', codigo: 'AP', tipo: 'GENERAL', orden: 5 },
];

/**
 * Obtiene las materias oficiales para un sistema educativo dado
 */
export function getMateriasOficiales(sistema: SistemaEducativo): {
  materias: MateriaOficial[];
  pais: 'DO' | 'HT';
  provisional: boolean;
} {
  switch (sistema) {
    // República Dominicana
    case 'INICIAL_DO':
      return { materias: MATERIAS_INICIAL_DO, pais: 'DO', provisional: false };
    case 'PRIMARIA_DO':
      return { materias: MATERIAS_PRIMARIA_DO, pais: 'DO', provisional: false };
    case 'SECUNDARIA_GENERAL_DO':
      return { materias: MATERIAS_SECUNDARIA_DO, pais: 'DO', provisional: false };
    case 'POLITECNICO_DO':
      return {
        materias: [...MATERIAS_POLITECNICO_BASE_DO, ...MATERIAS_POLITECNICO_TECNICAS_DO],
        pais: 'DO',
        provisional: false
      };

    // Haití (todas marcadas como provisionales hasta confirmar con MENFP)
    case 'INICIAL_HT':
      return { materias: MATERIAS_INICIAL_HT, pais: 'HT', provisional: true };
    case 'PRIMARIA_HT':
      return { materias: MATERIAS_PRIMARIA_HT, pais: 'HT', provisional: true };
    case 'SECUNDARIA_HT':
      return { materias: MATERIAS_SECUNDARIA_HT, pais: 'HT', provisional: true };

    default:
      return { materias: [], pais: 'DO', provisional: false };
  }
}

/**
 * Obtiene el nombre del sistema educativo para mostrar
 */
export function getNombreSistema(sistema: SistemaEducativo): string {
  const nombres: Record<SistemaEducativo, string> = {
    INICIAL_DO: 'Nivel Inicial (DO)',
    PRIMARIA_DO: 'Primaria (DO)',
    SECUNDARIA_GENERAL_DO: 'Secundaria (DO)',
    POLITECNICO_DO: 'Politécnico (DO)',
    INICIAL_HT: 'Niveau Initial (HT)',
    PRIMARIA_HT: 'Primaire (HT)',
    SECUNDARIA_HT: 'Secondaire (HT)',
  };
  return nombres[sistema] || sistema;
}
