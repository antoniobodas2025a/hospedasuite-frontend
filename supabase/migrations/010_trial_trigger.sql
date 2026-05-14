-- Trigger automático: calcula trial_ends_at al crear un hotel
-- trial_ends_at = created_at + 90 días
-- Esto evita que hoteles nuevos queden sin fecha de fin de trial.

CREATE OR REPLACE FUNCTION set_trial_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo setear si no viene con valor explícito
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NEW.created_at + INTERVAL '90 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS trg_set_trial_ends_at ON hotels;

CREATE TRIGGER trg_set_trial_ends_at
  BEFORE INSERT ON hotels
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_ends_at();

-- También actualizar hoteles existentes que no tienen trial_ends_at
UPDATE hotels
SET trial_ends_at = created_at + INTERVAL '90 days'
WHERE trial_ends_at IS NULL
  AND subscription_status = 'trialing';
