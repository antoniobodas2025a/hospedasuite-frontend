/**
 * 🪣 Cloudflare R2 — Presigned URLs via manual AWS Signature V4
 *
 * R2 es compatible con la API de S3, pero sus access keys tienen 53 chars
 * (prefijo cfat_) y el AWS SDK las rechaza validando longitud de 32.
 * Implementamos la firma V4 manualmente con crypto para evitar esa validación.
 */

import { createHmac, createHash } from 'node:crypto';

const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'dummy_access_key';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'dummy_secret_key';
const endpoint = process.env.R2_ENDPOINT || 'https://dummy.r2.cloudflarestorage.com';

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'hospedasuite-media';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-xxxxx.r2.dev';

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Genera URL presignada para PUT directo a R2 (firma V4 manual).
 * Válida por 15 minutos. El browser hace PUT directamente sin pasar por el servidor.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string = 'image/webp',
  expiresIn: number = 900
): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const region = 'auto';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const url = new URL(endpoint);
  const host = url.host;

  // Sign BOTH host and content-type.
  // The browser automatically sends Content-Type when body is a File,
  // and R2 rejects unsigned headers with 400.
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  const queryEntries = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${credentialScope}`)}`,
    `X-Amz-Date=${timeStamp}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=${signedHeaders}`,
  ];

  const canonicalUri = `/${R2_BUCKET}/${key}`;
  const canonicalQueryString = queryEntries.join('&');
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timeStamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const dateKey = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmacSha256(dateKey, region);
  const dateRegionServiceKey = hmacSha256(dateRegionKey, service);
  const signingKey = hmacSha256(dateRegionServiceKey, 'aws4_request');

  const signature = hmacSha256(signingKey, stringToSign).toString('hex');

  return `${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
