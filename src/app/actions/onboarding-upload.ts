'use server';

import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import sharp from 'sharp';

/**
 * Sube una imagen de onboarding a Supabase Storage con compresión.
 * 
 * Usa userId en lugar de hotelId porque el hotel aún no existe.
 * Genera 3 tamaños (thumb, card, full) y devuelve la URL completa.
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

    // Subir los 3 tamaños
    const uploads = await Promise.all([
      supabaseAdmin.storage.from('hotel-media').upload(`${baseName}_thumb.webp`, thumb, { contentType: 'image/webp', cacheControl: '31536000' }),
      supabaseAdmin.storage.from('hotel-media').upload(`${baseName}_card.webp`, card, { contentType: 'image/webp', cacheControl: '31536000' }),
      supabaseAdmin.storage.from('hotel-media').upload(`${baseName}_full.webp`, full, { contentType: 'image/webp', cacheControl: '31536000' }),
    ]);

    for (const { error } of uploads) {
      if (error) throw error;
    }

    // Obtener URL pública de la versión full
    const { data: urlData } = supabaseAdmin.storage.from('hotel-media').getPublicUrl(`${baseName}_full.webp`);

    return { success: true, url: urlData.publicUrl };

  } catch (error: any) {
    console.error('🔥 Error subiendo imagen de onboarding:', error);
    return { success: false, error: error.message || 'Error al procesar la imagen' };
  }
}
