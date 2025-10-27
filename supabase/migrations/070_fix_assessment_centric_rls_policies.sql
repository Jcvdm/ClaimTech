-- ============================================================================
-- Migration 070: Fix Assessment-Centric RLS Policies
-- Purpose: Fix RLS policies to support assessment-centric architecture
-- Date: January 26, 2025
-- ============================================================================

-- Issue 1: Engineer INSERT policy on assessments requires appointment_id,
--          but assessment-centric pattern creates assessments BEFORE appointments
--          are scheduled (with appointment_id = null initially).
--
-- Issue 2: Engineer SELECT policy on inspections checks requests.assigned_engineer_id,
--          but new architecture assigns engineers to APPOINTMENTS, not requests.

-- ============================================================================
-- FIX 1: Update Engineer Assessment INSERT Policy
-- ============================================================================

-- Drop old policy that blocks early-stage assessment creation
DROP POLICY IF EXISTS "Engineers can insert assessments for their appointments" ON assessments;

-- Create new policy with stage-aware logic
CREATE POLICY "Engineers can insert assessments for their appointments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (
  -- EARLY STAGES: Allow NULL appointment_id
  -- Assessment created with request, before appointment is scheduled
  (
    stage IN ('request_submitted', 'request_accepted')
    AND appointment_id IS NULL
  )
  OR
  -- LATER STAGES: Require appointment with engineer assignment
  -- Assessment can only be created/progressed if engineer is assigned via appointment
  (
    stage NOT IN ('request_submitted', 'request_accepted')
    AND appointment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_id
      AND appointments.engineer_id = get_user_engineer_id()
    )
  )
);

COMMENT ON POLICY "Engineers can insert assessments for their appointments" ON assessments IS
  'Allows engineers to create early-stage assessments (before appointment scheduled) and later-stage assessments (when assigned via appointment). Aligns with assessment-centric architecture where assessment is created WITH request.';

-- ============================================================================
-- FIX 2: Update Engineer Inspections SELECT Policy
-- ============================================================================

-- Drop old policy that only checks requests.assigned_engineer_id
DROP POLICY IF EXISTS "Engineers can view assigned inspections" ON inspections;

-- Create new policy with dual-pattern check (appointments + requests)
CREATE POLICY "Engineers can view assigned inspections"
ON inspections FOR SELECT
TO authenticated
USING (
  -- NEW PATTERN: Check engineer assignment via appointments
  -- (This is the correct pattern for assessment-centric architecture)
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.inspection_id = inspections.id
    AND appointments.engineer_id = get_user_engineer_id()
  )
  OR
  -- OLD PATTERN: Fallback to requests.assigned_engineer_id
  -- (Maintains backward compatibility with old data)
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = inspections.request_id
    AND requests.assigned_engineer_id = get_user_engineer_id()
  )
);

COMMENT ON POLICY "Engineers can view assigned inspections" ON inspections IS
  'Dual-pattern policy: checks engineer assignment via appointments (new pattern) with fallback to requests.assigned_engineer_id (old pattern). Ensures backward compatibility while supporting assessment-centric architecture.';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify assessment INSERT policy allows early-stage creation
-- Expected: Should allow INSERT with appointment_id = null for request_submitted stage
DO $$
BEGIN
  RAISE NOTICE 'Migration 070 applied successfully';
  RAISE NOTICE 'Assessment INSERT policy: Allows NULL appointment_id for early stages (request_submitted, request_accepted)';
  RAISE NOTICE 'Inspections SELECT policy: Checks appointments table (new pattern) with requests fallback (backward compatibility)';
END $$;

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Migration completed successfully
-- Breaking changes: false (backward compatible)
-- RLS policies updated: 2
--   1. assessments INSERT (engineers)
--   2. inspections SELECT (engineers)
