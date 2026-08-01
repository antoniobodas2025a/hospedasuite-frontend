-- Add referred_by column to hotels table
-- Tracks which partner/seller referred this hotel for automatic commission calculation

ALTER TABLE hotels
ADD COLUMN referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN hotels.referred_by IS 'Partner/seller user_id who referred this hotel for commission tracking';

-- Index for efficient commission queries
CREATE INDEX idx_hotels_referred_by ON hotels(referred_by) WHERE referred_by IS NOT NULL;
