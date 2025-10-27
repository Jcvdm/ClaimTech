-- ============================================================================
-- Migration 073: Fix Engineer Assessment SELECT Policy for Early-Stage Access
-- Purpose: Allow engineers to see assessments even when appointment_id is NULL
-- Date: January 26, 2025
-- ============================================================================

-- Issue: Engineers cannot see early-stage assessments (appointment_id = NULL)
--        even when accessing via their assigned appointment page.
--        This causes "Data integrity error: No assessment found" when clicking
--        "Start Assessment" because RLS blocks SELECT before appointment_id can be linked.

-- Root Cause: Engineer SELECT policy requires appointment_id IS NOT NULL,
--             but assessments are created with appointment_id = NULL initially.

-- Solution: Allow engineers to see assessments when:
--           1. Assessment has appointment_id linked to their appointment (existing)
--           2. Assessment's request has an appointment assigned to them (NEW)

-- ============================================================================
-- FIX: Update Engineer Assessment SELECT Policy
-- ============================================================================

-- Drop current restrictive policy
DROP POLICY IF EXISTS "Engineers can view their assessments" ON assessments;

-- Create updated policy allowing early-stage access via request's appointments
CREATE POLICY "Engineers can view their assessments"
ON assessments FOR SELECT
TO authenticated
USING (
  is_admin() OR
  -- Case 1: Assessment has appointment_id linked to engineer's appointment
  -- (This handles later-stage assessments where appointment_id is already set)
  (
    appointment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = assessments.appointment_id
      AND appointments.engineer_id = get_user_engineer_id()
    )
  )
  OR
  -- Case 2: Assessment's request has an appointment assigned to engineer
  -- (This handles early-stage assessments where appointment_id is still NULL)
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.request_id = assessments.request_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

COMMENT ON POLICY "Engineers can view their assessments" ON assessments IS
  'Allows engineers to view assessments for requests they are assigned to via appointments. Handles both early-stage assessments (appointment_id = NULL) and later-stage assessments (appointment_id linked). Dual-check ensures engineers can see assessment before and after appointment_id is linked on the assessment record.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 073 applied successfully';
  RAISE NOTICE 'Engineer SELECT policy updated to allow early-stage access';
  RAISE NOTICE 'Engineers can now see assessments via request appointments even when appointment_id IS NULL';
  RAISE NOTICE 'This fixes "Data integrity error" when clicking Start Assessment';
END $$;

-- ============================================================================
-- Expected Behavior After Migration
-- ============================================================================

-- ✅ Engineer clicks "Start Assessment" from appointment page
-- ✅ Engineer can SELECT assessment (even with appointment_id = NULL)
-- ✅ Code links appointment_id to assessment
-- ✅ Engineer continues to see assessment after linking
-- ✅ No "Data integrity error" on early-stage assessments

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Migration completed successfully
-- Breaking changes: false (only expands access appropriately)
-- RLS policies updated: 1 (assessments SELECT for engineers)
-- Security impact: Engineers can only see assessments for requests they're assigned to
