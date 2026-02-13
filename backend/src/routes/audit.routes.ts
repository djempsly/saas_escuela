import { Router } from 'express';
import { getAuditLogsHandler } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR]),
  resolveTenantMiddleware,
);

router.get('/', getAuditLogsHandler);

export default router;
