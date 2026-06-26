-- Migration 028: Cron Job Execution Log
-- Persiste resultados de ejecución de cron jobs (process-renewals, etc.).
-- Reemplaza console.log() con una tabla consultable para el dashboard de salud.

CREATE TABLE IF NOT EXISTS cron_job_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running'
    CHECK (status IN ('success', 'failed', 'timeout', 'running')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  output JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries del dashboard de salud
CREATE INDEX IF NOT EXISTS idx_cron_log_job ON cron_job_log (job_name);
CREATE INDEX IF NOT EXISTS idx_cron_log_status ON cron_job_log (status);
CREATE INDEX IF NOT EXISTS idx_cron_log_started ON cron_job_log (started_at DESC);

-- RLS: Solo superadmins pueden leer; los inserts son server-side (service key)
ALTER TABLE cron_job_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_client_insert_cron_log"
  ON cron_job_log FOR INSERT
  WITH CHECK (false);

CREATE POLICY "superadmins_view_cron_log"
  ON cron_job_log FOR SELECT
  USING (auth.email() = 'suitehospeda@gmail.com');

COMMENT ON TABLE cron_job_log IS 'Registro de ejecuciones de cron jobs. Append-only, consultable por superadmins.';
