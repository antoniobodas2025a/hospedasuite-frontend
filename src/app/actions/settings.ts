'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentHotel } from '@/lib/hotel-context';

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
  description: z.string().optional(),
  whatsapp_number: z.string().optional(),
  google_maps_url: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  cancellation_policy: z.string().optional(),
  hotel_amenities: z.array(z.string()).optional(),
  cover_photo_url: z.string().url().optional().or(z.literal('')),
  gallery_urls: z.array(z.string().url()).optional(),
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
        cover_photo_url: validData.cover_photo_url,
        gallery_urls: validData.gallery_urls,
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