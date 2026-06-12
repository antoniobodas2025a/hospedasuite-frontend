-- Migration 026: Wompi Sandbox Toggle
-- Add column to hotels table for sandbox mode toggle

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS wompi_sandbox_mode BOOLEAN DEFAULT false;

COMMENT ON COLUMN hotels.wompi_sandbox_mode IS 'Toggle between Wompi test and production environments';
