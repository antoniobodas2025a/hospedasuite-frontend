-- Add marketing content configuration to hotels table
-- Allows hotels to customize story section title and trust badge texts

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS story_section_title TEXT DEFAULT 'La Historia',
  ADD COLUMN IF NOT EXISTS trust_badge_1_title TEXT DEFAULT 'Reserva Directa',
  ADD COLUMN IF NOT EXISTS trust_badge_1_subtitle TEXT DEFAULT 'Sin intermediarios',
  ADD COLUMN IF NOT EXISTS trust_badge_2_title TEXT DEFAULT 'Confirmacion Inmediata',
  ADD COLUMN IF NOT EXISTS trust_badge_2_subtitle TEXT DEFAULT 'Bloqueo al instante';
