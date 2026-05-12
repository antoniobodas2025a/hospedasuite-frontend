-- Add category badge configuration to hotels table
-- Allows hotels to customize or hide the category badge shown on OTA page

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS category_badge TEXT;
