-- Add Warranty / Service Details to assessment_vehicle_values table
-- These fields track vehicle warranty status and service history

ALTER TABLE assessment_vehicle_values
  ADD COLUMN warranty_status TEXT CHECK (warranty_status IN ('active', 'expired', 'void', 'transferred', 'unknown')),
  ADD COLUMN warranty_period_years INTEGER,
  ADD COLUMN warranty_start_date DATE,
  ADD COLUMN warranty_end_date DATE,
  ADD COLUMN warranty_expiry_mileage TEXT,
  ADD COLUMN service_history_status TEXT CHECK (service_history_status IN ('checked', 'not_checked', 'incomplete', 'up_to_date', 'overdue', 'unknown')),
  ADD COLUMN warranty_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN assessment_vehicle_values.warranty_status 
  IS 'Current warranty status: active, expired, void, transferred, or unknown';
  
COMMENT ON COLUMN assessment_vehicle_values.warranty_period_years 
  IS 'Warranty period in years (e.g., 3, 5, 7)';
  
COMMENT ON COLUMN assessment_vehicle_values.warranty_start_date 
  IS 'Warranty start date (From)';
  
COMMENT ON COLUMN assessment_vehicle_values.warranty_end_date 
  IS 'Warranty end date (To)';
  
COMMENT ON COLUMN assessment_vehicle_values.warranty_expiry_mileage 
  IS 'Warranty expiry mileage (e.g., "unlimited", "100000", "150000")';
  
COMMENT ON COLUMN assessment_vehicle_values.service_history_status 
  IS 'Service history verification status: checked, not_checked, incomplete, up_to_date, overdue, or unknown';
  
COMMENT ON COLUMN assessment_vehicle_values.warranty_notes 
  IS 'Additional warranty and service information';

