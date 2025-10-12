-- Change condition_adjustment_percentage to condition_adjustment_value
-- User enters the actual adjustment amount, system calculates percentage

-- Rename the column from percentage to value
ALTER TABLE assessment_vehicle_values 
  RENAME COLUMN condition_adjustment_percentage TO condition_adjustment_value;

-- Update the comment
COMMENT ON COLUMN assessment_vehicle_values.condition_adjustment_value IS 
  'Condition adjustment amount (not percentage). System calculates percentage as (value / base_value) × 100';

