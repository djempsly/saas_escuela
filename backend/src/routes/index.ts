import { Router } from 'express';
import authRoutes from './auth.routes';
import institucionRoutes from './institucion.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/instituciones', institucionRoutes);
router.use('/users', userRoutes);

export default router;