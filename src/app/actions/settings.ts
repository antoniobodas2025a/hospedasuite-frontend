'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentHotel } from '@/lib/hotel-context';

// ============================================================================
// 🛠️ ACCIÓN 1: CONFIGURACIÓN BÁSICA Y FINANCIERA (Recuperada y Blindada)
// ============================================================================

export interface HotelSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  tax_rate: number;
  primary_color: string;
  wompi_public_key?: string;
  wompi_integrity_secret?: string;
  wompi_events_secret?: string;
}

export async function saveSettingsAction(settings: HotelSettings) {
  try {
    // 🚨 MEJORA QA: Se inyectó la validación de propiedad a la función antigua
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== settings.id) {
      throw new Error('Violación de Seguridad: No tienes permisos sobre este hotel.');
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');

    const { error } = await supabaseAdmin
      .from('hotels')
      .update({
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        tax_rate: settings.tax_rate,
        primary_color: settings.primary_color,
        wompi_public_key: settings.wompi_public_key,
        wompi_integrity_secret: settings.wompi_integrity_secret,
        wompi_events_secret: settings.wompi_events_secret,
      })
      .eq('id', settings.id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('🔥 Error guardando configuración básica:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// 🌍 ACCIÓN 2: PERFIL OTA Y MOTOR DE VENTAS (La Nueva)
// ============================================================================

// 🚨 VALIDACIÓN ZOD: Protección contra inyección de datos corruptos
const updateProfileSchema = z.object({
  description: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  google_maps_url: z.string().url('Debe ser una URL válida').nullable().optional().or(z.literal('')),
  cancellation_policy: z.string().nullable().optional(),
  hotel_amenities: z.array(z.string()).nullable().optional(),
  main_image_url: z.string().url().nullable().optional().or(z.literal('')),
  cover_photo_url: z.string().url().nullable().optional().or(z.literal('')),
  gallery_urls: z.array(z.string().url()).nullable().optional(),
  show_recent_activity: z.boolean().optional(),
  recent_activity_messages: z.array(z.object({
    icon: z.string(),
    text: z.string(),
    color: z.string(),
  })).nullable().optional(),
  seo_meta_title: z.string().nullable().optional(),
  seo_meta_description: z.string().nullable().optional(),
  seo_og_image_url: z.string().url().nullable().optional().or(z.literal('')),
  seo_canonical_url: z.string().url().nullable().optional().or(z.literal('')),
  category_badge: z.string().nullable().optional(),
  show_trust_badges: z.boolean().optional(),
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  reception_hours: z.string().nullable().optional(),
  story_section_title: z.string().nullable().optional(),
  trust_badge_1_title: z.string().nullable().optional(),
  trust_badge_1_subtitle: z.string().nullable().optional(),
  trust_badge_2_title: z.string().nullable().optional(),
  trust_badge_2_subtitle: z.string().nullable().optional(),
  image_blur_meta: z.any().nullable().optional(),
});

export async function updateHotelProfileAction(hotelId: string, formData: any) {
  try {
    // 🚨 SEGURIDAD DBA: Verificar que el usuario actual ES DUEÑO de este hotel
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== hotelId) {
      throw new Error('Violación de Seguridad: No tienes permisos sobre este hotel.');
    }

    const { supabaseAdmin } = await import('@/lib/supabase-admin');
    
    // Filtramos la carga útil (payload) a través del escudo Zod
    const validData = updateProfileSchema.parse(formData);

    // Inyección en la base de datos
    const { error } = await supabaseAdmin
      .from('hotels')
      .update({
        description: validData.description,
        whatsapp_number: validData.whatsapp_number,
        google_maps_url: validData.google_maps_url,
        cancellation_policy: validData.cancellation_policy,
        hotel_amenities: validData.hotel_amenities,
        main_image_url: validData.main_image_url,
        cover_photo_url: validData.cover_photo_url,
        gallery_urls: validData.gallery_urls,
        show_recent_activity: validData.show_recent_activity,
        recent_activity_messages: validData.recent_activity_messages,
        seo_meta_title: validData.seo_meta_title,
        seo_meta_description: validData.seo_meta_description,
        seo_og_image_url: validData.seo_og_image_url,
        seo_canonical_url: validData.seo_canonical_url,
        category_badge: validData.category_badge,
        show_trust_badges: validData.show_trust_badges,
        check_in_time: validData.check_in_time,
        check_out_time: validData.check_out_time,
        reception_hours: validData.reception_hours,
        story_section_title: validData.story_section_title,
        trust_badge_1_title: validData.trust_badge_1_title,
        trust_badge_1_subtitle: validData.trust_badge_1_subtitle,
        trust_badge_2_title: validData.trust_badge_2_title,
        trust_badge_2_subtitle: validData.trust_badge_2_subtitle,
        image_blur_meta: validData.image_blur_meta,
      })
      .eq('id', hotelId);

    if (error) throw new Error(error.message);

    // Purgar la caché de Next.js para que los cambios se vean instantáneamente
    revalidatePath('/dashboard/settings');
    return { success: true };
    
  } catch (error: any) {
    console.error('🔥 Error actualizando perfil del hotel:', error);
    return { success: false, error: error.message || 'Error de validación de datos' };
  }
}


// ============================================================================
// ⚡ ACCIÓN 3: PRESIGNED URL PARA UPLOAD DIRECTO
// ============================================================================

/**
 * Genera una URL presignada para que el browser suba directo a R2.
 * El servidor solo autentica y firma — no toca el archivo.
 *
 * Uso:
 *   1. Client llama a esta acción con { folder, fileName, contentType }
 *   2. Server devuelve { uploadUrl, publicUrl }
 *   3. Client hace PUT directo a uploadUrl con el archivo comprimido
 *   4. Client usa publicUrl para mostrar la imagen
 */
export async function getPresignedUploadUrlAction(
  folder: 'hero' | 'covers' | 'gallery' | 'rooms',
  fileName: string,
  contentType: string = 'image/webp'
) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) {
      return { success: false, error: 'No autenticado' };
    }

    const { getPresignedUploadUrl } = await import('@/lib/r2-client');
    const { R2_PUBLIC_URL } = await import('@/lib/r2-client');

    const key = `${currentHotel.id}/${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return { success: true, uploadUrl, publicUrl, key };
  } catch (error: any) {
    console.error('🔥 Error generando presigned URL:', error);
    return { success: false, error: error.message || 'Error al generar URL de subida' };
  }
}