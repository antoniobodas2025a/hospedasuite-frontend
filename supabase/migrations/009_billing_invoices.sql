-- Tabla de facturas (audit trail inmutable)
-- Cada factura generada se guarda como registro permanente.
-- Permite historial, métricas MRR, y prevención de revenue leakage.

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,

  -- Período que cubre esta factura
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Desglose de cargos
  plan_fee INT NOT NULL DEFAULT 0,
  ota_commissions INT NOT NULL DEFAULT 0,
  upsell_commissions INT NOT NULL DEFAULT 0,
  total INT NOT NULL,

  -- Estado de la factura
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),

  -- Referencia de Wompi (para idempotencia y tracking)
  wompi_reference TEXT UNIQUE,
  wompi_transaction_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Índice para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_billing_invoices_hotel_id
  ON billing_invoices(hotel_id);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_status
  ON billing_invoices(status);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_period
  ON billing_invoices(period_start, period_end);

-- Comentario para documentación
COMMENT ON TABLE billing_invoices IS 'Audit trail de facturas SaaS. Cada fila es inmutable una vez creada.';
