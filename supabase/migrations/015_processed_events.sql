-- Table for idempotency tracking of event consumption
CREATE TABLE IF NOT EXISTS processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  correlation_id VARCHAR(100) NOT NULL,
  payload_hash VARCHAR(64) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'processed',

  -- Prevent duplicate processing of the same event
  CONSTRAINT unique_event UNIQUE (event_type, correlation_id)
);

-- Index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS idx_processed_events_lookup
  ON processed_events (event_type, correlation_id);

-- Index for monitoring/auditing
CREATE INDEX IF NOT EXISTS idx_processed_events_time
  ON processed_events (processed_at DESC);
