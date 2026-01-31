import { Router } from 'express';
import authRoutes from './auth.routes';
import institucionRoutes from './institucion.routes';
import userRoutes from './user.routes';
import cycleRoutes from './cycle.routes';
import levelRoutes from './level.routes';
import subjectRoutes from './subject.routes';
import claseRoutes from './clase.routes';
import inscripcionRoutes from './inscripcion.routes';
import asistenciaRoutes from './asistencia.routes';
import calificacionRoutes from './calificacion.routes';
import actividadRoutes from './actividad.routes';
import tareaRoutes from './tarea.routes';
import eventoRoutes from './evento.routes';
import mensajeRoutes from './mensaje.routes';
import cobroRoutes from './cobro.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de administrador (Super Admin)
router.use('/admin', adminRoutes);

// Rutas de instituciones
router.use('/instituciones', institucionRoutes);

// Rutas de usuarios
router.use('/users', userRoutes);

// Rutas académicas
router.use('/cycles', cycleRoutes);
router.use('/levels', levelRoutes);
router.use('/subjects', subjectRoutes);
router.use('/clases', claseRoutes);
router.use('/inscripciones', inscripcionRoutes);
router.use('/asistencia', asistenciaRoutes);
router.use('/calificaciones', calificacionRoutes);

// Rutas de actividades (públicas + admin)
router.use('/actividades', actividadRoutes);

// Nuevas rutas de módulos
router.use('/tareas', tareaRoutes);
router.use('/eventos', eventoRoutes);
router.use('/mensajes', mensajeRoutes);
router.use('/cobros', cobroRoutes);

export default router;
