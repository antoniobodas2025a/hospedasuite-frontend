-- Seed support columns for hotels table
-- These are used by the onboarding provisioning and seed scripts

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('hotel', 'glamping', 'cabanas', 'hostal', 'apartamento'));
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS is_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
