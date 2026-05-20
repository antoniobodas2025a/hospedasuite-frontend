-- Migración 018: Unificar POS con Carta Digital schema
--
-- El POS viejo usa menu_items con columnas: category (string), image_emoji, is_active
-- La migración 017 creó menu_items con: category_id (UUID FK), image_url, is_available
--
-- Esta migración:
-- 1. Agrega columnas legacy para compatibilidad con POS
-- 2. Crea vista unificada para que ambos sistemas coexistan

-- ─── 1. Agregar columnas de compatibilidad ─────────────────────

-- category_legacy: string category name (para filtro rápido del POS)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_legacy TEXT;

-- image_emoji: fallback emoji cuando no hay image_url
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_emoji TEXT DEFAULT '🍽️';

-- is_active: alias de is_available (para compatibilidad con código viejo)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN GENERATED ALWAYS AS (is_available) STORED;

-- ─── 2. Trigger: sync category_legacy cuando cambia category_id ─

CREATE OR REPLACE FUNCTION sync_category_legacy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO NEW.category_legacy
    FROM menu_categories
    WHERE id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_category_legacy_on_insert
  BEFORE INSERT OR UPDATE OF category_id ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_category_legacy();

-- ─── 3. Pobrar category_legacy para items existentes ───────────

UPDATE menu_items
SET category_legacy = mc.name
FROM menu_categories mc
WHERE menu_items.category_id = mc.id
  AND menu_items.category_legacy IS NULL;

-- ─── 4. Comments ───────────────────────────────────────────────

COMMENT ON COLUMN menu_items.category_legacy IS 'Nombre de categoría como string (compatibilidad POS). Se sincroniza automáticamente desde category_id.';
COMMENT ON COLUMN menu_items.image_emoji IS 'Emoji fallback para POS cuando no hay image_url.';
COMMENT ON COLUMN menu_items.is_active IS 'Columna generada: alias de is_available para compatibilidad.';
