-- Add go_live gate columns to hotels table
-- Enables explicit "Go Live" activation by hoteliers after passing all readiness checks.
-- Used by checkGoLiveGate() to guard OTA publish and other post-live features.

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS go_live BOOLEAN DEFAULT false;

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS go_live_at TIMESTAMPTZ;

COMMENT ON COLUMN hotels.go_live IS 'Whether the hotel has been explicitly activated for public sale. Set via setGoLiveAction after all Required readiness checks pass.';
COMMENT ON COLUMN hotels.go_live_at IS 'Timestamp when the hotel was activated for public sale via Go Live CTA.';
