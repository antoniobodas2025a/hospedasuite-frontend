-- Add trust badges toggle to hotels table
-- Allows hotels to show/hide the trust badges section on OTA page

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS show_trust_badges BOOLEAN DEFAULT true;
