-- Migration 065: Fix handle_new_user() function role constraint violation
-- Issue: Function defaulted to 'user' role which violates user_profiles_role_check
-- Fix: Read role from user metadata and default to 'engineer' instead of 'user'

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_role text;
  engineer_record record;
BEGIN
  -- Get role from user metadata (set during admin.createUser)
  user_role := NEW.raw_user_meta_data->>'role';

  -- If no role in metadata, check if engineer exists by email
  IF user_role IS NULL THEN
    SELECT * INTO engineer_record
    FROM public.engineers
    WHERE email = NEW.email;

    IF FOUND THEN
      user_role := 'engineer';

      -- Link engineer to auth user
      UPDATE public.engineers
      SET auth_user_id = NEW.id
      WHERE id = engineer_record.id;
    ELSE
      -- Default to engineer for this system (admin/engineer only)
      user_role := 'engineer';
    END IF;
  END IF;

  -- Validate role is allowed (admin or engineer only)
  -- This ensures we never violate the user_profiles_role_check constraint
  IF user_role NOT IN ('admin', 'engineer') THEN
    user_role := 'engineer';
  END IF;

  -- Create user profile with validated role
  INSERT INTO public.user_profiles (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, user_role, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Verify the trigger is still active
-- (Should already exist from previous migration, but this confirms it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function to create user_profiles on auth.users INSERT.
   Reads role from raw_user_meta_data (set via admin.createUser).
   Defaults to engineer role to comply with user_profiles_role_check constraint.
   Links existing engineer records via email match.';
