-- Migration: Add Additionals Terms & Conditions to company_settings
-- Date: 2025-11-16
-- Description: Add TEXT field for storing T&Cs for Additionals Letter PDFs

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS additionals_terms_and_conditions TEXT;

COMMENT ON COLUMN company_settings.additionals_terms_and_conditions IS 'Terms and conditions text to display in Additionals Letter PDFs';