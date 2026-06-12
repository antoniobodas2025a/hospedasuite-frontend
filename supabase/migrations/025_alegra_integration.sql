-- Migration 025: Alegra Integration
-- Add columns to hotels table for Alegra API credentials

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS alegra_email TEXT;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS alegra_token TEXT;

COMMENT ON COLUMN hotels.alegra_email IS 'Email de la cuenta de Alegra del hotelero';
COMMENT ON COLUMN hotels.alegra_token IS 'Token de API de Alegra (Basic Auth)';
