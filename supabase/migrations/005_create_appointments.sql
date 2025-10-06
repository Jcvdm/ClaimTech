-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_number TEXT UNIQUE NOT NULL,
  inspection_id UUID REFERENCES inspections(id) NOT NULL,
  request_id UUID REFERENCES requests(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  engineer_id UUID REFERENCES engineers(id) NOT NULL,
  
  -- Appointment Details
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('in_person', 'digital')),
  appointment_date TIMESTAMPTZ NOT NULL,
  appointment_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Location (for in-person only)
  location_address TEXT,
  location_city TEXT,
  location_province TEXT,
  location_notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
  
  -- Vehicle Information (copied from inspection)
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_registration TEXT,
  
  -- Notes
  notes TEXT,
  special_instructions TEXT,
  
  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

-- Add comments for documentation
COMMENT ON TABLE appointments IS 'Appointments for vehicle inspections - both in-person and digital assessments';
COMMENT ON COLUMN appointments.appointment_type IS 'Type of appointment: in_person (physical inspection) or digital (remote assessment)';
COMMENT ON COLUMN appointments.appointment_date IS 'Date and time of the appointment';
COMMENT ON COLUMN appointments.duration_minutes IS 'Expected duration of appointment in minutes';
COMMENT ON COLUMN appointments.status IS 'Current status of the appointment';

-- Indexes for efficient querying
CREATE INDEX idx_appointments_inspection ON appointments(inspection_id);
CREATE INDEX idx_appointments_engineer ON appointments(engineer_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_type ON appointments(appointment_type);
CREATE INDEX idx_appointments_request ON appointments(request_id);
CREATE INDEX idx_appointments_client ON appointments(client_id);

-- Constraint: One active appointment per inspection
-- This ensures an inspection can only have one non-cancelled/non-completed appointment at a time
CREATE UNIQUE INDEX idx_appointments_unique_active_inspection 
  ON appointments(inspection_id) 
  WHERE status NOT IN ('cancelled', 'completed');

-- Trigger for updated_at timestamp
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Permissive policy for development (allows all operations)
-- TODO: Replace with proper policies based on user roles in production
CREATE POLICY "Allow all operations on appointments for development"
  ON appointments
  FOR ALL
  USING (true)
  WITH CHECK (true);

