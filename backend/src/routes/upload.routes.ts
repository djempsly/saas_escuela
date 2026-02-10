import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { resolveTenantMiddleware } from '../middleware/tenant.middleware';
import { upload } from '../middleware/upload.middleware';
import { uploadToS3 } from '../services/s3.service';

const router = Router();

router.use(authMiddleware, resolveTenantMiddleware);

router.post(
  '/file',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ message: 'No se envió ningún archivo' });
        return;
      }

      const institucionId = (req as any).resolvedInstitucionId || null;
      const url = await uploadToS3(req.file, 'recursos', institucionId);

      const mimetype = req.file.mimetype;
      let tipo = 'ARCHIVO';
      if (mimetype.startsWith('image/')) {
        tipo = 'IMAGEN';
      }

      res.json({
        url,
        nombre: req.file.originalname,
        tipo,
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error uploading file');
      res.status(500).json({ message: 'Error al subir el archivo' });
    }
  }
);

export default router;
