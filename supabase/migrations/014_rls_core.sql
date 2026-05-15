-- ============================================================================
-- Migración 014: RLS Core — Aislamiento Multi-Tenant
-- ============================================================================
-- Habilita Row Level Security en todas las tablas core.
-- Estructura real confirmada:
-- - guests: tiene hotel_id directo
-- - service_items, payments: tienen booking_id (vinculado a bookings.hotel_id)
-- ============================================================================

-- 1. HOTELS
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotels_owner_access" ON hotels;
CREATE POLICY "hotels_owner_access" ON hotels
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 2. ROOMS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_tenant_isolation" ON rooms;
CREATE POLICY "rooms_tenant_isolation" ON rooms
  FOR ALL
  USING (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  );

-- 3. BOOKINGS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_tenant_isolation" ON bookings;
CREATE POLICY "bookings_tenant_isolation" ON bookings
  FOR ALL
  USING (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  );

-- 4. GUESTS (hotel_id directo)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guests_tenant_isolation" ON guests;
CREATE POLICY "guests_tenant_isolation" ON guests
  FOR ALL
  USING (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  );

-- 5. SERVICE_ITEMS (booking_id -> bookings.hotel_id)
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_items_tenant_isolation" ON service_items;
CREATE POLICY "service_items_tenant_isolation" ON service_items
  FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
    )
  );

-- 6. BILLING_INVOICES (hotel_id directo)
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_invoices_tenant_isolation" ON billing_invoices;
CREATE POLICY "billing_invoices_tenant_isolation" ON billing_invoices
  FOR ALL
  USING (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
  );

-- 7. PAYMENTS (booking_id -> bookings.hotel_id)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_tenant_isolation" ON payments;
CREATE POLICY "payments_tenant_isolation" ON payments
  FOR ALL
  USING (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    booking_id IN (
      SELECT id FROM bookings 
      WHERE hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid())
    )
  );

-- ============================================================================
-- FIN DE MIGRACIÓN 014
-- ============================================================================
