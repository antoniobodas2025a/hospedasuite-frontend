-- Migración 017: Carta Digital
--
-- Tablas para el sistema de carta digital/menú del restaurante del hotel.
-- Incluye categorías, items, códigos QR por mesa, y analytics de vistas.

-- ============================================================================
-- 1. MENU_CATEGORIES — Categorías del menú
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_en TEXT,                    -- Traducción automática al inglés
  description TEXT,
  description_en TEXT,
  display_order INT DEFAULT 0,     -- Orden de visualización
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_hotel ON menu_categories(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories(hotel_id, is_active);

-- ============================================================================
-- 2. MENU_ITEMS — Items del menú (platos, bebidas, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_en TEXT,                    -- Traducción automática al inglés
  description TEXT,
  description_en TEXT,
  price INT NOT NULL DEFAULT 0,    -- Precio en COP
  image_url TEXT,                  -- URL de la foto del plato (R2/Supabase)
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- Destacado en la carta
  display_order INT DEFAULT 0,
  tags TEXT[],                     -- Ej: ['vegetariano', 'picante', 'sin gluten']
  allergens TEXT[],                -- Ej: ['gluten', 'lacteos', 'nueces']
  preparation_time_min INT,        -- Tiempo estimado de preparación
  calories INT,                    -- Calorías (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_hotel ON menu_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(hotel_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON menu_items(hotel_id, is_featured);

-- ============================================================================
-- 3. QR_CODES — Códigos QR por mesa/habitación
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,      -- Número de mesa o habitación
  qr_data TEXT NOT NULL,           -- URL completa de la carta con parámetro de mesa
  qr_image_url TEXT,               -- URL de la imagen QR generada
  is_active BOOLEAN DEFAULT true,
  scan_count INT DEFAULT 0,        -- Contador de escaneos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique: una mesa por hotel
  CONSTRAINT uq_qr_codes_hotel_table UNIQUE (hotel_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_hotel ON qr_codes(hotel_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(hotel_id, is_active);

-- ============================================================================
-- 4. MENU_VIEWS — Analytics de vistas de la carta
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  language TEXT DEFAULT 'es',      -- Idioma del visitante
  table_number TEXT,               -- Mesa desde donde se escaneó
  session_id TEXT                  -- Para agrupar vistas de una misma sesión
);

CREATE INDEX IF NOT EXISTS idx_menu_views_hotel ON menu_views(hotel_id);
CREATE INDEX IF NOT EXISTS idx_menu_views_item ON menu_views(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_views_date ON menu_views(hotel_id, viewed_at);

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_views ENABLE ROW LEVEL SECURITY;

-- Hotel solo ve sus propios datos
CREATE POLICY "hotels_manage_menu_categories"
  ON menu_categories FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

CREATE POLICY "hotels_manage_menu_items"
  ON menu_items FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

CREATE POLICY "hotels_manage_qr_codes"
  ON qr_codes FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

-- Menu views: hotel puede ver sus analytics
CREATE POLICY "hotels_view_menu_views"
  ON menu_views FOR SELECT
  USING (hotel_id IN (SELECT id FROM hotels WHERE owner_id = auth.uid()));

-- Menu views: INSERT público (cualquiera puede ver la carta)
CREATE POLICY "public_insert_menu_views"
  ON menu_views FOR INSERT
  WITH CHECK (true);

-- Carta pública: SELECT público para items activos y categorías activas
CREATE POLICY "public_view_menu_items"
  ON menu_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "public_view_menu_categories"
  ON menu_categories FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- 6. Trigger: updated_at
-- ============================================================================

CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. Comments
-- ============================================================================

COMMENT ON TABLE menu_categories IS 'Categorías del menú digital del hotel (Entradas, Platos Principales, Bebidas, etc.)';
COMMENT ON TABLE menu_items IS 'Items del menú digital (platos, bebidas, postres) con precios, fotos y traducciones';
COMMENT ON TABLE qr_codes IS 'Códigos QR generados por mesa/habitación para acceder a la carta digital';
COMMENT ON TABLE menu_views IS 'Analytics de vistas de la carta digital y items populares';
