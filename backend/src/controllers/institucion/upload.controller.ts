import { Request, Response } from 'express';
import prisma from '../../config/db';
import { uploadToS3, deleteFromS3, isS3Url } from '../../services/s3.service';
import { sanitizeErrorMessage } from '../../utils/security';
import { getErrorMessage } from '../../utils/error-helpers';

// POST /api/v1/instituciones/:id/favicon - Subir favicon
export const uploadFaviconHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo de favicon' });
    }

    // Borrar favicon anterior de S3 si existe
    const existingFavicon = await prisma.institucion.findUnique({
      where: { id },
      select: { faviconUrl: true },
    });
    if (existingFavicon?.faviconUrl && isS3Url(existingFavicon.faviconUrl)) {
      await deleteFromS3(existingFavicon.faviconUrl);
    }

    const faviconUrl = await uploadToS3(req.file, 'favicons', id);

    const result = await prisma.institucion.update({
      where: { id },
      data: { faviconUrl },
      select: { id: true, faviconUrl: true },
    });

    return res.status(200).json(result);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error uploading favicon');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/instituciones/:id/hero - Subir imagen hero
export const uploadHeroHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó imagen hero' });
    }

    // Borrar hero anterior de S3 si existe
    const existingHero = await prisma.institucion.findUnique({
      where: { id },
      select: { heroImageUrl: true },
    });
    if (existingHero?.heroImageUrl && isS3Url(existingHero.heroImageUrl)) {
      await deleteFromS3(existingHero.heroImageUrl);
    }

    const heroImageUrl = await uploadToS3(req.file, 'heroes', id);

    const result = await prisma.institucion.update({
      where: { id },
      data: { heroImageUrl },
      select: { id: true, heroImageUrl: true },
    });

    return res.status(200).json(result);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error uploading hero image');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

// POST /api/v1/instituciones/:id/login-logo - Subir logo de login
export const uploadLoginLogoHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó logo de login' });
    }

    // Borrar login logo anterior de S3 si existe
    const existingLoginLogo = await prisma.institucion.findUnique({
      where: { id },
      select: { loginLogoUrl: true },
    });
    if (existingLoginLogo?.loginLogoUrl && isS3Url(existingLoginLogo.loginLogoUrl)) {
      await deleteFromS3(existingLoginLogo.loginLogoUrl);
    }

    const loginLogoUrl = await uploadToS3(req.file, 'login-logos', id);

    const result = await prisma.institucion.update({
      where: { id },
      data: { loginLogoUrl },
      select: { id: true, loginLogoUrl: true },
    });

    return res.status(200).json(result);
  } catch (error: unknown) {
    req.log.error({ err: error }, 'Error uploading login logo');
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
