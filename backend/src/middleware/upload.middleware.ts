import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Crear directorio uploads si no existe
const uploadDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadDir, 'images');
const videosDir = path.join(uploadDir, 'videos');
const logosDir = path.join(uploadDir, 'logos');

[uploadDir, imagesDir, videosDir, logosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'imagen' || file.mimetype.startsWith('image/')) {
      cb(null, imagesDir);
    } else if (file.fieldname === 'video' || file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else if (file.fieldname === 'logo') {
      cb(null, logosDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// Filtro de tipos de archivo
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideos = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

  if (file.fieldname === 'imagen' || file.fieldname === 'logo') {
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
  files: 2, // máximo 2 archivos (imagen + video)
};

// Configuración de multer
export const upload = multer({
  storage,
  fileFilter,
  limits,
});

// Middleware específico para actividades (imagen + video opcional)
export const uploadActividad = upload.fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

// Middleware para subir logo de institución
export const uploadLogo = upload.single('logo');

// Función helper para obtener URL del archivo
export const getFileUrl = (file: Express.Multer.File): string => {
  return `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;
};

// Función para eliminar archivo
export const deleteFile = (filePath: string): void => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
