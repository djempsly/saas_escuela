import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { logger } from '../config/logger';

function getConfig() {
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || '',
    cloudfrontUrl: process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL || '',
  };
}

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const { region } = getConfig();
    _s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return _s3Client;
}

const BASE_PREFIX = 'plataforma-escolar';

type S3Folder =
  | 'logos'
  | 'favicons'
  | 'heroes'
  | 'login-logos'
  | 'login-bgs'
  | 'fotos'
  | 'videos'
  | 'perfiles'
  | 'imagenes'
  | 'recursos'
  | 'exports';

const ALL_FOLDERS: S3Folder[] = [
  'logos', 'favicons', 'heroes', 'login-logos', 'login-bgs',
  'fotos', 'videos', 'perfiles', 'imagenes', 'recursos', 'exports',
];

const PRIVATE_FOLDERS = new Set<S3Folder>(['perfiles', 'recursos']);

/**
 * Sube un archivo a S3 y retorna la URL.
 * Archivos privados retornan ruta al proxy de signed URLs.
 * Archivos publicos retornan URL directa (CloudFront o S3).
 */
export async function uploadToS3(
  file: Express.Multer.File,
  folder: S3Folder,
  institucionId?: string | null,
): Promise<string> {
  const { region, bucket, cloudfrontUrl } = getConfig();
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${file.fieldname}-${Date.now()}-${uniqueSuffix}${ext}`;

  const keyParts = [BASE_PREFIX];
  if (institucionId) {
    keyParts.push(institucionId);
  }
  keyParts.push(folder, filename);
  const key = keyParts.join('/');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await getS3Client().send(command);

  // Archivos privados: retornar ruta al proxy de signed URLs
  if (PRIVATE_FOLDERS.has(folder)) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return `${backendUrl}/api/v1/files/${key}`;
  }

  // Archivos publicos: retornar URL directa
  if (cloudfrontUrl) {
    return `${cloudfrontUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Sube un Buffer a S3 y retorna la URL publica/proxy.
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  filename: string,
  folder: S3Folder,
  institucionId?: string,
): Promise<string> {
  const { region, bucket, cloudfrontUrl } = getConfig();
  const keyParts = [BASE_PREFIX];
  if (institucionId) keyParts.push(institucionId);
  keyParts.push(folder, filename);
  const key = keyParts.join('/');

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentDisposition: `attachment; filename="${filename}"`,
    }),
  );

  if (PRIVATE_FOLDERS.has(folder)) {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return `${backendUrl}/api/v1/files/${key}`;
  }

  if (cloudfrontUrl) {
    return `${cloudfrontUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Elimina un archivo de S3 dado su URL (publica, CloudFront, o proxy).
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  const key = extractKeyFromUrl(fileUrl);
  if (!key) return;

  const { bucket } = getConfig();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  try {
    await getS3Client().send(command);
  } catch (error) {
    logger.error({ err: error }, 'Error deleting from S3');
  }
}

/**
 * Verifica la conexión a S3 haciendo HeadBucket.
 * Lanza error si el bucket no existe o no hay credenciales.
 */
export async function checkS3Connection(): Promise<void> {
  const { bucket } = getConfig();
  if (!bucket) {
    throw new Error('AWS_BUCKET_NAME no configurado');
  }
  await getS3Client().send(new HeadBucketCommand({ Bucket: bucket }));
}

/**
 * Detecta si una URL pertenece a S3, CloudFront, o es una URL de proxy privada.
 */
export function isS3Url(url: string): boolean {
  if (!url) return false;
  const { cloudfrontUrl } = getConfig();
  if (cloudfrontUrl && url.startsWith(cloudfrontUrl)) return true;
  if (url.includes('.amazonaws.com/')) return true;
  if (url.includes('/api/v1/files/plataforma-escolar/')) return true;
  return false;
}

/**
 * Genera una URL firmada temporal para acceder a un archivo privado en S3.
 */
export async function getSignedFileUrl(key: string, expiresIn = 900): Promise<string> {
  const { bucket } = getConfig();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return awsGetSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Determina si un S3 key corresponde a una carpeta privada.
 */
export function isPrivateKey(key: string): boolean {
  // key: plataforma-escolar/{institucionId?}/{folder}/{filename}
  const parts = key.split('/');
  // Con institucionId: [prefix, instId, folder, filename] → parts[2]
  // Sin institucionId: [prefix, folder, filename] → parts[1]
  const folder = parts.length >= 4 ? parts[2] : parts[1];
  return PRIVATE_FOLDERS.has(folder as S3Folder);
}

/**
 * Extrae el institucionId del S3 key, si existe.
 * key: plataforma-escolar/{institucionId}/{folder}/{filename}
 */
export function extractInstitucionIdFromKey(key: string): string | null {
  const parts = key.split('/');
  if (parts.length >= 4) {
    const possibleId = parts[1];
    if (!ALL_FOLDERS.includes(possibleId as S3Folder)) {
      return possibleId;
    }
  }
  return null;
}

/**
 * Extrae el S3 key de una URL (CloudFront, S3 directa, o proxy).
 */
export function extractKeyFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;

  // URL de proxy: .../api/v1/files/plataforma-escolar/...
  const proxyMatch = fileUrl.match(/\/api\/v1\/files\/(plataforma-escolar\/.+)$/);
  if (proxyMatch) return proxyMatch[1];

  // URL de CloudFront
  const { cloudfrontUrl } = getConfig();
  if (cloudfrontUrl && fileUrl.startsWith(cloudfrontUrl)) {
    return fileUrl.replace(cloudfrontUrl.replace(/\/$/, '') + '/', '');
  }

  // URL directa de S3
  const s3Match = fileUrl.match(/\.amazonaws\.com\/(.+)$/);
  if (s3Match) return s3Match[1];

  return null;
}
