-- Migration: Add Additionals Terms & Conditions to clients
-- Date: 2025-11-16
-- Description: Add TEXT field for client-specific T&Cs for Additionals Letters

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS additionals_terms_and_conditions TEXT;

COMMENT ON COLUMN clients.additionals_terms_and_conditions IS
  'Client-specific terms for Additionals Letters. If set, overrides company default T&Cs. If NULL, falls back to company_settings.additionals_terms_and_conditions.';