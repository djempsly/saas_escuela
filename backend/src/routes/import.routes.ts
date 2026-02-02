import { Router } from 'express';
import multer from 'multer';
import { importEstudiantesHandler, downloadPlantillaHandler } from '../controllers/import.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { resolveTenantMiddleware, requireTenantMiddleware } from '../middleware/tenant.middleware';
import { ROLES } from '../utils/zod.schemas';

const router = Router();

// Configure multer for Excel file uploads (memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  },
});

// Apply auth middlewares
router.use(
  authMiddleware,
  roleMiddleware([ROLES.ADMIN, ROLES.DIRECTOR, ROLES.SECRETARIA]),
  resolveTenantMiddleware,
  requireTenantMiddleware
);

// Import students from Excel
router.post('/estudiantes', upload.single('file'), importEstudiantesHandler);

// Download Excel template
router.get('/estudiantes/plantilla', downloadPlantillaHandler);

export default router;
