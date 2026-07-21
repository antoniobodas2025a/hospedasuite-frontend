'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import type { ImageCategory } from '@/types';

/**
 * Category assignment heuristics based on filename patterns
 */
function inferCategoryFromFilename(filename: string): ImageCategory {
  const lower = filename.toLowerCase();
  
  // Exterior patterns
  if (
    lower.includes('exterior') ||
    lower.includes('fachada') ||
    lower.includes('frente') ||
    lower.includes('building') ||
    lower.includes('outside') ||
    lower.includes('entrance') ||
    lower.includes('entrada')
  ) {
    return 'exterior';
  }

  // Lobby patterns
  if (
    lower.includes('lobby') ||
    lower.includes('recepcion') ||
    lower.includes('reception') ||
    lower.includes('hall') ||
    lower.includes('vestibulo')
  ) {
    return 'lobby';
  }

  // Room patterns
  if (
    lower.includes('habitacion') ||
    lower.includes('room') ||
    lower.includes('dormitorio') ||
    lower.includes('bedroom') ||
    lower.includes('suite')
  ) {
    return 'habitacion';
  }

  // Bathroom patterns
  if (
    lower.includes('bano') ||
    lower.includes('bathroom') ||
    lower.includes('ducha') ||
    lower.includes('shower') ||
    lower.includes('tina')
  ) {
    return 'bano';
  }

  // Amenity patterns
  if (
    lower.includes('amenidad') ||
    lower.includes('amenity') ||
    lower.includes('piscina') ||
    lower.includes('pool') ||
    lower.includes('gym') ||
    lower.includes('gimnasio') ||
    lower.includes('spa') ||
    lower.includes('sauna')
  ) {
    return 'amenidades';
  }

  // Restaurant patterns
  if (
    lower.includes('restaurante') ||
    lower.includes('restaurant') ||
    lower.includes('comedor') ||
    lower.includes('dining') ||
    lower.includes('cocina') ||
    lower.includes('kitchen') ||
    lower.includes('bar') ||
    lower.includes('cafe')
  ) {
    return 'restaurante';
  }

  // Surroundings patterns
  if (
    lower.includes('entorno') ||
    lower.includes('surrounding') ||
    lower.includes('vista') ||
    lower.includes('view') ||
    lower.includes('jardin') ||
    lower.includes('garden') ||
    lower.includes('playa') ||
    lower.includes('beach') ||
    lower.includes('montana') ||
    lower.includes('mountain')
  ) {
    return 'entorno';
  }

  // Default to 'otros'
  return 'otros';
}

/**
 * Extract filename from URL
 */
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || '';
  } catch {
    // If URL parsing fails, try to extract from string
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  }
}

export interface MigrationResult {
  success: boolean;
  hotelsProcessed: number;
  imagesMigrated: number;
  errors: Array<{ hotelId: string; error: string }>;
  details: Array<{
    hotelId: string;
    hotelName: string;
    imagesCount: number;
    categories: Record<ImageCategory, number>;
  }>;
}

/**
 * Migrate existing hotels from gallery_urls to hotel_images table
 * 
 * This function:
 * 1. Reads all hotels with gallery_urls
 * 2. Infers categories from filenames
 * 3. Inserts images into hotel_images table
 * 4. Keeps gallery_urls for backward compatibility
 * 5. Returns detailed migration report
 */
