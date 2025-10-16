-- Add frozen rates and markups to assessments table
-- These values are snapshotted at estimate finalization for FRC consistency

ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS finalized_labour_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS finalized_paint_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS finalized_oem_markup DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS finalized_alt_markup DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS finalized_second_hand_markup DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS finalized_outwork_markup DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN assessments.finalized_labour_rate IS 'Labour rate (per hour) frozen at estimate finalization for FRC consistency';
COMMENT ON COLUMN assessments.finalized_paint_rate IS 'Paint rate (per panel) frozen at estimate finalization for FRC consistency';
COMMENT ON COLUMN assessments.finalized_oem_markup IS 'OEM parts markup percentage frozen at estimate finalization for FRC consistency';
COMMENT ON COLUMN assessments.finalized_alt_markup IS 'Alternative parts markup percentage frozen at estimate finalization for FRC consistency';
COMMENT ON COLUMN assessments.finalized_second_hand_markup IS 'Second-hand parts markup percentage frozen at estimate finalization for FRC consistency';
COMMENT ON COLUMN assessments.finalized_outwork_markup IS 'Outwork markup percentage frozen at estimate finalization for FRC consistency';

