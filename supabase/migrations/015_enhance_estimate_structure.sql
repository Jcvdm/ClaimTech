-- Enhance assessment_estimates table with rates and updated line item structure
-- This migration adds labour_rate and paint_rate columns for calculation purposes

-- Add labour_rate column (cost per hour)
ALTER TABLE assessment_estimates 
ADD COLUMN labour_rate DECIMAL(10,2) DEFAULT 500.00;

-- Add paint_rate column (cost per panel)
ALTER TABLE assessment_estimates 
ADD COLUMN paint_rate DECIMAL(10,2) DEFAULT 2000.00;

-- Add comments for new columns
COMMENT ON COLUMN assessment_estimates.labour_rate IS 'Labour cost per hour (e.g., R500/hour)';
COMMENT ON COLUMN assessment_estimates.paint_rate IS 'Paint cost per panel (e.g., R2000/panel)';

-- Update existing estimates to have default rates
UPDATE assessment_estimates 
SET labour_rate = 500.00, paint_rate = 2000.00 
WHERE labour_rate IS NULL OR paint_rate IS NULL;

-- Line items JSONB structure documentation
-- Each line item should have the following structure based on process_type:
-- {
--   "id": "uuid",
--   "process_type": "N|R|P|B|A|O",
--   "description": "string",
--   "part_price": number (nullable - only for N),
--   "strip_assemble": number (nullable - for N,R,P,B),
--   "labour_hours": number (nullable - for N,R,A),
--   "labour_cost": number (calculated: labour_hours × labour_rate),
--   "paint_panels": number (nullable - for N,R,P,B),
--   "paint_cost": number (calculated: paint_panels × paint_rate),
--   "outwork_charge": number (nullable - only for O),
--   "total": number (calculated sum of applicable costs)
-- }
--
-- Process Types:
-- N = New Part: part_price + strip_assemble + labour + paint
-- R = Repair: strip_assemble + labour + paint (no part)
-- P = Paint: strip_assemble + paint
-- B = Blend: strip_assemble + paint
-- A = Align: labour only
-- O = Outwork: outwork_charge only

COMMENT ON COLUMN assessment_estimates.line_items IS 
'Array of line items with process-based fields. Structure varies by process_type (N,R,P,B,A,O). See migration 015 for details.';

