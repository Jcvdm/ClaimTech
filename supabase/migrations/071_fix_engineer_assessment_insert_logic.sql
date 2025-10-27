-- ============================================================================
-- Migration 071: Fix Engineer Assessment INSERT Policy Logic
-- Purpose: Allow early-stage assessments WITH appointment_id if it belongs to engineer
-- Date: January 26, 2025
-- ============================================================================

-- Issue: Migration 070 was too restrictive. It required early stages to have
--        appointment_id IS NULL, but the code passes appointment_id when engineers
--        open the assessment page, causing RLS 42501 errors.
--
-- Fix: Allow early stages to have appointment_id as long as it belongs to the engineer.

-- ============================================================================
-- FIX: Update Engineer Assessment INSERT Policy (Corrected Logic)
-- ============================================================================

-- Drop incorrect policy from Migration 070
DROP POLICY IF EXISTS "Engineers can insert assessments for their appointments" ON assessments;

-- Create corrected policy
CREATE POLICY "Engineers can insert assessments for their appointments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (
  -- EARLY STAGES: Allow with OR without appointment_id
  (
    stage IN ('request_submitted', 'request_accepted')
    AND (
      -- Case 1: Admin creates assessment with request (no appointment yet)
      appointment_id IS NULL
      OR
      -- Case 2: Engineer opens assessment page with appointment context
      EXISTS (
        SELECT 1 FROM appointments
        WHERE appointments.id = appointment_id
        AND appointments.engineer_id = get_user_engineer_id()
      )
    )
  )
  OR
  -- LATER STAGES: Require appointment with engineer assignment
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
  'Allows engineers to create assessments at any stage if they are assigned via appointment. Early stages (request_submitted, request_accepted) allow NULL appointment_id for admin-created assessments, or appointment_id if the engineer is assigned to that appointment. Later stages require appointment with engineer assignment.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 071 applied successfully';
  RAISE NOTICE 'Engineer INSERT policy now allows:';
  RAISE NOTICE '  1. Early stages + NULL appointment_id (admin creates with request)';
  RAISE NOTICE '  2. Early stages + appointment_id belonging to engineer (engineer opens page)';
  RAISE NOTICE '  3. Later stages + appointment_id belonging to engineer';
END $$;

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Migration completed successfully
-- Breaking changes: false (backward compatible)
-- RLS policies updated: 1 (assessments INSERT for engineers)
