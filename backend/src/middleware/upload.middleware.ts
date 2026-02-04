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

// Directorio para fotos de perfil
const fotosDir = path.join(uploadDir, 'fotos');

[fotosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'foto') {
      cb(null, fotosDir);
    } else if (file.fieldname === 'logo' || file.fieldname === 'fondoLogin' || file.fieldname === 'favicon' || file.fieldname === 'hero' || file.fieldname === 'loginLogo') {
      cb(null, logosDir); // Guardamos assets de institución en logos
    } else if (file.fieldname === 'imagen' || file.fieldname === 'imagenes' || file.mimetype.startsWith('image/')) {
      cb(null, imagesDir);
    } else if (file.fieldname === 'video' || file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
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

// Middleware para subir logo de institución
export const uploadLogo = upload.single('logo');

// Middleware para subir logo y fondo de login de institución
export const uploadInstitucionMedia = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'fondoLogin', maxCount: 1 },
]);

// Función helper para obtener URL del archivo
export const getFileUrl = (file: Express.Multer.File): string => {
  const subdir = path.basename(path.dirname(file.path));
  return `/uploads/${subdir}/${file.filename}`;
};

// Middleware para subir foto de perfil
export const uploadFoto = upload.single('foto');

// Middleware para subir favicon de institución
export const uploadFavicon = upload.single('favicon');

// Middleware para subir hero image de institución
export const uploadHero = upload.single('hero');

// Middleware para subir login logo de institución
export const uploadLoginLogo = upload.single('loginLogo');

// Función para eliminar archivo
export const deleteFile = (filePath: string): void => {
  const fullPath = path.join(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};
