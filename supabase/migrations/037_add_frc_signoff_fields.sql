-- Add sign-off tracking fields to assessment_frc table
-- These fields capture who signed off on the completed FRC

ALTER TABLE assessment_frc 
ADD COLUMN signed_off_by_name TEXT,
ADD COLUMN signed_off_by_email TEXT,
ADD COLUMN signed_off_by_role TEXT,
ADD COLUMN signed_off_at TIMESTAMPTZ,
ADD COLUMN sign_off_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN assessment_frc.signed_off_by_name IS 'Name of engineer who signed off FRC';
COMMENT ON COLUMN assessment_frc.signed_off_by_email IS 'Email of engineer who signed off';
COMMENT ON COLUMN assessment_frc.signed_off_by_role IS 'Role/title of person signing off (e.g., Senior Vehicle Assessor)';
COMMENT ON COLUMN assessment_frc.signed_off_at IS 'Timestamp when FRC was signed off';
COMMENT ON COLUMN assessment_frc.sign_off_notes IS 'Optional notes from sign-off';

