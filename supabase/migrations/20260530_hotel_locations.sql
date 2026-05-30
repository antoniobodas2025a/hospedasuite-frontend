-- Migration: hotel_locations table + ota_catalog materialized view
-- PRD-009 Fase 1: Fundación de Datos de Geocoding

-- ─── hotel_locations ───────────────────────────────────────────────────────────
-- Almacena coordenadas geográficas de hoteles con trazabilidad.
-- Permite múltiples ubicaciones por hotel (refinamientos, cambios de dirección).
-- La ubicación más reciente se usa para el catálogo OTA.

CREATE TABLE IF NOT EXISTS hotel_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  precision TEXT NOT NULL CHECK (precision IN ('rooftop', 'street', 'city', 'none')),
  source TEXT NOT NULL CHECK (source IN (
    'wizard', 'google_maps_url', 'nominatim', 'mapbox', 'backfill', 'manual', 'hotelier_edit'
  )),
  raw_input TEXT,                         -- Dirección original ingresada
  normalized_address TEXT,                 -- Dirección normalizada por el proveedor
  geocoding_response JSONB,               -- Respuesta RAW del proveedor (debug)
  geocoded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_hotel_locations_hotel ON hotel_locations(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_locations_coords ON hotel_locations(lat, lng);
CREATE INDEX IF NOT EXISTS idx_hotel_locations_precision ON hotel_locations(precision);

-- ─── ota_catalog (materialized view) ──────────────────────────────────────────
-- Vista única para queries del marketplace OTA.
-- Incluye datos de hotel + ubicación más reciente + precio mínimo + rating + amenities.

CREATE MATERIALIZED VIEW IF NOT EXISTS ota_catalog AS
SELECT DISTINCT ON (h.id)
  h.id,
  h.name,
  h.slug,
  h.city,
  hl.lat,
  hl.lng,
  hl.precision,
  h.main_image_url,
  h.description,
  h.category,
  h.type,
  MIN(r.price) FILTER (WHERE r.status = 'active') AS min_price,
  AVG(rv.rating) AS avg_rating,
  COUNT(rv.id) FILTER (WHERE rv.id IS NOT NULL) AS review_count,
  array_agg(DISTINCT hfa.amenity_id) FILTER (WHERE hfa.amenity_id IS NOT NULL) AS amenity_ids
FROM hotels h
LEFT JOIN hotel_locations hl
  ON hl.hotel_id = h.id
  AND hl.id = (
    SELECT loc.id
    FROM hotel_locations loc
    WHERE loc.hotel_id = h.id
    ORDER BY loc.created_at DESC
    LIMIT 1
  )
LEFT JOIN rooms r ON r.hotel_id = h.id AND r.status = 'active'
LEFT JOIN reviews rv ON rv.hotel_id = h.id
LEFT JOIN hotel_feature_amenities hfa ON hfa.hotel_id = h.id
WHERE h.status = 'active'
GROUP BY h.id, hl.lat, hl.lng, hl.precision;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ota_catalog_id ON ota_catalog(id);

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP MATERIALIZED VIEW IF EXISTS ota_catalog;
-- DROP TABLE IF EXISTS hotel_locations CASCADE;
