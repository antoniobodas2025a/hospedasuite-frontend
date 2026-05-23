/**
 * Script to fix hotel slugs and upload photos from /home/anto/Descargas/patio del mundo/
 * Run: npx tsx scripts/fix-hotels-photos.ts
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Generate URL-friendly slug ──────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Upload file to Supabase Storage ─────────────────────────────────────────
async function uploadFile(filePath: string, bucket: string, destPath: string): Promise<string | null> {
  const fileBuffer = fs.readFileSync(filePath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(destPath, fileBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error(`  ❌ Error uploading ${destPath}:`, error.message);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(destPath);

  return publicUrl;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔧 Fixing hotel slugs and uploading photos...\n');

  // 1. Get all active hotels
  const { data: hotels, error: fetchError } = await supabase
    .from('hotels')
    .select('id, name, slug, main_image_url, gallery_urls, city, location, type')
    .eq('status', 'active');

  if (fetchError || !hotels) {
    console.error('❌ Error fetching hotels:', fetchError?.message);
    process.exit(1);
  }

  console.log(`📋 Found ${hotels.length} active hotels\n`);

  // 2. Fix slugs
  for (const hotel of hotels) {
    if (!hotel.slug) {
      const slug = generateSlug(hotel.name);
      console.log(`  🏷️  ${hotel.name} → slug: "${slug}"`);

      const { error } = await supabase
        .from('hotels')
        .update({ slug })
        .eq('id', hotel.id);

      if (error) {
        console.error(`  ❌ Error updating slug for ${hotel.name}:`, error.message);
      }
    }
  }

  console.log('\n✅ Slugs updated\n');

  // 3. Upload photos
  const photosDir = '/home/anto/Descargas/patio del mundo/';
  const bucket = 'hotel-images';

  if (!fs.existsSync(photosDir)) {
    console.error(`❌ Photos directory not found: ${photosDir}`);
    process.exit(1);
  }

  const photoFiles = fs.readdirSync(photosDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  console.log(`📸 Found ${photoFiles.length} photos in ${photosDir}\n`);

  // Map photos to hotels based on hotel name/type
  // "Patio del Mundo" gets the first batch
  // Other hotels get remaining photos
  const patioDelMundo = hotels.find(h => h.name.toLowerCase().includes('patio'));
  const otherHotels = hotels.filter(h => !h.name.toLowerCase().includes('patio'));

  const uploadedUrls: string[] = [];

  // Upload all photos
  for (const file of photoFiles) {
    const filePath = path.join(photosDir, file);
    const destPath = `hotels/patio-del-mundo/${file}`;

    console.log(`  ⬆️  Uploading ${file}...`);
    const url = await uploadFile(filePath, bucket, destPath);
    if (url) {
      uploadedUrls.push(url);
      console.log(`  ✅ ${url}`);
    }
  }

  console.log(`\n📸 Uploaded ${uploadedUrls.length} photos\n`);

  // 4. Assign photos to hotels
  if (patioDelMundo) {
    // Patio del Mundo gets all photos as gallery + first as main
    const galleryUrls = uploadedUrls.map(url => ({ url }));
    const mainImageUrl = uploadedUrls[0];

    console.log(`  🏨 Assigning ${uploadedUrls.length} photos to "${patioDelMundo.name}"`);

    const { error } = await supabase
      .from('hotels')
      .update({
        main_image_url: mainImageUrl,
        gallery_urls: galleryUrls,
      })
      .eq('id', patioDelMundo.id);

    if (error) {
      console.error(`  ❌ Error updating ${patioDelMundo.name}:`, error.message);
    } else {
      console.log(`  ✅ ${patioDelMundo.name} updated with ${uploadedUrls.length} photos`);
    }
  }

  // Assign some photos to other hotels (placeholder for now)
  for (const hotel of otherHotels) {
    // Give each hotel a few photos from the collection
    const startIndex = otherHotels.indexOf(hotel) * 5;
    const hotelPhotos = uploadedUrls.slice(startIndex, startIndex + 5);

    if (hotelPhotos.length > 0) {
      console.log(`  🏨 Assigning ${hotelPhotos.length} photos to "${hotel.name}"`);

      const { error } = await supabase
        .from('hotels')
        .update({
          main_image_url: hotelPhotos[0],
          gallery_urls: hotelPhotos.map(url => ({ url })),
        })
        .eq('id', hotel.id);

      if (error) {
        console.error(`  ❌ Error updating ${hotel.name}:`, error.message);
      } else {
        console.log(`  ✅ ${hotel.name} updated with ${hotelPhotos.length} photos`);
      }
    }
  }

  console.log('\n✅ All done! Hotels now have slugs and photos.');
}

main().catch(console.error);
