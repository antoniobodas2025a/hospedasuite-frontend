-- Migration 029: Feature Flags — Runtime toggle system with per-hotel overrides
-- Replaces build-time process.env flag toggling with a database-backed system.
-- Only service-role has RLS access; client-side operations are blocked.

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key TEXT NOT NULL,
  flag_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  hotel_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_feature_flag_key_hotel UNIQUE NULLS NOT DISTINCT (flag_key, hotel_id)
);

-- Indexes for common queries: lookup by key, by hotel, filter by enabled
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags (flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_hotel ON feature_flags (hotel_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags (enabled);

-- RLS: service-role bypasses RLS entirely. Client access is blocked.
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON feature_flags FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "no_client_access_feature_flags" ON feature_flags FOR ALL
  USING (false) WITH CHECK (false);

-- Trigger for updated_at auto-management
CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE feature_flags IS 'Runtime feature flags with global and per-hotel scope. Managed exclusively by superadmins.';
