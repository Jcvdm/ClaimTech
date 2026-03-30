-- Add check-in user tracking to shop_jobs
ALTER TABLE public.shop_jobs
  ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

COMMENT ON COLUMN public.shop_jobs.checked_in_by IS 'User who checked in the vehicle';
COMMENT ON COLUMN public.shop_jobs.checked_in_at IS 'Exact timestamp of vehicle check-in';
