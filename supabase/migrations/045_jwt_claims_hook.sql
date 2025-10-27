-- JWT Claims Hook Migration
-- Adds custom access token hook to include user role and engineer_id in JWT claims
-- This allows role-based access control without additional database queries

-- Create function to add custom claims to JWT
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_province text;
  user_company text;
BEGIN
  -- Get user profile data
  SELECT 
    role,
    province,
    company
  INTO 
    user_role,
    user_province,
    user_company
  FROM public.user_profiles 
  WHERE id = (event->>'user_id')::uuid;

  -- Get existing claims
  claims := event->'claims';

  -- Add custom claims if user profile exists
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    
    -- Add province and company for engineers
    IF user_role = 'engineer' THEN
      IF user_province IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_province}', to_jsonb(user_province));
      END IF;
      
      IF user_company IS NOT NULL THEN
        claims := jsonb_set(claims, '{user_company}', to_jsonb(user_company));
      END IF;
    END IF;
  ELSE
    -- Default to engineer role if no profile exists yet
    claims := jsonb_set(claims, '{user_role}', '"engineer"');
  END IF;

  -- Update event with new claims
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant necessary permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant supabase_auth_admin access to user_profiles table
GRANT SELECT ON TABLE public.user_profiles TO supabase_auth_admin;

-- Add comment for documentation
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Custom access token hook that adds user_role, user_province, and user_company to JWT claims for role-based access control';

-- Note: After running this migration, you must enable the hook in Supabase Dashboard:
-- 1. Go to Authentication → Hooks
-- 2. Enable "Custom Access Token Hook"
-- 3. Select "public.custom_access_token_hook"
-- 4. Save

