-- Migración 013: iCal Mejorado — Tracking, Sync Log y Atribución
-- 
-- Cambios:
-- 1. billing_invoices: columnas para comisiones OTA (JSONB inmutable)
-- 2. rooms: columnas de estado de sync iCal
-- 3. bookings: columna referral_channel para atribución de links sociales
-- 4. ota_sync_log: tabla inmutable de auditoría de cada ejecución de sync

-- ============================================================================
-- 1. BILLING_INVOICES — Comisiones OTA
-- ============================================================================

ALTER TABLE billing_invoices 
  ADD COLUMN IF NOT EXISTS ota_commissions JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ota_commissions_total DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN billing_invoices.ota_commissions IS 'Detalle de comisiones OTA por reserva: [{booking_id, source, total, commission}]';
COMMENT ON COLUMN billing_invoices.ota_commissions_total IS 'Suma total de comisiones OTA en este ciclo de facturación';

-- ============================================================================
-- 2. ROOMS — Estado de sync iCal
-- ============================================================================

ALTER TABLE rooms 
  ADD COLUMN IF NOT EXISTS last_ical_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ical_sync_status TEXT DEFAULT 'ok' CHECK (ical_sync_status IN ('ok', 'error', 'pending'));

COMMENT ON COLUMN rooms.last_ical_sync IS 'Última vez que se sincronizó el calendario iCal de esta habitación';
COMMENT ON COLUMN rooms.ical_sync_status IS 'Estado del último sync: ok, error, o pending';

-- ============================================================================
-- 3. BOOKINGS — Atribución de canal directo (social links)
-- ============================================================================

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS referral_channel TEXT;

COMMENT ON COLUMN bookings.referral_channel IS 'Canal de atribución para reservas directas: instagram, whatsapp, facebook, tiktok, google';

-- ============================================================================
-- 4. OTA_SYNC_LOG — Auditoría inmutable de cada ejecución de sync
-- ============================================================================

CREATE TABLE IF NOT EXISTS ota_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Qué hotel se sincronizó
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  
  -- Resultados del sync
  rooms_synced INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  bookings_cancelled INTEGER DEFAULT 0,
  bookings_unchanged INTEGER DEFAULT 0,
  
  -- Estado de la ejecución
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  error_message TEXT,
  
  -- Metadata
  sync_source TEXT DEFAULT 'ical',  -- 'ical', 'api', 'manual'
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_ota_sync_log_hotel ON ota_sync_log(hotel_id);
CREATE INDEX IF NOT EXISTS idx_ota_sync_log_executed ON ota_sync_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ota_sync_log_status ON ota_sync_log(status);

-- RLS: habilitar row-level security
ALTER TABLE ota_sync_log ENABLE ROW LEVEL SECURITY;

-- Política: hotel solo ve sus propios logs
CREATE POLICY "hotels_view_own_sync_logs"
  ON ota_sync_log FOR SELECT
  USING (
    hotel_id IN (
      SELECT id FROM hotels WHERE owner_id = auth.uid()
    )
  );

-- Política: nadie puede modificar logs desde el cliente
CREATE POLICY "no_client_modify_sync_logs"
  ON ota_sync_log FOR INSERT
  WITH CHECK (false);

-- Política: nadie puede actualizar o borrar logs
CREATE POLICY "no_client_update_sync_logs"
  ON ota_sync_log FOR UPDATE
  USING (false);

CREATE POLICY "no_client_delete_sync_logs"
  ON ota_sync_log FOR DELETE
  USING (false);

COMMENT ON TABLE ota_sync_log IS 'Registro inmutable de cada ejecución del sync iCal. Usado para debugging y monitoreo.';
