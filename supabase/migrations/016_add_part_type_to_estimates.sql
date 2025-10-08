-- Migration: Add part_type field to estimate line items
-- Description: Adds part_type field to line_items JSONB structure for tracking part origin
-- Date: 2025-01-08

-- Note: Since line_items is stored as JSONB, no schema change is required.
-- This migration serves as documentation for the new field structure.

-- Part Type Field Documentation:
-- part_type: 'OEM' | 'ALT' | '2ND'
--   - OEM: Original Equipment Manufacturer (genuine parts)
--   - ALT: Alternative/Aftermarket parts
--   - 2ND: Second Hand/Used parts
-- 
-- This field is only applicable when process_type = 'N' (New Part)
-- For other process types (R, P, B, A, O), part_type should be null or omitted

-- Example line_item structure with part_type:
-- {
--   "id": "uuid",
--   "process_type": "N",
--   "part_type": "OEM",
--   "description": "Front Bumper",
--   "part_price": 5000.00,
--   "strip_assemble": 500.00,
--   "labour_hours": 2.5,
--   "labour_cost": 1250.00,
--   "paint_panels": 1,
--   "paint_cost": 2000.00,
--   "total": 8750.00
-- }

COMMENT ON COLUMN assessment_estimates.line_items IS 
'JSONB array of estimate line items. Each item contains:
- id: unique identifier
- process_type: N (New), R (Repair), P (Paint), B (Blend), A (Align), O (Outwork)
- part_type: OEM (Original), ALT (Alternative), 2ND (Second Hand) - only for process_type=N
- description: item description
- part_price: cost of part (N only)
- strip_assemble: strip and assemble cost (N, R, P, B)
- labour_hours: hours of labour (N, R, A)
- labour_cost: calculated labour cost
- paint_panels: number of panels to paint (N, R, P, B)
- paint_cost: calculated paint cost
- outwork_charge: outwork cost (O only)
- total: total cost for line item';

