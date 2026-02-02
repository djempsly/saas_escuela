import { Request, Response } from 'express';
import { generarBoletin, BoletinConfig, DatosEstudiante, Calificacion, Grado } from '../services/boletin.service';
import prisma from '../config/db';
import { sanitizeErrorMessage } from '../utils/security';
import archiver from 'archiver';

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
    console.error('Error generando boletín plantilla:', error);
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

    if (!req.user?.institucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Obtener datos del estudiante con institución e inscripciones
    const estudiante = await prisma.user.findFirst({
      where: {
        id: estudianteId,
        institucionId: req.user.institucionId,
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
                cicloLectivo: true,
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

    // Mapear tanda a texto legible
    const tandaMap: Record<string, string> = {
      'MATUTINA': 'Matutina',
      'VESPERTINA': 'Vespertina',
      'NOCTURNA': 'Nocturna',
      'SABATINA': 'Sabatina',
      'EXTENDIDA': 'Extendida',
    };

    // Preparar datos del estudiante para el boletín
    const datosEstudiante: DatosEstudiante = {
      nombre: `${estudiante.nombre} ${estudiante.apellido}`,
      seccion: inscripcion?.clase?.seccion || 'A',
      numeroOrden: inscripcion?.id?.slice(-4) || '',
      añoEscolarInicio: inscripcion?.clase?.cicloLectivo?.fechaInicio?.getFullYear()?.toString() || calificacionesDB[0]?.cicloLectivo?.fechaInicio?.getFullYear()?.toString() || new Date().getFullYear().toString(),
      añoEscolarFin: inscripcion?.clase?.cicloLectivo?.fechaFin?.getFullYear()?.toString() || calificacionesDB[0]?.cicloLectivo?.fechaFin?.getFullYear()?.toString() || (new Date().getFullYear() + 1).toString(),
      centroEducativo: estudiante.institucion?.nombre || '',
      codigoCentro: estudiante.institucion?.codigoCentro || '',
      tanda: tandaMap[inscripcion?.clase?.tanda || 'MATUTINA'] || 'Matutina',
      provincia: estudiante.institucion?.provincia || '',
      municipio: estudiante.institucion?.municipio || '',
      distritoEducativo: estudiante.institucion?.distritoEducativo || '',
      regionalEducacion: estudiante.institucion?.regionalEducacion || '',
    };

    // Mapear grado basado en el nombre del nivel
    const gradoMap: Record<string, Grado> = {
      '1': '1er',
      '2': '2do',
      '3': '3er',
      '4': '4to',
      '5': '5to',
      '6': '6to',
    };
    // Extraer el número del grado del nombre del nivel (ej: "1ro Secundaria" -> "1")
    const nivelNumero = nivel?.nombre?.match(/(\d)/)?.[1] || '1';
    const grado = gradoMap[nivelNumero] || '1er';

    // Transformar calificaciones al formato del boletín
    // Mapea las calificaciones por materia a las áreas curriculares
    const areasMap: Record<string, string[]> = {
      'Lengua Española': ['Lengua Española', 'Español', 'Lengua'],
      'Lenguas Extranjeras': ['Inglés', 'Francés', 'Lenguas Extranjeras', 'Idiomas'],
      'Matemática': ['Matemática', 'Matemáticas', 'Math'],
      'Ciencias Sociales': ['Ciencias Sociales', 'Sociales', 'Historia', 'Geografía'],
      'Ciencias de la Naturaleza': ['Ciencias Naturales', 'Ciencias de la Naturaleza', 'Biología', 'Química', 'Física'],
      'Formación Integral Humana y Religiosa': ['Formación Humana', 'Religión', 'FIHR', 'Ética', 'Valores'],
      'Educación Física': ['Educación Física', 'Ed. Física', 'Deportes'],
      'Educación Artística': ['Educación Artística', 'Arte', 'Música', 'Artes'],
    };

    const calificaciones: Calificacion[] = [];

    // Agrupar calificaciones por área curricular
    for (const [area, materias] of Object.entries(areasMap)) {
      const califArea = calificacionesDB.find(c =>
        materias.some(m => c.clase?.materia?.nombre?.toLowerCase().includes(m.toLowerCase()))
      );

      if (califArea) {
        // Usar las calificaciones directamente como promedio (simplificado)
        // En un sistema completo, cada competencia tendría su propia evaluación
        calificaciones.push({
          area,
          comunicativa: {
            p1: califArea.p1 || 0,
            p2: califArea.p2 || 0,
            p3: califArea.p3 || 0,
            p4: califArea.p4 || 0
          },
          pensamientoLogico: {
            p1: califArea.p1 || 0,
            p2: califArea.p2 || 0,
            p3: califArea.p3 || 0,
            p4: califArea.p4 || 0
          },
          cientifica: {
            p1: califArea.p1 || 0,
            p2: califArea.p2 || 0,
            p3: califArea.p3 || 0,
            p4: califArea.p4 || 0
          },
          etica: {
            p1: califArea.p1 || 0,
            p2: califArea.p2 || 0,
            p3: califArea.p3 || 0,
            p4: califArea.p4 || 0
          },
          promedios: {
            pc1: califArea.p1 || 0,
            pc2: califArea.p2 || 0,
            pc3: califArea.p3 || 0,
            pc4: califArea.p4 || 0,
          },
          calFinal: califArea.promedioFinal || 0,
          situacion: {
            aprobado: califArea.situacion === 'APROBADO',
            reprobado: califArea.situacion === 'REPROBADO',
          },
        });
      }
    }

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
    console.error('Error generando boletín estudiante:', error);
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
    const cicloLectivoId = req.query.cicloId as string | undefined;

    if (!req.user?.institucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Verificar que la clase pertenece a la institución
    const clase = await prisma.clase.findFirst({
      where: {
        id: claseId,
        institucionId: req.user.institucionId,
      },
      include: {
        nivel: true,
        materia: true,
        cicloLectivo: true,
        institucion: true,
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

    if (clase.inscripciones.length === 0) {
      return res.status(400).json({ message: 'No hay estudiantes inscritos en esta clase' });
    }

    // Mapear grado
    const gradoMap: Record<string, Grado> = {
      '1': '1er', '2': '2do', '3': '3er', '4': '4to', '5': '5to', '6': '6to',
    };
    const nivelNumero = clase.nivel?.nombre?.match(/(\d)/)?.[1] || '1';
    const grado = gradoMap[nivelNumero] || '1er';

    // Mapear tanda
    const tandaMap: Record<string, string> = {
      'MATUTINA': 'Matutina', 'VESPERTINA': 'Vespertina', 'NOCTURNA': 'Nocturna',
      'SABATINA': 'Sabatina', 'EXTENDIDA': 'Extendida',
    };

    // Áreas curriculares para mapeo
    const areasMap: Record<string, string[]> = {
      'Lengua Española': ['Lengua Española', 'Español', 'Lengua'],
      'Lenguas Extranjeras': ['Inglés', 'Francés', 'Lenguas Extranjeras'],
      'Matemática': ['Matemática', 'Matemáticas'],
      'Ciencias Sociales': ['Ciencias Sociales', 'Sociales', 'Historia'],
      'Ciencias de la Naturaleza': ['Ciencias Naturales', 'Ciencias de la Naturaleza', 'Biología'],
      'Formación Integral Humana y Religiosa': ['Formación Humana', 'Religión', 'FIHR'],
      'Educación Física': ['Educación Física', 'Deportes'],
      'Educación Artística': ['Educación Artística', 'Arte', 'Música'],
    };

    const config: BoletinConfig = {
      grado,
      colorNota: 'FFFFCC',
      colorHeader: 'D5E4AE',
      colorSubheader: 'EAF2D8',
    };

    // Crear archivo ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=boletines_${clase.nivel?.nombre || 'clase'}_${clase.materia?.nombre || clase.codigo}.zip`);

    archive.pipe(res);

    // Generar boletín para cada estudiante
    for (const inscripcion of clase.inscripciones) {
      const estudiante = inscripcion.estudiante;

      // Obtener calificaciones del estudiante
      const calificacionesDB = await prisma.calificacion.findMany({
        where: {
          estudianteId: estudiante.id,
          ...(cicloLectivoId && { cicloLectivoId }),
        },
        include: {
          cicloLectivo: true,
          clase: { include: { materia: true } },
        },
      });

      // Preparar datos del estudiante
      const datosEstudiante: DatosEstudiante = {
        nombre: `${estudiante.nombre} ${estudiante.apellido}`,
        seccion: clase.seccion || 'A',
        numeroOrden: inscripcion.id.slice(-4),
        añoEscolarInicio: clase.cicloLectivo?.fechaInicio?.getFullYear()?.toString() || new Date().getFullYear().toString(),
        añoEscolarFin: clase.cicloLectivo?.fechaFin?.getFullYear()?.toString() || (new Date().getFullYear() + 1).toString(),
        centroEducativo: clase.institucion?.nombre || '',
        codigoCentro: clase.institucion?.codigoCentro || '',
        tanda: tandaMap[clase.tanda || 'MATUTINA'] || 'Matutina',
        provincia: clase.institucion?.provincia || '',
        municipio: clase.institucion?.municipio || '',
        distritoEducativo: clase.institucion?.distritoEducativo || '',
        regionalEducacion: clase.institucion?.regionalEducacion || '',
      };

      // Mapear calificaciones
      const calificaciones: Calificacion[] = [];
      for (const [area, materias] of Object.entries(areasMap)) {
        const califArea = calificacionesDB.find(c =>
          materias.some(m => c.clase?.materia?.nombre?.toLowerCase().includes(m.toLowerCase()))
        );
        if (califArea) {
          calificaciones.push({
            area,
            comunicativa: { p1: califArea.p1 || 0, p2: califArea.p2 || 0, p3: califArea.p3 || 0, p4: califArea.p4 || 0 },
            pensamientoLogico: { p1: califArea.p1 || 0, p2: califArea.p2 || 0, p3: califArea.p3 || 0, p4: califArea.p4 || 0 },
            cientifica: { p1: califArea.p1 || 0, p2: califArea.p2 || 0, p3: califArea.p3 || 0, p4: califArea.p4 || 0 },
            etica: { p1: califArea.p1 || 0, p2: califArea.p2 || 0, p3: califArea.p3 || 0, p4: califArea.p4 || 0 },
            promedios: { pc1: califArea.p1 || 0, pc2: califArea.p2 || 0, pc3: califArea.p3 || 0, pc4: califArea.p4 || 0 },
            calFinal: califArea.promedioFinal || 0,
            situacion: { aprobado: califArea.situacion === 'APROBADO', reprobado: califArea.situacion === 'REPROBADO' },
          });
        }
      }

      // Generar boletín
      const buffer = await generarBoletin(config, datosEstudiante, calificaciones);

      // Agregar al ZIP
      const nombreArchivo = `boletin_${estudiante.apellido}_${estudiante.nombre}.docx`
        .replace(/\s+/g, '_')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      archive.append(buffer, { name: nombreArchivo });
    }

    await archive.finalize();
  } catch (error: any) {
    console.error('Error generando boletines clase:', error);
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
    console.error('Error generando boletín personalizado:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
