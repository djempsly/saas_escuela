import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Usar memoryStorage para que los archivos se suban a S3
const storage = multer.memoryStorage();

// Filtro de tipos de archivo
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideos = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  const allowedIcons = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];

  const imageFields = ['imagen', 'imagenes', 'logo', 'foto', 'fondoLogin', 'hero', 'loginLogo'];
  const iconFields = ['favicon'];

  if (iconFields.includes(file.fieldname)) {
    if (allowedIcons.includes(file.mimetype) || allowedImages.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten iconos (ICO, PNG, SVG)'));
    }
  } else if (imageFields.includes(file.fieldname)) {
    if (allowedImages.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'));
    }
  } else if (file.fieldname === 'video') {
    if (allowedVideos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten videos (MP4, WebM, OGG, MOV)'));
    }
  } else {
    cb(null, true);
  }
};

// Límites de tamaño
const limits = {
  fileSize: 50 * 1024 * 1024, // 50MB máximo
  files: 12, // máximo 12 archivos (10 imágenes + 2 videos)
};

// Configuración de multer
export const upload = multer({
  storage,
  fileFilter,
  limits,
});

// Middleware específico para actividades (múltiples imágenes + video opcional)
export const uploadActividad = upload.fields([
  { name: 'imagenes', maxCount: 10 },
  { name: 'video', maxCount: 1 },
]);

// Middleware para subir logo y fondo de login de institución
export const uploadInstitucionMedia = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'fondoLogin', maxCount: 1 },
]);

// Middleware para subir favicon de institución
export const uploadFavicon = upload.single('favicon');

// Middleware para subir hero image de institución
export const uploadHero = upload.single('hero');

// Middleware para subir login logo de institución
export const uploadLoginLogo = upload.single('loginLogo');

// Función para eliminar archivo local (fallback para archivos legacy en disco)
export const deleteFile = (filePath: string): void => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
