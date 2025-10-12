-- Migration: Add assessment_result to assessment_estimates
-- Description: Add assessment result field to track final outcome (Repair, Code 2, Code 3, Total Loss)
-- Date: 2025-01-09

-- Create enum type for assessment results
CREATE TYPE assessment_result_type AS ENUM ('repair', 'code_2', 'code_3', 'total_loss');

-- Add assessment_result column to assessment_estimates
ALTER TABLE assessment_estimates
ADD COLUMN assessment_result assessment_result_type;

-- Add index for filtering by result
CREATE INDEX idx_assessment_estimates_result ON assessment_estimates(assessment_result);

-- Add comment
COMMENT ON COLUMN assessment_estimates.assessment_result IS 'Final assessment outcome: repair (economic to repair), code_2 (repairable write-off), code_3 (non-repairable write-off), or total_loss (complete loss)';

-- Add comment on enum type
COMMENT ON TYPE assessment_result_type IS 'Assessment result types for South African vehicle assessments';

