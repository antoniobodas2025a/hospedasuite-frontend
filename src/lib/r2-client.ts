/**
 * 🪣 Singleton — Cloudflare R2 Client (S3-compatible)
 *
 * R2 es compatible con la API de S3. Usamos @aws-sdk/client-s3
 * para subir, listar y eliminar objetos directamente.
 *
 * Sin costo de egreso (bandwidth gratis) + CDN global de Cloudflare.
 */

import { S3Client } from '@aws-sdk/client-s3';

// Build-time safe: dummy values during compilation
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'dummy_access_key';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'dummy_secret_key';
const endpoint = process.env.R2_ENDPOINT || 'https://dummy.r2.cloudflarestorage.com';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'hospedasuite-media';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxx.r2.dev';
