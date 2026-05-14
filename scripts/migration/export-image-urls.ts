/**
 * Script de migración: Exporta todas las URLs de imágenes de Supabase
 * Genera un JSON con las rutas para backup y migración a R2.
 *
 * Uso:
 *   npx tsx scripts/migration/export-image-urls.ts
 *
 * Output: scripts/migration/exported-images-YYYY-MM-DD.json
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'hotel-media';

interface ImageRecord {
  id: string;
  path: string;
  url: string;
  r2_url: string; // Placeholder para R2
  table: string;
  hotel_id?: string;
  room_id?: string;
}

async function listBucketFiles(prefix: string): Promise<ImageRecord[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix);

  if (error) {
    console.error(`Error listing ${prefix}:`, error.message);
    return [];
  }

  const results: ImageRecord[] = [];

  for (const item of data || []) {
    if (item.name) {
      // Es un archivo
      const filePath = `${prefix}${item.name}`;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      results.push({
        id: item.name,
        path: filePath,
        url: urlData.publicUrl,
        r2_url: '', // Se llena al migrar
        table: 'hotel_media',
      });
    } else if (item.id) {
      // Es un subdirectorio — recursivo
      const subResults = await listBucketFiles(`${prefix}${item.name}/`);
      results.push(...subResults);
    }
  }

  return results;
}

async function getHotelsWithImages(): Promise<ImageRecord[]> {
  console.log('🔍 Buscando hoteles con imágenes en la DB...');

  // Tabla hotels — columnas de imagen
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('id, main_image_url, cover_photo_url, gallery_urls, logo_url');

  if (hotelsError) {
    console.error('Error querying hotels:', hotelsError.message);
    return [];
  }

  const results: ImageRecord[] = [];

  for (const hotel of hotels || []) {
    if (hotel.main_image_url) {
      results.push({
        id: `hotel-${hotel.id}-main`,
        path: extractPathFromUrl(hotel.main_image_url),
        url: hotel.main_image_url,
        r2_url: '',
        table: 'hotels',
        hotel_id: hotel.id,
      });
    }
    if (hotel.cover_photo_url) {
      results.push({
        id: `hotel-${hotel.id}-cover`,
        path: extractPathFromUrl(hotel.cover_photo_url),
        url: hotel.cover_photo_url,
        r2_url: '',
        table: 'hotels',
        hotel_id: hotel.id,
      });
    }
    if (hotel.logo_url) {
      results.push({
        id: `hotel-${hotel.id}-logo`,
        path: extractPathFromUrl(hotel.logo_url),
        url: hotel.logo_url,
        r2_url: '',
        table: 'hotels',
        hotel_id: hotel.id,
      });
    }
    if (Array.isArray(hotel.gallery_urls)) {
      hotel.gallery_urls.forEach((url: string, i: number) => {
        results.push({
          id: `hotel-${hotel.id}-gallery-${i}`,
          path: extractPathFromUrl(url),
          url,
          r2_url: '',
          table: 'hotels',
          hotel_id: hotel.id,
        });
      });
    }
  }

  // Tabla rooms — columnas de imagen
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, hotel_id, gallery');

  if (roomsError) {
    console.error('Error querying rooms:', roomsError.message);
  } else {
    for (const room of rooms || []) {
      if (Array.isArray(room.gallery)) {
        room.gallery.forEach((item: any, i: number) => {
          const url = typeof item === 'string' ? item : item.url;
          if (url) {
            results.push({
              id: `room-${room.id}-gallery-${i}`,
              path: extractPathFromUrl(url),
              url,
              r2_url: '',
              table: 'rooms',
              hotel_id: room.hotel_id,
              room_id: room.id,
            });
          }
        });
      }
    }
  }

  return results;
}

function extractPathFromUrl(url: string): string {
  // Extrae el path relativo del bucket desde la URL completa
  const match = url.match(/\/object\/public\/[^/]+\/(.+)/);
  return match ? match[1] : url;
}

async function main() {
  console.log('📸 Exportando URLs de imágenes de Supabase...\n');

  // 1. Imágenes referenciadas en la DB
  const dbImages = await getHotelsWithImages();

  // 2. Todas las imágenes en el bucket (para encontrar huérfanas)
  console.log('\n📁 Escaneando bucket completo...');
  const bucketImages = await listBucketFiles('');

  // 3. Generar reporte
  const report = {
    exported_at: new Date().toISOString(),
    bucket: BUCKET,
    total_db_references: dbImages.length,
    total_bucket_files: bucketImages.length,
    db_images: dbImages,
    bucket_files: bucketImages,
    // Huérfanas: están en el bucket pero no referenciadas en la DB
    orphaned_files: bucketImages.filter(
      (b) => !dbImages.some((d) => d.path === b.path)
    ),
  };

  // 4. Guardar
  const date = new Date().toISOString().split('T')[0];
  const outputPath = path.join(__dirname, `exported-images-${date}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n✅ Exportado a: ${outputPath}`);
  console.log(`   📊 ${report.total_db_references} imágenes en DB`);
  console.log(`   📁 ${report.total_bucket_files} archivos en bucket`);
  console.log(`   👻 ${report.orphaned_files.length} archivos huérfanos`);
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Revisar el JSON generado');
  console.log('   2. Ejecutar download-images.ts para bajar todas las fotos');
  console.log('   3. Subir a Cloudflare R2');
  console.log('   4. Actualizar URLs en la DB con las nuevas rutas R2');
}

main().catch(console.error);
