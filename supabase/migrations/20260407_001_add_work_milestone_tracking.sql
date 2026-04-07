-- Add work milestone tracking to shop_jobs
ALTER TABLE public.shop_jobs
  ADD COLUMN IF NOT EXISTS parts_ordered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parts_ordered_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS parts_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parts_arrived_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS strip_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS strip_started_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.shop_jobs.parts_ordered_at IS 'When parts were ordered (can happen before check-in)';
COMMENT ON COLUMN public.shop_jobs.parts_arrived_at IS 'When ordered parts arrived';
COMMENT ON COLUMN public.shop_jobs.strip_started_at IS 'When vehicle disassembly started';
