-- Migración 016: SaaS Subscriptions — Billing recurrente
--
-- Tabla central para gestionar suscripciones de hoteles.
-- Reemplaza el modelo de "facturas manuales" por suscripciones trackeadas.

-- ============================================================================
-- 0. DROP tabla existente (puede tener schema incompatible de intentos previos)
-- ============================================================================

DROP TABLE IF EXISTS saas_subscriptions CASCADE;

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  wompi_customer_id TEXT,
  wompi_payment_source_id TEXT,
  wompi_subscription_id TEXT,
  last_wompi_payment_id TEXT,
  last_wompi_payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_saas_subscriptions_hotel UNIQUE (hotel_id)
);

-- ============================================================================
-- 2. Constraints
-- ============================================================================

ALTER TABLE saas_subscriptions ADD CONSTRAINT saas_subscriptions_plan_key_check
  CHECK (plan_key IN ('starter', 'pro', 'enterprise'));

ALTER TABLE saas_subscriptions ADD CONSTRAINT saas_subscriptions_status_check
  CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused'));

-- ============================================================================
-- 3. Indexes
-- ============================================================================

CREATE INDEX idx_subscriptions_status ON saas_subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON saas_subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_plan ON saas_subscriptions(plan_key);

-- ============================================================================
-- 4. RLS
-- ============================================================================

ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotels_view_own_subscriptions" ON saas_subscriptions FOR SELECT
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

CREATE POLICY "no_client_modify_subscriptions" ON saas_subscriptions FOR INSERT WITH CHECK (false);
CREATE POLICY "no_client_update_subscriptions" ON saas_subscriptions FOR UPDATE USING (false);
CREATE POLICY "no_client_delete_subscriptions" ON saas_subscriptions FOR DELETE USING (false);

-- ============================================================================
-- 5. Trigger updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saas_subscriptions_updated_at
  BEFORE UPDATE ON saas_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. Migrar datos existentes
-- ============================================================================

INSERT INTO saas_subscriptions (
  id, hotel_id, plan_key, status, current_period_start, current_period_end
)
SELECT 
  gen_random_uuid(),
  h.id,
  CASE LOWER(COALESCE(h.subscription_plan, 'starter'))
    WHEN 'standard' THEN 'starter'
    WHEN 'pro' THEN 'pro'
    WHEN 'enterprise' THEN 'enterprise'
    ELSE 'starter'
  END,
  COALESCE(h.subscription_status, 'trialing'),
  h.created_at,
  COALESCE(h.trial_ends_at, h.created_at + INTERVAL '90 days')
FROM hotels h
WHERE h.subscription_status IN ('trialing', 'active')
ON CONFLICT (hotel_id) DO NOTHING;

-- ============================================================================
-- 7. Comments
-- ============================================================================

COMMENT ON TABLE saas_subscriptions IS 'Suscripciones SaaS de hoteles.';
COMMENT ON COLUMN saas_subscriptions.plan_key IS 'Plan: starter, pro, enterprise';
COMMENT ON COLUMN saas_subscriptions.status IS 'Estado: trialing, active, past_due, cancelled, paused';
COMMENT ON COLUMN saas_subscriptions.current_period_start IS 'Inicio del período actual';
COMMENT ON COLUMN saas_subscriptions.current_period_end IS 'Fin del período actual';
COMMENT ON COLUMN saas_subscriptions.cancel_at_period_end IS 'Cancelación al fin del período';
COMMENT ON COLUMN saas_subscriptions.wompi_customer_id IS 'ID cliente en Wompi';
COMMENT ON COLUMN saas_subscriptions.wompi_payment_source_id IS 'ID fuente de pago en Wompi';
COMMENT ON COLUMN saas_subscriptions.wompi_subscription_id IS 'ID suscripción en Wompi';
