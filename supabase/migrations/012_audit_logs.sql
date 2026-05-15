-- Tabla de auditoría de seguridad
-- Registra TODOS los cambios críticos en el sistema SaaS.
-- Inmutable: solo se permiten INSERTs.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Quién hizo el cambio
  actor_id TEXT,                  -- User ID, 'system', 'webhook', 'cron'
  actor_type TEXT CHECK (actor_type IN ('user', 'webhook', 'cron', 'api', 'system')),
  actor_email TEXT,               -- Email del actor (para humanos)
  
  -- Qué se hizo
  action TEXT NOT NULL,           -- 'plan_changed', 'payment_received', 'trial_expired', 'downgrade_requested', 'subscription_cancelled'
  entity_type TEXT NOT NULL,      -- 'hotel', 'invoice', 'subscription'
  entity_id UUID NOT NULL,
  
  -- Valores antes y después (JSONB para flexibilidad)
  old_value JSONB,
  new_value JSONB,
  
  -- Contexto
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- RLS: Solo superadmins pueden ver logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: nadie puede INSERTar desde el cliente (solo server actions/webhooks)
CREATE POLICY "no_client_insert_audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- Política: solo superadmins pueden ver logs
CREATE POLICY "superadmins_view_audit_logs"
  ON audit_logs FOR SELECT
  USING (auth.email() = 'suitehospeda@gmail.com');

-- Política: server actions pueden insertar (bypassean RLS con service key)
-- No necesitamos política explícita porque el service key bypassea RLS

COMMENT ON TABLE audit_logs IS 'Audit trail inmutable de cambios críticos en el sistema SaaS.';
