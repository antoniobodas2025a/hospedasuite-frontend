'use server';

import { createClient } from '@/utils/supabase/server';
import { getPresignedReadUrl, getPresignedUploadUrl, R2_PUBLIC_URL } from '@/lib/r2-client';
import { CATEGORY_PRIORITY, IMAGE_CATEGORIES } from '@/lib/image-category';
import { validateNoJargon } from '@/lib/jargon-guard';
import type { CategorizedImage, ImageCategory } from '@/types';

/**
 * Read hotel images from hotel_images table with auth guard.
 * Returns images sorted by category priority, then by sort_order within each category.
 */
export async function getHotelImagesAction(
  hotelId: string
): Promise<{ success: boolean; data?: CategorizedImage[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verify user has access to this hotel via staff table
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('hotel_id')
      .eq('user_id', user.id)
      .eq('hotel_id', hotelId)
      .limit(1);

    if (!staffRecord || staffRecord.length === 0) {
      return { success: false, error: 'No tienes permisos para acceder a este hotel' };
    }

    // Query hotel_images ordered by sort_order
    const { data: images, error } = await supabase
      .from('hotel_images')
      .select('url, category, sort_order, blur_data')
      .eq('hotel_id', hotelId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[hotel-images] Error querying images:', error.message);
      return { success: false, error: 'Error al cargar las imágenes' };
    }

    // Sort by category priority, then by sort_order within each category
    const sorted = (images || []).sort((a, b) => {
      const aPriority = CATEGORY_PRIORITY.indexOf(a.category as ImageCategory);
      const bPriority = CATEGORY_PRIORITY.indexOf(b.category as ImageCategory);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.sort_order - b.sort_order;
    });

    const categorized: CategorizedImage[] = sorted.map((img) => ({
      url: img.url,
      category: img.category as ImageCategory,
      sort_order: img.sort_order,
      blur_data: img.blur_data,
    }));

    return { success: true, data: categorized };
  } catch (error: any) {
    console.error('[hotel-images] Unexpected error:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}

/**
 * Generate a presigned URL for reading an image from R2.
 * URL expires in 1 hour (3600s).
 */
export async function getPresignedUrlAction(
  imageKey: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    if (!imageKey || imageKey.trim() === '') {
      return { success: false, error: 'Clave de imagen inválida' };
    }

    const url = await getPresignedReadUrl(imageKey, 3600);

    return { success: true, url };
  } catch (error: any) {
    console.error('[hotel-images] Error generating presigned URL:', error);
    return { success: false, error: error.message || 'Error al generar URL presignada' };
  }
}

/**
 * Generate a presigned PUT URL for uploading an image to R2 with category-aware path.
 * Path pattern: hotels/{hotelId}/{category}/{timestamp}-{fileName}
 */
export async function getPresignedCategoryUrlAction(
  hotelId: string,
  category: ImageCategory,
  fileName: string
): Promise<{ success: boolean; uploadUrl?: string; publicUrl?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verify user has access to this hotel via staff table
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('hotel_id')
      .eq('user_id', user.id)
      .eq('hotel_id', hotelId)
      .limit(1);

    if (!staffRecord || staffRecord.length === 0) {
      return { success: false, error: 'No tienes permisos para acceder a este hotel' };
    }

    // Validate category is valid ImageCategory
    if (!IMAGE_CATEGORIES.includes(category)) {
      return { success: false, error: `Categoría inválida: ${category}` };
    }

    // Apply jargon-guard validation on fileName
    const jargonError = validateNoJargon(fileName);
    if (jargonError) {
      return { success: false, error: jargonError };
    }

    // Sanitize fileName
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const key = `hotels/${hotelId}/${category}/${timestamp}-${sanitizedFileName}`;

    const uploadUrl = await getPresignedUploadUrl(key, 'image/webp');
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return { success: true, uploadUrl, publicUrl };
  } catch (error: any) {
    console.error('[hotel-images] Error generating presigned category URL:', error);
    return { success: false, error: error.message || 'Error al generar URL de subida' };
  }
}

/**
 * Insert an image into hotel_images table with auth guard.
 */
export async function uploadHotelImageAction(
  hotelId: string,
  image: { url: string; category: ImageCategory; sort_order: number; blur_data?: string | null }
): Promise<{ success: boolean; data?: CategorizedImage; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verify user has access to this hotel via staff table
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('hotel_id')
      .eq('user_id', user.id)
      .eq('hotel_id', hotelId)
      .limit(1);

    if (!staffRecord || staffRecord.length === 0) {
      return { success: false, error: 'No tienes permisos para acceder a este hotel' };
    }

    // Validate category is valid ImageCategory
    if (!IMAGE_CATEGORIES.includes(image.category)) {
      return { success: false, error: `Categoría inválida: ${image.category}` };
    }

    // Validate URL is not blob/data/javascript
    if (
      image.url.startsWith('blob:') ||
      image.url.startsWith('data:') ||
      image.url.startsWith('javascript:')
    ) {
      return { success: false, error: 'URL de imagen inválida' };
    }

    // Insert into hotel_images
    const { data, error } = await supabase
      .from('hotel_images')
      .insert({
        hotel_id: hotelId,
        url: image.url,
        category: image.category,
        sort_order: image.sort_order,
        blur_data: image.blur_data || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[hotel-images] Error inserting image:', error.message);
      return { success: false, error: 'Error al guardar la imagen' };
    }

    const categorized: CategorizedImage = {
      url: data.url,
      category: data.category as ImageCategory,
      sort_order: data.sort_order,
      blur_data: data.blur_data,
    };

    return { success: true, data: categorized };
  } catch (error: any) {
    console.error('[hotel-images] Unexpected error uploading image:', error);
    return { success: false, error: error.message || 'Error inesperado' };
  }
}
