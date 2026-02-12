import { FormatoSabana } from '@prisma/client';
import prisma from '../../config/db';
import { NotFoundError, ValidationError, ConflictError } from '../../errors';

export const COMPETENCIAS_POR_FORMATO: Record<FormatoSabana, string[]> = {
  INICIAL_DO: ['IL1', 'IL2', 'IL3', 'IL4', 'IL5'],
  INICIAL_HT: ['IL1', 'IL2', 'IL3', 'IL4', 'IL5'],
  PRIMARIA_DO: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  PRIMARIA_HT: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  SECUNDARIA_DO: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  SECUNDARIA_HT: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  POLITECNICO_DO: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
  ADULTOS: ['CF1', 'CF2', 'CF3', 'CF4', 'CF5'],
};

export const RA_CODIGOS_POLITECNICO = [
  'RA1', 'RA2', 'RA3', 'RA4', 'RA5',
  'RA6', 'RA7', 'RA8', 'RA9', 'RA10',
];

interface InscripcionNivelResult {
  estudianteId: string;
  nivelId: string;
  clasesInscritas: number;
  calificacionesCreadas: number;
  competenciasCreadas: number;
  tecnicasCreadas: number;
}

export const inscribirEstudianteEnNivel = async (
  estudianteId: string,
  nivelId: string,
  institucionId: string,
): Promise<InscripcionNivelResult> => {
  return prisma.$transaction(async (tx) => {
    // 1. Buscar nivel con formatoSabana
    const nivel = await tx.nivel.findUnique({
      where: { id: nivelId },
    });

    if (!nivel || nivel.institucionId !== institucionId) {
      throw new NotFoundError('Nivel no encontrado');
    }

    // 2. Verificar estudiante
    const estudiante = await tx.user.findFirst({
      where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
      select: { id: true },
    });

    if (!estudiante) {
      throw new NotFoundError('Estudiante no encontrado');
    }

    // 3. Buscar ciclo lectivo activo
    const cicloActivo = await tx.cicloLectivo.findFirst({
      where: { institucionId, activo: true },
      select: { id: true },
    });

    if (!cicloActivo) {
      throw new ValidationError('No hay un ciclo lectivo activo');
    }

    // 4. Buscar clases del nivel en el ciclo activo
    const clases = await tx.clase.findMany({
      where: { nivelId, cicloLectivoId: cicloActivo.id },
      include: { materia: { select: { tipo: true } } },
    });

    if (clases.length === 0) {
      throw new ValidationError(
        'No hay clases asignadas a este nivel en el ciclo activo',
      );
    }

    // 5. Verificar duplicados
    const inscripcionesExistentes = await tx.inscripcion.findMany({
      where: {
        estudianteId,
        claseId: { in: clases.map((c) => c.id) },
      },
      select: { claseId: true },
    });

    if (inscripcionesExistentes.length > 0) {
      throw new ConflictError(
        `El estudiante ya está inscrito en ${inscripcionesExistentes.length} clase(s) de este nivel`,
      );
    }

    // 6. Configuración según formatoSabana (usa el enum, no strings)
    const { formatoSabana } = nivel;
    const competencias = COMPETENCIAS_POR_FORMATO[formatoSabana];
    const crearTecnicas = formatoSabana === FormatoSabana.POLITECNICO_DO;

    let calificacionesCreadas = 0;
    let competenciasCreadas = 0;
    let tecnicasCreadas = 0;

    // 7. Crear inscripciones y calificaciones por clase
    for (const clase of clases) {
      // Inscripción
      await tx.inscripcion.create({
        data: { estudianteId, claseId: clase.id },
      });

      // Calificación general (todos los formatos)
      await tx.calificacion.create({
        data: {
          estudianteId,
          claseId: clase.id,
          cicloLectivoId: cicloActivo.id,
        },
      });
      calificacionesCreadas++;

      // Competencias / Indicadores de logro
      if (competencias.length > 0) {
        await tx.calificacionCompetencia.createMany({
          data: competencias.map((comp) => ({
            estudianteId,
            claseId: clase.id,
            cicloLectivoId: cicloActivo.id,
            competencia: comp,
          })),
        });
        competenciasCreadas += competencias.length;
      }

      // Calificaciones técnicas (solo POLITECNICO_DO + materia TECNICA)
      if (crearTecnicas && clase.materia.tipo === 'TECNICA') {
        await tx.calificacionTecnica.createMany({
          data: RA_CODIGOS_POLITECNICO.map((ra) => ({
            estudianteId,
            claseId: clase.id,
            ra_codigo: ra,
          })),
        });
        tecnicasCreadas += RA_CODIGOS_POLITECNICO.length;
      }
    }

    // 8. Actualizar nivelActualId del estudiante
    await tx.user.update({
      where: { id: estudianteId },
      data: { nivelActualId: nivelId },
    });

    return {
      estudianteId,
      nivelId,
      clasesInscritas: clases.length,
      calificacionesCreadas,
      competenciasCreadas,
      tecnicasCreadas,
    };
  });
};
