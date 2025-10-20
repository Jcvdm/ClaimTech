-- Add 'cancelled' status to assessments table
-- This allows assessments to be cancelled at any stage
-- Flow: in_progress → submitted (finalized) → archived (FRC completed)
--       OR in_progress → cancelled (work stopped)

-- Update the CHECK constraint to include 'cancelled' status
ALTER TABLE assessments 
DROP CONSTRAINT IF EXISTS assessments_status_check;

ALTER TABLE assessments 
ADD CONSTRAINT assessments_status_check 
CHECK (status IN ('in_progress', 'completed', 'submitted', 'archived', 'cancelled'));

-- Add cancelled_at timestamp column
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add comment explaining the status flow
COMMENT ON COLUMN assessments.status IS 'Assessment status: in_progress (active work), completed (deprecated), submitted (estimate finalized), archived (FRC completed), cancelled (work stopped)';

COMMENT ON COLUMN assessments.cancelled_at IS 'Timestamp when assessment was cancelled';

-- Create index for cancelled assessments
CREATE INDEX IF NOT EXISTS idx_assessments_cancelled 
ON assessments(status) WHERE status = 'cancelled';

-- Create index for cancelled_at for sorting
CREATE INDEX IF NOT EXISTS idx_assessments_cancelled_at 
ON assessments(cancelled_at) WHERE cancelled_at IS NOT NULL;

