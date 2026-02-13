import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { isPrivateKey, extractInstitucionIdFromKey, getSignedFileUrl } from '../services/s3.service';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/files/plataforma-escolar/{institucionId?}/{folder}/{filename}
router.get('{*key}', async (req: Request, res: Response) => {
  const rawKey = req.params.key;
  const key = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;

  if (!key || !key.startsWith('plataforma-escolar/')) {
    return res.status(400).json({ message: 'Key de archivo invalida' });
  }

  if (!isPrivateKey(key)) {
    return res.status(400).json({ message: 'Este archivo es publico, acceda directamente' });
  }

  // Autorizacion: ADMIN accede a todo, otros solo a su institucion
  const userRole = req.user?.rol;
  if (userRole !== 'ADMIN') {
    const fileInstitucionId = extractInstitucionIdFromKey(key);
    const userInstitucionId = req.user?.institucionId;

    if (fileInstitucionId && fileInstitucionId !== userInstitucionId) {
      return res.status(403).json({ message: 'No tiene acceso a este archivo' });
    }
  }

  const signedUrl = await getSignedFileUrl(key, 900);
  return res.json({ url: signedUrl, expiresIn: 900 });
});

export default router;
