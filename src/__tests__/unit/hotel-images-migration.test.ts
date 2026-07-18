/**
 * Hotel Images Migration — Unit Tests (T13, T14)
 *
 * Validates the SQL migration file structure and TypeScript type definitions
 * for the hotel_images table (categorized media management).
 *
 * Test contracts:
 *   T13: Migration creates hotel_images table with correct schema
 *   T14: Migration is reversible (ROLLBACK works)
 *
 * Since these tests run in a Node environment without a live PostgreSQL
 * connection, they validate the migration SQL structure statically and
 * verify TypeScript type correctness at compile time.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/030_hotel_images.sql',
);

function readMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf-8');
}

// ── Imports for type checking (RED: these will fail until types are created) ─
import type { Database } from '@/types/database';
import type { CategorizedImage, ImageCategory } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// T13: Migration creates hotel_images table with correct schema
// ═══════════════════════════════════════════════════════════════════════════

describe('T13: hotel_images migration schema', () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration();
  });

  // ── ENUM type ──────────────────────────────────────────────────────────

  it('creates the image_category ENUM type with all 8 valid categories', () => {
    const expectedCategories = [
      'exterior',
      'lobby',
      'habitacion',
      'bano',
      'amenidades',
      'restaurante',
      'entorno',
      'otros',
    ];

    // Check ENUM creation
    expect(sql).toMatch(/CREATE\s+TYPE\s+image_category\s+AS\s+ENUM/i);

    // Each category must appear in the ENUM definition
    for (const category of expectedCategories) {
      expect(sql).toMatch(new RegExp(`'${category}'`));
    }
  });

  it('does NOT include invalid categories in the ENUM', () => {
    const invalidCategories = ['exterior2', 'pool', 'gym', 'invalid_cat'];
    // These should not appear as standalone enum values
    // We check the ENUM block specifically
    const enumMatch = sql.match(
      /CREATE\s+TYPE\s+image_category\s+AS\s+ENUM\s*\(([^)]+)\)/i,
    );
    expect(enumMatch).not.toBeNull();
    const enumBlock = enumMatch![1]!;

    for (const invalid of invalidCategories) {
      expect(enumBlock).not.toContain(`'${invalid}'`);
    }
  });

  // ── TABLE structure ────────────────────────────────────────────────────

  it('creates the hotel_images table', () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?hotel_images/i);
  });

  it('defines id column as UUID with primary key', () => {
    expect(sql).toMatch(/id\s+UUID.*PRIMARY\s+KEY/i);
  });

  it('defines hotel_id column as UUID NOT NULL with FK to hotels', () => {
    expect(sql).toMatch(/hotel_id\s+UUID\s+NOT\s+NULL/i);
    expect(sql).toMatch(/REFERENCES\s+hotels\s*\(\s*id\s*\)/i);
  });

  it('defines url column as TEXT NOT NULL', () => {
    expect(sql).toMatch(/url\s+TEXT\s+NOT\s+NULL/i);
  });

  it('defines category column using image_category ENUM, NOT NULL', () => {
    expect(sql).toMatch(/category\s+image_category\s+NOT\s+NULL/i);
  });

  it('defines blur_data column as TEXT (nullable)', () => {
    expect(sql).toMatch(/blur_data\s+TEXT/i);
  });

  it('defines sort_order column as INTEGER NOT NULL with default 0', () => {
    expect(sql).toMatch(/sort_order\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i);
  });

  it('defines created_at column as TIMESTAMPTZ with default NOW()', () => {
    expect(sql).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\s*\(\s*\)/i);
  });

  it('includes ON DELETE CASCADE for the hotel_id FK', () => {
    expect(sql).toMatch(/ON\s+DELETE\s+CASCADE/i);
  });

  // ── URL safety CHECK constraint ────────────────────────────────────────

  it('includes a CHECK constraint rejecting blob:, data:, and javascript: URLs', () => {
    expect(sql).toMatch(/CHECK/i);
    expect(sql).toMatch(/NOT\s+LIKE\s+'blob:%'/i);
    expect(sql).toMatch(/NOT\s+LIKE\s+'data:%'/i);
    expect(sql).toMatch(/NOT\s+LIKE\s+'javascript:%'/i);
  });

  // ── Indexes ────────────────────────────────────────────────────────────

  it('creates composite index on (hotel_id, category, sort_order)', () => {
    expect(sql).toMatch(/CREATE\s+INDEX/i);
    // The composite index must reference all three columns
    expect(sql).toMatch(/hotel_id\s*,\s*category\s*,\s*sort_order/i);
  });

  // ── RLS ────────────────────────────────────────────────────────────────

  it('enables Row Level Security on hotel_images', () => {
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+hotel_images\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
  });

  it('creates a public read policy', () => {
    expect(sql).toMatch(/CREATE\s+POLICY.*public.*read.*hotel_images/i);
  });

  it('creates an owner/admin write policy', () => {
    expect(sql).toMatch(/CREATE\s+POLICY.*owner.*write.*hotel_images/i);
  });

  // ── Data migration ─────────────────────────────────────────────────────

  it('migrates existing gallery_urls to hotel_images with category otros', () => {
    expect(sql).toMatch(/INSERT\s+INTO\s+hotel_images/i);
    expect(sql).toMatch(/gallery_urls/i);
    expect(sql).toMatch(/'otros'/i);
  });

  it('migrates blur metadata per-image via URL match', () => {
    expect(sql).toMatch(/blur_data/i);
    expect(sql).toMatch(/image_blur_meta/i);
    expect(sql).toMatch(/LATERAL/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T14: Migration is reversible (ROLLBACK works)
// ═══════════════════════════════════════════════════════════════════════════

describe('T14: migration reversibility', () => {
  let sql: string;

  beforeAll(() => {
    sql = readMigration();
  });

  it('does NOT drop or alter the legacy hotels table columns', () => {
    // Migration must preserve gallery_urls, main_image_url, cover_photo_url
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+hotels\s+DROP\s+COLUMN/i);
    // Ensure no destructive operation on the legacy columns
    expect(sql).not.toMatch(/DROP\s+COLUMN.*gallery_urls/i);
    expect(sql).not.toMatch(/DROP\s+COLUMN.*main_image_url/i);
  });

  it('uses IF EXISTS guards for safe re-runnability', () => {
    // At least one DROP IF EXISTS or CREATE IF NOT EXISTS for rollback safety
    const hasGuard =
      /IF\s+EXISTS/i.test(sql) || /IF\s+NOT\s+EXISTS/i.test(sql);
    expect(hasGuard).toBe(true);
  });

  it('provides rollback SQL in a comment for manual recovery', () => {
    // The migration should document how to roll back
    expect(sql).toMatch(/ROLLBACK|rollback|DROP\s+TABLE/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TypeScript type safety (compile-time checks)
// ═══════════════════════════════════════════════════════════════════════════

describe('T13: TypeScript type definitions', () => {
  it('Database type includes hotel_images table definition', () => {
    // This test verifies at runtime that the type structure exists
    // The real check is compile-time — if this compiles, types are correct
    type HotelImagesTable = Database['public']['Tables']['hotel_images'];
    type Row = HotelImagesTable['Row'];
    type Insert = HotelImagesTable['Insert'];
    type Update = HotelImagesTable['Update'];

    // Verify Row has the expected fields by constructing a valid object
    const mockRow: Row = {
      id: 'uuid-1',
      hotel_id: 'uuid-2',
      url: 'https://r2.dev/image.webp',
      category: 'exterior',
      blur_data: null,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    };

    expect(mockRow.id).toBe('uuid-1');
    expect(mockRow.category).toBe('exterior');
    expect(mockRow.sort_order).toBe(0);

    // Verify Insert type exists and accepts required fields
    const mockInsert: Insert = {
      id: 'uuid-1',
      hotel_id: 'uuid-2',
      url: 'https://r2.dev/image.webp',
      category: 'lobby',
      sort_order: 1,
    };

    expect(mockInsert.category).toBe('lobby');

    // Verify Update type has all optional fields
    const mockUpdate: Update = {
      url: 'https://r2.dev/new-image.webp',
    };

    expect(mockUpdate.url).toBe('https://r2.dev/new-image.webp');
  });

  it('ImageCategory type accepts exactly the 8 valid categories', () => {
    const categories: ImageCategory[] = [
      'exterior',
      'lobby',
      'habitacion',
      'bano',
      'amenidades',
      'restaurante',
      'entorno',
      'otros',
    ];

    expect(categories).toHaveLength(8);
    expect(categories).toContain('exterior');
    expect(categories).toContain('otros');
    expect(categories).toContain('restaurante');
    expect(categories).toContain('entorno');
  });

  it('CategorizedImage interface has the correct shape', () => {
    const image: CategorizedImage = {
      url: 'https://r2.dev/hotel/exterior/1.webp',
      category: 'exterior',
      sort_order: 0,
      blur_data: 'blur-data-string',
      alt: 'Hotel exterior view',
    };

    expect(image.url).toBe('https://r2.dev/hotel/exterior/1.webp');
    expect(image.category).toBe('exterior');
    expect(image.sort_order).toBe(0);
    expect(image.blur_data).toBe('blur-data-string');
    expect(image.alt).toBe('Hotel exterior view');
  });

  it('CategorizedImage allows null blur_data', () => {
    const image: CategorizedImage = {
      url: 'https://r2.dev/image.webp',
      category: 'habitacion',
      sort_order: 2,
      blur_data: null,
    };

    expect(image.blur_data).toBeNull();
  });

  it('CategorizedImage allows omitting optional alt field', () => {
    const image: CategorizedImage = {
      url: 'https://r2.dev/image.webp',
      category: 'bano',
      sort_order: 1,
    };

    expect(image.alt).toBeUndefined();
  });
});
