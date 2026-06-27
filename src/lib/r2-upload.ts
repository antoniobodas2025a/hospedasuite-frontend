/**
 * 🪣 R2 Direct Upload — Fetch + AWS Signature v4 (no AWS SDK)
 *
 * Bypasses AWS SDK v3's strict accessKeyId length validation (32 chars).
 * Cloudflare R2 access keys can be 53+ chars (cfat_ prefix).
 * Uses native fetch + HMAC-SHA256 signing.
 */

import { createHmac, createHash } from 'crypto';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'hospedasuite-media';
const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://dummy.r2.cloudflarestorage.com';

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function getSigningKey(dateStamp: string): Buffer {
  const kDate = hmac(Buffer.from(`AWS4${R2_SECRET_ACCESS_KEY}`), dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;

  const payloadHash = sha256(body);
  const endpointHost = new URL(R2_ENDPOINT).host;

  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${endpointHost}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest =
    `PUT\n` +
    `/${R2_BUCKET}/${key}\n` +
    `\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${payloadHash}`;

  const stringToSign =
    `AWS4-HMAC-SHA256\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    `${sha256(canonicalRequest)}`;

  const signingKey = getSigningKey(dateStamp);
  const signature = hmac(signingKey, stringToSign).toString('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Cerebro Operativo] Server upload failed: status ${response.status}`, errorText);
    // Heurística #2: nunca exponer jerga técnica al usuario
    throw new Error(
      `No se pudo subir la imagen al almacenamiento. `,
    );
  }

  return `${process.env.R2_PUBLIC_URL || 'https://pub-xxxx.r2.dev'}/${key}`;
}

export { R2_BUCKET };
