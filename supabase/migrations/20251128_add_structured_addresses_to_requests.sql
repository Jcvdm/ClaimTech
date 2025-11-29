-- Add structured address columns for incident location
-- Following the same pattern as appointments table for consistency
-- This enables modern address autocomplete and geocoding features

-- Incident location structured fields
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS incident_street_address TEXT,
  ADD COLUMN IF NOT EXISTS incident_suburb TEXT,
  ADD COLUMN IF NOT EXISTS incident_city TEXT,
  ADD COLUMN IF NOT EXISTS incident_province TEXT,
  ADD COLUMN IF NOT EXISTS incident_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS incident_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS incident_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS incident_place_id TEXT,
  ADD COLUMN IF NOT EXISTS incident_location_notes TEXT;

-- Owner address structured fields
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS owner_street_address TEXT,
  ADD COLUMN IF NOT EXISTS owner_suburb TEXT,
  ADD COLUMN IF NOT EXISTS owner_city TEXT,
  ADD COLUMN IF NOT EXISTS owner_province TEXT,
  ADD COLUMN IF NOT EXISTS owner_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS owner_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS owner_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS owner_place_id TEXT;

-- Create indexes for province filtering (useful for regional reports)
CREATE INDEX IF NOT EXISTS idx_requests_incident_province ON requests(incident_province);
CREATE INDEX IF NOT EXISTS idx_requests_owner_province ON requests(owner_province);
CREATE INDEX IF NOT EXISTS idx_requests_incident_city ON requests(incident_city);

-- Add comments for documentation
COMMENT ON COLUMN requests.incident_street_address IS 'Street number and name of incident location';
COMMENT ON COLUMN requests.incident_suburb IS 'Suburb/neighborhood of incident location';
COMMENT ON COLUMN requests.incident_city IS 'City/town of incident location';
COMMENT ON COLUMN requests.incident_province IS 'SA province of incident location';
COMMENT ON COLUMN requests.incident_postal_code IS 'South African postal code (4 digits)';
COMMENT ON COLUMN requests.incident_latitude IS 'Latitude coordinate of incident location';
COMMENT ON COLUMN requests.incident_longitude IS 'Longitude coordinate of incident location';
COMMENT ON COLUMN requests.incident_place_id IS 'Google Places API place_id for reference';
COMMENT ON COLUMN requests.incident_location_notes IS 'Additional notes about the incident location (access instructions, etc.)';

COMMENT ON COLUMN requests.owner_street_address IS 'Street number and name of owner address';
COMMENT ON COLUMN requests.owner_suburb IS 'Suburb/neighborhood of owner address';
COMMENT ON COLUMN requests.owner_city IS 'City/town of owner address';
COMMENT ON COLUMN requests.owner_province IS 'SA province of owner address';
COMMENT ON COLUMN requests.owner_postal_code IS 'South African postal code (4 digits)';
COMMENT ON COLUMN requests.owner_latitude IS 'Latitude coordinate of owner address';
COMMENT ON COLUMN requests.owner_longitude IS 'Longitude coordinate of owner address';
COMMENT ON COLUMN requests.owner_place_id IS 'Google Places API place_id for reference';
