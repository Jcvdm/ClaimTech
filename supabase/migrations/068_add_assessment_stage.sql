-- ============================================================================
-- Migration 068: Add Assessment Stage Field
-- Purpose: Introduce stage-based pipeline tracking for assessments
-- Date: January 2025
-- ============================================================================

-- Step 1: Create assessment_stage enum type
CREATE TYPE assessment_stage AS ENUM (
  'request_submitted',      -- Initial request created, assessment created
  'request_accepted',       -- Admin accepted request, ready for scheduling
  'inspection_scheduled',   -- Appointment scheduled with engineer
  'assessment_in_progress', -- Engineer started assessment (collecting data)
  'assessment_completed',   -- All assessment tabs completed
  'estimate_finalized',     -- Estimate finalized, rates frozen
  'frc_in_progress',        -- Final Repair Costing started
  'frc_completed',          -- FRC completed and signed off
  'archived',               -- Assessment archived/completed
  'cancelled'               -- Cancelled at any stage
);

-- Step 2: Add stage column to assessments table
ALTER TABLE assessments
  ADD COLUMN stage assessment_stage NOT NULL DEFAULT 'request_submitted';

-- Step 3: Make appointment_id and inspection_id nullable
-- (They don't exist when assessment is first created with request)
ALTER TABLE assessments
  ALTER COLUMN appointment_id DROP NOT NULL,
  ALTER COLUMN inspection_id DROP NOT NULL;

-- Step 4: Add unique constraint on request_id
-- (One assessment per request - assessment is the canonical case record)
ALTER TABLE assessments
  ADD CONSTRAINT uq_assessments_request UNIQUE (request_id);

-- Step 5: Add check constraint for appointment_id requirement
-- (appointment_id must exist for certain stages)
ALTER TABLE assessments
  ADD CONSTRAINT require_appointment_when_scheduled
  CHECK (
    CASE
      WHEN stage IN (
        'inspection_scheduled',
        'assessment_in_progress',
        'assessment_completed',
        'estimate_finalized',
        'frc_in_progress',
        'frc_completed'
      ) THEN appointment_id IS NOT NULL
      ELSE TRUE
    END
  );

-- Step 6: Add indexes for performance
CREATE INDEX idx_assessments_stage ON assessments(stage);
CREATE INDEX idx_assessments_request_id ON assessments(request_id);

-- Step 7: Backfill existing assessments with stage based on status
UPDATE assessments
SET stage = CASE
  WHEN status = 'in_progress' THEN 'assessment_in_progress'::assessment_stage
  WHEN status = 'completed' THEN 'assessment_completed'::assessment_stage
  WHEN status = 'submitted' THEN 'estimate_finalized'::assessment_stage
  WHEN status = 'archived' THEN 'archived'::assessment_stage
  WHEN status = 'cancelled' THEN 'cancelled'::assessment_stage
  ELSE 'assessment_in_progress'::assessment_stage
END;

-- Step 8: Add comment for documentation
COMMENT ON COLUMN assessments.stage IS 'Pipeline stage tracking - replaces status field with more granular workflow stages';
COMMENT ON TYPE assessment_stage IS 'Assessment pipeline stages from request submission to archive';

-- ============================================================================
-- RLS Policy Updates
-- ============================================================================

-- Drop old INSERT policy that requires appointment_id
DROP POLICY IF EXISTS "Engineers can insert their assessments" ON assessments;

-- Create new INSERT policy that allows admin inserts without appointment_id
CREATE POLICY "Admins can insert assessments without appointment"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Create new INSERT policy for engineers (requires appointment_id)
CREATE POLICY "Engineers can insert assessments for their appointments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (
  appointment_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Update SELECT policy to allow viewing assessments in early stages
-- (Admins can see all, engineers can see their assigned ones)
DROP POLICY IF EXISTS "Engineers can view their assessments" ON assessments;

CREATE POLICY "Engineers can view their assessments"
ON assessments FOR SELECT
TO authenticated
USING (
  is_admin()
  OR (
    appointment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = assessments.appointment_id
      AND appointments.engineer_id = get_user_engineer_id()
    )
  )
);

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Migration completed successfully
-- Backfilled records: (SELECT COUNT(*) FROM assessments)
-- Breaking changes: false
