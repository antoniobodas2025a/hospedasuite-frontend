-- ============================================================================
-- Migración 20260615: Hotel Fingerprints — Prevención de Duplicados
-- ============================================================================
-- Tabla hotel_fingerprints para detectar hoteles duplicados al registrarse.
-- El fingerprint es un hash SHA256 de nombre+ciudad+ubicación normalizado.
-- Hoteles con fingerprint duplicado se marcan como 'duplicate_review' para
-- que un super-admin los revise manualmente.
-- ============================================================================

-- 1. TABLA hotel_fingerprints
CREATE TABLE IF NOT EXISTS hotel_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  fingerprint_hash TEXT UNIQUE NOT NULL,
  name_normalized TEXT,
  city_normalized TEXT,
  location_normalized TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE hotel_fingerprints IS 'Huellas digitales de hoteles para detección de duplicados. El hash se calcula como SHA256(nombre|ciudad|ubicación) normalizados.';
COMMENT ON COLUMN hotel_fingerprints.fingerprint_hash IS 'SHA256 del nombre, ciudad y ubicación normalizados en minúsculas sin espacios extras.';
COMMENT ON COLUMN hotel_fingerprints.name_normalized IS 'Nombre del hotel normalizado (lowercase, trimmed).';
COMMENT ON COLUMN hotel_fingerprints.city_normalized IS 'Ciudad normalizada (lowercase, trimmed).';
COMMENT ON COLUMN hotel_fingerprints.location_normalized IS 'Ubicación/vereda normalizada (lowercase, trimmed).';

-- Índice UNIQUE en fingerprint_hash (ya cubierto por la constraint UNIQUE, pero explícito para claridad)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_fingerprints_hash ON hotel_fingerprints(fingerprint_hash);

-- Índice para búsqueda por hotel
CREATE INDEX IF NOT EXISTS idx_hotel_fingerprints_hotel_id ON hotel_fingerprints(hotel_id);

-- ============================================================================
-- 2. AGREGAR 'duplicate_review' AL CHECK DE subscription_status
-- ============================================================================
-- Mismo patrón que migraciones 011 y 024: DROP + ADD
ALTER TABLE hotels
  DROP CONSTRAINT IF EXISTS hotels_subscription_status_check;

ALTER TABLE hotels
  ADD CONSTRAINT hotels_subscription_status_check
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'grace_period', 'cancelled', 'pending_approval', 'duplicate_review'));

COMMENT ON COLUMN hotels.subscription_status IS 'trialing | active | past_due | grace_period | cancelled | pending_approval | duplicate_review';

-- ============================================================================
-- 3. RLS — hotel_fingerprints
-- ============================================================================
ALTER TABLE hotel_fingerprints ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden leer fingerprints de su propio hotel
DROP POLICY IF EXISTS "hotel_fingerprints_owner_read" ON hotel_fingerprints;
CREATE POLICY "hotel_fingerprints_owner_read" ON hotel_fingerprints
  FOR SELECT
  USING (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  );

-- Política: service_role puede insertar y actualizar (usado en server actions)
-- Nota: el acceso de service_role bypassa RLS por defecto en Supabase,
-- pero es buena práctica documentarlo con una política explícita.
DROP POLICY IF EXISTS "hotel_fingerprints_service_role" ON hotel_fingerprints;
CREATE POLICY "hotel_fingerprints_service_role" ON hotel_fingerprints
  FOR ALL
  USING (true)
  WITH CHECK (true);
