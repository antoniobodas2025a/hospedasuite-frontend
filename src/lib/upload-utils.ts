/**
 * 🖼️ Upload Utilities — Client-side image pipeline
 *
 * Pipeline: Compress → Presign → Upload → Blur
 *
 * - browser-image-compression: WebWorker-based compression (non-blocking)
 * - Presigned URLs: Direct upload to R2 (zero server bandwidth)
 * - Canvas API: 20×20 blur placeholder for next/image
 * - Retry with exponential backoff per file
 */

import imageCompression from 'browser-image-compression';

// ─── Validation constants ──────────────────────────────────────────

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];

/**
 * Valida localmente una imagen antes de intentar subirla.
 * Heurística #5: previene errores antes de contactar a R2.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check empty
  if (!file || file.size === 0) {
    return { valid: false, error: 'El archivo está vacío.' };
  }

  // Check size (before compression)
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `La imagen es muy grande (máx. ${MAX_FILE_SIZE_MB}MB).` };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato no soportado. Usá JPG, PNG o WebP.' };
  }

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!sanitizedName || sanitizedName.length < 2) {
    return { valid: false, error: 'Nombre de archivo inválido.' };
  }

  return { valid: true };
}

// ─── Compression presets ───────────────────────────────────────────

export const DEFAULT_COMPRESSION = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp',
} as const;

export const THUMBNAIL_COMPRESSION = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 640,
  useWebWorker: true,
  fileType: 'image/webp',
} as const;

/**
 * Comprime una imagen en el browser usando WebWorkers.
 * Convierte a WebP y reduce a ~1MB max.
 */
export async function compressImage(file: File, opts = DEFAULT_COMPRESSION): Promise<File> {
  // Si ya es pequeña, skip compression
  if (file.size < 500 * 1024 && file.type === 'image/webp') return file;
  
  try {
    return await imageCompression(file, opts);
  } catch (workerError) {
    console.warn('[Cerebro Operativo] WebWorker falló, activando fallback Canvas para Activación Visual...');
    // Fallback síncrono con Canvas API
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, opts.maxWidthOrHeight / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas toBlob failed'));
          const fallbackFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' });
          resolve(fallbackFile);
        }, 'image/webp', 0.85);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => reject(workerError);
      img.src = URL.createObjectURL(file);
    });
  }
}

/**
 * Genera un blur placeholder de 20×20px como data URL WebP.
 * Compatible con next/image placeholder="blur".
 */
export async function generateBlurDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 20;
      canvas.height = 20;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0, 20, 20);
      resolve(canvas.toDataURL('image/webp', 0.5));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('Failed to generate blur placeholder'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Sube un archivo directamente a R2 usando una URL presignada.
 * Incluye retry con exponential backoff (3 intentos).
 */
export async function uploadToR2(presignedUrl: string, file: File, retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      // Send as ArrayBuffer so fetch does NOT automatically attach Content-Type.
      // This avoids signature mismatches with R2.
      const res = await fetch(presignedUrl, {
        method: 'PUT',
        body: await file.arrayBuffer(),
      });
      if (res.ok) return;
      // Log status code for debugging (console only, never shown to user)
      console.warn(
        `[Cerebro Operativo] Intento ${i + 1}/${retries} fallido para ${file.name}: status ${res.status}`,
      );
      // If R2 returns 403, the presigned URL signature may be invalid
      // If R2 returns 400, the request format is wrong — don't retry
      if (res.status === 403 || res.status === 400) break;
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    } catch (err) {
      // Network error — likely CORS or connectivity issue
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) {
        // Heurística #2: lenguaje empático, cero jerga técnica
        throw new Error(
          `No se pudo subir la imagen. `,
        );
      }
      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  // Heurística #2: mensaje amigable, nunca errores técnicos crudos
  throw new Error(
    `No se pudo procesar la imagen. `,
  );
}

/**
 * Pipeline completo: comprimir → presign → subir → blur.
 * Retorna la URL pública y el blurDataURL.
 */
export interface UploadResult {
  url: string;
  blurDataURL: string;
  fileName: string;
  originalSize: number;
  compressedSize: number;
}

export async function uploadImage(
  file: File,
  getPresignedUrl: (fileName: string, contentType: string) => Promise<{ success: boolean; uploadUrl?: string; publicUrl?: string; error?: string }>,
  compressionOpts = DEFAULT_COMPRESSION
): Promise<UploadResult> {
  const originalSize = file.size;

  // 1. Comprimir
  const compressed = await compressImage(file, compressionOpts);

  // 2. Obtener URL presignada
  const presign = await getPresignedUrl(file.name, 'image/webp');
  if (!presign.success || !presign.uploadUrl || !presign.publicUrl) {
    throw new Error(presign.error || 'Failed to get presigned URL');
  }

  // 3. Subir directo a R2
  await uploadToR2(presign.uploadUrl, compressed);

  // 4. Generar blur
  const blurDataURL = await generateBlurDataURL(compressed);

  return {
    url: presign.publicUrl,
    blurDataURL,
    fileName: file.name,
    originalSize,
    compressedSize: compressed.size,
  };
}

/**
 * Sube múltiples imágenes en paralelo con Promise.allSettled.
 * Retorna resultados exitosos y errores separados.
 */
export interface BatchUploadResult {
  successful: UploadResult[];
  failed: { fileName: string; error: string }[];
  progress: number; // 0-100
}

export async function batchUpload(
  files: File[],
  getPresignedUrl: (fileName: string, contentType: string) => Promise<{ success: boolean; uploadUrl?: string; publicUrl?: string; error?: string }>,
  compressionOpts = DEFAULT_COMPRESSION,
  onProgress?: (current: number, total: number) => void
): Promise<BatchUploadResult> {
  const total = files.length;
  let completed = 0;

  const results = await Promise.allSettled(
    files.map(async (file) => {
      const result = await uploadImage(file, getPresignedUrl, compressionOpts);
      completed++;
      onProgress?.(completed, total);
      return result;
    })
  );

  const successful: UploadResult[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({
        fileName: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        error: String(result.reason),
      });
    }
  }

  return { successful, failed, progress: 100 };
}
