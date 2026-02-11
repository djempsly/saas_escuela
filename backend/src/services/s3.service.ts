import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
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
  | 'recursos';

/**
 * Sube un archivo a S3 y retorna la URL pública.
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

  if (cloudfrontUrl) {
    return `${cloudfrontUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Elimina un archivo de S3 dado su URL pública.
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  if (!isS3Url(fileUrl)) return;

  const { bucket, cloudfrontUrl } = getConfig();
  let key: string | undefined;

  if (cloudfrontUrl && fileUrl.startsWith(cloudfrontUrl)) {
    key = fileUrl.replace(cloudfrontUrl.replace(/\/$/, '') + '/', '');
  } else {
    // Extraer key de URL de S3: https://bucket.s3.region.amazonaws.com/key
    const match = fileUrl.match(/\.amazonaws\.com\/(.+)$/);
    if (match) {
      key = match[1];
    }
  }

  if (!key) return;

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
 * Detecta si una URL pertenece a S3 o CloudFront.
 */
export function isS3Url(url: string): boolean {
  if (!url) return false;
  const { cloudfrontUrl } = getConfig();
  if (cloudfrontUrl && url.startsWith(cloudfrontUrl)) return true;
  if (url.includes('.amazonaws.com/')) return true;
  return false;
}
