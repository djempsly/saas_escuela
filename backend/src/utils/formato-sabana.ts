import { FormatoSabana, TipoCicloEducativo } from '@prisma/client';

type TipoCiclo = 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA' | 'POLITECNICO' | 'ADULTOS';

/**
 * Detecta el tipo de ciclo educativo a partir de su nombre (fallback).
 * Normaliza acentos y busca palabras clave.
 */
function detectarTipoCicloPorNombre(nombre: string): TipoCiclo | null {
  const n = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (n.includes('inicial') || n.includes('preescolar') || n.includes('parvularia')) {
    return 'INICIAL';
  }
  if (n.includes('primaria') || n.includes('basica')) return 'PRIMARIA';
  if (n.includes('politecnico') || n.includes('tecnico')) return 'POLITECNICO';
  if (n.includes('secundaria') || n.includes('media')) return 'SECUNDARIA';
  if (n.includes('adulto')) return 'ADULTOS';
  return null;
}

interface FormatoSabanaResult {
  formatoSabana: FormatoSabana;
  numeroPeriodos: number;
  usaModulosTec: boolean;
}

function mapearTipoAFormato(tipo: TipoCiclo, sistemaInstitucion: string): FormatoSabanaResult {
  const esHT = sistemaInstitucion.includes('_HT');
  const periodos = esHT ? 3 : 4;

  const mapa: Record<TipoCiclo, FormatoSabanaResult> = {
    INICIAL: {
      formatoSabana: esHT ? FormatoSabana.INICIAL_HT : FormatoSabana.INICIAL_DO,
      numeroPeriodos: periodos,
      usaModulosTec: false,
    },
    PRIMARIA: {
      formatoSabana: esHT ? FormatoSabana.PRIMARIA_HT : FormatoSabana.PRIMARIA_DO,
      numeroPeriodos: periodos,
      usaModulosTec: false,
    },
    SECUNDARIA: {
      formatoSabana: esHT ? FormatoSabana.SECUNDARIA_HT : FormatoSabana.SECUNDARIA_DO,
      numeroPeriodos: periodos,
      usaModulosTec: false,
    },
    POLITECNICO: {
      formatoSabana: FormatoSabana.POLITECNICO_DO,
      numeroPeriodos: 4,
      usaModulosTec: true,
    },
    ADULTOS: {
      formatoSabana: FormatoSabana.ADULTOS,
      numeroPeriodos: 4,
      usaModulosTec: false,
    },
  };

  return mapa[tipo];
}

/**
 * Determina el formatoSabana, numeroPeriodos y usaModulosTec.
 *
 * Fuente principal: campo `tipo` del CicloEducativo (enum).
 * Fallback: detección por nombre del CicloEducativo.
 *
 * Para DO vs HT: si el sistema de la institución contiene "_HT" → HT, sino → DO.
 * numeroPeriodos: 4 para DO, 3 para HT.
 * usaModulosTec: true solo para POLITECNICO_DO.
 */
export function determinarFormatoSabana(
  ciclo: { nombre: string; tipo?: TipoCicloEducativo | null },
  sistemaInstitucion: string,
): FormatoSabanaResult | null {
  // 1. Usar campo tipo si existe
  const tipo: TipoCiclo | null = ciclo.tipo ?? detectarTipoCicloPorNombre(ciclo.nombre);
  if (!tipo) return null;

  return mapearTipoAFormato(tipo, sistemaInstitucion);
}
