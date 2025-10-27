-- ============================================================================
-- Migration 074: Fix Engineer Assessment UPDATE Policy for Early-Stage Access
-- Purpose: Allow engineers to UPDATE assessments even when appointment_id is NULL
-- Date: January 26, 2025
-- ============================================================================

-- Issue: Engineers cannot UPDATE assessments to link appointment_id when it's NULL.
--        Same catch-22 as SELECT policy (fixed in Migration 073) but for UPDATE.
--        Code tries to UPDATE { appointment_id: X } but RLS blocks because
--        the current appointment_id is NULL.

-- Root Cause: Engineer UPDATE policy requires appointment_id IS NOT NULL,
--             but the UPDATE operation is specifically trying to SET appointment_id.

-- Solution: Apply same dual-check pattern as Migration 073 SELECT policy.
--           Allow engineers to UPDATE assessments when:
--           1. Assessment has appointment_id linked to their appointment (existing)
--           2. Assessment's request has an appointment assigned to them (NEW)

-- ============================================================================
-- FIX: Update Engineer Assessment UPDATE Policy
-- ============================================================================

-- Drop current restrictive policy
DROP POLICY IF EXISTS "Engineers can update their assessments" ON assessments;

-- Create updated policy allowing early-stage updates via request's appointments
CREATE POLICY "Engineers can update their assessments"
ON assessments FOR UPDATE
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
  -- (Allows initial linking of appointment_id via UPDATE)
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.request_id = assessments.request_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

COMMENT ON POLICY "Engineers can update their assessments" ON assessments IS
  'Allows engineers to update assessments for requests they are assigned to via appointments. Handles both early-stage assessments (appointment_id = NULL - allows initial linking) and later-stage assessments (appointment_id linked). Dual-check ensures engineers can UPDATE assessment before and after appointment_id is linked on the assessment record. Matches SELECT policy pattern from Migration 073.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 074 applied successfully';
  RAISE NOTICE 'Engineer UPDATE policy updated to allow early-stage updates';
  RAISE NOTICE 'Engineers can now UPDATE assessments via request appointments even when appointment_id IS NULL';
  RAISE NOTICE 'This fixes PGRST116 error when linking appointment_id';
END $$;

-- ============================================================================
-- Expected Behavior After Migration
-- ============================================================================

-- ✅ Engineer clicks "Start Assessment" from appointment page
-- ✅ Engineer can SELECT assessment (Migration 073)
-- ✅ Engineer can UPDATE assessment to link appointment_id (Migration 074)
-- ✅ Engineer continues to UPDATE assessment after linking
-- ✅ No PGRST116 error on early-stage assessments

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Migration completed successfully
-- Breaking changes: false (only expands access appropriately)
-- RLS policies updated: 1 (assessments UPDATE for engineers)
-- Security impact: Engineers can only update assessments for requests they're assigned to
-- Companion to: Migration 073 (SELECT policy fix)
