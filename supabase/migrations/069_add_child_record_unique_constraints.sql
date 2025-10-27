-- Add unique constraints for idempotent child record creation
-- This ensures that default child records can be safely re-created on page refresh/retry
-- without creating duplicates or throwing constraint errors

-- assessment_tyres: ensure one tyre per position per assessment
ALTER TABLE assessment_tyres
  ADD CONSTRAINT uq_assessment_tyres_position UNIQUE (assessment_id, position);

-- assessment_vehicle_values: ensure one vehicle values record per assessment
ALTER TABLE assessment_vehicle_values
  ADD CONSTRAINT uq_assessment_vehicle_values UNIQUE (assessment_id);

-- pre_incident_estimates: ensure one pre-incident estimate per assessment
ALTER TABLE pre_incident_estimates
  ADD CONSTRAINT uq_pre_incident_estimates UNIQUE (assessment_id);

-- Add comments explaining the constraints
COMMENT ON CONSTRAINT uq_assessment_tyres_position ON assessment_tyres
  IS 'Ensures only one tyre per position per assessment - enables idempotent tyre creation';

COMMENT ON CONSTRAINT uq_assessment_vehicle_values ON assessment_vehicle_values
  IS 'Ensures only one vehicle values record per assessment - enables idempotent creation';

COMMENT ON CONSTRAINT uq_pre_incident_estimates ON pre_incident_estimates
  IS 'Ensures only one pre-incident estimate per assessment - enables idempotent creation';
