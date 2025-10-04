-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('insurance', 'private')),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for clients
CREATE INDEX idx_clients_type ON clients(type);
CREATE INDEX idx_clients_active ON clients(is_active);
CREATE INDEX idx_clients_name ON clients(name);

-- Create requests table
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('insurance', 'private')),
  claim_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_progress', 'completed', 'cancelled')),
  description TEXT,
  
  -- Incident Details
  date_of_loss DATE,
  insured_value DECIMAL(12,2),
  incident_type TEXT,
  incident_description TEXT,
  incident_location TEXT,
  
  -- Vehicle Information
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_vin TEXT,
  vehicle_registration TEXT,
  vehicle_color TEXT,
  vehicle_mileage INTEGER,
  
  -- Owner Details (Insured Party)
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  owner_address TEXT,
  
  -- Third Party Details (if applicable)
  third_party_name TEXT,
  third_party_phone TEXT,
  third_party_email TEXT,
  third_party_insurance TEXT,
  
  -- Workflow
  current_step TEXT DEFAULT 'request' CHECK (current_step IN ('request', 'assessment', 'quote', 'approval')),
  assigned_engineer_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for requests
CREATE INDEX idx_requests_client ON requests(client_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_step ON requests(current_step);
CREATE INDEX idx_requests_engineer ON requests(assigned_engineer_id);
CREATE INDEX idx_requests_number ON requests(request_number);

-- Create request_tasks table
CREATE TABLE request_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  step TEXT NOT NULL CHECK (step IN ('request', 'assessment', 'quote', 'approval')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  assigned_to UUID,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for request_tasks
CREATE INDEX idx_tasks_request ON request_tasks(request_id);
CREATE INDEX idx_tasks_status ON request_tasks(status);
CREATE INDEX idx_tasks_assigned ON request_tasks(assigned_to);

-- Create engineers table
CREATE TABLE engineers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  specialization TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for engineers
CREATE INDEX idx_engineers_active ON engineers(is_active);
CREATE INDEX idx_engineers_email ON engineers(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_request_tasks_updated_at
  BEFORE UPDATE ON request_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (will be tightened with auth)
CREATE POLICY "Allow all operations on clients for now" ON clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on requests for now" ON requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on request_tasks for now" ON request_tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on engineers for now" ON engineers
  FOR ALL USING (true) WITH CHECK (true);

