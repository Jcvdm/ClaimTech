-- Add vehicle info columns to assessment_vehicle_identification
-- Allows engineers to edit/correct vehicle make, model, year during assessment

ALTER TABLE assessment_vehicle_identification
ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN assessment_vehicle_identification.vehicle_make IS 'Vehicle make (editable during assessment, can differ from request)';
COMMENT ON COLUMN assessment_vehicle_identification.vehicle_model IS 'Vehicle model (editable during assessment, can differ from request)';
COMMENT ON COLUMN assessment_vehicle_identification.vehicle_year IS 'Vehicle year (editable during assessment, can differ from request)';

