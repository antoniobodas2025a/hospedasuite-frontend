/**
 * 🪣 Singleton — Cloudflare R2 Client (S3-compatible)
 *
 * R2 es compatible con la API de S3. Usamos @aws-sdk/client-s3
 * para subir, listar y eliminar objetos directamente.
 *
 * Sin costo de egreso (bandwidth gratis) + CDN global de Cloudflare.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Build-time safe: dummy values during compilation
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'dummy_access_key';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'dummy_secret_key';
const endpoint = process.env.R2_ENDPOINT || 'https://dummy.r2.cloudflarestorage.com';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true, // Required for R2
  credentials: async () => ({
    accessKeyId,
    secretAccessKey,
  }),
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'hospedasuite-media';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxx.r2.dev';

/**
 * Genera una URL presignada para subir un archivo directo a R2.
 * Válida por 15 minutos. El browser hace PUT directamente sin pasar por el servidor.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'image/webp',
  expiresIn: number = 900 // 15 minutos
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000',
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}
