/**
 * Data Repair Script: Fix Blob Image URLs
 *
 * Detects and repairs hotels with blob:/data:/javascript: URLs in
 * main_image_url or gallery_urls fields.
 *
 * Usage:
 *   npx tsx scripts/fix-blob-image-urls.ts           # dry-run: reports affected hotels
 *   npx tsx scripts/fix-blob-image-urls.ts --fix     # repairs: nulls out blob URLs
 *
 * Follows the pattern of scripts/fix-gallery-urls.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const INVALID_PREFIXES = ['blob:', 'data:', 'javascript:'];

function isInvalidUrl(url: string): boolean {
  return INVALID_PREFIXES.some(prefix => url.startsWith(prefix));
}

async function main() {
  const isDryRun = !process.argv.includes('--fix');
  const mode = isDryRun ? 'DRY-RUN (report only)' : 'REPAIR MODE';
  console.log(`🔧 fix-blob-image-urls — ${mode}\n`);

  // ── 1. Find hotels with blob/data/javascript URLs ────────
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, slug, main_image_url, gallery_urls')
    .not('status', 'eq', 'deleted');

  if (error || !hotels) {
    console.error('❌ Error fetching hotels:', error?.message);
    process.exit(1);
  }

  const affected: Array<{
    id: string;
    name: string;
    slug: string | null;
    mainImageInvalid: boolean;
    invalidGalleryCount: number;
    totalGalleryCount: number;
    galleryUrls: string[] | null;
    fixes: string[];
  }> = [];

  for (const hotel of hotels) {
    const fixes: string[] = [];
    let mainImageInvalid = false;
    let invalidGalleryCount = 0;
    const totalGalleryCount = Array.isArray(hotel.gallery_urls) ? hotel.gallery_urls.length : 0;

    // Check main_image_url
    if (hotel.main_image_url && isInvalidUrl(hotel.main_image_url)) {
      mainImageInvalid = true;
      fixes.push('main_image_url → NULL');
    }

    // Check gallery_urls
    if (Array.isArray(hotel.gallery_urls)) {
      for (const item of hotel.gallery_urls) {
        const url = typeof item === 'string'
          ? item
          : (item && typeof item === 'object' && 'url' in item) ? (item as any).url : null;
        if (url && isInvalidUrl(url)) {
          invalidGalleryCount++;
        }
      }

      if (invalidGalleryCount > 0) {
        fixes.push(`gallery_urls: ${invalidGalleryCount}/${totalGalleryCount} URLs inválidas`);
      }
    }

    if (fixes.length > 0) {
      affected.push({
        id: hotel.id,
        name: hotel.name,
        slug: hotel.slug,
        mainImageInvalid,
        invalidGalleryCount,
        totalGalleryCount,
        galleryUrls: Array.isArray(hotel.gallery_urls)
          ? hotel.gallery_urls.map((item: any) =>
              typeof item === 'string'
                ? item
                : (item && typeof item === 'object' && 'url' in item) ? item.url : null
            )
          : null,
        fixes,
      });
    }
  }

  // ── 2. Report ────────────────────────────────────────────
  if (affected.length === 0) {
    console.log('✅ No hotels with blob/data/javascript URLs found.');
    process.exit(0);
  }

  console.log(`📋 Found ${affected.length} hotel(s) with invalid image URLs:\n`);

  for (const hotel of affected) {
    console.log(`  🏨 ${hotel.name} (${hotel.slug || 'sin slug'})`);
    for (const fix of hotel.fixes) {
      console.log(`     🔧 ${fix}`);
    }
    console.log('');
  }

  // ── 3. Repair (if --fix flag) ────────────────────────────
  if (isDryRun) {
    console.log('💡 Dry-run complete. Run with --fix to apply repairs.');
    process.exit(0);
  }

  console.log('🔨 Applying repairs...\n');
  let repaired = 0;

  for (const hotel of affected) {
    const updates: Record<string, any> = {};

    // Null out main_image_url if invalid
    if (hotel.mainImageInvalid) {
      updates.main_image_url = null;
    }

    // Remove invalid entries from gallery_urls
    if (hotel.invalidGalleryCount > 0 && Array.isArray(hotel.galleryUrls)) {
      const cleanGallery = hotel.galleryUrls
        .filter((url: string | null) => !url || !isInvalidUrl(url));

      updates.gallery_urls = cleanGallery.length > 0 ? cleanGallery : null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('hotels')
        .update(updates)
        .eq('id', hotel.id);

      if (updateError) {
        console.error(`  ❌ ${hotel.name}: error — ${updateError.message}`);
      } else {
        console.log(`  ✅ ${hotel.name}: repaired`);
        repaired++;
      }
    }
  }

  console.log(`\n✅ ${repaired}/${affected.length} hotels repaired.`);
}

main().catch(console.error);
