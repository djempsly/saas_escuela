import { Router } from 'express';
import {
  crearCobroHandler,
  crearCobrosMasivosHandler,
  getCobrosHandler,
  getCobrosByEstudianteHandler,
  getCobrosPendientesHandler,
  registrarPagoHandler,
  getCobroByIdHandler,
  getReportePagosHandler,
  getEstadisticasHandler,
  getConceptosCobroHandler,
  getMetodosPagoHandler,
} from '../controllers/cobro.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Middleware común para todas las rutas
router.use(authMiddleware, resolveTenantMiddleware, requireTenantMiddleware);

// Rutas públicas (para obtener enums)
router.get('/conceptos', getConceptosCobroHandler);
router.get('/metodos-pago', getMetodosPagoHandler);

// Rutas para estudiantes (ver sus propios cobros)
router.get('/mis-cobros', roleMiddleware([ROLES.ESTUDIANTE]), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  req.params.id = req.user.usuarioId.toString();
  return getCobrosByEstudianteHandler(req, res);
});

// Rutas administrativas (DIRECTOR, SECRETARIA, COORDINADOR_ACADEMICO)
router.use(roleMiddleware([ROLES.DIRECTOR, ROLES.SECRETARIA, ROLES.COORDINADOR_ACADEMICO, ROLES.BIBLIOTECARIO]));

// Listar todos los cobros
router.get('/', getCobrosHandler);

// Obtener cobros pendientes
router.get('/pendientes', getCobrosPendientesHandler);

// Obtener reporte de pagos (solo DIRECTOR)
router.get('/reporte', roleMiddleware([ROLES.DIRECTOR]), getReportePagosHandler);

// Obtener estadísticas (solo DIRECTOR)
router.get('/estadisticas', roleMiddleware([ROLES.DIRECTOR]), getEstadisticasHandler);

// Obtener cobros de un estudiante específico
router.get('/estudiante/:id', getCobrosByEstudianteHandler);

// Obtener detalle de cobro
router.get('/:id', getCobroByIdHandler);

// Crear cobro individual
router.post('/', crearCobroHandler);

// Crear cobros masivos
router.post('/masivo', crearCobrosMasivosHandler);

// Registrar pago
router.post('/:id/pagar', registrarPagoHandler);

export default router;
