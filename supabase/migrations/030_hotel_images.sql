-- Migration 030: Hotel Images — Normalized categorized media storage
-- Replaces flat gallery_urls[] with a structured hotel_images table.
-- Each image carries a mandatory category, sort order, and optional blur metadata.
-- Legacy columns (gallery_urls, main_image_url, cover_photo_url) are preserved.
--
-- ROLLBACK: DROP TABLE IF EXISTS hotel_images; DROP TYPE IF EXISTS image_category;

-- ── ENUM: image_category ─────────────────────────────────────────────────────
CREATE TYPE image_category AS ENUM (
  'exterior',
  'lobby',
  'habitacion',
  'bano',
  'amenidades',
  'restaurante',
  'entorno',
  'otros'
);

-- ── TABLE: hotel_images ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  category image_category NOT NULL,
  blur_data TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_hotel_images_url_safety CHECK (
    url NOT LIKE 'blob:%'
    AND url NOT LIKE 'data:%'
    AND url NOT LIKE 'javascript:%'
  )
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────

-- Composite index for category-grouped display queries (R4: priority ordering)
CREATE INDEX IF NOT EXISTS idx_hotel_images_category_sort
  ON hotel_images (hotel_id, category, sort_order);

-- Index for hotel-level lookups (backfill, CRUD)
CREATE INDEX IF NOT EXISTS idx_hotel_images_hotel
  ON hotel_images (hotel_id);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE hotel_images ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can view hotel images
CREATE POLICY "public_read_hotel_images" ON hotel_images
  FOR SELECT USING (true);

-- Owner write: only hotel admins can insert/update/delete
CREATE POLICY "owner_write_hotel_images" ON hotel_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.hotel_id = hotel_images.hotel_id
        AND staff.user_id = auth.uid()
        AND staff.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.hotel_id = hotel_images.hotel_id
        AND staff.user_id = auth.uid()
        AND staff.role = 'admin'
    )
  );

-- ── DATA MIGRATION: gallery_urls → hotel_images ─────────────────────────────

-- Migrate existing flat gallery URLs with default category 'otros'
INSERT INTO hotel_images (hotel_id, url, category, blur_data, sort_order)
SELECT
  h.id,
  unnest(h.gallery_urls) AS url,
  'otros'::image_category,
  NULL,
  generate_subscripts(h.gallery_urls, 1) - 1
FROM hotels h
WHERE h.gallery_urls IS NOT NULL
  AND array_length(h.gallery_urls, 1) > 0;

-- Migrate blur metadata per-image (best-effort match by URL)
UPDATE hotel_images hi
SET blur_data = gb.blur
FROM hotels h,
  LATERAL jsonb_array_elements(h.image_blur_meta->'gallery_blurs') AS gb
WHERE hi.hotel_id = h.id
  AND hi.url = gb->>'url'
  AND hi.blur_data IS NULL
  AND h.image_blur_meta IS NOT NULL;

COMMENT ON TABLE hotel_images IS 'Normalized categorized hotel images. Replaces flat gallery_urls[] with per-image category metadata.';
