-- Add original estimate snapshot to shop_additionals (frozen at time of creation)
ALTER TABLE public.shop_additionals
  ADD COLUMN IF NOT EXISTS original_line_items JSONB,
  ADD COLUMN IF NOT EXISTS original_subtotal DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS original_vat_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS original_total DECIMAL(12,2);

COMMENT ON COLUMN public.shop_additionals.original_line_items IS 'Frozen snapshot of estimate line items at time additionals were created';
