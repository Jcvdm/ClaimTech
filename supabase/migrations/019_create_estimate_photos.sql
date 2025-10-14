-- Migration: Create estimate_photos table for incident photos
-- This allows uploading multiple photos per estimate with optional labels

CREATE TABLE IF NOT EXISTS estimate_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES assessment_estimates(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups by estimate_id
CREATE INDEX IF NOT EXISTS idx_estimate_photos_estimate_id ON estimate_photos(estimate_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_estimate_photos_display_order ON estimate_photos(estimate_id, display_order);

-- Add RLS policies
ALTER TABLE estimate_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON estimate_photos
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_estimate_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER estimate_photos_updated_at
  BEFORE UPDATE ON estimate_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_estimate_photos_updated_at();

-- Add comments for documentation
COMMENT ON TABLE estimate_photos IS 'Photos attached to estimates (incident photos)';
COMMENT ON COLUMN estimate_photos.id IS 'Unique identifier for the photo';
COMMENT ON COLUMN estimate_photos.estimate_id IS 'Reference to the estimate this photo belongs to';
COMMENT ON COLUMN estimate_photos.photo_url IS 'Public URL of the photo in Supabase Storage';
COMMENT ON COLUMN estimate_photos.photo_path IS 'Storage path of the photo for deletion';
COMMENT ON COLUMN estimate_photos.label IS 'Optional label/note for the photo';
COMMENT ON COLUMN estimate_photos.display_order IS 'Order for displaying photos (0-based)';
COMMENT ON COLUMN estimate_photos.created_at IS 'Timestamp when the photo was uploaded';
COMMENT ON COLUMN estimate_photos.updated_at IS 'Timestamp when the photo was last updated';

