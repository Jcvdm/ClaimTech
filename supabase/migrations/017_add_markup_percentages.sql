-- Migration: Add markup percentages for parts pricing
-- Description: Adds three markup percentage columns for OEM, Aftermarket, and Second Hand parts
-- Date: 2025-01-08

-- Add markup percentage columns
ALTER TABLE assessment_estimates 
ADD COLUMN oem_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
ADD COLUMN alt_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
ADD COLUMN second_hand_markup_percentage DECIMAL(5,2) DEFAULT 25.00;

-- Add comments for new columns
COMMENT ON COLUMN assessment_estimates.oem_markup_percentage IS 'Markup percentage for OEM (Original Equipment Manufacturer) parts - default 25%';
COMMENT ON COLUMN assessment_estimates.alt_markup_percentage IS 'Markup percentage for ALT (Alternative/Aftermarket) parts - default 25%';
COMMENT ON COLUMN assessment_estimates.second_hand_markup_percentage IS 'Markup percentage for 2ND (Second Hand/Used) parts - default 25%';

-- Update existing estimates to have default markup percentages
UPDATE assessment_estimates 
SET 
  oem_markup_percentage = 25.00,
  alt_markup_percentage = 25.00,
  second_hand_markup_percentage = 25.00
WHERE 
  oem_markup_percentage IS NULL 
  OR alt_markup_percentage IS NULL 
  OR second_hand_markup_percentage IS NULL;

-- Markup Calculation Documentation:
-- When a part is added with a nett price (cost price), the system applies markup:
-- selling_price = nett_price × (1 + markup_percentage / 100)
--
-- Example with 25% markup:
-- Nett Price: R10,000
-- Markup: 25%
-- Selling Price: R10,000 × 1.25 = R12,500
--
-- The markup percentage used depends on the part_type field in line_items:
-- - part_type = 'OEM' → uses oem_markup_percentage
-- - part_type = 'ALT' → uses alt_markup_percentage  
-- - part_type = '2ND' → uses second_hand_markup_percentage

-- Line items JSONB structure update:
-- Each line item now includes:
-- {
--   "id": "uuid",
--   "process_type": "N|R|P|B|A|O",
--   "part_type": "OEM|ALT|2ND" (only for process_type='N'),
--   "description": "string",
--   "part_price_nett": number (nett price without markup - user input),
--   "part_price": number (selling price with markup - calculated),
--   "strip_assemble_hours": number (hours for S&A - user input),
--   "strip_assemble": number (S&A cost = hours × labour_rate - calculated),
--   "labour_hours": number,
--   "labour_cost": number (calculated),
--   "paint_panels": number,
--   "paint_cost": number (calculated),
--   "outwork_charge": number,
--   "total": number
-- }

COMMENT ON COLUMN assessment_estimates.line_items IS 
'JSONB array of estimate line items. Each item contains:
- id: unique identifier
- process_type: N (New), R (Repair), P (Paint), B (Blend), A (Align), O (Outwork)
- part_type: OEM (Original), ALT (Alternative), 2ND (Second Hand) - only for process_type=N
- description: item description
- part_price_nett: nett price without markup (user input for N only)
- part_price: selling price with markup applied (calculated for N only)
- strip_assemble_hours: hours for strip & assemble (user input for N,R,P,B)
- strip_assemble: S&A cost = hours × labour_rate (calculated for N,R,P,B)
- labour_hours: hours of labour (N, R, A)
- labour_cost: calculated labour cost
- paint_panels: number of panels to paint (N, R, P, B)
- paint_cost: calculated paint cost
- outwork_charge: outwork cost (O only)
- total: total cost for line item';


