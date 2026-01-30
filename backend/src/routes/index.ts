import { Router } from 'express';
import authRoutes from './auth.routes';
import institucionRoutes from './institucion.routes';
import userRoutes from './user.routes';
import cycleRoutes from './cycle.routes';
import levelRoutes from './level.routes';
import subjectRoutes from './subject.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/instituciones', institucionRoutes);
router.use('/users', userRoutes);
router.use('/cycles', cycleRoutes);
router.use('/levels', levelRoutes);
router.use('/subjects', subjectRoutes);

export default router;
