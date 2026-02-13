import { Router } from 'express';
import { getAvisoActivoHandler } from '../controllers/mantenimiento.controller';

const router = Router();

// GET /api/v1/mantenimiento — public, no auth
router.get('/', getAvisoActivoHandler);

export default router;
