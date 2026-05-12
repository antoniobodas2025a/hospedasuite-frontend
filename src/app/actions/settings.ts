'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentHotel } from '@/lib/hotel-context';
import sharp from 'sharp';

// 1. Instancia de Supabase con privilegios administrativos
const getAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('❌ Faltan las variables de entorno de Supabase en el archivo .env.local');
  }

  return createClient(url, key, {
    auth: { persistSession: false }
  });
};

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
}

export async function saveSettingsAction(settings: HotelSettings) {
  try {
    // 🚨 MEJORA QA: Se inyectó la validación de propiedad a la función antigua
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== settings.id) {
      throw new Error('Violación de Seguridad: No tienes permisos sobre este hotel.');
    }

    const supabaseAdmin = getAdminClient();

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
});

export async function updateHotelProfileAction(hotelId: string, formData: any) {
  try {
    // 🚨 SEGURIDAD DBA: Verificar que el usuario actual ES DUEÑO de este hotel
    const currentHotel = await getCurrentHotel();
    if (!currentHotel || currentHotel.id !== hotelId) {
      throw new Error('Violación de Seguridad: No tienes permisos sobre este hotel.');
    }

    const supabaseAdmin = getAdminClient();
    
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
// 📸 ACCIÓN 3: UPLOAD DE IMÁGENES OPTIMIZADAS CON SHARP
// ============================================================================

/**
 * Recibe un archivo, lo optimiza con Sharp (resize + WebP), y lo sube a Supabase Storage.
 * 
 * - Resize: max 1920x1080 (sin agrandar si es más chica)
 * - Formato: WebP quality 80
 * - Bucket: hotel-media
 * - Retorna: URL pública de la imagen optimizada
 */
export async function uploadOptimizedImageAction(
  formData: FormData,
  folder: 'hero' | 'covers' | 'gallery' = 'gallery'
) {
  try {
    const currentHotel = await getCurrentHotel();
    if (!currentHotel) {
      throw new Error('No se pudo verificar la propiedad del hotel.');
    }

    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No se recibió ningún archivo.');
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen.');
    }

    // Validar tamaño (max 20MB antes de comprimir)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('La imagen no puede superar los 20MB.');
    }

    // Leer buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimizar con Sharp
    const optimized = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toBuffer();

    // Generar nombre único
    const fileName = `${currentHotel.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

    // Subir a Supabase
    const supabaseAdmin = getAdminClient();
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('hotel-media')
      .upload(fileName, optimized, {
        contentType: 'image/webp',
        cacheControl: '31536000', // 1 año
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin
      .storage
      .from('hotel-media')
      .getPublicUrl(fileName);

    // Stats para logging
    const originalKB = (file.size / 1024).toFixed(0);
    const optimizedKB = (optimized.length / 1024).toFixed(0);
    const savings = Math.round((1 - optimized.length / file.size) * 100);
    console.log(`📸 Imagen optimizada: ${originalKB}KB → ${optimizedKB}KB (${savings}% menos)`);

    return { success: true, url: urlData.publicUrl, stats: { originalKB, optimizedKB, savings } };

  } catch (error: any) {
    console.error('🔥 Error optimizando imagen:', error);
    return { success: false, error: error.message || 'Error al procesar la imagen' };
  }
}