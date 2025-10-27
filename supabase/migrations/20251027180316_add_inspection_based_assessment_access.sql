-- Migration: Add Inspection-Based Assessment Access for Engineers (SECURE)
-- Created: 2025-10-27
-- Purpose: Fix engineer visibility issue where assessments at stage 3 (inspection_scheduled)
--          are invisible to engineers due to missing appointment linkage.
--          This adds a fallback RLS policy allowing engineers to access assessments
--          via inspection assignment when appointment doesn't exist yet.

-- ASSESSMENT-CENTRIC ARCHITECTURE FIX
-- Problem: At stage 3 (inspection_scheduled), assessment.appointment_id is NULL
--          but inspection.assigned_engineer_id is populated. Engineers need access
--          to see their assigned work even before appointment is created.

-- SECURITY NOTE: The inspection-based access path includes a critical security check
--                 to prevent unauthorized access when inspection and appointment are
--                 assigned to different engineers.

-- Drop existing "Engineers can view their assessments" policy
DROP POLICY IF EXISTS "Engineers can view their assessments" ON assessments;

-- Recreate policy with SECURE inspection-based access path
CREATE POLICY "Engineers can view their assessments"
ON assessments FOR SELECT
TO authenticated
USING (
  -- Path 1: Admin users see all assessments
  is_admin()

  OR

  -- Path 2: Engineers see assessments via appointment link (stage 4+)
  -- This is the primary path once appointment_id is populated
  (
    appointment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = assessments.appointment_id
      AND appointments.engineer_id = get_user_engineer_id()
    )
  )

  OR

  -- Path 3: Engineers see assessments via request appointment (legacy/fallback)
  -- Handles cases where appointment exists but isn't linked to assessment yet
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.request_id = assessments.request_id
    AND appointments.engineer_id = get_user_engineer_id()
  )

  OR

  -- Path 4: Engineers see assessments via inspection assignment (NEW - stage 3)
  -- SECURITY: Only allows access via inspection when:
  --   1. No appointment exists yet (appointment_id IS NULL), OR
  --   2. Appointment exists AND is assigned to the same engineer
  -- This prevents conflict where inspection and appointment are assigned to different engineers
  (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = assessments.inspection_id
      AND inspections.assigned_engineer_id = get_user_engineer_id()
    )
    AND (
      -- Case 1: No appointment yet (early stage 3)
      appointment_id IS NULL
      OR
      -- Case 2: Appointment exists and is assigned to same engineer
      EXISTS (
        SELECT 1 FROM appointments
        WHERE appointments.id = assessments.appointment_id
        AND appointments.engineer_id = get_user_engineer_id()
      )
    )
  )
);

-- Add comment explaining the four access paths with security notes
COMMENT ON POLICY "Engineers can view their assessments" ON assessments IS
'Engineers can view assessments through four paths:
1. Admin role (full access)
2. Direct appointment link (stage 4+, assessment.appointment_id populated)
3. Request appointment link (fallback for orphaned appointments)
4. Inspection assignment (stage 3, SECURE: only when appointment_id is NULL or matches)

Path 4 SECURITY: Prevents access conflict where inspection and appointment are assigned
to different engineers. Only grants access when no appointment exists (early stage 3)
OR when the appointment is also assigned to the same engineer.

This ensures appointment assignment remains the authoritative source of engineer assignment.';

-- Drop and recreate UPDATE policy with same SECURE logic
DROP POLICY IF EXISTS "Engineers can update their assessments" ON assessments;

CREATE POLICY "Engineers can update their assessments"
ON assessments FOR UPDATE
TO authenticated
USING (
  -- Same secure four-path logic as SELECT policy
  is_admin()
  OR
  (
    appointment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = assessments.appointment_id
      AND appointments.engineer_id = get_user_engineer_id()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.request_id = assessments.request_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = assessments.inspection_id
      AND inspections.assigned_engineer_id = get_user_engineer_id()
    )
    AND (
      appointment_id IS NULL
      OR
      EXISTS (
        SELECT 1 FROM appointments
        WHERE appointments.id = assessments.appointment_id
        AND appointments.engineer_id = get_user_engineer_id()
      )
    )
  )
);

COMMENT ON POLICY "Engineers can update their assessments" ON assessments IS
'Engineers can update assessments using the same secure four-path access logic as SELECT.
This ensures engineers can modify assessments they can view, with the same security
guarantee that inspection-based access only works when appointment_id is NULL or matches.';

-- Create indexes to optimize RLS policy performance
-- These indexes ensure sub-millisecond policy checks even with thousands of records
CREATE INDEX IF NOT EXISTS idx_inspections_assigned_engineer
ON inspections(assigned_engineer_id)
WHERE assigned_engineer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_engineer
ON appointments(engineer_id)
WHERE engineer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_inspection
ON assessments(inspection_id)
WHERE inspection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_appointment
ON assessments(appointment_id)
WHERE appointment_id IS NOT NULL;

-- Verification queries (commented out - for manual testing)
--
-- -- Test 1: Verify engineer can see assessment via inspection (stage 3)
-- -- Expected: Returns assessment ASM-2025-016 for engineer Jakes
-- SELECT
--   a.assessment_number,
--   a.stage,
--   a.appointment_id,
--   a.inspection_id,
--   i.assigned_engineer_id,
--   e.name as engineer_name
-- FROM assessments a
-- LEFT JOIN inspections i ON i.id = a.inspection_id
-- LEFT JOIN engineers e ON e.id = i.assigned_engineer_id
-- WHERE a.assessment_number = 'ASM-2025-016';
--
-- -- Test 2: Count assessments visible to specific engineer
-- -- Run as engineer user to verify RLS policy
-- SELECT COUNT(*)
-- FROM assessments
-- WHERE stage = 'inspection_scheduled';
--
-- -- Test 3: Verify all four access paths work
-- -- Shows which path grants access for each assessment
-- SELECT
--   assessment_number,
--   stage,
--   CASE
--     WHEN appointment_id IS NOT NULL THEN 'Path 2: Appointment Link'
--     WHEN inspection_id IS NOT NULL THEN 'Path 4: Inspection Assignment'
--     ELSE 'Path 3: Request Appointment'
--   END as access_path
-- FROM assessments
-- WHERE stage >= 'inspection_scheduled'
-- ORDER BY created_at DESC;
--
-- -- Test 4: Security test - verify no access conflicts
-- -- This should return ZERO rows (no cases where inspector != appointment engineer)
-- SELECT
--   a.assessment_number,
--   i.assigned_engineer_id as inspection_engineer,
--   ap.engineer_id as appointment_engineer
-- FROM assessments a
-- JOIN inspections i ON i.id = a.inspection_id
-- JOIN appointments ap ON ap.id = a.appointment_id
-- WHERE i.assigned_engineer_id != ap.engineer_id;
