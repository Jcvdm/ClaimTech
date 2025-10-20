-- Migration: Add betterment fields to estimate line items
-- Description: Adds betterment percentage fields to support deductions on specific cost components
-- Date: 2025-10-20

-- No schema changes needed since line_items is JSONB
-- This migration only updates documentation

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
- outwork_charge_nett: nett outwork cost (user input for O only)
- outwork_charge: selling price with markup (calculated for O only)
- total: total cost for line item

**BETTERMENT FIELDS (NEW):**
- betterment_part_percentage: percentage deduction on part_price_nett (0-100)
- betterment_sa_percentage: percentage deduction on strip_assemble (0-100)
- betterment_labour_percentage: percentage deduction on labour_cost (0-100)
- betterment_paint_percentage: percentage deduction on paint_cost (0-100)
- betterment_outwork_percentage: percentage deduction on outwork_charge_nett (0-100)
- betterment_total: total betterment amount deducted from line item (calculated)';

-- Also update pre-incident estimates documentation
COMMENT ON COLUMN pre_incident_estimates.line_items IS 
'JSONB array of pre-incident estimate line items. Same structure as assessment_estimates.line_items including betterment fields.';

