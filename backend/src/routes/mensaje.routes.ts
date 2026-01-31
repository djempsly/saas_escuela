import { Router } from 'express';
import {
  crearConversacionHandler,
  getConversacionesHandler,
  getMensajesHandler,
  getMensajesNuevosHandler,
  enviarMensajeHandler,
  marcarComoLeidaHandler,
  getNoLeidosHandler,
  getUsuariosDisponiblesHandler,
} from '../controllers/mensaje.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';

const router = Router();

// Middleware común para todas las rutas
router.use(
  authMiddleware,
  resolveTenantMiddleware,
  requireTenantMiddleware
);

// Obtener usuarios disponibles para chat
router.get('/usuarios', getUsuariosDisponiblesHandler);

// Obtener conteo de mensajes no leídos
router.get('/no-leidos', getNoLeidosHandler);

// Listar conversaciones
router.get('/conversaciones', getConversacionesHandler);

// Crear nueva conversación
router.post('/conversaciones', crearConversacionHandler);

// Obtener mensajes de una conversación
router.get('/conversaciones/:id', getMensajesHandler);

// Obtener mensajes nuevos (para polling)
router.get('/conversaciones/:id/nuevos', getMensajesNuevosHandler);

// Enviar mensaje en una conversación
router.post('/conversaciones/:id/mensajes', enviarMensajeHandler);

// Marcar conversación como leída
router.put('/conversaciones/:id/leer', marcarComoLeidaHandler);

export default router;
