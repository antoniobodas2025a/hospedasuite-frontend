-- Community Templates: curación de textos generados por hoteleros + IA
-- Permite recolectar, revisar y aprobar plantillas de la comunidad

CREATE TABLE IF NOT EXISTS community_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('cancellation', 'roomDescription', 'hotelDescription')),
  content TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('es', 'en')),
  property_type TEXT CHECK (property_type IN ('hotel', 'glamping', 'cabanas', 'hostal', 'apartamento')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  source TEXT NOT NULL DEFAULT 'ai_generated' CHECK (source IN ('ai_generated', 'user_written', 'ai_enriched')),
  hotel_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  curated_by TEXT,
  curated_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_community_templates_status ON community_templates(status);
CREATE INDEX IF NOT EXISTS idx_community_templates_type_locale ON community_templates(type, locale);
CREATE INDEX IF NOT EXISTS idx_community_templates_approved ON community_templates(status, type, locale) WHERE status = 'approved';

-- RLS policies
ALTER TABLE community_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved templates (used by AI assistant)
CREATE POLICY "approved_templates_public_read"
  ON community_templates FOR SELECT
  USING (status = 'approved');

-- Authenticated users can submit (insert as pending)
CREATE POLICY "authenticated_submit_templates"
  ON community_templates FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending');

-- Only admins can curate (update status)
CREATE POLICY "admin_curate_templates"
  ON community_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Amenity Suggestions: hoteleros proponen nuevas amenidades
-- Pasan por curación antes de entrar al registry oficial
-- ============================================================================

CREATE TABLE IF NOT EXISTS amenity_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  locale TEXT NOT NULL CHECK (locale IN ('es', 'en')),
  category TEXT CHECK (category IN ('hotel', 'room', 'both')),
  suggested_icon TEXT, -- lucide icon name, e.g. 'Wifi', 'Pool'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  hotel_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  curated_by TEXT,
  curated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  merged_id TEXT -- once approved, the canonical id in the registry
);

CREATE INDEX IF NOT EXISTS idx_amenity_suggestions_status ON amenity_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_amenity_suggestions_category ON amenity_suggestions(category);

ALTER TABLE amenity_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved/merged suggestions
CREATE POLICY "approved_amenities_public_read"
  ON amenity_suggestions FOR SELECT
  USING (status IN ('approved', 'merged'));

-- Authenticated users can submit
CREATE POLICY "authenticated_submit_amenities"
  ON amenity_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (status = 'pending');

-- Only admins can curate
CREATE POLICY "admin_curate_amenities"
  ON amenity_suggestions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
