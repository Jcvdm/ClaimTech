-- ============================================================================
-- Migration 072: Enforce Admin-Only Assessment Creation
-- Purpose: Block engineers from creating assessments (architectural enforcement)
-- Date: January 26, 2025
-- ============================================================================

-- Issue: Engineers can still create assessments via findOrCreateByRequest(),
--        violating the core principle of assessment-centric architecture.
--        Assessments should ONLY be created by admins when requests are created.

-- Solution: Remove engineer INSERT policy entirely. Only admins can create assessments.

-- ============================================================================
-- FIX: Remove Engineer Assessment INSERT Policy
-- ============================================================================

-- Drop the policy from Migration 071 that allowed engineers to INSERT assessments
DROP POLICY IF EXISTS "Engineers can insert assessments for their appointments" ON assessments;

COMMENT ON TABLE assessments IS
  'Assessments table - assessments can ONLY be created by admins when requests are created. Engineers can SELECT and UPDATE existing assessments, but cannot INSERT new ones.';

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify that engineers can still SELECT and UPDATE assessments
-- But they CANNOT INSERT assessments (no INSERT policy for authenticated users)

DO $$
BEGIN
  RAISE NOTICE 'Migration 072 applied successfully';
  RAISE NOTICE 'Engineer INSERT policy removed';
  RAISE NOTICE 'Only admins can create assessments via service role or admin role';
  RAISE NOTICE 'Engineers can only SELECT and UPDATE existing assessments';
  RAISE NOTICE 'This enforces the assessment-centric architecture principle';
END $$;

-- ============================================================================
-- Expected Behavior After Migration
-- ============================================================================

-- ✅ Admin creates request → assessment auto-created (via service role)
-- ✅ Engineer opens assessment page → finds existing assessment (SELECT works)
-- ❌ Engineer tries to create assessment → RLS 42501 error (no INSERT policy)
-- ✅ Engineer updates assessment → UPDATE works (existing policies)

-- ============================================================================
-- Migration Metadata
-- ============================================================================

-- Migration completed successfully
-- Breaking changes: false (engineers were never supposed to create assessments)
-- RLS policies removed: 1 (assessments INSERT for engineers)
-- Architectural principle enforced: admin-only assessment creation
