-- Create assessment_frc_documents table for FRC invoice/attachment uploads
-- Stores references to documents uploaded to Supabase Storage

CREATE TABLE assessment_frc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  frc_id UUID REFERENCES assessment_frc(id) ON DELETE CASCADE NOT NULL,
  
  -- Storage references
  document_url TEXT NOT NULL,
  document_path TEXT NOT NULL,
  
  -- Document metadata
  label TEXT,
  document_type TEXT DEFAULT 'invoice' CHECK (document_type IN ('invoice', 'attachment')),
  file_size_bytes INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on frc_id for faster lookups
CREATE INDEX idx_assessment_frc_documents_frc_id ON assessment_frc_documents(frc_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_assessment_frc_documents_updated_at
  BEFORE UPDATE ON assessment_frc_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE assessment_frc_documents IS 'Documents (invoices, attachments) uploaded for Final Repair Costing';
COMMENT ON COLUMN assessment_frc_documents.document_url IS 'Public URL to the document in Supabase Storage';
COMMENT ON COLUMN assessment_frc_documents.document_path IS 'Storage path for the document';
COMMENT ON COLUMN assessment_frc_documents.document_type IS 'Type of document: invoice or attachment';

