import { Router } from 'express';
import {
  getNotificacionesHandler,
  getNoLeidasHandler,
  marcarComoLeidaHandler,
  marcarTodasComoLeidasHandler,
} from '../controllers/notificacion.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Listar notificaciones
router.get('/', getNotificacionesHandler);

// Contar no leídas
router.get('/no-leidas', getNoLeidasHandler);

// Marcar todas como leídas (ANTES de /:id/leer para evitar conflicto)
router.put('/leer-todas', marcarTodasComoLeidasHandler);

// Marcar una como leída
router.put('/:id/leer', marcarComoLeidaHandler);

export default router;
