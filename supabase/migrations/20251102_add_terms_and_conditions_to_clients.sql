-- Migration: Add Terms & Conditions fields to clients table
-- Date: 2025-11-02
-- Description: Add 3 TEXT fields for storing client-specific T&Cs that override company defaults

-- Add assessment_terms_and_conditions field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS assessment_terms_and_conditions TEXT;

-- Add estimate_terms_and_conditions field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS estimate_terms_and_conditions TEXT;

-- Add frc_terms_and_conditions field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS frc_terms_and_conditions TEXT;

-- Add comments for documentation
COMMENT ON COLUMN clients.assessment_terms_and_conditions IS
  'Client-specific terms for Assessment Reports. If set, overrides company default T&Cs. If NULL, falls back to company_settings.assessment_terms_and_conditions.';

COMMENT ON COLUMN clients.estimate_terms_and_conditions IS
  'Client-specific terms for Estimate PDFs. If set, overrides company default T&Cs. If NULL, falls back to company_settings.estimate_terms_and_conditions.';

COMMENT ON COLUMN clients.frc_terms_and_conditions IS
  'Client-specific terms for FRC Reports. If set, overrides company default T&Cs. If NULL, falls back to company_settings.frc_terms_and_conditions.';

-- RLS Policies: New columns inherit existing policies
-- The clients table already has RLS enabled with the following policies:
--   SELECT: All authenticated users (engineers need to read client T&Cs for PDF generation)
--   INSERT/UPDATE/DELETE: Admin-only
-- These policies automatically apply to the new T&Cs columns.
-- No additional RLS policies are required.

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for safety - DO NOT EXECUTE unless rolling back)
-- ============================================================================
-- ALTER TABLE clients DROP COLUMN IF EXISTS assessment_terms_and_conditions;
-- ALTER TABLE clients DROP COLUMN IF EXISTS estimate_terms_and_conditions;
-- ALTER TABLE clients DROP COLUMN IF EXISTS frc_terms_and_conditions;
