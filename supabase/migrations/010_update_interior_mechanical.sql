-- Update assessment_interior_mechanical table to add new fields
-- Add transmission type, gear lever photo, and vehicle power fields
-- Update SRS system to include 'deployed' option

-- Add transmission type field (automatic or manual)
ALTER TABLE assessment_interior_mechanical 
  ADD COLUMN IF NOT EXISTS transmission_type TEXT CHECK (transmission_type IN ('automatic', 'manual'));

-- Add gear lever photo
ALTER TABLE assessment_interior_mechanical 
  ADD COLUMN IF NOT EXISTS gear_lever_photo_url TEXT;

-- Add vehicle power field (does the vehicle have power)
ALTER TABLE assessment_interior_mechanical 
  ADD COLUMN IF NOT EXISTS vehicle_has_power BOOLEAN;

-- Update SRS system constraint to include 'deployed' option
-- First drop the old constraint
ALTER TABLE assessment_interior_mechanical 
  DROP CONSTRAINT IF EXISTS assessment_interior_mechanical_srs_system_check;

-- Add new constraint with 'deployed' option
ALTER TABLE assessment_interior_mechanical 
  ADD CONSTRAINT assessment_interior_mechanical_srs_system_check 
  CHECK (srs_system IN ('operational', 'warning_light', 'not_working', 'deployed'));

-- Add comments for documentation
COMMENT ON COLUMN assessment_interior_mechanical.transmission_type IS 'Type of transmission: automatic or manual';
COMMENT ON COLUMN assessment_interior_mechanical.gear_lever_photo_url IS 'Photo of the gear lever/shifter';
COMMENT ON COLUMN assessment_interior_mechanical.vehicle_has_power IS 'Whether the vehicle has electrical power (battery connected and working)';
COMMENT ON COLUMN assessment_interior_mechanical.srs_system IS 'SRS (airbag) system status: operational, warning_light, not_working, or deployed';

