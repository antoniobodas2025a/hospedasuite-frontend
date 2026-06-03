# PRD-013: Investigación — Imágenes no visibles en nuevos hoteles

## Executive Summary

Las imágenes subidas durante el wizard no se muestran en la OTA. Se almacenan URLs `blob://` (efímeras del browser) en la DB porque la subida a R2 falla silenciosamente. El error se traga en el `Promise.allSettled` y el wizard continúa como si todo estuviera bien.

---

## Pipeline Completo de Imágenes

```
Usuario sube foto
    ↓
compressImage() → WebWorker (browser-image-compression)
    ↓
getPresignedOnboardingUrlAction() → server action
    ↓
getPresignedUploadUrl() → @aws-sdk/s3-request-presigner → S3Client → R2
    ↓
uploadToR2() → fetch PUT a presigned URL → R2 bucket
    ↓
Si OK: galleryUrls.push(publicUrl)
Si FAIL: silencioso → galleryPreviews (blob:// URLs)
    ↓
Provisioning → gallery_urls = galleryUrls (vacíos) || galleryPreviews (blob)
    ↓
main_image_url = gallery_urls[0] || null
    ↓
OTA muestra <Image> con main_image_url = blob:// → roto tras refresh
```

## Puntos de Falla Potenciales

| # | Punto | Archivo | Síntoma | Probabilidad |
|---|-------|---------|---------|-------------|
| 1 | `S3Client` con async credentials | `r2-client.ts:18` | `getPresignedUrl` lanza error | **ALTA** |
| 2 | `R2_PUBLIC_URL` mal configurado | `r2-client.ts:29` | URL pública no resuelve | **MEDIA** |
| 3 | Bucket R2 sin acceso público | Cloudflare R2 | `fetch PUT` 403 | **MEDIA** |
| 4 | CORS del bucket no permite origin | Cloudflare R2 | `fetch PUT` bloqueado por CORS | **BAJA** |
| 5 | `R2_ACCESS_KEY_ID` con formato `cfat_` | `.env.local` | AWS SDK valida largo 32 | **ALTA** |

---

## Diagnóstico — Comandos para ejecutar

### 1. Verificar que la URL pública de R2 resuelve

```bash
curl -I https://pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev/onboarding/test.txt
# Debería devolver 200 o 404 (no 403 ni timeout)
```

### 2. Verificar que las credenciales generan presigned URL

```bash
# Desde Node.js en el servidor de producción
node -e "
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

getSignedUrl(client, new PutObjectCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  Key: 'test-' + Date.now(),
}), { expiresIn: 900 })
  .then(url => console.log('✅ Presigned URL generada:', url.slice(0, 50) + '...'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

### 3. Verificar qué URLs tiene un hotel en la DB

```sql
SELECT id, name, main_image_url, gallery_urls[1:3]
FROM hotels
WHERE id = 'e3e4ec3d-d20b-449b-874a-33d180ef9741'
   OR id = '7addc7b6-e2a3-43a9-9798-9ad29ec1b58c';
```

Si `gallery_urls` contiene `blob:https://...` → la subida a R2 falló.

---

## Fixes Propuestos

### Fix A (urgente): Verificar async credentials en AWS SDK v3.1053

El mayor sospechoso es que `credentials: async () => ({...})` no bypassa la validación en AWS SDK v3.1053. Hacer un test rápido:

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="bash">
<｜｜DSML｜｜parameter name="command" string="true">cd /home/anto/proyectos-programacion/hospedasuite && node -e "
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = process.env.R2_ENDPOINT;

// Test 1: static credentials (va a fallar por longitus)
try {
  const c1 = new S3Client({
    region: 'auto', endpoint, forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  await getSignedUrl(c1, new PutObjectCommand({ Bucket: 'hospedasuite-media', Key: 'test-1' }), { expiresIn: 900 });
  console.log('✅ Static funciona');
} catch(e) { console.log('❌ Static:', e.message.slice(0, 100)); }

// Test 2: async provider function
try {
  const c2 = new S3Client({
    region: 'auto', endpoint, forcePathStyle: true,
    credentials: async () => ({ accessKeyId, secretAccessKey }),
  });
  await getSignedUrl(c2, new PutObjectCommand({ Bucket: 'hospedasuite-media', Key: 'test-2' }), { expiresIn: 900 });
  console.log('✅ Async funciona');
} catch(e) { console.log('❌ Async:', e.message.slice(0, 100)); }
" 2>&1