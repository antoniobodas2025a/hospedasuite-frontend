-- Migration: Add wompi_events_secret to hotels table
-- Required for Wompi webhook signature verification in production
-- src/app/api/webhooks/tenant/wompi/route.ts

ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS wompi_events_secret TEXT;
