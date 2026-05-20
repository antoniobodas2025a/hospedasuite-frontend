-- Migración 016: SaaS Subscriptions — Billing recurrente
--
-- Tabla central para gestionar suscripciones de hoteles.
-- Reemplaza el modelo de "facturas manuales" por suscripciones trackeadas.
--
-- Estados:
--   trialing  → dentro de los 3 meses gratis
--   active    → suscripción activa, pagando
--   past_due  → pago vencido, grace period
--   cancelled → cancelada, acceso hasta fin del período
--   paused    → pausada temporalmente

-- ============================================================================
-- 1. SAAS_SUBSCRIPTIONS — Tabla central de suscripciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Plan info
  plan_key TEXT NOT NULL CHECK (plan_key IN ('starter', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused')),
  
  -- Billing periods
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Wompi integration
  wompi_customer_id TEXT,
  wompi_payment_source_id TEXT,
  wompi_subscription_id TEXT,
  last_wompi_payment_id TEXT,
  last_wompi_payment_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one subscription per hotel
  CONSTRAINT uq_saas_subscriptions_hotel UNIQUE (hotel_id)
);

-- Idempotencia: agregar columnas si la tabla ya existe pero le faltan
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS wompi_customer_id TEXT;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS wompi_payment_source_id TEXT;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS wompi_subscription_id TEXT;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS last_wompi_payment_id TEXT;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS last_wompi_payment_date TIMESTAMPTZ;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS plan_key TEXT;
ALTER TABLE saas_subscriptions ADD COLUMN IF NOT EXISTS status TEXT;

-- CHECK constraints idempotentes (solo si no existen)
DO $$
BEGIN
  -- plan_key check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saas_subscriptions_plan_key_check'
  ) THEN
    ALTER TABLE saas_subscriptions ADD CONSTRAINT saas_subscriptions_plan_key_check
      CHECK (plan_key IN ('starter', 'pro', 'enterprise'));
  END IF;

  -- status check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saas_subscriptions_status_check'
  ) THEN
    ALTER TABLE saas_subscriptions ADD CONSTRAINT saas_subscriptions_status_check
      CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'paused'));
  END IF;

  -- unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_saas_subscriptions_hotel'
  ) THEN
    ALTER TABLE saas_subscriptions ADD CONSTRAINT uq_saas_subscriptions_hotel UNIQUE (hotel_id);
  END IF;
END $$;

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON saas_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON saas_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON saas_subscriptions(plan_key);

-- RLS: habilitar row-level security
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas idempotentes
DO $$
BEGIN
  -- hotels_view_own_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'hotels_view_own_subscriptions' AND tablename = 'saas_subscriptions'
  ) THEN
    CREATE POLICY "hotels_view_own_subscriptions"
      ON saas_subscriptions FOR SELECT
      USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));
  END IF;

  -- no_client_modify_subscriptions (INSERT)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'no_client_modify_subscriptions' AND tablename = 'saas_subscriptions'
  ) THEN
    CREATE POLICY "no_client_modify_subscriptions"
      ON saas_subscriptions FOR INSERT WITH CHECK (false);
  END IF;

  -- no_client_update_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'no_client_update_subscriptions' AND tablename = 'saas_subscriptions'
  ) THEN
    CREATE POLICY "no_client_update_subscriptions"
      ON saas_subscriptions FOR UPDATE USING (false);
  END IF;

  -- no_client_delete_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'no_client_delete_subscriptions' AND tablename = 'saas_subscriptions'
  ) THEN
    CREATE POLICY "no_client_delete_subscriptions"
      ON saas_subscriptions FOR DELETE USING (false);
  END IF;
END $$;

-- Trigger: actualizar updated_at (idempotente)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS update_saas_subscriptions_updated_at ON saas_subscriptions;
CREATE TRIGGER update_saas_subscriptions_updated_at
  BEFORE UPDATE ON saas_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Migrar datos existentes: crear suscripciones para hoteles con trial/active
-- ============================================================================

INSERT INTO saas_subscriptions (
  hotel_id, 
  plan_key, 
  status, 
  current_period_start, 
  current_period_end
)
SELECT 
  h.id,
  COALESCE(h.subscription_plan, 'starter'),
  COALESCE(h.subscription_status, 'trialing'),
  h.created_at,
  COALESCE(h.trial_ends_at, h.created_at + INTERVAL '90 days')
FROM hotels h
WHERE h.subscription_status IN ('trialing', 'active')
  AND NOT EXISTS (
    SELECT 1 FROM saas_subscriptions s WHERE s.hotel_id = h.id
  )
ON CONFLICT (hotel_id) DO NOTHING;

-- ============================================================================
-- 3. COMMENTS
-- ============================================================================

COMMENT ON TABLE saas_subscriptions IS 'Suscripciones SaaS de hoteles. Una por hotel, trackea plan, estado, períodos de facturación y datos de Wompi.';
COMMENT ON COLUMN saas_subscriptions.plan_key IS 'Plan actual: starter, pro, enterprise';
COMMENT ON COLUMN saas_subscriptions.status IS 'Estado: trialing, active, past_due, cancelled, paused';
COMMENT ON COLUMN saas_subscriptions.current_period_start IS 'Inicio del período de facturación actual';
COMMENT ON COLUMN saas_subscriptions.current_period_end IS 'Fin del período de facturación actual. Si cancel_at_period_end=true, aquí se cancela.';
COMMENT ON COLUMN saas_subscriptions.cancel_at_period_end IS 'El usuario pidió cancelar. Acceso continúa hasta current_period_end.';
COMMENT ON COLUMN saas_subscriptions.wompi_customer_id IS 'ID del cliente en Wompi (para cobros recurrentes)';
COMMENT ON COLUMN saas_subscriptions.wompi_payment_source_id IS 'ID de la fuente de pago en Wompi (tarjeta guardada)';
COMMENT ON COLUMN saas_subscriptions.wompi_subscription_id IS 'ID de la suscripción en Wompi (si Wompi soporta subscriptions nativas)';
