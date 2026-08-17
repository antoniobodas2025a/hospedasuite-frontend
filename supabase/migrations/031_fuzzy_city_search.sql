-- Migration 031: Fuzzy City Search with pg_trgm
-- Adds trigram index on hotels.city and RPC for fuzzy matching.
--
-- ROLLBACK: DROP FUNCTION IF EXISTS search_cities_fuzzy;
--           DROP INDEX IF EXISTS idx_hotels_city_trgm;
--           DROP EXTENSION IF EXISTS pg_trgm;

-- ── 1. Enable pg_trgm extension ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 2. GIN trigram index on hotels.city ──────────────────────────────────────
--    Enables fast fuzzy matching via similarity() and ILIKE with %
CREATE INDEX IF NOT EXISTS idx_hotels_city_trgm
    ON hotels
    USING gin (city gin_trgm_ops)
    WHERE city IS NOT NULL;

-- ── 3. RPC: search_cities_fuzzy ───────────────────────────────────────────────
--    Returns distinct cities matching a fuzzy query, with hotel count,
--    first coordinates (lat/lng), and similarity score, ordered by similarity DESC.
CREATE OR REPLACE FUNCTION search_cities_fuzzy(
    search_query TEXT,
    min_similarity FLOAT DEFAULT 0.3,
    max_results INTEGER DEFAULT 8
)
RETURNS TABLE (
    city        TEXT,
    coordinates JSONB,
    hotel_count BIGINT,
    similarity  FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.city,
        (ARRAY_AGG(
            CASE WHEN hl.lat IS NOT NULL AND hl.lng IS NOT NULL
            THEN jsonb_build_object('lat', hl.lat, 'lng', hl.lng)
            END
        ))[1]                                    AS coordinates,
        COUNT(*)::BIGINT                         AS hotel_count,
        similarity(h.city, search_query)::FLOAT  AS similarity
    FROM hotels h
    LEFT JOIN hotel_locations hl ON hl.hotel_id = h.id
    WHERE h.status  = 'active'
      AND h.city    IS NOT NULL
      AND similarity(h.city, search_query) >= min_similarity
    GROUP BY h.city, similarity(h.city, search_query)
    ORDER BY similarity DESC, hotel_count DESC
    LIMIT max_results;
END;
$$;
