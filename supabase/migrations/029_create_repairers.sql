-- Create repairers table
CREATE TABLE repairers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  
  -- Default rates for this repairer
  default_labour_rate DECIMAL(10,2) DEFAULT 500.00,
  default_paint_rate DECIMAL(10,2) DEFAULT 2000.00,
  default_vat_percentage DECIMAL(5,2) DEFAULT 15.00,
  default_oem_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  default_alt_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  default_second_hand_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  default_outwork_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index on name for faster searches
CREATE INDEX idx_repairers_name ON repairers(name);

-- Create index on is_active for filtering
CREATE INDEX idx_repairers_is_active ON repairers(is_active);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_repairers_updated_at
  BEFORE UPDATE ON repairers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (if needed in future)
-- For now, we'll keep it simple without RLS since auth is planned for later

