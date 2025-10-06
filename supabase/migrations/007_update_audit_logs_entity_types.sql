-- Update audit_logs entity_type constraint to include assessment entity types
-- Drop the old constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;

-- Add the new constraint with all entity types
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_type_check 
  CHECK (entity_type IN (
    'request',
    'inspection', 
    'task',
    'client',
    'engineer',
    'appointment',
    'assessment',
    'vehicle_identification',
    'exterior_360',
    'accessory',
    'interior_mechanical',
    'tyre',
    'damage_record'
  ));

-- Add comment
COMMENT ON CONSTRAINT audit_logs_entity_type_check ON audit_logs IS 
  'Ensures entity_type is one of the valid entity types including assessment-related entities';

