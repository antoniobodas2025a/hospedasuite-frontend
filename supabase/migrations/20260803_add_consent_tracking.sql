-- Migration: Add consent tracking for legal compliance (Ley 1581 de 2012)
-- Adds fields to hotels table and creates consent_audit table

-- 1. Add consent fields to hotels table
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_ip INET,
ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;

-- 2. Create consent_audit table for tracking consent history
CREATE TABLE IF NOT EXISTS consent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  terms_version TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('accept', 'revoke')),
  consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  consent_ip INET,
  consent_user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_consent_audit_user_id ON consent_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_hotel_id ON consent_audit(hotel_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_timestamp ON consent_audit(consent_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_consent_audit_action ON consent_audit(action);

-- 4. Add RLS policies for consent_audit
ALTER TABLE consent_audit ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent history
CREATE POLICY "Users can view own consent history"
  ON consent_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update consent records (server actions)
CREATE POLICY "Service role can manage consent"
  ON consent_audit
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Add comments for documentation
COMMENT ON TABLE consent_audit IS 'Audit trail for terms and privacy policy consent (Ley 1581 de 2012 compliance)';
COMMENT ON COLUMN consent_audit.user_id IS 'User who gave/revoked consent';
COMMENT ON COLUMN consent_audit.hotel_id IS 'Hotel associated with consent (nullable for platform-wide consent)';
COMMENT ON COLUMN consent_audit.terms_version IS 'Version of terms accepted (e.g., v1.0, v1.1)';
COMMENT ON COLUMN consent_audit.action IS 'Type of consent action: accept or revoke';
COMMENT ON COLUMN consent_audit.consent_timestamp IS 'When consent was given/revoked';
COMMENT ON COLUMN consent_audit.consent_ip IS 'IP address from which consent was given';
COMMENT ON COLUMN consent_audit.consent_user_agent IS 'Browser/device info when consent was given';

COMMENT ON COLUMN hotels.terms_accepted IS 'Whether hotel owner accepted terms and privacy policy';
COMMENT ON COLUMN hotels.terms_version IS 'Version of terms accepted';
COMMENT ON COLUMN hotels.consent_timestamp IS 'When terms were accepted';
COMMENT ON COLUMN hotels.consent_ip IS 'IP address from which terms were accepted';
COMMENT ON COLUMN hotels.consent_user_agent IS 'Browser/device info when terms were accepted';
