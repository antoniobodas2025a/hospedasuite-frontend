-- Migration: Fix consent_audit schema for guest checkout consent (Ley 1581 de 2012)
-- Problem: consent_audit.user_id REFERENCES auth.users(id) NOT NULL,
-- but guest checkout users don't have auth.users records.
-- Fix: make user_id nullable, add guest_id referencing guests table.

-- 1. Make user_id nullable (hotel owners still use it, guests won't)
ALTER TABLE consent_audit
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add guest_id for guest checkout consent
ALTER TABLE consent_audit
ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;

-- 3. Add context field to distinguish consent sources
ALTER TABLE consent_audit
ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'onboarding'
CHECK (context IN ('onboarding', 'guest_checkout', 'settings'));

-- 4. Add bookings_id for traceability to specific booking
ALTER TABLE consent_audit
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- 5. Add index for guest consent queries
CREATE INDEX IF NOT EXISTS idx_consent_audit_guest_id ON consent_audit(guest_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_booking_id ON consent_audit(booking_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_context ON consent_audit(context);

-- 6. Update comments
COMMENT ON COLUMN consent_audit.user_id IS 'Hotel owner who gave/revoked consent (nullable for guest consent)';
COMMENT ON COLUMN consent_audit.guest_id IS 'Guest who gave/revoked consent (nullable for owner consent)';
COMMENT ON COLUMN consent_audit.booking_id IS 'Booking associated with guest consent';
COMMENT ON COLUMN consent_audit.context IS 'Where consent was given: onboarding, guest_checkout, or settings';

-- 7. Add consent fields to bookings table for direct storage
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS consent_ip INET;
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;

COMMENT ON COLUMN bookings.consent_accepted IS 'Whether guest accepted privacy policy during checkout';
COMMENT ON COLUMN bookings.consent_timestamp IS 'When guest consent was given during checkout';
COMMENT ON COLUMN bookings.consent_ip IS 'IP address from which guest consent was given';
COMMENT ON COLUMN bookings.consent_user_agent IS 'Browser/device info when guest consent was given';
