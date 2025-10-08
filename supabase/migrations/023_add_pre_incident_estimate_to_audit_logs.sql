-- Add 'pre_incident_estimate' to audit_logs entity_type constraint
-- This allows audit logging for pre-incident estimate changes

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;

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
    'estimate',
    'pre_incident_estimate'
  ));

COMMENT ON CONSTRAINT audit_logs_entity_type_check ON audit_logs IS 
  'Ensures entity_type is one of the valid entity types including pre_incident_estimate';

