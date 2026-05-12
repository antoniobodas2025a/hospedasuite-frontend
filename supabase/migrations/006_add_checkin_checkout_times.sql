-- Add check-in/out time configuration to hotels table
-- Allows hotels to customize their check-in, check-out, and reception hours

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS check_in_time TEXT DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS check_out_time TEXT DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS reception_hours TEXT DEFAULT '24/7';
