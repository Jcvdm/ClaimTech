-- Add repairer_id to assessment_estimates table only (not pre-incident)
ALTER TABLE assessment_estimates
ADD COLUMN repairer_id UUID REFERENCES repairers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_assessment_estimates_repairer_id ON assessment_estimates(repairer_id);

