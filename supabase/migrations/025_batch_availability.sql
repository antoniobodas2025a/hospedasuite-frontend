-- Migration 025: Batch hotel availability RPC
-- Replaces N+1 per-hotel get_available_rooms RPC calls with a single array-based query.
-- Pattern: LEFT JOIN LATERAL with anti-join (NOT EXISTS on active bookings).
-- Returns availability counts, total room counts, and minimum price per hotel.

CREATE OR REPLACE FUNCTION get_batch_availability(
  p_hotel_ids uuid[],
  p_check_in date,
  p_check_out date,
  p_guests integer DEFAULT 0
)
RETURNS TABLE(
  hotel_id uuid,
  available_rooms bigint,
  total_rooms bigint,
  min_price numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id AS hotel_id,
    COALESCE(avail.cnt, 0)::bigint AS available_rooms,
    COALESCE(tot.cnt, 0)::bigint AS total_rooms,
    COALESCE(avail.min_p, tot.min_p, 0)::numeric AS min_price
  FROM unnest(p_hotel_ids) AS h(id)
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS cnt,
      MIN(r.price) AS min_p
    FROM rooms r
    WHERE r.hotel_id = h.id
      AND r.status != 'maintenance'
      AND (p_guests <= 0 OR r.capacity >= p_guests)
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.room_id = r.id
          AND b.status NOT IN ('cancelled', 'CANCELLED')
          AND b.check_in < p_check_out
          AND b.check_out > p_check_in
      )
  ) avail ON true
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS cnt,
      MIN(r.price) AS min_p
    FROM rooms r
    WHERE r.hotel_id = h.id
      AND r.status != 'maintenance'
  ) tot ON true;
END;
$$;
