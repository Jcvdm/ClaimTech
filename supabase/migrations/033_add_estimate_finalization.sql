-- Migration: Add estimate finalization tracking to assessments
-- Description: Add timestamp field to track when estimate was finalized and sent to client
-- Date: 2025-01-14

-- Add estimate_finalized_at column to assessments table
ALTER TABLE assessments
ADD COLUMN estimate_finalized_at TIMESTAMPTZ;

-- Add index for filtering finalized assessments
CREATE INDEX idx_assessments_finalized ON assessments(estimate_finalized_at) WHERE estimate_finalized_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN assessments.estimate_finalized_at IS 'Timestamp when estimate was finalized and sent to client. Enables Additionals tab.';

