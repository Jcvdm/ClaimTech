-- Add province and company details to engineers table
ALTER TABLE engineers 
ADD COLUMN province TEXT,
ADD COLUMN company_name TEXT,
ADD COLUMN company_type TEXT CHECK (company_type IN ('internal', 'external')),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger for engineers updated_at
CREATE TRIGGER update_engineers_updated_at
  BEFORE UPDATE ON engineers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for province and company type filtering
CREATE INDEX idx_engineers_province ON engineers(province);
CREATE INDEX idx_engineers_company_type ON engineers(company_type);

-- Add vehicle_province to requests table
ALTER TABLE requests 
ADD COLUMN vehicle_province TEXT;

-- Create index for province filtering on requests
CREATE INDEX idx_requests_province ON requests(vehicle_province);

-- Add vehicle_province to inspections table
ALTER TABLE inspections 
ADD COLUMN vehicle_province TEXT;

-- Create index for province filtering on inspections
CREATE INDEX idx_inspections_province ON inspections(vehicle_province);

-- Update existing engineers with sample data
UPDATE engineers 
SET 
  province = CASE 
    WHEN name = 'James Wilson' THEN 'Gauteng'
    WHEN name = 'Emma Thompson' THEN 'Western Cape'
    WHEN name = 'Robert Davis' THEN 'Free State'
    ELSE 'Gauteng'
  END,
  company_name = 'Claimtech',
  company_type = 'internal',
  updated_at = NOW()
WHERE province IS NULL;

-- Update existing requests with sample provinces based on location
UPDATE requests 
SET vehicle_province = CASE 
  WHEN incident_location LIKE '%Sandton%' OR incident_location LIKE '%Johannesburg%' OR incident_location LIKE '%Midrand%' OR incident_location LIKE '%Pretoria%' THEN 'Gauteng'
  WHEN incident_location LIKE '%Cape Town%' THEN 'Western Cape'
  WHEN incident_location LIKE '%Durban%' THEN 'KwaZulu-Natal'
  WHEN incident_location LIKE '%Bloemfontein%' THEN 'Free State'
  ELSE 'Gauteng'
END
WHERE vehicle_province IS NULL;

-- Update existing inspections with province from their requests
UPDATE inspections 
SET vehicle_province = (
  SELECT vehicle_province 
  FROM requests 
  WHERE requests.id = inspections.request_id
)
WHERE vehicle_province IS NULL;

