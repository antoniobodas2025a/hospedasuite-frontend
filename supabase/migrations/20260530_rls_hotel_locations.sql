-- Migration: RLS for hotel_locations
-- PRD-009: Seguridad en datos de geolocalización
-- 
-- hotel_locations NO tenía RLS habilitado — cualquiera con la API key
-- podía leer y escribir coordenadas de hoteles.

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE hotel_locations ENABLE ROW LEVEL SECURITY;

-- ─── Policies ────────────────────────────────────────────────────────────────

-- Cualquier persona (autenticada o no) puede leer ubicaciones.
-- Las coordenadas de hoteles activos son datos públicos del mapa OTA.
CREATE POLICY "locations_readable_by_all"
  ON hotel_locations FOR SELECT
  USING (true);

-- Solo admins del hotel pueden insertar ubicaciones.
-- Se verifica que el hotel pertenezca al usuario autenticado.
CREATE POLICY "hotel_admins_can_insert_locations"
  ON hotel_locations FOR INSERT
  WITH CHECK (
    hotel_id IN (
      SELECT s.hotel_id FROM staff s
      WHERE s.user_id = auth.uid() AND s.role = 'admin'
    )
  );

-- Solo admins del hotel pueden actualizar ubicaciones.
CREATE POLICY "hotel_admins_can_update_locations"
  ON hotel_locations FOR UPDATE
  USING (
    hotel_id IN (
      SELECT s.hotel_id FROM staff s
      WHERE s.user_id = auth.uid() AND s.role = 'admin'
    )
  );

-- Solo admins del hotel pueden eliminar ubicaciones.
CREATE POLICY "hotel_admins_can_delete_locations"
  ON hotel_locations FOR DELETE
  USING (
    hotel_id IN (
      SELECT s.hotel_id FROM staff s
      WHERE s.user_id = auth.uid() AND s.role = 'admin'
    )
  );

-- Service role bypass (para el backfill y onboarding)
-- La política WITH CHECK (true) para INSERT/UPDATE/DELETE usando service_role
-- no es necesaria porque el service_role bypassa RLS automáticamente.

-- ─── Test de verificación ─────────────────────────────────────────────────────
-- Para probar que funciona correctamente:
-- 1. Con anon key: SELECT debe funcionar, INSERT debe fallar
-- 2. Con admin del hotel: INSERT/UPDATE/DELETE debe funcionar
-- 3. Con admin de OTRO hotel: INSERT/UPDATE/DELETE debe fallar
-- 4. Con service_role: todo debe funcionar (bypass automático)

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS locations_readable_by_all ON hotel_locations;
-- DROP POLICY IF EXISTS hotel_admins_can_insert_locations ON hotel_locations;
-- DROP POLICY IF EXISTS hotel_admins_can_update_locations ON hotel_locations;
-- DROP POLICY IF EXISTS hotel_admins_can_delete_locations ON hotel_locations;
-- ALTER TABLE hotel_locations DISABLE ROW LEVEL SECURITY;
