-- Migración 019: Migrar menu_items.id de BIGINT a UUID
--
-- El POS legacy creó menu_items con id BIGINT.
-- Carta Digital y el DAL esperan UUID.
-- Esta migración convierte el tipo sin perder datos ni relaciones.

-- ============================================================================
-- Paso 1: Crear columna UUID temporal y poblarla
-- ============================================================================

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();

-- Asegurar que todos los rows tienen un UUID único
UPDATE menu_items SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- ============================================================================
-- Paso 2: Crear tabla de mapeo old_id → new_id
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS menu_id_mapping (
  old_id BIGINT PRIMARY KEY,
  new_id UUID NOT NULL
);

INSERT INTO menu_id_mapping (old_id, new_id)
SELECT id, new_id FROM menu_items;

-- ============================================================================
-- Paso 3: Actualizar FKs que referencian menu_items.id
-- ============================================================================

-- 3a. menu_views.menu_item_id (BIGINT → UUID)
ALTER TABLE menu_views ADD COLUMN IF NOT EXISTS menu_item_id_new UUID;

UPDATE menu_views
SET menu_item_id_new = m.new_id
FROM menu_id_mapping m
WHERE menu_views.menu_item_id = m.old_id;

-- 3b. Si hay otras tablas con FK a menu_items.id, actualizarlas aquí
-- (Por ahora solo menu_views tiene FK)

-- ============================================================================
-- Paso 4: Dropear constraints existentes
-- ============================================================================

-- Dropear FK de menu_views
ALTER TABLE menu_views DROP CONSTRAINT IF EXISTS menu_views_menu_item_id_fkey;

-- Dropear FK de menu_items → menu_categories
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;

-- Dropear PK de menu_items
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_pkey;

-- ============================================================================
-- Paso 5: Reemplazar columnas
-- ============================================================================

-- Dropear columna old id
ALTER TABLE menu_items DROP COLUMN IF EXISTS id;

-- Renombrar new_id → id
ALTER TABLE menu_items RENAME COLUMN new_id TO id;

-- Agregar PK
ALTER TABLE menu_items ADD PRIMARY KEY (id);

-- Dropear columna old en menu_views
ALTER TABLE menu_views DROP COLUMN IF EXISTS menu_item_id;

-- Renombrar new → old nombre
ALTER TABLE menu_views RENAME COLUMN menu_item_id_new TO menu_item_id;

-- ============================================================================
-- Paso 6: Recrear FKs
-- ============================================================================

ALTER TABLE menu_items ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL;

ALTER TABLE menu_views ADD CONSTRAINT menu_views_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL;

-- ============================================================================
-- Paso 7: Recrear indexes que usan id
-- ============================================================================

DROP INDEX IF EXISTS idx_menu_items_hotel;
CREATE INDEX idx_menu_items_hotel ON menu_items(hotel_id);

DROP INDEX IF EXISTS idx_menu_items_category;
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

DROP INDEX IF EXISTS idx_menu_items_available;
CREATE INDEX idx_menu_items_available ON menu_items(hotel_id, is_available);

DROP INDEX IF EXISTS idx_menu_items_featured;
CREATE INDEX idx_menu_items_featured ON menu_items(hotel_id, is_featured);

DROP INDEX IF EXISTS idx_menu_views_item;
CREATE INDEX idx_menu_views_item ON menu_views(menu_item_id);

-- ============================================================================
-- Paso 8: Cleanup
-- ============================================================================

DROP TABLE IF EXISTS menu_id_mapping;

-- ============================================================================
-- Paso 9: Verificación
-- ============================================================================

-- Verificar que no quedaron rows sin id
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM menu_items WHERE id IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'menu_items tiene % rows sin id después de la migración', v_count;
  END IF;
END $$;
