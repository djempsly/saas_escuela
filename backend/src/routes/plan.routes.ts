import { Router } from 'express';
import { getPlanesHandler } from '../controllers/suscripcion.controller';

const router = Router();

// Ruta pública — lista planes disponibles
router.get('/', getPlanesHandler);

export default router;
