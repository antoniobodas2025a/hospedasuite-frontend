-- Agrega soporte para downgrade de plan y período de gracia

-- Columna para plan pendiente (downgrade solicitado, se aplica al próximo ciclo)
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS pending_plan_change TEXT
  CHECK (pending_plan_change IN ('starter', 'pro', 'enterprise'));

-- Agregar estado 'grace_period' al CHECK de subscription_status
-- Primero droppeamos el constraint existente
ALTER TABLE hotels
  DROP CONSTRAINT IF EXISTS hotels_subscription_status_check;

-- Recreamos con el nuevo valor incluido
ALTER TABLE hotels
  ADD CONSTRAINT hotels_subscription_status_check
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'grace_period', 'cancelled'));

COMMENT ON COLUMN hotels.pending_plan_change IS 'Plan al que se cambiará al inicio del próximo ciclo de facturación. NULL si no hay cambio pendiente.';
