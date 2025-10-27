-- Migration 075: Fix Assessment Stage Enum
-- Purpose: Update assessment_stage enum to match Phase 3 documentation
-- Issue: Migration 068 used outdated stage names causing runtime errors
-- Date: January 26, 2025

-- Step 1: Drop the check constraint first (it references the enum)
ALTER TABLE assessments
  DROP CONSTRAINT IF EXISTS require_appointment_when_scheduled;

-- Step 2: Drop the default value temporarily
ALTER TABLE assessments
  ALTER COLUMN stage DROP DEFAULT;

-- Step 3: Convert column to text temporarily
ALTER TABLE assessments
  ALTER COLUMN stage TYPE text;

-- Step 4: Update the text values to new stage names
UPDATE assessments
SET stage = CASE
  WHEN stage = 'request_accepted' THEN 'request_reviewed'
  WHEN stage = 'assessment_completed' THEN 'estimate_review'
  WHEN stage = 'frc_completed' THEN 'archived'
  ELSE stage
END;

-- Step 5: Drop old enum type (CASCADE to drop any dependent objects)
DROP TYPE assessment_stage CASCADE;

-- Step 6: Create new enum with correct stage names
CREATE TYPE assessment_stage AS ENUM (
  'request_submitted',      -- 1. Initial request created
  'request_reviewed',       -- 2. Admin reviewed request (was request_accepted)
  'inspection_scheduled',   -- 3. Inspection scheduled
  'appointment_scheduled',  -- 4. Appointment scheduled (NEW - was missing)
  'assessment_in_progress', -- 5. Engineer started assessment
  'estimate_review',        -- 6. Estimate under review (was assessment_completed)
  'estimate_sent',          -- 7. Estimate sent to client (NEW - was missing)
  'estimate_finalized',     -- 8. Estimate finalized
  'frc_in_progress',        -- 9. FRC in progress
  'archived',               -- 10. Archived (terminal state)
  'cancelled'               -- Terminal state (cancelled)
);

-- Step 7: Convert column back to enum type
ALTER TABLE assessments
  ALTER COLUMN stage TYPE assessment_stage
  USING stage::assessment_stage;

-- Step 8: Restore default value with correct enum value
ALTER TABLE assessments
  ALTER COLUMN stage SET DEFAULT 'request_submitted'::assessment_stage;

-- Step 9: Add updated check constraint with new stage names
ALTER TABLE assessments
  ADD CONSTRAINT require_appointment_when_scheduled
  CHECK (
    CASE
      WHEN stage IN (
        'appointment_scheduled',  -- NEW stage
        'assessment_in_progress',
        'estimate_review',        -- Renamed from assessment_completed
        'estimate_sent',          -- NEW stage
        'estimate_finalized',
        'frc_in_progress'
      ) THEN appointment_id IS NOT NULL
      ELSE TRUE
    END
  );

-- Step 10: Add comment for documentation
COMMENT ON TYPE assessment_stage IS
  'Assessment workflow stages (Phase 3 - corrected Jan 2025). Stages 1-10 represent linear workflow progression.';

-- Migration complete
-- All existing data migrated:
--   request_accepted → request_reviewed
--   assessment_completed → estimate_review
--   frc_completed → archived
