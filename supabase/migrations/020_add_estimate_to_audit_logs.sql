-- Add 'estimate' to audit_logs entity_type constraint
-- This fixes the 23514 error when logging audit entries for estimate changes

-- Drop the old constraint
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;

-- Add the new constraint with 'estimate' included
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
    'damage_record',
    'estimate'
  ));

-- Add comment
COMMENT ON CONSTRAINT audit_logs_entity_type_check ON audit_logs IS 
  'Ensures entity_type is one of the valid entity types including estimate';

