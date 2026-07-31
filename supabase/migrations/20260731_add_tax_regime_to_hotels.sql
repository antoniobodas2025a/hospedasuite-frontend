-- Add tax_regime column to hotels table
-- This field specifies whether the hotel is under "Régimen Simplificado" (no IVA)
-- or "Responsable de IVA" (charges 19% IVA)

ALTER TABLE hotels
ADD COLUMN tax_regime VARCHAR(20) DEFAULT 'simplified'
CHECK (tax_regime IN ('simplified', 'responsible'));

-- Add comment for documentation
COMMENT ON COLUMN hotels.tax_regime IS 'Tax regime: simplified (no IVA) or responsible (charges 19% IVA)';
