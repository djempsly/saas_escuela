import { Router } from 'express';
import { getDashboardStatsHandler } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Obtener estadisticas del dashboard segun rol del usuario
router.get('/stats', authMiddleware, getDashboardStatsHandler);

export default router;
