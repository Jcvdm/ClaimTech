ALTER TABLE public.shop_estimates
  ADD COLUMN IF NOT EXISTS pdf_path TEXT;
