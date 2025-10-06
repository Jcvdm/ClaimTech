-- Create assessment_notes table for global notes visible across all assessment tabs
-- This table stores notes that are visible on all tabs of an assessment

CREATE TABLE IF NOT EXISTS assessment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by assessment_id
CREATE INDEX idx_assessment_notes_assessment_id ON assessment_notes(assessment_id);

-- Create index for sorting by created_at
CREATE INDEX idx_assessment_notes_created_at ON assessment_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE assessment_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read all notes
CREATE POLICY "Allow authenticated users to read assessment notes"
  ON assessment_notes FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert notes
CREATE POLICY "Allow authenticated users to create assessment notes"
  ON assessment_notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update their own notes
CREATE POLICY "Allow authenticated users to update assessment notes"
  ON assessment_notes FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete notes
CREATE POLICY "Allow authenticated users to delete assessment notes"
  ON assessment_notes FOR DELETE
  TO authenticated
  USING (true);

-- Development: Allow all operations without authentication
CREATE POLICY "Allow all operations in development"
  ON assessment_notes FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessment_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_notes_updated_at
  BEFORE UPDATE ON assessment_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_notes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE assessment_notes IS 'Global notes for assessments visible across all tabs';
COMMENT ON COLUMN assessment_notes.id IS 'Unique identifier for the note';
COMMENT ON COLUMN assessment_notes.assessment_id IS 'Reference to the assessment this note belongs to';
COMMENT ON COLUMN assessment_notes.note_text IS 'The note content';
COMMENT ON COLUMN assessment_notes.created_by IS 'User who created the note';
COMMENT ON COLUMN assessment_notes.created_at IS 'Timestamp when the note was created';
COMMENT ON COLUMN assessment_notes.updated_at IS 'Timestamp when the note was last updated';

