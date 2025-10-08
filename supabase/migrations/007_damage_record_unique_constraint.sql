-- Add unique constraint to ensure one damage record per assessment
-- This enforces the business rule that each incident/claim has only one damage record

ALTER TABLE assessment_damage 
ADD CONSTRAINT assessment_damage_assessment_id_unique UNIQUE (assessment_id);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT assessment_damage_assessment_id_unique ON assessment_damage 
IS 'Ensures each assessment has exactly one damage record';

