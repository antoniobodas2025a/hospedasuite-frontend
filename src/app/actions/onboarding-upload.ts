'use server';

import { createClient } from '@/utils/supabase/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2-client';
import sharp from 'sharp';

/**
 * Sube una imagen de onboarding a R2 (Cloudflare) con compresión.
 * 
 * Usa userId en lugar de hotelId porque el hotel aún no existe.
 * Genera 3 tamaños (thumb, card, full) y devuelve la URL pública.
 */
export async function uploadOnboardingImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No se recibió ningún archivo.' };

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'El archivo debe ser una imagen.' };
    }

    // Límite 20MB
    if (file.size > 20 * 1024 * 1024) {
      return { success: false, error: 'La imagen no puede superar los 20MB.' };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer);

    // Generar 3 tamaños
    const [thumb, card, full] = await Promise.all([
      image.clone().resize(256, 256, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 50, effort: 6 }).toBuffer(),
      image.clone().resize(640, 640, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 75, effort: 6 }).toBuffer(),
      image.clone().resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toBuffer(),
    ]);

    // Nombre único
    const ext = file.name.split('.').pop() || 'jpg';
    const baseName = `onboarding/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Subir los 3 tamaños a R2
    const uploads = await Promise.all([
      r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: `${baseName}_thumb.webp`, Body: thumb, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000' })),
      r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: `${baseName}_card.webp`, Body: card, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000' })),
      r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: `${baseName}_full.webp`, Body: full, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000' })),
    ]);

    // URL pública de la versión full
    const publicUrl = `${R2_PUBLIC_URL}/${baseName}_full.webp`;

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error('🔥 Error subiendo imagen de onboarding a R2:', error);
    return { success: false, error: error.message || 'Error al procesar la imagen' };
  }
}


// ============================================================================
// ⚡ PRESIGNED URL PARA UPLOAD DIRECTO (NUEVA ARQUITECTURA)
// ============================================================================

/**
 * Genera URL presignada para onboarding (usa userId porque el hotel no existe aún).
 * El browser sube directo a R2 — el servidor solo autentica y firma.
 */
export async function getPresignedOnboardingUrlAction(
  fileName: string,
  contentType: string = 'image/webp'
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { getPresignedUploadUrl, R2_PUBLIC_URL } = await import('@/lib/r2-client');

    const key = `onboarding/${user.id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return { success: true, uploadUrl, publicUrl, key };
  } catch (error: any) {
    console.error('🔥 Error generando presigned URL para onboarding:', error);
    return { success: false, error: error.message || 'Error al generar URL de subida' };
  }
}
