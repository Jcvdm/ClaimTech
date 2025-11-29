-- Enhance appointments table with additional address fields
-- Note: location_address, location_city, location_province, location_notes already exist
-- This adds the missing structured fields for consistency with requests table

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS location_street_address TEXT,
  ADD COLUMN IF NOT EXISTS location_suburb TEXT,
  ADD COLUMN IF NOT EXISTS location_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS location_place_id TEXT;

-- Create index for postal code filtering
CREATE INDEX IF NOT EXISTS idx_appointments_location_postal_code ON appointments(location_postal_code);
CREATE INDEX IF NOT EXISTS idx_appointments_location_city ON appointments(location_city);

-- Add comments for documentation
COMMENT ON COLUMN appointments.location_street_address IS 'Street number and name of appointment location';
COMMENT ON COLUMN appointments.location_suburb IS 'Suburb/neighborhood of appointment location';
COMMENT ON COLUMN appointments.location_postal_code IS 'South African postal code (4 digits)';
COMMENT ON COLUMN appointments.location_latitude IS 'Latitude coordinate of appointment location';
COMMENT ON COLUMN appointments.location_longitude IS 'Longitude coordinate of appointment location';
COMMENT ON COLUMN appointments.location_place_id IS 'Google Places API place_id for reference';
