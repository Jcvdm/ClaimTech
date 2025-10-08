-- Create assessment_estimates table
-- This table stores cost estimates for vehicle repairs/assessments
-- One estimate per assessment (enforced by unique constraint)

CREATE TABLE assessment_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Line items stored as JSONB array
  -- Each item: {description, category, quantity, unit_price, total}
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
CREATE INDEX idx_assessment_estimates_assessment_id ON assessment_estimates(assessment_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_assessment_estimates_updated_at
  BEFORE UPDATE ON assessment_estimates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE assessment_estimates IS 'Cost estimates for vehicle repairs and assessments';
COMMENT ON COLUMN assessment_estimates.line_items IS 'Array of line items with description, category, quantity, unit_price, and total';
COMMENT ON COLUMN assessment_estimates.subtotal IS 'Sum of all line item totals before VAT';
COMMENT ON COLUMN assessment_estimates.vat_percentage IS 'VAT percentage applied (default 15%)';
COMMENT ON COLUMN assessment_estimates.vat_amount IS 'Calculated VAT amount';
COMMENT ON COLUMN assessment_estimates.total IS 'Final total including VAT';
COMMENT ON COLUMN assessment_estimates.currency IS 'Currency code (default ZAR for South African Rand)';

-- Add constraint to ensure one estimate per assessment
COMMENT ON CONSTRAINT assessment_estimates_assessment_id_key ON assessment_estimates 
IS 'Ensures each assessment has exactly one estimate';

