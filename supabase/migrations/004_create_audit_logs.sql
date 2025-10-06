-- Create audit_logs table for tracking all changes
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('request', 'inspection', 'task', 'client', 'engineer')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned', 'cancelled', 'accepted'
  field_name TEXT, -- Which field changed (optional)
  old_value TEXT, -- Previous value (optional)
  new_value TEXT, -- New value (optional)
  changed_by TEXT, -- User ID or name (for now just a string, later will be UUID when auth is added)
  metadata JSONB, -- Additional context (e.g., { "inspection_number": "INS-2025-001" })
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for tracking all changes to entities in the system';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being tracked (request, inspection, task, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of the entity being tracked';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (created, updated, status_changed, etc.)';
COMMENT ON COLUMN audit_logs.field_name IS 'Name of the field that was changed (optional)';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous value before the change (optional)';
COMMENT ON COLUMN audit_logs.new_value IS 'New value after the change (optional)';
COMMENT ON COLUMN audit_logs.changed_by IS 'User who made the change (currently string, will be UUID with auth)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context about the change in JSON format';

