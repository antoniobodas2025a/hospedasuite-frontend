-- ============================================================================
-- Migración 024: Pagos Manuales (Nequi / Daviplata)
-- ============================================================================
-- Tabla manual_payments para registrar pagos por transferencia manual
-- con comprobante adjunto, workflow de aprobación por super-admin.
-- ============================================================================

-- 1. TABLA manual_payments
CREATE TABLE IF NOT EXISTS manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('nequi', 'daviplata')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  receipt_url TEXT NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE manual_payments IS 'Pagos manuales con comprobante (Nequi/Daviplata). Flujo: pending → approved | rejected por super-admin.';
COMMENT ON COLUMN manual_payments.receipt_url IS 'URL pública del comprobante en Supabase Storage (bucket manual-payment-receipts).';
COMMENT ON COLUMN manual_payments.approved_by IS 'ID del super-admin que aprobó el pago. NULL si está pendiente o rechazado.';

-- Índices para búsqueda por hotel y filtrado por estado
CREATE INDEX IF NOT EXISTS idx_manual_payments_hotel_id ON manual_payments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_status ON manual_payments(status);
CREATE INDEX IF NOT EXISTS idx_manual_payments_created_at ON manual_payments(created_at DESC);

-- ============================================================================
-- 2. AGREGAR 'pending_approval' AL CHECK DE subscription_status
-- ============================================================================
-- Mismo patrón que migración 011 (grace_period): DROP + ADD
ALTER TABLE hotels
  DROP CONSTRAINT IF EXISTS hotels_subscription_status_check;

ALTER TABLE hotels
  ADD CONSTRAINT hotels_subscription_status_check
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'grace_period', 'cancelled', 'pending_approval'));

COMMENT ON COLUMN hotels.subscription_status IS 'trialing | active | past_due | grace_period | cancelled | pending_approval';

-- ============================================================================
-- 3. RLS — manual_payments
-- ============================================================================
ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados INSERT/SELECT sus propios pagos
DROP POLICY IF EXISTS "manual_payments_user_access" ON manual_payments;
CREATE POLICY "manual_payments_user_access" ON manual_payments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: super-admin puede ver y modificar todos (via service_role bypass en server actions)
-- Nota: el acceso de super-admin se maneja con supabaseAdmin (service_role) en server actions,
-- por lo que no requiere política RLS explícita.

-- ============================================================================
-- 4. STORAGE BUCKET — manual-payment-receipts
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manual-payment-receipts',
  'manual-payment-receipts',
  false,
  5242880, -- 5 MB máximo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Storage: autenticados pueden subir
DROP POLICY IF EXISTS "manual_receipts_upload" ON storage.objects;
CREATE POLICY "manual_receipts_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'manual-payment-receipts'
    AND auth.role() = 'authenticated'
  );

-- RLS Storage: autenticados pueden leer sus propios archivos
DROP POLICY IF EXISTS "manual_receipts_read" ON storage.objects;
CREATE POLICY "manual_receipts_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'manual-payment-receipts'
    AND auth.role() = 'authenticated'
  );
