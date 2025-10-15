-- Migration: Add excluded_line_item_ids to assessment_additionals
-- Description: Add JSONB array to track which original estimate lines are excluded from combined total
-- Date: 2025-10-15

-- Add excluded_line_item_ids column to assessment_additionals
ALTER TABLE assessment_additionals
ADD COLUMN excluded_line_item_ids JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Add comment
COMMENT ON COLUMN assessment_additionals.excluded_line_item_ids IS 'Array of line item IDs from the original estimate that are excluded from the combined total calculation';

