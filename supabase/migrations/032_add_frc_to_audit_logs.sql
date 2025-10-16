-- Add 'frc' and 'frc_document' to audit_logs entity_type constraint
-- This allows audit logging for FRC changes

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
    'vehicle_values',
    'estimate',
    'pre_incident_estimate',
    'frc',
    'frc_document'
  ));

COMMENT ON CONSTRAINT audit_logs_entity_type_check ON audit_logs IS 
  'Ensures entity_type is one of the valid entity types including frc and frc_document';

