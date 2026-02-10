import { Request, Response } from 'express';
import { generarBoletin, BoletinConfig, DatosEstudiante, Calificacion, Grado } from '../services/boletin.service';
import prisma from '../config/db';
import { sanitizeErrorMessage } from '../utils/security';

/**
 * Genera y descarga un boletín de calificaciones vacío (plantilla)
 * GET /api/v1/boletines/plantilla/:grado
 */
export const getBoletinPlantillaHandler = async (req: Request, res: Response) => {
  try {
    const { grado } = req.params as { grado: Grado };

    const validGrados: Grado[] = ['1er', '2do', '3er', '4to', '5to', '6to'];
    if (!validGrados.includes(grado)) {
      return res.status(400).json({ message: 'Grado inválido. Use: 1er, 2do, 3er, 4to, 5to, 6to' });
    }

    const config: BoletinConfig = {
      grado,
      colorNota: 'FFFFCC',
      colorHeader: 'D5E4AE',
      colorSubheader: 'EAF2D8',
    };

    const buffer = await generarBoletin(config);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=boletin_${grado}_plantilla.docx`);
    return res.send(buffer);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generando boletín plantilla');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

/**
 * Genera un boletín de calificaciones para un estudiante específico
 * GET /api/v1/boletines/estudiante/:estudianteId
 */
export const getBoletinEstudianteHandler = async (req: Request, res: Response) => {
  try {
    const estudianteId = Array.isArray(req.params.estudianteId)
      ? req.params.estudianteId[0]
      : req.params.estudianteId;
    const cicloLectivoId = Array.isArray(req.query.cicloId)
      ? req.query.cicloId[0] as string
      : req.query.cicloId as string | undefined;

    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Obtener datos del estudiante con institución e inscripciones
    const estudiante = await prisma.user.findFirst({
      where: {
        id: estudianteId,
        institucionId: req.resolvedInstitucionId,
        role: 'ESTUDIANTE',
      },
      include: {
        institucion: true,
        inscripciones: {
          include: {
            clase: {
              include: {
                nivel: true,
                materia: true,
              },
            },
          },
          orderBy: { fecha: 'desc' },
          take: 1,
        },
      },
    });

    if (!estudiante) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const inscripcion = estudiante.inscripciones[0];
    const nivel = inscripcion?.clase?.nivel;

    // Obtener calificaciones del estudiante con ciclo lectivo y clase/materia
    const calificacionesDB = await prisma.calificacion.findMany({
      where: {
        estudianteId,
        ...(cicloLectivoId && { cicloLectivoId }),
      },
      include: {
        cicloLectivo: true,
        clase: {
          include: {
            materia: true,
          },
        },
      },
      orderBy: {
        clase: {
          materia: { nombre: 'asc' }
        }
      },
    });

    // Preparar datos del estudiante para el boletín
    const datosEstudiante: DatosEstudiante = {
      nombre: `${estudiante.nombre} ${estudiante.apellido}`,
      seccion: inscripcion?.clase?.materia?.nombre || '',
      numeroOrden: inscripcion?.id?.slice(-4) || '',
      añoEscolarInicio: calificacionesDB[0]?.cicloLectivo?.fechaInicio?.getFullYear()?.toString() || new Date().getFullYear().toString(),
      añoEscolarFin: calificacionesDB[0]?.cicloLectivo?.fechaFin?.getFullYear()?.toString() || (new Date().getFullYear() + 1).toString(),
      centroEducativo: estudiante.institucion?.nombre || '',
      codigoCentro: estudiante.institucion?.codigoCentro || '',
      tanda: inscripcion?.clase?.tanda || 'MATUTINA',
      provincia: estudiante.institucion?.provincia || '',
      municipio: estudiante.institucion?.municipio || '',
    };

    // Mapear grado basado en gradoNumero del nivel (preferido) o nombre (fallback)
    const gradoMap: Record<string, Grado> = {
      '1': '1er',
      '2': '2do',
      '3': '3er',
      '4': '4to',
      '5': '5to',
      '6': '6to',
    };
    // Usar gradoNumero si está definido, sino fallback a regex del nombre
    // Nota: gradoNumero se agregó al schema, ejecutar prisma generate después de migración
    const nivelNumero = (nivel as { gradoNumero?: number } | undefined)?.gradoNumero?.toString() ||
      nivel?.nombre?.match(/(\d)/)?.[1] || '1';
    const grado = gradoMap[nivelNumero] || '1er';

    // Transformar calificaciones al formato del boletín
    // TODO: Implementar mapeo completo de calificaciones por competencia
    const calificaciones: Calificacion[] = [];

    const config: BoletinConfig = {
      grado,
      colorNota: 'FFFFCC',
      colorHeader: 'D5E4AE',
      colorSubheader: 'EAF2D8',
    };

    const buffer = await generarBoletin(config, datosEstudiante, calificaciones);

    const nombreArchivo = `boletin_${estudiante.nombre}_${estudiante.apellido}_${grado}.docx`
      .replace(/\s+/g, '_')
      .toLowerCase();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
    return res.send(buffer);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generando boletín estudiante');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

/**
 * Genera boletines para todos los estudiantes de una clase
 * GET /api/v1/boletines/clase/:claseId
 */
export const getBoletinesClaseHandler = async (req: Request, res: Response) => {
  try {
    const claseId = Array.isArray(req.params.claseId)
      ? req.params.claseId[0]
      : req.params.claseId;

    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Verificar que la clase pertenece a la institución
    const clase = await prisma.clase.findFirst({
      where: {
        id: claseId,
        institucionId: req.resolvedInstitucionId,
      },
      include: {
        nivel: true,
        materia: true,
        inscripciones: {
          include: {
            estudiante: true,
          },
        },
      },
    });

    if (!clase) {
      return res.status(404).json({ message: 'Clase no encontrada' });
    }

    // Por ahora, retornar información de la clase
    // TODO: Implementar generación masiva con ZIP
    return res.status(200).json({
      message: 'Funcionalidad de boletines masivos en desarrollo',
      clase: {
        id: clase.id,
        nombre: clase.materia?.nombre || clase.codigo,
        nivel: clase.nivel?.nombre,
        totalEstudiantes: clase.inscripciones.length,
      },
    });
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generando boletines clase');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

/**
 * Genera un boletín con datos personalizados (POST)
 * POST /api/v1/boletines/generar
 */
export const generarBoletinPersonalizadoHandler = async (req: Request, res: Response) => {
  try {
    const { config, datosEstudiante, calificaciones } = req.body as {
      config?: BoletinConfig;
      datosEstudiante?: DatosEstudiante;
      calificaciones?: Calificacion[];
    };

    const buffer = await generarBoletin(
      config || {},
      datosEstudiante,
      calificaciones
    );

    const nombreArchivo = datosEstudiante?.nombre
      ? `boletin_${datosEstudiante.nombre.replace(/\s+/g, '_')}.docx`
      : 'boletin.docx';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
    return res.send(buffer);
  } catch (error: any) {
    req.log.error({ err: error }, 'Error generando boletín personalizado');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
