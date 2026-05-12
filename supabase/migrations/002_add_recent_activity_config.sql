-- Add RecentActivity configuration columns to hotels table
-- Allows hotels to toggle social proof on/off and customize messages

ALTER TABLE hotels
  ADD COLUMN IF NOT EXISTS show_recent_activity BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS recent_activity_messages JSONB DEFAULT '[
    {"icon": "TrendingUp", "text": "3 reservas en las ultimas 24 horas", "color": "text-emerald-600"},
    {"icon": "Clock", "text": "2 personas estan viendo esta propiedad ahora", "color": "text-amber-600"}
  ]'::jsonb;
