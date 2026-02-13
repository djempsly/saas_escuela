import { TipoCicloEducativo } from '@prisma/client';
import prisma from '../config/db';
import { getEstructuraAcademica } from '../utils/estructura-academica';
import { determinarFormatoSabana } from '../utils/formato-sabana';
import { ConflictError } from '../errors';

interface GenerarResult {
  ciclosCreados: { id: string; nombre: string }[];
  nivelesCreados: { id: string; nombre: string; gradoNumero: number | null }[];
}

export async function generarEstructuraAcademica(
  tipo: TipoCicloEducativo,
  institucionId: string,
): Promise<GenerarResult> {
  const template = getEstructuraAcademica(tipo);

  if (template.ciclos.length === 0 && template.gradosSinCiclo.length === 0) {
    return { ciclosCreados: [], nivelesCreados: [] };
  }

  // Get institution sistema for formatoSabana resolution
  const institucion = await prisma.institucion.findUnique({
    where: { id: institucionId },
    select: { sistema: true },
  });
  if (!institucion) {
    throw new Error('Institución no encontrada');
  }

  const sistemaStr = institucion.sistema as string;

  return prisma.$transaction(async (tx) => {
    const ciclosCreados: GenerarResult['ciclosCreados'] = [];
    const nivelesCreados: GenerarResult['nivelesCreados'] = [];

    // Create ciclos and their grados
    for (const cicloTpl of template.ciclos) {
      // Check for duplicate ciclo
      const existing = await tx.cicloEducativo.findFirst({
        where: { nombre: cicloTpl.nombre, institucionId },
      });
      if (existing) {
        throw new ConflictError(`Ya existe el ciclo educativo "${cicloTpl.nombre}"`);
      }

      const ciclo = await tx.cicloEducativo.create({
        data: {
          nombre: cicloTpl.nombre,
          tipo: cicloTpl.tipo,
          orden: cicloTpl.orden,
          institucionId,
        },
      });
      ciclosCreados.push({ id: ciclo.id, nombre: ciclo.nombre });

      // Resolve formatoSabana for this ciclo's niveles
      const formato = determinarFormatoSabana(
        { nombre: cicloTpl.nombre, tipo: cicloTpl.tipo },
        sistemaStr,
      );

      for (const gradoTpl of cicloTpl.grados) {
        // Check for duplicate nivel
        const existingNivel = await tx.nivel.findFirst({
          where: { nombre: gradoTpl.nombre, institucionId },
        });
        if (existingNivel) {
          throw new ConflictError(`Ya existe el nivel "${gradoTpl.nombre}"`);
        }

        const nivel = await tx.nivel.create({
          data: {
            nombre: gradoTpl.nombre,
            gradoNumero: gradoTpl.gradoNumero,
            cicloEducativoId: ciclo.id,
            institucionId,
            ...(formato && {
              formatoSabana: formato.formatoSabana,
              numeroPeriodos: formato.numeroPeriodos,
              usaModulosTec: formato.usaModulosTec,
            }),
          },
        });
        nivelesCreados.push({
          id: nivel.id,
          nombre: nivel.nombre,
          gradoNumero: nivel.gradoNumero,
        });
      }
    }

    // Create grados without ciclo (e.g. INICIAL)
    for (const gradoTpl of template.gradosSinCiclo) {
      const existingNivel = await tx.nivel.findFirst({
        where: { nombre: gradoTpl.nombre, institucionId },
      });
      if (existingNivel) {
        throw new ConflictError(`Ya existe el nivel "${gradoTpl.nombre}"`);
      }

      // For niveles without ciclo, resolve formato using the tipo directly
      const formato = determinarFormatoSabana(
        { nombre: gradoTpl.nombre, tipo },
        sistemaStr,
      );

      const nivel = await tx.nivel.create({
        data: {
          nombre: gradoTpl.nombre,
          gradoNumero: gradoTpl.gradoNumero,
          institucionId,
          ...(formato && {
            formatoSabana: formato.formatoSabana,
            numeroPeriodos: formato.numeroPeriodos,
            usaModulosTec: formato.usaModulosTec,
          }),
        },
      });
      nivelesCreados.push({
        id: nivel.id,
        nombre: nivel.nombre,
        gradoNumero: nivel.gradoNumero,
      });
    }

    return { ciclosCreados, nivelesCreados };
  });
}
