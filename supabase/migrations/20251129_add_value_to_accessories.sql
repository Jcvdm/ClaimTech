-- Add value column to assessment_accessories table
-- This value applies equally to trade/market/retail calculations

ALTER TABLE assessment_accessories
ADD COLUMN IF NOT EXISTS value numeric DEFAULT NULL;

COMMENT ON COLUMN assessment_accessories.value IS
'Single value for accessory that applies equally to trade/market/retail calculations';
