-- Migration: Add Additionals Letter URL to assessment_additionals
-- Date: 2025-11-16
-- Description: Store the generated Additionals Letter PDF URL on assessment_additionals

ALTER TABLE assessment_additionals
ADD COLUMN IF NOT EXISTS additionals_letter_url TEXT;

COMMENT ON COLUMN assessment_additionals.additionals_letter_url IS 'URL of the generated Additionals Letter PDF in Supabase Storage';