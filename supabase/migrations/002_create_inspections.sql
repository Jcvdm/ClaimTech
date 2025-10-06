-- Create inspections table
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_number TEXT UNIQUE NOT NULL,
  request_id UUID REFERENCES requests(id) NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  
  -- Request reference data
  type TEXT NOT NULL CHECK (type IN ('insurance', 'private')),
  claim_number TEXT,
  request_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- Vehicle Information (copied from request)
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_vin TEXT,
  vehicle_registration TEXT,
  vehicle_color TEXT,
  vehicle_mileage INTEGER,
  
  -- Inspection specific
  scheduled_date TIMESTAMPTZ,
  inspection_location TEXT,
  assigned_engineer_id UUID REFERENCES engineers(id),
  notes TEXT,
  
  -- Metadata
  accepted_by UUID, -- User who accepted the request
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for inspections
CREATE INDEX idx_inspections_request ON inspections(request_id);
CREATE INDEX idx_inspections_client ON inspections(client_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_engineer ON inspections(assigned_engineer_id);
CREATE INDEX idx_inspections_number ON inspections(inspection_number);

-- Add constraint: one inspection per request
CREATE UNIQUE INDEX idx_inspections_unique_request ON inspections(request_id);

-- Trigger for updated_at
CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for development
CREATE POLICY "Allow all operations for development" ON inspections
  FOR ALL
  USING (true)
  WITH CHECK (true);

