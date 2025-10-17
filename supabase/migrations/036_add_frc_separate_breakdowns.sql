-- Add separate estimate and additionals breakdown columns to assessment_frc
-- This allows displaying original estimate totals separately from additionals totals
-- Parts and outwork show NETT values, with markup as a separate line item

-- QUOTED ESTIMATE BREAKDOWN (original estimate only)
ALTER TABLE assessment_frc ADD COLUMN quoted_estimate_parts_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_estimate_labour DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_estimate_paint DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_estimate_outwork_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_estimate_markup DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_estimate_subtotal DECIMAL(10,2) DEFAULT 0.00;

-- QUOTED ADDITIONALS BREAKDOWN (approved additionals only)
ALTER TABLE assessment_frc ADD COLUMN quoted_additionals_parts_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_additionals_labour DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_additionals_paint DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_additionals_outwork_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_additionals_markup DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN quoted_additionals_subtotal DECIMAL(10,2) DEFAULT 0.00;

-- ACTUAL ESTIMATE BREAKDOWN (original estimate only)
ALTER TABLE assessment_frc ADD COLUMN actual_estimate_parts_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_estimate_labour DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_estimate_paint DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_estimate_outwork_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_estimate_markup DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_estimate_subtotal DECIMAL(10,2) DEFAULT 0.00;

-- ACTUAL ADDITIONALS BREAKDOWN (approved additionals only)
ALTER TABLE assessment_frc ADD COLUMN actual_additionals_parts_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_additionals_labour DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_additionals_paint DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_additionals_outwork_nett DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_additionals_markup DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE assessment_frc ADD COLUMN actual_additionals_subtotal DECIMAL(10,2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN assessment_frc.quoted_estimate_parts_nett IS 'Quoted parts nett total from original estimate only (no markup)';
COMMENT ON COLUMN assessment_frc.quoted_estimate_labour IS 'Quoted labour total from original estimate only (S&A + Labour)';
COMMENT ON COLUMN assessment_frc.quoted_estimate_paint IS 'Quoted paint total from original estimate only';
COMMENT ON COLUMN assessment_frc.quoted_estimate_outwork_nett IS 'Quoted outwork nett total from original estimate only (no markup)';
COMMENT ON COLUMN assessment_frc.quoted_estimate_markup IS 'Quoted markup amount from original estimate (parts + outwork markup)';
COMMENT ON COLUMN assessment_frc.quoted_estimate_subtotal IS 'Quoted subtotal from original estimate (nett + markup)';

COMMENT ON COLUMN assessment_frc.quoted_additionals_parts_nett IS 'Quoted parts nett total from approved additionals only (no markup)';
COMMENT ON COLUMN assessment_frc.quoted_additionals_labour IS 'Quoted labour total from approved additionals only (S&A + Labour)';
COMMENT ON COLUMN assessment_frc.quoted_additionals_paint IS 'Quoted paint total from approved additionals only';
COMMENT ON COLUMN assessment_frc.quoted_additionals_outwork_nett IS 'Quoted outwork nett total from approved additionals only (no markup)';
COMMENT ON COLUMN assessment_frc.quoted_additionals_markup IS 'Quoted markup amount from approved additionals (parts + outwork markup)';
COMMENT ON COLUMN assessment_frc.quoted_additionals_subtotal IS 'Quoted subtotal from approved additionals (nett + markup)';

COMMENT ON COLUMN assessment_frc.actual_estimate_parts_nett IS 'Actual parts nett total from original estimate lines (no markup)';
COMMENT ON COLUMN assessment_frc.actual_estimate_labour IS 'Actual labour total from original estimate lines (S&A + Labour)';
COMMENT ON COLUMN assessment_frc.actual_estimate_paint IS 'Actual paint total from original estimate lines';
COMMENT ON COLUMN assessment_frc.actual_estimate_outwork_nett IS 'Actual outwork nett total from original estimate lines (no markup)';
COMMENT ON COLUMN assessment_frc.actual_estimate_markup IS 'Actual markup amount from original estimate lines (parts + outwork markup)';
COMMENT ON COLUMN assessment_frc.actual_estimate_subtotal IS 'Actual subtotal from original estimate lines (nett + markup)';

COMMENT ON COLUMN assessment_frc.actual_additionals_parts_nett IS 'Actual parts nett total from additional lines (no markup)';
COMMENT ON COLUMN assessment_frc.actual_additionals_labour IS 'Actual labour total from additional lines (S&A + Labour)';
COMMENT ON COLUMN assessment_frc.actual_additionals_paint IS 'Actual paint total from additional lines';
COMMENT ON COLUMN assessment_frc.actual_additionals_outwork_nett IS 'Actual outwork nett total from additional lines (no markup)';
COMMENT ON COLUMN assessment_frc.actual_additionals_markup IS 'Actual markup amount from additional lines (parts + outwork markup)';
COMMENT ON COLUMN assessment_frc.actual_additionals_subtotal IS 'Actual subtotal from additional lines (nett + markup)';

-- Note: Existing columns (quoted_parts_total, quoted_labour_total, etc.) remain for backward compatibility
-- These represent the COMBINED totals (estimate + additionals)