export async function migrateExistingHotelImages(): Promise<MigrationResult> {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  // Check if user is authenticated and has admin role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      hotelsProcessed: 0,
      imagesMigrated: 0,
      errors: [{ hotelId: 'auth', error: 'Usuario no autenticado' }],
      details: [],
    };
  }

  // Check admin role (you may need to adjust this based on your auth setup)
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!staff || staff.role !== 'admin') {
    return {
      success: false,
      hotelsProcessed: 0,
      imagesMigrated: 0,
      errors: [{ hotelId: 'auth', error: 'Usuario no tiene permisos de administrador' }],
      details: [],
    };
  }

  const result: MigrationResult = {
    success: true,
    hotelsProcessed: 0,
    imagesMigrated: 0,
    errors: [],
    details: [],
  };

  try {
    // Fetch all hotels with gallery_urls
    const { data: hotels, error: fetchError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, gallery_urls')
      .not('gallery_urls', 'is', null);

    if (fetchError) {
      return {
        ...result,
        success: false,
        errors: [{ hotelId: 'fetch', error: fetchError.message }],
      };
    }

    if (!hotels || hotels.length === 0) {
      return result;
    }

    // Process each hotel
    for (const hotel of hotels) {
      if (!hotel.gallery_urls || !Array.isArray(hotel.gallery_urls) || hotel.gallery_urls.length === 0) {
        continue;
      }

      result.hotelsProcessed++;
      const categories: Record<ImageCategory, number> = {
        exterior: 0,
        lobby: 0,
        habitacion: 0,
        bano: 0,
        amenidades: 0,
        restaurante: 0,
        entorno: 0,
        otros: 0,
      };

      const imagesToInsert = hotel.gallery_urls.map((url: string, index: number) => {
        const filename = extractFilename(url);
        const category = inferCategoryFromFilename(filename);
        categories[category]++;

        return {
          hotel_id: hotel.id,
          url,
          category,
          sort_order: index,
          blur_data: null,
        };
      });

      // Insert into hotel_images
      const { error: insertError } = await supabaseAdmin
        .from('hotel_images')
        .insert(imagesToInsert);

      if (insertError) {
        result.errors.push({
          hotelId: hotel.id,
          error: insertError.message,
        });
        result.success = false;
      } else {
        result.imagesMigrated += imagesToInsert.length;
        result.details.push({
          hotelId: hotel.id,
          hotelName: hotel.name,
          imagesCount: imagesToInsert.length,
          categories,
        });
      }
    }

    return result;
  } catch (error) {
    return {
      ...result,
      success: false,
      errors: [
        ...result.errors,
        {
          hotelId: 'unknown',
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
      ],
    };
  }
}

/**
 * Dry run migration - shows what would be migrated without actually migrating
 */
export async function dryRunMigration(): Promise<MigrationResult> {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      hotelsProcessed: 0,
      imagesMigrated: 0,
      errors: [{ hotelId: 'auth', error: 'Usuario no autenticado' }],
      details: [],
    };
  }

  const result: MigrationResult = {
    success: true,
    hotelsProcessed: 0,
    imagesMigrated: 0,
    errors: [],
    details: [],
  };

  try {
    const { data: hotels, error: fetchError } = await supabaseAdmin
      .from('hotels')
      .select('id, name, gallery_urls')
      .not('gallery_urls', 'is', null);

    if (fetchError) {
      return {
        ...result,
        success: false,
        errors: [{ hotelId: 'fetch', error: fetchError.message }],
      };
    }

    if (!hotels || hotels.length === 0) {
      return result;
    }

    for (const hotel of hotels) {
      if (!hotel.gallery_urls || !Array.isArray(hotel.gallery_urls) || hotel.gallery_urls.length === 0) {
        continue;
      }

      result.hotelsProcessed++;
      const categories: Record<ImageCategory, number> = {
        exterior: 0,
        lobby: 0,
        habitacion: 0,
        bano: 0,
        amenidades: 0,
        restaurante: 0,
        entorno: 0,
        otros: 0,
      };

      hotel.gallery_urls.forEach((url: string) => {
        const filename = extractFilename(url);
        const category = inferCategoryFromFilename(filename);
        categories[category]++;
      });

      result.imagesMigrated += hotel.gallery_urls.length;
      result.details.push({
        hotelId: hotel.id,
        hotelName: hotel.name,
        imagesCount: hotel.gallery_urls.length,
        categories,
      });
    }

    return result;
  } catch (error) {
    return {
      ...result,
      success: false,
      errors: [
        {
          hotelId: 'unknown',
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
      ],
    };
  }
}
