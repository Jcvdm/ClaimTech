-- Migration: Add Terms & Conditions fields to company_settings
-- Date: 2025-11-02
-- Description: Add 3 TEXT fields for storing T&Cs for Assessment Reports, Estimates, and FRC Reports

-- Add assessment_terms_and_conditions field
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS assessment_terms_and_conditions TEXT;

-- Add estimate_terms_and_conditions field
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS estimate_terms_and_conditions TEXT;

-- Add frc_terms_and_conditions field
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS frc_terms_and_conditions TEXT;

-- Add comments for documentation
COMMENT ON COLUMN company_settings.assessment_terms_and_conditions IS 'Terms and conditions text to display in Assessment Report PDFs';
COMMENT ON COLUMN company_settings.estimate_terms_and_conditions IS 'Terms and conditions text to display in Estimate PDFs';
COMMENT ON COLUMN company_settings.frc_terms_and_conditions IS 'Terms and conditions text to display in FRC Report PDFs';

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for safety - DO NOT EXECUTE unless rolling back)
-- ============================================================================
-- WARNING: Uncomment the lines below ONLY if you need to rollback this migration.
-- This will permanently delete all Terms & Conditions data.
--
-- ALTER TABLE company_settings DROP COLUMN IF EXISTS assessment_terms_and_conditions;
-- ALTER TABLE company_settings DROP COLUMN IF EXISTS estimate_terms_and_conditions;
-- ALTER TABLE company_settings DROP COLUMN IF EXISTS frc_terms_and_conditions;

