-- Create assessment_vehicle_values table
-- This table stores vehicle valuation data from third-party valuators
-- One vehicle values record per assessment (enforced by unique constraint)

CREATE TABLE assessment_vehicle_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Valuation Source (generic for all valuation sources)
  sourced_from TEXT, -- e.g., "TransUnion - iCheck", "Lightstone Auto", "AutoTrader"
  sourced_code TEXT, -- Reference code from valuation report
  sourced_date DATE, -- Date of valuation
  
  -- Vehicle Values (manually entered from third-party report)
  trade_value DECIMAL(12,2),
  market_value DECIMAL(12,2),
  retail_value DECIMAL(12,2),
  
  -- New List Price (optional)
  new_list_price DECIMAL(12,2),
  
  -- Depreciation (optional)
  depreciation_percentage DECIMAL(5,2),
  
  -- Generic Adjustments (applicable to any valuation source)
  valuation_adjustment DECIMAL(12,2), -- Fixed amount adjustment (e.g., R82,413.00)
  valuation_adjustment_percentage DECIMAL(5,2), -- Percentage adjustment (e.g., 9%)
  condition_adjustment_percentage DECIMAL(5,2), -- Condition adjustment % (e.g., 5%)
  
  -- Adjusted Values (calculated after adjustments)
  trade_adjusted_value DECIMAL(12,2),
  market_adjusted_value DECIMAL(12,2),
  retail_adjusted_value DECIMAL(12,2),
  
  -- Optional Extras (stored as JSONB array)
  -- Each extra: {id, description, trade_value, market_value, retail_value}
  extras JSONB DEFAULT '[]'::jsonb,
  
  -- Total Optional Extras (sum of all extras per value type)
  trade_extras_total DECIMAL(12,2) DEFAULT 0.00,
  market_extras_total DECIMAL(12,2) DEFAULT 0.00,
  retail_extras_total DECIMAL(12,2) DEFAULT 0.00,
  
  -- Total Adjusted Values (adjusted value + extras)
  trade_total_adjusted_value DECIMAL(12,2),
  market_total_adjusted_value DECIMAL(12,2),
  retail_total_adjusted_value DECIMAL(12,2),
  
  -- Write-off Calculations (calculated using client's percentages)
  borderline_writeoff_trade DECIMAL(12,2),
  borderline_writeoff_market DECIMAL(12,2),
  borderline_writeoff_retail DECIMAL(12,2),
  
  total_writeoff_trade DECIMAL(12,2),
  total_writeoff_market DECIMAL(12,2),
  total_writeoff_retail DECIMAL(12,2),
  
  salvage_trade DECIMAL(12,2),
  salvage_market DECIMAL(12,2),
  salvage_retail DECIMAL(12,2),
  
  -- PDF Proof Document
  valuation_pdf_url TEXT,
  valuation_pdf_path TEXT,
  
  -- Remarks/Notes
  remarks TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_vehicle_values_assessment ON assessment_vehicle_values(assessment_id);

-- Create trigger for updated_at
CREATE TRIGGER update_vehicle_values_updated_at
  BEFORE UPDATE ON assessment_vehicle_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to document the table
COMMENT ON TABLE assessment_vehicle_values 
IS 'Vehicle valuation data from third-party valuators with write-off calculations. One record per assessment.';

COMMENT ON COLUMN assessment_vehicle_values.sourced_from 
IS 'Name of valuation source (e.g., TransUnion, Lightstone Auto)';

COMMENT ON COLUMN assessment_vehicle_values.sourced_code 
IS 'Reference code from valuation report';

COMMENT ON COLUMN assessment_vehicle_values.sourced_date 
IS 'Date when valuation was performed';

COMMENT ON COLUMN assessment_vehicle_values.trade_value 
IS 'Trade-in value from valuation report';

COMMENT ON COLUMN assessment_vehicle_values.market_value 
IS 'Market value from valuation report';

COMMENT ON COLUMN assessment_vehicle_values.retail_value 
IS 'Retail value from valuation report';

COMMENT ON COLUMN assessment_vehicle_values.valuation_adjustment 
IS 'Fixed amount adjustment from valuator (e.g., R82,413.00)';

COMMENT ON COLUMN assessment_vehicle_values.valuation_adjustment_percentage 
IS 'Percentage adjustment from valuator (e.g., 9%)';

COMMENT ON COLUMN assessment_vehicle_values.condition_adjustment_percentage 
IS 'Condition-based percentage adjustment (e.g., 5%)';

COMMENT ON COLUMN assessment_vehicle_values.extras 
IS 'JSONB array of optional extras with values: [{id, description, trade_value, market_value, retail_value}]';

COMMENT ON COLUMN assessment_vehicle_values.borderline_writeoff_trade 
IS 'Calculated borderline write-off value for trade (using client percentage)';

COMMENT ON COLUMN assessment_vehicle_values.total_writeoff_trade 
IS 'Calculated total write-off value for trade (using client percentage)';

COMMENT ON COLUMN assessment_vehicle_values.salvage_trade 
IS 'Calculated salvage value for trade (using client percentage)';

COMMENT ON COLUMN assessment_vehicle_values.valuation_pdf_url 
IS 'Public URL of uploaded valuation PDF document';

COMMENT ON COLUMN assessment_vehicle_values.valuation_pdf_path 
IS 'Storage path of uploaded valuation PDF document';

