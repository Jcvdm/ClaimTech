ALTER TABLE assessment_estimates 
  ADD COLUMN IF NOT EXISTS sundries_percentage DECIMAL(5,2) DEFAULT 1.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS sundries_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

UPDATE assessment_estimates
SET sundries_percentage = 1.00
WHERE sundries_percentage IS NULL;

UPDATE assessment_estimates
SET sundries_amount = ROUND(subtotal * 0.01, 2);

UPDATE assessment_estimates
SET 
  vat_amount = ROUND(((subtotal + sundries_amount) * vat_percentage / 100), 2),
  total = ROUND(subtotal + sundries_amount + vat_amount, 2);

COMMENT ON COLUMN assessment_estimates.sundries_percentage IS 'Fixed sundries percentage applied on subtotal (ex VAT)';
COMMENT ON COLUMN assessment_estimates.sundries_amount IS 'Calculated sundries amount (subtotal × percentage) included in VAT base';