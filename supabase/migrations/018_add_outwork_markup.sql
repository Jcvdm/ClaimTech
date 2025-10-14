-- Migration: Add outwork markup percentage to assessment_estimates
-- This allows outwork charges to have markup applied like parts (OEM/ALT/2ND)

-- Add outwork_markup_percentage column with default 25%
ALTER TABLE assessment_estimates 
ADD COLUMN outwork_markup_percentage DECIMAL(5,2) DEFAULT 25.00;

-- Add comment for documentation
COMMENT ON COLUMN assessment_estimates.outwork_markup_percentage 
IS 'Markup percentage for outwork charges (default 25%)';

-- Update existing estimates to have the default markup
UPDATE assessment_estimates 
SET outwork_markup_percentage = 25.00 
WHERE outwork_markup_percentage IS NULL;

