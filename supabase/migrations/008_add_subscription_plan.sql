-- Agrega columnas de suscripción SaaS a la tabla hotels
-- Modelo post-pago: los hoteles usan el sistema todo el mes y se les factura al cierre
-- Período de prueba: 3 meses gratis desde el registro

-- Plan de suscripción contratado (starter, pro, enterprise)
-- Define qué funcionalidades tiene habilitadas el hotel
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter'
  CHECK (subscription_plan IN ('starter', 'pro', 'enterprise'));

-- Estado actual de la suscripción:
--   trialing  → dentro de los 3 meses gratis
--   active    → suscripción activa post-trial
--   past_due  → factura vencida, funcionalidad limitada
--   cancelled → suscripción cancelada, datos exportables por 30 días
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing'
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled'));

-- Fecha de fin del período de prueba (3 meses desde el registro)
-- NULL si ya pasó el trial o si no aplica
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Fecha de inicio del ciclo de facturación mensual
-- Se setea cuando termina el trial y empieza el cobro recurrente
-- NULL durante el período de prueba
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS billing_cycle_start DATE;

-- Fecha del último pago registrado (facturación manual vía Wompi)
-- NULL si nunca se ha pagado o está en trial
ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS date_paid TIMESTAMPTZ;
