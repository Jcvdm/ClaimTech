-- Migration: Create assessment_additionals table
-- Description: Store additional line items added after estimate finalization with approval workflow
-- Date: 2025-01-14

-- Create assessment_additionals table
CREATE TABLE assessment_additionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID REFERENCES assessments(id) NOT NULL UNIQUE,
  
  -- Snapshot rates from original estimate (locked, cannot be changed)
  repairer_id UUID REFERENCES repairers(id),
  labour_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paint_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  vat_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15,
  oem_markup_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25,
  alt_markup_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25,
  second_hand_markup_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25,
  outwork_markup_percentage NUMERIC(5, 2) NOT NULL DEFAULT 25,
  
  -- Line items with status (pending/approved/declined) and decline reason
  -- Each line item has: id, process_type, description, prices, status, decline_reason, approved_at, declined_at
  line_items JSONB DEFAULT '[]',
  
  -- Totals (only approved items counted)
  subtotal_approved NUMERIC(10, 2) DEFAULT 0,
  vat_amount_approved NUMERIC(10, 2) DEFAULT 0,
  total_approved NUMERIC(10, 2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by assessment
CREATE INDEX idx_assessment_additionals_assessment ON assessment_additionals(assessment_id);

-- Index for filtering by repairer
CREATE INDEX idx_assessment_additionals_repairer ON assessment_additionals(repairer_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_assessment_additionals_updated_at
  BEFORE UPDATE ON assessment_additionals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE assessment_additionals IS 'Additional line items added after estimate finalization with approval workflow';
COMMENT ON COLUMN assessment_additionals.line_items IS 'JSONB array of additional line items with status (pending/approved/declined) and decline_reason';
COMMENT ON COLUMN assessment_additionals.subtotal_approved IS 'Subtotal of approved additional items only';
COMMENT ON COLUMN assessment_additionals.vat_amount_approved IS 'VAT amount calculated on approved items only';
COMMENT ON COLUMN assessment_additionals.total_approved IS 'Total of approved additional items including VAT';

