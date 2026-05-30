/**
 * geocode-backfill.ts — Geocode all hotels without location data.
 *
 * Usage:
 *   npx tsx scripts/geocode-backfill.ts              # production mode
 *   npx tsx scripts/geocode-backfill.ts --dry-run     # preview only
 *   npx tsx scripts/geocode-backfill.ts --limit 50    # first 50 hotels
 *
 * Flow:
 *   1. Fetch ALL hotels without entries in hotel_locations
 *   2. For each hotel, geocode via /api/geocode (or direct lib)
 *   3. Save result in hotel_locations table
 *   4. Rate-limited to respect Nominatim ToS (1 req/sec)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const RATE_LIMIT_MS = 1_100; // 1.1s between requests (Nominatim ToS: 1 req/sec)
const LOG_FILE = 'geocode-backfill.log';

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const maxHotels = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeocodeResult {
  lat: number;
  lng: number;
  precision: 'rooftop' | 'street' | 'city' | 'none';
  source: string;
}

interface BackfillEntry {
  hotel_id: string;
  name: string;
  city: string | null;
  location: string | null;
  address: string | null;
  status: 'pending' | 'success' | 'fallback' | 'error';
  lat?: number;
  lng?: number;
  precision?: string;
  source?: string;
  error?: string;
}

// ─── Logging ─────────────────────────────────────────────────────────────────

const fs = await import('fs/promises');

async function logResult(entry: BackfillEntry): Promise<void> {
  const line = `[${entry.status.toUpperCase()}] ${entry.hotel_id} | ${entry.name} | ${entry.lat ?? '-'},${entry.lng ?? '-'} | ${entry.precision ?? '-'} | ${entry.source ?? '-'}${entry.error ? ` | ERROR: ${entry.error}` : ''}`;
  console.log(line);
  await fs.appendFile(LOG_FILE, line + '\n');
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Geocode via API ─────────────────────────────────────────────────────────

async function geocodeHotel(
  address: string | null,
  city: string | null,
  location: string | null,
): Promise<GeocodeResult | null> {
  // Build address: use full address > location > city
  const addr = address || location || '';
  const cty = city || '';

  if (!addr && !cty) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: addr || cty,
        city: cty,
        country: 'Colombia',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.warn(`  ⚠ API returned ${res.status}: ${err.error}`);
      return null;
    }

    const json = await res.json();
    return json.data as GeocodeResult;
  } catch (err) {
    console.warn(`  ⚠ Request failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n🚀 Geocode Backfill — ${isDryRun ? '🔍 DRY RUN' : '⚡ PRODUCTION'}`);
  console.log(`   Hotels to process: ${maxHotels === Infinity ? 'ALL' : maxHotels}\n`);

  // 1. Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 2. Fetch hotels without locations
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('id, name, city, location, address')
    .is('id', null) // We'll filter via NOT EXISTS
    .limit(0); // Placeholder — we'll use raw query

  // Use a more direct approach: find hotels not in hotel_locations
  const { data: allHotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('id, name, city, location, address')
    .eq('status', 'active');

  if (hotelsError) {
    console.error('❌ Error fetching hotels:', hotelsError.message);
    process.exit(1);
  }

  if (!allHotels || allHotels.length === 0) {
    console.log('✅ No active hotels found.');
    return;
  }

  // Get hotels that already have locations
  const { data: existingLocations } = await supabase
    .from('hotel_locations')
    .select('hotel_id');

  const existingIds = new Set((existingLocations || []).map((l: any) => l.hotel_id));
  const pendingHotels = allHotels.filter((h: any) => !existingIds.has(h.id));

  // Apply limit
  const batch = pendingHotels.slice(0, maxHotels);

  console.log(`   Total active hotels: ${allHotels.length}`);
  console.log(`   Already geocoded: ${existingIds.size}`);
  console.log(`   Pending: ${pendingHotels.length}`);
  console.log(`   Processing: ${batch.length}\n`);

  if (isDryRun) {
    console.log('🔍 DRY RUN — no data will be written\n');
    for (const hotel of batch) {
      const entry: BackfillEntry = {
        hotel_id: hotel.id,
        name: hotel.name,
        city: hotel.city,
        location: hotel.location,
        address: hotel.address,
        status: 'pending',
      };
      await logResult(entry);
    }
    console.log(`\n✅ Dry run complete. ${batch.length} hotels would be processed.\n`);
    return;
  }

  // 3. Geocode each hotel
  let successCount = 0;
  let fallbackCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const hotel = batch[i];
    const address = hotel.address || hotel.location || '';
    const city = hotel.city || '';

    process.stdout.write(`[${i + 1}/${batch.length}] ${hotel.name}... `);

    const result = await geocodeHotel(hotel.address, hotel.city, hotel.location);

    const entry: BackfillEntry = {
      hotel_id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      location: hotel.location,
      address: hotel.address,
      status: 'error',
    };

    if (result) {
      // Save to hotel_locations
      const { error: insertError } = await supabase
        .from('hotel_locations')
        .insert({
          hotel_id: hotel.id,
          lat: result.lat,
          lng: result.lng,
          precision: result.precision,
          source: 'backfill',
          raw_input: address || city,
          geocoded_at: new Date().toISOString(),
        });

      if (insertError) {
        entry.status = 'error';
        entry.error = insertError.message;
        console.log(`❌ DB error: ${insertError.message}`);
      } else {
        entry.status = 'success';
        entry.lat = result.lat;
        entry.lng = result.lng;
        entry.precision = result.precision;
        entry.source = result.source;
        successCount++;
        console.log(`✅ ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} (${result.precision}/${result.source})`);
      }
    } else {
      // City-level fallback
      if (city) {
        try {
          const cityRes = await geocodeHotel(city, city, null);
          if (cityRes) {
            const { error: insertError } = await supabase
              .from('hotel_locations')
              .insert({
                hotel_id: hotel.id,
                lat: cityRes.lat,
                lng: cityRes.lng,
                precision: 'city',
                source: 'backfill',
                raw_input: city,
                geocoded_at: new Date().toISOString(),
              });

            if (!insertError) {
              entry.status = 'fallback';
              entry.lat = cityRes.lat;
              entry.lng = cityRes.lng;
              entry.precision = 'city';
              entry.source = cityRes.source;
              fallbackCount++;
              console.log(`⚠ city-level: ${cityRes.lat.toFixed(4)}, ${cityRes.lng.toFixed(4)}`);
            }
          } else {
            entry.status = 'error';
            entry.error = 'No coordinates from any provider';
            errorCount++;
            console.log('❌ No coordinates');
          }
        } catch {
          entry.status = 'error';
          entry.error = 'Fallback also failed';
          errorCount++;
          console.log('❌ Fallback failed');
        }
      } else {
        entry.status = 'error';
        entry.error = 'No address or city';
        errorCount++;
        console.log('❌ No address or city');
      }
    }

    await logResult(entry);

    // Rate limit between requests
    if (i < batch.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  // 4. Summary
  console.log('\n═══════════════════════════════════');
  console.log('  📊 BACKFILL COMPLETE');
  console.log('═══════════════════════════════════');
  console.log(`  Total processed:  ${batch.length}`);
  console.log(`  ✅ Success:       ${successCount}`);
  console.log(`  ⚠  City-level:   ${fallbackCount}`);
  console.log(`  ❌ Errors:        ${errorCount}`);
  console.log(`  Log file:         ${LOG_FILE}`);
  console.log('═══════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
