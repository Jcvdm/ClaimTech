-- Migration: Create assessment_damage_photos table for damage photos
-- This replaces the JSONB photos array in assessment_damage table
-- Follows the same pattern as estimate_photos, interior_photos, exterior_360_photos

CREATE TABLE IF NOT EXISTS assessment_damage_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  label TEXT,
  panel TEXT, -- Which panel this damage photo shows (e.g., "Front Bumper", "Driver Door")
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by assessment_id
CREATE INDEX IF NOT EXISTS idx_damage_photos_assessment_id ON assessment_damage_photos(assessment_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_damage_photos_display_order ON assessment_damage_photos(assessment_id, display_order);

-- Add RLS policies
ALTER TABLE assessment_damage_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assessment_damage_photos' 
    AND policyname = 'Allow all operations for authenticated users'
  ) THEN
    CREATE POLICY "Allow all operations for authenticated users" ON assessment_damage_photos
      FOR ALL
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_assessment_damage_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assessment_damage_photos_updated_at ON assessment_damage_photos;
CREATE TRIGGER assessment_damage_photos_updated_at
  BEFORE UPDATE ON assessment_damage_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_damage_photos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE assessment_damage_photos IS 'Photos of vehicle damage attached to assessments';
COMMENT ON COLUMN assessment_damage_photos.id IS 'Unique identifier for the photo';
COMMENT ON COLUMN assessment_damage_photos.assessment_id IS 'Reference to the assessment this photo belongs to';
COMMENT ON COLUMN assessment_damage_photos.photo_url IS 'Public URL of the photo in Supabase Storage';
COMMENT ON COLUMN assessment_damage_photos.photo_path IS 'Storage path of the photo for deletion';
COMMENT ON COLUMN assessment_damage_photos.label IS 'Optional label/description for the photo (e.g., "Front impact damage")';
COMMENT ON COLUMN assessment_damage_photos.panel IS 'Which vehicle panel this damage photo shows (e.g., "Front Bumper", "Driver Door")';
COMMENT ON COLUMN assessment_damage_photos.display_order IS 'Order for displaying photos (0-based)';
COMMENT ON COLUMN assessment_damage_photos.created_at IS 'Timestamp when the photo was uploaded';
COMMENT ON COLUMN assessment_damage_photos.updated_at IS 'Timestamp when the photo was last updated';

