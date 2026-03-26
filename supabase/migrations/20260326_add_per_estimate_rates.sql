ALTER TABLE public.shop_estimates
  ADD COLUMN IF NOT EXISTS labour_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS paint_rate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS oem_markup_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS alt_markup_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS second_hand_markup_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS outwork_markup_pct DECIMAL(5,2);
