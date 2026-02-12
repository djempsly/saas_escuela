import { Request, Response, NextFunction } from 'express';

// Tipos MIME permitidos por magic bytes
const ALLOWED_TYPES = new Set([
  // Imagenes
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  // Documentos
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-excel', // xls
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
]);

// Tipos de texto que no tienen magic bytes — se validan solo por MIME declarado
const TEXT_TYPES = new Set(['text/csv', 'text/plain', 'image/svg+xml']);

export const validateFileType = async (req: Request, res: Response, next: NextFunction) => {
  const { fileTypeFromBuffer } = await import('file-type');

  // Recoger todos los archivos (single o fields)
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      for (const arr of Object.values(req.files)) {
        files.push(...arr);
      }
    }
  }

  if (files.length === 0) return next();

  for (const file of files) {
    const result = await fileTypeFromBuffer(file.buffer);

    if (result) {
      // file-type detecto el tipo real → verificar que este en la lista permitida
      if (!ALLOWED_TYPES.has(result.mime)) {
        return res.status(400).json({
          message: `Tipo de archivo no permitido: ${result.mime} (${file.originalname})`,
        });
      }
    } else {
      // file-type no pudo detectar (archivos de texto: CSV, SVG, etc.)
      // Permitir solo si el MIME declarado es de tipo texto/csv/svg
      if (!TEXT_TYPES.has(file.mimetype)) {
        return res.status(400).json({
          message: `No se pudo verificar el tipo del archivo: ${file.originalname}`,
        });
      }
    }
  }

  next();
};
