-- Migration 064: Fix RLS Infinite Recursion on user_profiles Table
--
-- Problem: The user_profiles RLS policies query the same table to check admin status,
--          causing infinite recursion when users try to log in.
--
-- Root Cause: Policies use "EXISTS (SELECT 1 FROM user_profiles WHERE ...)"
--             which triggers the same RLS policies again → infinite loop
--
-- Solution: Use JWT claims instead of database queries. The custom_access_token_hook
--           (migration 045) already adds 'user_role' to JWT tokens, so we can check
--           auth.jwt() ->> 'user_role' without querying the database.
--
-- Created: October 25, 2025
-- References:
--   - Migration 043 (original policies with recursion)
--   - Migration 045 (JWT custom claims hook)
--   - Task: .agent/Tasks/active/fix_rls_recursion_and_errors.md

-- ============================================================================
-- Step 1: Drop Recursive Policies
-- ============================================================================

-- These policies cause infinite recursion by querying user_profiles
-- while evaluating access to user_profiles

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;

-- ============================================================================
-- Step 2: Create JWT-Based Policies (No Recursion)
-- ============================================================================

-- These policies check JWT claims which don't trigger RLS policies,
-- breaking the recursive loop

-- SELECT: Admins can read all profiles, users can read their own
CREATE POLICY "Admin or own profile read access"
  ON public.user_profiles
  FOR SELECT
  USING (
    -- Check JWT claim for admin role (no database query = no recursion)
    (auth.jwt() ->> 'user_role') = 'admin'
    -- OR user is reading their own profile
    OR auth.uid() = id
  );

-- INSERT: Only admins can create new profiles
CREATE POLICY "Admin can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
  );

-- UPDATE: Admins can update all profiles
-- Note: "Users can update own profile" policy from migration 043 still exists
--       and allows users to update their own profile
CREATE POLICY "Admin can update all profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_role') = 'admin'
  );

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admin can delete profiles"
  ON public.user_profiles
  FOR DELETE
  USING (
    (auth.jwt() ->> 'user_role') = 'admin'
  );

-- ============================================================================
-- Verification
-- ============================================================================

-- After this migration:
-- ✅ No database queries in RLS policies = no recursion
-- ✅ JWT claims checked directly via auth.jwt()
-- ✅ Custom access token hook (migration 045) adds user_role to JWT
-- ✅ Users can log in without infinite recursion errors
-- ✅ Admins have full access (read/insert/update/delete)
-- ✅ Regular users can read/update own profile only

-- Note: The custom_access_token_hook must be ENABLED in Supabase Dashboard
--       for JWT claims to be populated. Check: Authentication → Hooks
