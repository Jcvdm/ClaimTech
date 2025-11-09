-- Migration: Create assessment_interior_photos table for unlimited interior photos
-- This allows uploading multiple interior photos per assessment with optional labels
-- Follows the same pattern as estimate_photos and assessment_additionals_photos

CREATE TABLE IF NOT EXISTS assessment_interior_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by assessment_id
CREATE INDEX IF NOT EXISTS idx_interior_photos_assessment_id ON assessment_interior_photos(assessment_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_interior_photos_display_order ON assessment_interior_photos(assessment_id, display_order);

-- Add RLS policies
ALTER TABLE assessment_interior_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON assessment_interior_photos
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_assessment_interior_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_interior_photos_updated_at
  BEFORE UPDATE ON assessment_interior_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_interior_photos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE assessment_interior_photos IS 'Photos attached to assessments (additional interior photos)';
COMMENT ON COLUMN assessment_interior_photos.id IS 'Unique identifier for the photo';
COMMENT ON COLUMN assessment_interior_photos.assessment_id IS 'Reference to the assessment this photo belongs to';
COMMENT ON COLUMN assessment_interior_photos.photo_url IS 'Public URL of the photo in Supabase Storage';
COMMENT ON COLUMN assessment_interior_photos.photo_path IS 'Storage path of the photo for deletion';
COMMENT ON COLUMN assessment_interior_photos.label IS 'Optional label/note for the photo (e.g., "Steering wheel", "Seats")';
COMMENT ON COLUMN assessment_interior_photos.display_order IS 'Order for displaying photos (0-based)';
COMMENT ON COLUMN assessment_interior_photos.created_at IS 'Timestamp when the photo was uploaded';
COMMENT ON COLUMN assessment_interior_photos.updated_at IS 'Timestamp when the photo was last updated';

