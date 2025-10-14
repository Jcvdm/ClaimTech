-- Add write-off percentage fields to clients table
-- These percentages are used to calculate vehicle write-off thresholds
-- Different insurance companies may have different write-off criteria

ALTER TABLE clients 
ADD COLUMN borderline_writeoff_percentage DECIMAL(5,2) DEFAULT 65.00,
ADD COLUMN total_writeoff_percentage DECIMAL(5,2) DEFAULT 70.00,
ADD COLUMN salvage_percentage DECIMAL(5,2) DEFAULT 28.00;

-- Add comments to document the fields
COMMENT ON COLUMN clients.borderline_writeoff_percentage 
IS 'Percentage threshold for borderline write-off calculation (default 65%). Used to determine if vehicle is approaching write-off status.';

COMMENT ON COLUMN clients.total_writeoff_percentage 
IS 'Percentage threshold for total write-off calculation (default 70%). Used to determine if vehicle should be written off.';

COMMENT ON COLUMN clients.salvage_percentage 
IS 'Percentage for salvage value calculation (default 28%). Used to calculate salvage value of written-off vehicles.';

-- Update existing clients to have default values (in case NULL)
UPDATE clients 
SET 
  borderline_writeoff_percentage = 65.00,
  total_writeoff_percentage = 70.00,
  salvage_percentage = 28.00
WHERE 
  borderline_writeoff_percentage IS NULL 
  OR total_writeoff_percentage IS NULL 
  OR salvage_percentage IS NULL;

