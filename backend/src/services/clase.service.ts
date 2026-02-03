import prisma from '../config/db';
import { ClaseInput } from '../utils/zod.schemas';
import crypto from 'crypto';

const generateCodigoClase = (): string => {
  return `CLS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

export const createClase = async (input: ClaseInput, institucionId: string) => {
  // Verificar que materia, nivel, docente y ciclo pertenecen a la institución
  const [materia, nivel, docente, ciclo] = await Promise.all([
    prisma.materia.findFirst({ where: { id: input.materiaId, institucionId } }),
    prisma.nivel.findFirst({ where: { id: input.nivelId, institucionId } }),
    prisma.user.findFirst({ where: { id: input.docenteId, institucionId, role: 'DOCENTE' } }),
    prisma.cicloLectivo.findFirst({ where: { id: input.cicloLectivoId, institucionId } }),
  ]);

  if (!materia) throw new Error('Materia no encontrada o no pertenece a la institucion');
  if (!nivel) throw new Error('Nivel no encontrado o no pertenece a la institucion');
  if (!docente) throw new Error('Docente no encontrado o no pertenece a la institucion');
  if (!ciclo) throw new Error('Ciclo lectivo no encontrado o no pertenece a la institucion');

  // SEGURIDAD: Verificar que no exista otra clase con la misma materia, nivel, ciclo y sección
  // No puede haber dos materias con el mismo nombre en el mismo grado
  const claseExistente = await prisma.clase.findFirst({
    where: {
      materiaId: input.materiaId,
      nivelId: input.nivelId,
      cicloLectivoId: input.cicloLectivoId,
      seccion: input.seccion || null,
      institucionId,
    },
    include: {
      materia: { select: { nombre: true } },
      nivel: { select: { nombre: true } },
    },
  });

  if (claseExistente) {
    const seccionMsg = input.seccion ? ` sección ${input.seccion}` : '';
    throw new Error(
      `Ya existe una clase de "${claseExistente.materia.nombre}" en "${claseExistente.nivel.nombre}"${seccionMsg} para este ciclo lectivo. ` +
      `Si necesita otra sección, especifique una sección diferente (ej: A, B, C).`
    );
  }

  // Usar codigo proporcionado o generar uno automaticamente
  let codigo = input.codigo || generateCodigoClase();

  // Verificar que el codigo no exista
  if (input.codigo) {
    const existente = await prisma.clase.findUnique({ where: { codigo } });
    if (existente) {
      throw new Error('El codigo de clase ya existe. Use otro codigo.');
    }
  }

  return prisma.clase.create({
    data: {
      codigo,
      tanda: input.tanda || 'MATUTINA',
      seccion: input.seccion || null,
      materiaId: input.materiaId,
      nivelId: input.nivelId,
      docenteId: input.docenteId,
      cicloLectivoId: input.cicloLectivoId,
      institucionId,
    },
    include: {
      materia: true,
      nivel: true,
      docente: { select: { id: true, nombre: true, apellido: true, email: true } },
      cicloLectivo: true,
    },
  });
};

export const findClases = async (institucionId: string) => {
  return prisma.clase.findMany({
    where: { institucionId },
    include: {
      materia: true,
      nivel: true,
      docente: { select: { id: true, nombre: true, apellido: true, email: true } },
      cicloLectivo: true,
      _count: { select: { inscripciones: true } },
    },
  });
};

export const findClaseById = async (id: string, institucionId: string) => {
  return prisma.clase.findFirst({
    where: { id, institucionId },
    include: {
      materia: true,
      nivel: true,
      docente: { select: { id: true, nombre: true, apellido: true, email: true } },
      cicloLectivo: true,
      inscripciones: {
        include: {
          estudiante: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      },
    },
  });
};

export const findClaseByCodigo = async (codigo: string) => {
  return prisma.clase.findUnique({
    where: { codigo },
    include: {
      materia: true,
      nivel: true,
      docente: { select: { id: true, nombre: true, apellido: true, email: true } },
      cicloLectivo: true,
      institucion: { select: { id: true, nombre: true } },
    },
  });
};

export const updateClase = async (id: string, institucionId: string, input: Partial<ClaseInput>) => {
  // Si se cambia docente, verificar que pertenece a la institución
  if (input.docenteId) {
    const docente = await prisma.user.findFirst({
      where: { id: input.docenteId, institucionId, role: 'DOCENTE' },
    });
    if (!docente) throw new Error('Docente no encontrado o no pertenece a la institución');
  }

  return prisma.clase.updateMany({
    where: { id, institucionId },
    data: input,
  });
};

export const deleteClase = async (id: string, institucionId: string) => {
  // Verificar si tiene inscripciones activas
  const inscripciones = await prisma.inscripcion.count({
    where: { claseId: id, clase: { institucionId } },
  });

  if (inscripciones > 0) {
    throw new Error(`No se puede eliminar: hay ${inscripciones} estudiantes inscritos`);
  }

  return prisma.clase.deleteMany({
    where: { id, institucionId },
  });
};

// Obtener clases de un docente específico
export const findClasesByDocente = async (docenteId: string, institucionId: string) => {
  return prisma.clase.findMany({
    where: { docenteId, institucionId },
    include: {
      materia: true,
      nivel: true,
      cicloLectivo: true,
      _count: { select: { inscripciones: true } },
    },
  });
};
