-- Migration 027: Webhook Delivery Log
-- Persiste resultados de entrega de webhooks Wompi (platform + tenant).
-- Reemplaza console.log() con una tabla consultable para el dashboard de salud.

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(20) NOT NULL CHECK (webhook_type IN ('platform', 'tenant')),
  event_type VARCHAR(50),
  payload JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'failed', 'pending')),
  response_code SMALLINT,
  response_body JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries del dashboard de salud
CREATE INDEX IF NOT EXISTS idx_webhook_log_type ON webhook_delivery_log (webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_log_status ON webhook_delivery_log (status);
CREATE INDEX IF NOT EXISTS idx_webhook_log_created ON webhook_delivery_log (created_at DESC);

-- RLS: Solo superadmins pueden leer; los inserts son server-side (service key)
ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_client_insert_webhook_log"
  ON webhook_delivery_log FOR INSERT
  WITH CHECK (false);

CREATE POLICY "superadmins_view_webhook_log"
  ON webhook_delivery_log FOR SELECT
  USING (auth.email() = 'suitehospeda@gmail.com');

COMMENT ON TABLE webhook_delivery_log IS 'Registro de entregas de webhooks Wompi (platform + tenant). Append-only, consultable por superadmins.';
