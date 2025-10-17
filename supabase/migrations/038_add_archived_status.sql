-- Add 'archived' status to assessments table
-- This status is set when FRC is completed and signed off
-- Flow: in_progress → submitted (finalized) → archived (FRC completed)

-- Update the CHECK constraint to include 'archived' status
ALTER TABLE assessments 
DROP CONSTRAINT IF EXISTS assessments_status_check;

ALTER TABLE assessments 
ADD CONSTRAINT assessments_status_check 
CHECK (status IN ('in_progress', 'completed', 'submitted', 'archived'));

-- Add comment explaining the status flow
COMMENT ON COLUMN assessments.status IS 'Assessment status: in_progress (active work), completed (deprecated), submitted (estimate finalized), archived (FRC completed)';

-- Create index for archived assessments for efficient querying
CREATE INDEX IF NOT EXISTS idx_assessments_archived ON assessments(status) WHERE status = 'archived';

