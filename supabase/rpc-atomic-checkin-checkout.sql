-- ============================================================================
-- 🛡️ RPCs ATÓMICOS: Check-in y Checkout Transaccional
-- 
-- Reemplazan los updates secuenciales del lado del cliente (2-3 llamadas HTTP
-- independientes) por una sola transacción PostgreSQL que garantiza atomicidad:
-- TODO sucede o TODO se revierte.
--
-- Uso:
--   1. Abrí el SQL Editor de tu proyecto en supabase.com
--   2. Pegá TODO este archivo y ejecutalo
--   3. Nunca más toques el SQL, los cambios desde el cliente ya funcionan solos
-- ============================================================================

-- ============================================================================
-- RPC 1: atomic_check_in
-- Atómicamente actualiza booking → 'checked_in' y room → 'occupied'
-- con validaciones de negocio dentro de la misma transacción.
-- ============================================================================

CREATE OR REPLACE FUNCTION atomic_check_in(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id       UUID;
  v_booking_status TEXT;
  v_room_status   TEXT;
  v_room_name     TEXT;
BEGIN
  -- Lock de filas: tomamos un lock UPDATE tanto en bookings como en rooms
  -- Esto evita race conditions: otro proceso no puede modificar la misma
  -- habitación hasta que esta transacción termine.
  SELECT b.room_id, b.status, r.status, r.name
  INTO v_room_id, v_booking_status, v_room_status, v_room_name
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b, r;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND: La reserva no existe.');
  END IF;

  -- Validaciones de invariante físico
  IF v_room_status = 'dirty' THEN
    RETURN jsonb_build_object('success', false, 'error', format(
      'ROOM_DIRTY: La unidad %s requiere aseo profundo antes del Check-in.', v_room_name
    ));
  END IF;

  IF v_room_status = 'maintenance' THEN
    RETURN jsonb_build_object('success', false, 'error', format(
      'ROOM_MAINTENANCE: La unidad %s está bajo protocolos de reparación.', v_room_name
    ));
  END IF;

  IF v_room_status = 'occupied' AND v_booking_status != 'checked_in' THEN
    RETURN jsonb_build_object('success', false, 'error', format(
      'ROOM_CONFLICT: La unidad %s ya figura como ocupada por otro folio.', v_room_name
    ));
  END IF;

  -- ✨ Transacción atómica: ambas actualizaciones en una sola operación
  UPDATE bookings SET status = 'checked_in' WHERE id = p_booking_id;
  UPDATE rooms     SET status = 'occupied'  WHERE id = v_room_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================================
-- RPC 2: atomic_check_out
-- Atómicamente: booking → 'checked_out', room → 'dirty', service_items → 'paid'
-- Sin este RPC, si la actualización de la room falla, el booking ya quedó
-- como checked_out sin posibilidad de rollback.
-- ============================================================================

CREATE OR REPLACE FUNCTION atomic_check_out(
  p_booking_id  UUID,
  p_room_id     UUID,
  p_service_ids TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Cerrar el folio (booking → checked_out)
  UPDATE bookings SET status = 'checked_out' WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND: La reserva no existe.');
  END IF;

  -- 2. Marcar habitación como sucia (room → dirty)
  UPDATE rooms SET status = 'dirty' WHERE id = p_room_id;

  -- 3. Cerrar consumos pendientes (service_items → paid)
  IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
    UPDATE service_items SET status = 'paid' WHERE id::text = ANY(p_service_ids);
  END IF;

  -- Si todo sale bien, se confirma la transacción automáticamente.
  -- Si algo falla (check de FK, constraint), Postgres revierte TODO.
  RETURN jsonb_build_object('success', true);
END;
$$;
