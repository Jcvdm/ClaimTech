-- Add document generation fields to assessments table
ALTER TABLE assessments 
  ADD COLUMN report_pdf_url TEXT,
  ADD COLUMN report_pdf_path TEXT,
  ADD COLUMN estimate_pdf_url TEXT,
  ADD COLUMN estimate_pdf_path TEXT,
  ADD COLUMN photos_pdf_url TEXT,
  ADD COLUMN photos_pdf_path TEXT,
  ADD COLUMN photos_zip_url TEXT,
  ADD COLUMN photos_zip_path TEXT,
  ADD COLUMN documents_generated_at TIMESTAMPTZ,
  ADD COLUMN report_number TEXT,
  ADD COLUMN assessor_name TEXT,
  ADD COLUMN assessor_contact TEXT,
  ADD COLUMN assessor_email TEXT;

-- Create company_settings table (single row for global settings)
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'Claimtech',
  po_box TEXT DEFAULT 'P.O. Box 12345',
  city TEXT DEFAULT 'Johannesburg',
  province TEXT DEFAULT 'Gauteng',
  postal_code TEXT DEFAULT '2000',
  phone TEXT DEFAULT '+27 (0) 11 123 4567',
  fax TEXT DEFAULT '+27 (0) 86 123 4567',
  email TEXT DEFAULT 'info@claimtech.co.za',
  website TEXT DEFAULT 'www.claimtech.co.za',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default company settings
INSERT INTO company_settings (id) 
VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- Create trigger for company_settings updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_assessments_documents_generated ON assessments(documents_generated_at);
CREATE INDEX idx_assessments_report_number ON assessments(report_number);

-- Add comments for documentation
COMMENT ON TABLE company_settings IS 'Global company settings for document generation (single row)';
COMMENT ON COLUMN assessments.report_pdf_url IS 'Public URL for generated report PDF';
COMMENT ON COLUMN assessments.estimate_pdf_url IS 'Public URL for generated estimate PDF';
COMMENT ON COLUMN assessments.photos_pdf_url IS 'Public URL for generated photos PDF';
COMMENT ON COLUMN assessments.photos_zip_url IS 'Public URL for generated photos ZIP';
COMMENT ON COLUMN assessments.documents_generated_at IS 'Timestamp when documents were last generated';

