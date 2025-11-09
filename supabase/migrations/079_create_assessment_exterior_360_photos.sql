-- Migration: Create assessment_exterior_360_photos table for additional exterior photos
-- This allows uploading multiple additional exterior photos per assessment beyond the required 8-position 360° photos
-- Follows the same pattern as assessment_interior_photos

CREATE TABLE IF NOT EXISTS assessment_exterior_360_photos (
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
CREATE INDEX IF NOT EXISTS idx_exterior_360_photos_assessment_id ON assessment_exterior_360_photos(assessment_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_exterior_360_photos_display_order ON assessment_exterior_360_photos(assessment_id, display_order);

-- Add RLS policies
ALTER TABLE assessment_exterior_360_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON assessment_exterior_360_photos
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_assessment_exterior_360_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assessment_exterior_360_photos_updated_at
  BEFORE UPDATE ON assessment_exterior_360_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_exterior_360_photos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE assessment_exterior_360_photos IS 'Additional exterior photos attached to assessments (beyond required 8-position 360° photos)';
COMMENT ON COLUMN assessment_exterior_360_photos.id IS 'Unique identifier for the photo';
COMMENT ON COLUMN assessment_exterior_360_photos.assessment_id IS 'Reference to the assessment this photo belongs to';
COMMENT ON COLUMN assessment_exterior_360_photos.photo_url IS 'Public URL of the photo in Supabase Storage';
COMMENT ON COLUMN assessment_exterior_360_photos.photo_path IS 'Storage path of the photo for deletion';
COMMENT ON COLUMN assessment_exterior_360_photos.label IS 'Optional label/note for the photo (e.g., "Close-up of damage", "Wheel detail")';
COMMENT ON COLUMN assessment_exterior_360_photos.display_order IS 'Order for displaying photos (0-based)';
COMMENT ON COLUMN assessment_exterior_360_photos.created_at IS 'Timestamp when the photo was uploaded';
COMMENT ON COLUMN assessment_exterior_360_photos.updated_at IS 'Timestamp when the photo was last updated';

