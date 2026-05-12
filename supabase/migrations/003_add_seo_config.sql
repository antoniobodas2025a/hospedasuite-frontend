-- Add SEO configuration columns to hotels table
-- Allows hotels to customize meta title, description, OG image, and canonical URL

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS seo_meta_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_meta_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS seo_canonical_url TEXT;
