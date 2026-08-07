-- ============================================================================
-- MIGRATION: Enforce tax_rate NOT NULL + add fiscal audit columns to bookings
-- Phase: 0 (DB foundation before Phase 1 code deploy)
-- Context: IVA pricing fix — Colombian B2C model (entered price = final price)
-- ============================================================================

-- 1. Fix NULL tax_rate → 0 (simplified = no IVA)
UPDATE hotels
SET tax_rate = 0
WHERE tax_rate IS NULL;

-- 2. Add DEFAULT 0 and NOT NULL constraint
ALTER TABLE hotels
ALTER COLUMN tax_rate SET DEFAULT 0;

ALTER TABLE hotels
ALTER COLUMN tax_rate SET NOT NULL;

-- 3. Add fiscal audit columns to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS net_price INTEGER;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tax_amount INTEGER;

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS tax_rate_applied REAL;

-- 4. Populate fiscal columns from existing data
-- Simplified hotels (tax_rate = 0): net = total, tax = 0
UPDATE bookings
SET 
  net_price = total_price,
  tax_amount = 0,
  tax_rate_applied = h.tax_rate
FROM hotels h
WHERE bookings.hotel_id = h.id
  AND h.tax_rate = 0;

-- Responsible hotels (tax_rate > 0): extract IVA from total_price
UPDATE bookings
SET 
  net_price = ROUND(total_price / (1 + h.tax_rate)),
  tax_amount = total_price - ROUND(total_price / (1 + h.tax_rate)),
  tax_rate_applied = h.tax_rate
FROM hotels h
WHERE bookings.hotel_id = h.id
  AND h.tax_rate > 0;
