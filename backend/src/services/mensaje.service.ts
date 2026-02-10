import prisma from '../config/db';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize';

// Interfaces
interface CrearConversacionInput {
  titulo?: string;
  esGrupal?: boolean;
  participanteIds: string[];
}

interface EnviarMensajeInput {
  contenido: string;
  archivos?: { nombre: string; url: string; tipo: string }[];
}

// Crear conversación
export const crearConversacion = async (
  input: CrearConversacionInput,
  creadorId: string,
  institucionId: string
) => {
  // Verificar que todos los participantes existen y pertenecen a la institución
  const participantes = await prisma.user.findMany({
    where: {
      id: { in: input.participanteIds },
      institucionId,
    },
    select: { id: true, nombre: true, apellido: true },
  });

  if (participantes.length !== input.participanteIds.length) {
    throw new Error('Uno o más participantes no encontrados');
  }

  // Agregar el creador a los participantes si no está
  const todosParticipantes = [...new Set([creadorId, ...input.participanteIds])];

  // Para conversaciones 1 a 1, verificar si ya existe
  if (!input.esGrupal && todosParticipantes.length === 2) {
    const conversacionExistente = await prisma.conversacion.findFirst({
      where: {
        esGrupal: false,
        institucionId,
        AND: [
          { participantes: { some: { usuarioId: todosParticipantes[0] } } },
          { participantes: { some: { usuarioId: todosParticipantes[1] } } },
        ],
      },
      include: {
        participantes: {
          include: {
            usuario: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
          },
        },
        mensajes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (conversacionExistente) {
      return conversacionExistente;
    }
  }

  return prisma.conversacion.create({
    data: {
      titulo: sanitizeOptional(input.titulo),
      esGrupal: input.esGrupal || false,
      creadorId,
      institucionId,
      participantes: {
        create: todosParticipantes.map((usuarioId) => ({
          usuarioId,
        })),
      },
    },
    include: {
      participantes: {
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        },
      },
    },
  });
};

// Obtener conversaciones de un usuario
export const getConversaciones = async (usuarioId: string, institucionId: string) => {
  const conversaciones = await prisma.conversacion.findMany({
    where: {
      institucionId,
      participantes: {
        some: { usuarioId },
      },
    },
    include: {
      participantes: {
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        },
      },
      mensajes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          remitente: { select: { id: true, nombre: true, apellido: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Calcular mensajes no leídos para cada conversación
  const result = await Promise.all(
    conversaciones.map(async (conv) => {
      const participante = await prisma.participanteConversacion.findUnique({
        where: {
          conversacionId_usuarioId: {
            conversacionId: conv.id,
            usuarioId,
          },
        },
      });

      const noLeidos = await prisma.mensaje.count({
        where: {
          conversacionId: conv.id,
          createdAt: participante?.ultimoLeido
            ? { gt: participante.ultimoLeido }
            : undefined,
          remitenteId: { not: usuarioId },
        },
      });

      return {
        ...conv,
        noLeidos,
      };
    })
  );

  return result;
};

// Obtener mensajes de una conversación
export const getMensajes = async (
  conversacionId: string,
  usuarioId: string,
  institucionId: string,
  limit = 50,
  cursor?: string
) => {
  // Verificar participación
  const participante = await prisma.participanteConversacion.findUnique({
    where: {
      conversacionId_usuarioId: {
        conversacionId,
        usuarioId,
      },
    },
  });

  if (!participante) {
    throw new Error('No eres participante de esta conversación');
  }

  const conversacion = await prisma.conversacion.findFirst({
    where: { id: conversacionId, institucionId },
    include: {
      participantes: {
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
        },
      },
    },
  });

  if (!conversacion) {
    throw new Error('Conversación no encontrada');
  }

  const where: any = { conversacionId };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const mensajes = await prisma.mensaje.findMany({
    where,
    include: {
      remitente: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
      archivos: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return {
    conversacion,
    mensajes: mensajes.reverse(),
    hasMore: mensajes.length === limit,
  };
};

// Obtener mensajes nuevos (para polling)
export const getMensajesNuevos = async (
  conversacionId: string,
  usuarioId: string,
  institucionId: string,
  desde: Date
) => {
  // Verificar participación
  const participante = await prisma.participanteConversacion.findUnique({
    where: {
      conversacionId_usuarioId: {
        conversacionId,
        usuarioId,
      },
    },
  });

  if (!participante) {
    throw new Error('No eres participante de esta conversación');
  }

  const conversacion = await prisma.conversacion.findFirst({
    where: { id: conversacionId, institucionId },
  });

  if (!conversacion) {
    throw new Error('Conversación no encontrada');
  }

  return prisma.mensaje.findMany({
    where: {
      conversacionId,
      createdAt: { gt: desde },
    },
    include: {
      remitente: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
      archivos: true,
    },
    orderBy: { createdAt: 'asc' },
  });
};

// Enviar mensaje
export const enviarMensaje = async (
  conversacionId: string,
  input: EnviarMensajeInput,
  remitenteId: string,
  institucionId: string
) => {
  // Verificar participación
  const participante = await prisma.participanteConversacion.findUnique({
    where: {
      conversacionId_usuarioId: {
        conversacionId,
        usuarioId: remitenteId,
      },
    },
  });

  if (!participante) {
    throw new Error('No eres participante de esta conversación');
  }

  const conversacion = await prisma.conversacion.findFirst({
    where: { id: conversacionId, institucionId },
  });

  if (!conversacion) {
    throw new Error('Conversación no encontrada');
  }

  // Crear mensaje
  const mensaje = await prisma.mensaje.create({
    data: {
      contenido: sanitizeText(input.contenido),
      conversacionId,
      remitenteId,
      archivos: input.archivos
        ? {
            create: input.archivos.map((archivo) => ({
              nombre: archivo.nombre,
              url: archivo.url,
              tipo: archivo.tipo,
            })),
          }
        : undefined,
    },
    include: {
      remitente: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } },
      archivos: true,
    },
  });

  // Actualizar timestamp de conversación
  await prisma.conversacion.update({
    where: { id: conversacionId },
    data: { updatedAt: new Date() },
  });

  return mensaje;
};

// Marcar conversación como leída
export const marcarComoLeida = async (
  conversacionId: string,
  usuarioId: string,
  institucionId: string
) => {
  const conversacion = await prisma.conversacion.findFirst({
    where: { id: conversacionId, institucionId },
  });

  if (!conversacion) {
    throw new Error('Conversación no encontrada');
  }

  return prisma.participanteConversacion.update({
    where: {
      conversacionId_usuarioId: {
        conversacionId,
        usuarioId,
      },
    },
    data: {
      ultimoLeido: new Date(),
    },
  });
};

// Obtener conteo de mensajes no leídos
export const getNoLeidos = async (usuarioId: string, institucionId: string) => {
  const participaciones = await prisma.participanteConversacion.findMany({
    where: {
      usuarioId,
      conversacion: { institucionId },
    },
    include: {
      conversacion: true,
    },
  });

  let total = 0;

  for (const participacion of participaciones) {
    const count = await prisma.mensaje.count({
      where: {
        conversacionId: participacion.conversacionId,
        createdAt: participacion.ultimoLeido
          ? { gt: participacion.ultimoLeido }
          : undefined,
        remitenteId: { not: usuarioId },
      },
    });
    total += count;
  }

  return { noLeidos: total };
};

// Obtener usuarios disponibles para chat
export const getUsuariosDisponibles = async (
  usuarioId: string,
  role: string,
  institucionId: string
) => {
  // Obtener usuarios de la misma institución (excluyendo al usuario actual)
  const usuarios = await prisma.user.findMany({
    where: {
      institucionId,
      id: { not: usuarioId },
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      role: true,
      fotoUrl: true,
    },
    orderBy: [{ role: 'asc' }, { apellido: 'asc' }],
  });

  return usuarios;
};
