import prisma from '../../config/db';
import { NotFoundError, ValidationError } from '../../errors';
import { getErrorMessage } from '../../utils/error-helpers';
import { inscribirEstudianteEnNivel, InscripcionNivelResult } from './nivel.service';

interface PromocionMasivaResult {
  promovidos: number;
  yaInscritos: number;
  totalAprobados: number;
  errores: Array<{ estudianteId: string; error: string }>;
}

export const promoverMasivo = async (
  nivelOrigenId: string,
  nivelDestinoId: string,
  cicloDestinoId: string,
  institucionId: string,
): Promise<PromocionMasivaResult> => {
  // 1. Verificar niveles
  const [nivelOrigen, nivelDestino] = await Promise.all([
    prisma.nivel.findFirst({ where: { id: nivelOrigenId, institucionId } }),
    prisma.nivel.findFirst({ where: { id: nivelDestinoId, institucionId } }),
  ]);

  if (!nivelOrigen) throw new NotFoundError('Nivel origen no encontrado');
  if (!nivelDestino) throw new NotFoundError('Nivel destino no encontrado');

  // 2. Verificar ciclo destino: existe y no esta cerrado
  const cicloDestino = await prisma.cicloLectivo.findFirst({
    where: { id: cicloDestinoId, institucionId },
    select: { id: true, cerrado: true, activo: true },
  });

  if (!cicloDestino) throw new NotFoundError('Ciclo lectivo destino no encontrado');
  if (cicloDestino.cerrado) {
    throw new ValidationError('El ciclo lectivo destino esta cerrado');
  }

  // 3. Buscar el ciclo origen: el mas reciente con clases en el nivel origen (cerrado o inactivo)
  const claseOrigen = await prisma.clase.findFirst({
    where: { nivelId: nivelOrigenId, institucionId },
    orderBy: { cicloLectivo: { fechaInicio: 'desc' } },
    select: { cicloLectivoId: true },
  });

  if (!claseOrigen) {
    throw new ValidationError('No se encontraron clases en el nivel origen');
  }
  const cicloOrigenId = claseOrigen.cicloLectivoId;

  if (cicloOrigenId === cicloDestinoId) {
    throw new ValidationError('El ciclo origen y destino no pueden ser el mismo');
  }

  // 4. Buscar estudiantes inscritos en el nivel origen
  const inscripciones = await prisma.inscripcion.findMany({
    where: {
      clase: { nivelId: nivelOrigenId, cicloLectivoId: cicloOrigenId },
    },
    select: { estudianteId: true },
    distinct: ['estudianteId'],
  });

  // 5. Filtrar estudiantes APROBADOS (todas sus calificaciones con situacion APROBADO)
  const estudiantesAprobados: string[] = [];
  for (const { estudianteId } of inscripciones) {
    const calificaciones = await prisma.calificacion.findMany({
      where: {
        estudianteId,
        clase: { nivelId: nivelOrigenId },
        cicloLectivoId: cicloOrigenId,
      },
      select: { situacion: true },
    });

    const aprobado =
      calificaciones.length > 0 &&
      calificaciones.every((c) => c.situacion === 'APROBADO');

    if (aprobado) estudiantesAprobados.push(estudianteId);
  }

  // 6. Promover cada estudiante aprobado
  let promovidos = 0;
  let yaInscritos = 0;
  const errores: Array<{ estudianteId: string; error: string }> = [];

  for (const estudianteId of estudiantesAprobados) {
    try {
      const result = await inscribirEstudianteEnNivel(
        estudianteId,
        nivelDestinoId,
        institucionId,
        cicloDestinoId,
      );
      if (result.yaInscrito) {
        yaInscritos++;
      } else {
        promovidos++;
      }
    } catch (err) {
      errores.push({ estudianteId, error: getErrorMessage(err) });
    }
  }

  return {
    promovidos,
    yaInscritos,
    totalAprobados: estudiantesAprobados.length,
    errores,
  };
};

export const promoverIndividual = async (
  estudianteId: string,
  nivelDestinoId: string,
  cicloDestinoId: string,
  institucionId: string,
): Promise<InscripcionNivelResult> => {
  // 1. Verificar estudiante
  const estudiante = await prisma.user.findFirst({
    where: { id: estudianteId, institucionId, role: 'ESTUDIANTE' },
    select: { id: true },
  });
  if (!estudiante) throw new NotFoundError('Estudiante no encontrado');

  // 2. Verificar ciclo destino
  const cicloDestino = await prisma.cicloLectivo.findFirst({
    where: { id: cicloDestinoId, institucionId },
    select: { id: true, cerrado: true },
  });
  if (!cicloDestino) throw new NotFoundError('Ciclo lectivo destino no encontrado');
  if (cicloDestino.cerrado) {
    throw new ValidationError('El ciclo lectivo destino esta cerrado');
  }

  // 3. Inscribir sin verificar aprobacion (decision administrativa)
  return inscribirEstudianteEnNivel(estudianteId, nivelDestinoId, institucionId, cicloDestinoId);
};
