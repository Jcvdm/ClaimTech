-- Fix function search_path security issues
-- Add "SET search_path = ''" to all functions to prevent search_path injection attacks
-- This is especially critical for SECURITY DEFINER functions used in auth/RLS

-- ============================================================================
-- CRITICAL AUTH FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Function: is_admin
-- Used in RLS policies to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = '';  -- FIX: Prevent search_path attacks

-- Function: get_user_engineer_id
-- Used in RLS policies to get engineer_id for current user
CREATE OR REPLACE FUNCTION public.get_user_engineer_id()
RETURNS UUID AS $$
DECLARE
  eng_id UUID;
BEGIN
  SELECT id INTO eng_id
  FROM public.engineers
  WHERE auth_user_id = auth.uid();

  RETURN eng_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = '';  -- FIX: Prevent search_path attacks

-- Function: custom_access_token_hook
-- Used in auth token generation (JWT claims)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_email text;
  engineer_id uuid;
BEGIN
  -- Get user email from event
  user_email := event->'claims'->>'email';

  -- Get user role from user_profiles
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = (event->'user_id')::uuid;

  -- Get engineer_id if user is an engineer
  SELECT id INTO engineer_id
  FROM public.engineers
  WHERE auth_user_id = (event->'user_id')::uuid;

  -- Set default role if not found
  IF user_role IS NULL THEN
    user_role := 'user';
  END IF;

  -- Build claims
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  claims := jsonb_set(claims, '{email}', to_jsonb(user_email));

  -- Add engineer_id if exists
  IF engineer_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{engineer_id}', to_jsonb(engineer_id));
  END IF;

  -- Update event
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = '';  -- FIX: Prevent search_path attacks

-- ============================================================================
-- TRIGGER FUNCTIONS (Standard updated_at triggers)
-- ============================================================================

-- Function: update_updated_at_column
-- Generic trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';  -- FIX: Prevent search_path attacks

-- Function: update_estimate_photos_updated_at
-- Specific trigger for estimate_photos table
CREATE OR REPLACE FUNCTION public.update_estimate_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';  -- FIX: Prevent search_path attacks

-- Function: update_user_profile_updated_at
-- Specific trigger for user_profiles table
CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';  -- FIX: Prevent search_path attacks

-- Function: update_assessment_notes_updated_at
-- Specific trigger for assessment_notes table
CREATE OR REPLACE FUNCTION public.update_assessment_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';  -- FIX: Prevent search_path attacks

-- ============================================================================
-- AUTH HOOKS AND USER MANAGEMENT
-- ============================================================================

-- Function: handle_new_user
-- Trigger to create user_profile when new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_role text := 'user';
  engineer_record record;
BEGIN
  -- Check if user has an engineer record
  SELECT * INTO engineer_record
  FROM public.engineers
  WHERE email = NEW.email;

  -- If user is an engineer, set role to 'engineer'
  IF FOUND THEN
    default_role := 'engineer';

    -- Link engineer to auth user
    UPDATE public.engineers
    SET auth_user_id = NEW.id
    WHERE id = engineer_record.id;
  END IF;

  -- Create user profile
  INSERT INTO public.user_profiles (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, default_role, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';  -- FIX: Prevent search_path attacks

-- Add comments for documentation
COMMENT ON FUNCTION public.is_admin IS 'Helper function to check if current user has admin role - SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.get_user_engineer_id IS 'Helper function to get engineer_id for current authenticated user - SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Auth hook to add custom claims to JWT tokens - SECURITY DEFINER with search_path protection';
COMMENT ON FUNCTION public.handle_new_user IS 'Trigger to create user_profile and link engineers on auth user creation - SECURITY DEFINER with search_path protection';
