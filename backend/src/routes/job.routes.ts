import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { boletinQueue, excelQueue, notificacionesQueue } from '../queues';
import { QUEUE_NAMES } from '../config/bullmq';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

router.use(authMiddleware);

/**
 * GET /jobs/:id/status
 * Busca un job por ID en todas las colas y retorna su estado.
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  const jobId = req.params.id as string;

  const queues = [
    { queue: boletinQueue, name: QUEUE_NAMES.GENERAR_BOLETIN },
    { queue: excelQueue, name: QUEUE_NAMES.EXPORTAR_EXCEL },
    { queue: notificacionesQueue, name: QUEUE_NAMES.NOTIFICACIONES_MASIVAS },
  ];

  for (const { queue, name } of queues) {
    const job = await queue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      return res.json({
        id: job.id,
        queue: name,
        status: state,
        progress: job.progress,
        result: job.returnvalue,
        failedReason: job.failedReason || null,
      });
    }
  }

  return res.status(404).json({ message: 'Job no encontrado' });
});

/**
 * GET /jobs/admin/overview
 * Resumen de todas las colas (solo ADMIN/DIRECTOR).
 */
router.get(
  '/admin/overview',
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  async (_req: Request, res: Response) => {
    const [boletin, excel, notificaciones] = await Promise.all([
      boletinQueue.getJobCounts(),
      excelQueue.getJobCounts(),
      notificacionesQueue.getJobCounts(),
    ]);

    return res.json({
      [QUEUE_NAMES.GENERAR_BOLETIN]: boletin,
      [QUEUE_NAMES.EXPORTAR_EXCEL]: excel,
      [QUEUE_NAMES.NOTIFICACIONES_MASIVAS]: notificaciones,
    });
  },
);

export default router;
