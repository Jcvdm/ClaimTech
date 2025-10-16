-- Create assessment_frc table for Final Repair Costing
-- This table stores the reconciliation between quoted estimates and actual repair costs
-- One FRC record per assessment (enforced by unique constraint)

CREATE TABLE assessment_frc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  
  -- Line items stored as JSONB array (snapshot from estimate + approved additionals)
  -- Each item: {
  --   id: uuid,
  --   source: 'estimate' | 'additional',
  --   source_line_id: uuid,
  --   process_type: 'N' | 'R' | 'P' | 'B' | 'A' | 'O',
  --   description: string,
  --   quoted_total: number,
  --   actual_total: number | null,
  --   decision: 'pending' | 'agree' | 'adjust',
  --   adjust_reason: string | null (required when decision = 'adjust')
  -- }
  line_items JSONB DEFAULT '[]'::jsonb,
  
  -- VAT percentage (snapshot from estimate)
  vat_percentage DECIMAL(5,2) DEFAULT 15.00,
  
  -- Quoted breakdown (calculated once on FRC start from snapshot)
  quoted_parts_total DECIMAL(10,2) DEFAULT 0.00,
  quoted_labour_total DECIMAL(10,2) DEFAULT 0.00,
  quoted_paint_total DECIMAL(10,2) DEFAULT 0.00,
  quoted_outwork_total DECIMAL(10,2) DEFAULT 0.00,
  quoted_subtotal DECIMAL(10,2) DEFAULT 0.00,
  quoted_vat_amount DECIMAL(10,2) DEFAULT 0.00,
  quoted_total DECIMAL(10,2) DEFAULT 0.00,
  
  -- Actual breakdown (recalculated as decisions are made)
  actual_parts_total DECIMAL(10,2) DEFAULT 0.00,
  actual_labour_total DECIMAL(10,2) DEFAULT 0.00,
  actual_paint_total DECIMAL(10,2) DEFAULT 0.00,
  actual_outwork_total DECIMAL(10,2) DEFAULT 0.00,
  actual_subtotal DECIMAL(10,2) DEFAULT 0.00,
  actual_vat_amount DECIMAL(10,2) DEFAULT 0.00,
  actual_total DECIMAL(10,2) DEFAULT 0.00,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on assessment_id for faster lookups
CREATE INDEX idx_assessment_frc_assessment_id ON assessment_frc(assessment_id);

-- Create index on status for filtering
CREATE INDEX idx_assessment_frc_status ON assessment_frc(status);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_assessment_frc_updated_at
  BEFORE UPDATE ON assessment_frc
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE assessment_frc IS 'Final Repair Costing - reconciliation between quoted estimates and actual repair costs';
COMMENT ON COLUMN assessment_frc.line_items IS 'JSONB array of FRC line items with quoted vs actual totals and decisions';
COMMENT ON COLUMN assessment_frc.status IS 'FRC status: not_started, in_progress, or completed';
COMMENT ON COLUMN assessment_frc.quoted_subtotal IS 'Sum of all quoted line item totals before VAT';
COMMENT ON COLUMN assessment_frc.actual_subtotal IS 'Sum of all actual line item totals before VAT';
COMMENT ON COLUMN assessment_frc.started_at IS 'Timestamp when FRC was started (snapshot taken)';
COMMENT ON COLUMN assessment_frc.completed_at IS 'Timestamp when FRC was marked as completed';

