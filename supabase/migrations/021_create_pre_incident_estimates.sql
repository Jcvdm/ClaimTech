-- Create pre_incident_estimates table
-- This table stores pre-existing damage estimates (damage that existed before the incident)
-- One pre-incident estimate per assessment (enforced by unique constraint)

CREATE TABLE pre_incident_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Rates (same as incident estimate)
  labour_rate DECIMAL(10,2) DEFAULT 500.00,
  paint_rate DECIMAL(10,2) DEFAULT 2000.00,
  oem_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  alt_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  second_hand_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  outwork_markup_percentage DECIMAL(5,2) DEFAULT 25.00,
  
  -- Line items stored as JSONB array
  -- Each item: {id, process_type, description, part_type, part_price, labour_hours, paint_panels, etc.}
  line_items JSONB DEFAULT '[]'::jsonb,
  
  -- Calculated totals
  subtotal DECIMAL(10,2) DEFAULT 0.00,
  vat_percentage DECIMAL(5,2) DEFAULT 15.00,
  vat_amount DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) DEFAULT 0.00,
  
  -- Additional information
  notes TEXT,
  currency TEXT DEFAULT 'ZAR',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on assessment_id for faster lookups
CREATE INDEX idx_pre_incident_estimates_assessment_id ON pre_incident_estimates(assessment_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_pre_incident_estimates_updated_at
  BEFORE UPDATE ON pre_incident_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE pre_incident_estimates IS 'Pre-incident damage estimates (damage existing before the incident)';
COMMENT ON COLUMN pre_incident_estimates.line_items IS 'Array of line items with process type, description, costs, etc.';
COMMENT ON COLUMN pre_incident_estimates.subtotal IS 'Sum of all line item totals before VAT';
COMMENT ON COLUMN pre_incident_estimates.vat_percentage IS 'VAT percentage applied (default 15%)';
COMMENT ON COLUMN pre_incident_estimates.vat_amount IS 'Calculated VAT amount';
COMMENT ON COLUMN pre_incident_estimates.total IS 'Final total including VAT';
COMMENT ON COLUMN pre_incident_estimates.currency IS 'Currency code (default ZAR for South African Rand)';

-- Add constraint comment
COMMENT ON CONSTRAINT pre_incident_estimates_assessment_id_key ON pre_incident_estimates 
IS 'Ensures each assessment has exactly one pre-incident estimate';

