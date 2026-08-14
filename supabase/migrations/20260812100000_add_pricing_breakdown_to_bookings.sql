-- Add pricing breakdown columns to bookings table
-- This allows the success page to show accurate pricing breakdown
-- that matches what was actually charged (including weekend surcharges)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS subtotal INTEGER,
ADD COLUMN IF NOT EXISTS tax_amount INTEGER,
ADD COLUMN IF NOT EXISTS tax_rate_applied NUMERIC,
ADD COLUMN IF NOT EXISTS weekend_price_used INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN bookings.subtotal IS 'Base price before tax (includes weekend surcharges if applicable)';
COMMENT ON COLUMN bookings.tax_amount IS 'Tax amount (IVA) calculated on subtotal';
COMMENT ON COLUMN bookings.tax_rate_applied IS 'Tax rate used for calculation (0 for simplified, 0.19 for responsible)';
COMMENT ON COLUMN bookings.weekend_price_used IS 'Weekend price per night used for calculation (null if no weekend nights)';
