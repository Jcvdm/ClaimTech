-- Create assessment_tyre_photos table for unlimited photos per tyre
-- Follows unified photo panel pattern used in interior, estimate, additionals, exterior360

-- Create table
CREATE TABLE assessment_tyre_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tyre_id UUID REFERENCES assessment_tyres(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  
  -- Photo storage
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  
  -- Photo metadata
  label TEXT,
  display_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assessment_tyre_photos_tyre ON assessment_tyre_photos(tyre_id);
CREATE INDEX idx_assessment_tyre_photos_assessment ON assessment_tyre_photos(assessment_id);
CREATE INDEX idx_assessment_tyre_photos_display_order ON assessment_tyre_photos(tyre_id, display_order);

-- Enable RLS
ALTER TABLE assessment_tyre_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON assessment_tyre_photos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_assessment_tyre_photos_updated_at
  BEFORE UPDATE ON assessment_tyre_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE assessment_tyre_photos IS 'Photos for individual tyres (unlimited per tyre, follows unified photo panel pattern)';
COMMENT ON COLUMN assessment_tyre_photos.tyre_id IS 'Foreign key to assessment_tyres';
COMMENT ON COLUMN assessment_tyre_photos.assessment_id IS 'Foreign key to assessments (for easier querying)';
COMMENT ON COLUMN assessment_tyre_photos.photo_url IS 'URL to the photo in storage';
COMMENT ON COLUMN assessment_tyre_photos.photo_path IS 'Path to the photo in storage';
COMMENT ON COLUMN assessment_tyre_photos.label IS 'Photo label (e.g., Face/Sidewall, Tread Pattern, Measurement, Damage)';
COMMENT ON COLUMN assessment_tyre_photos.display_order IS 'Order for displaying photos in gallery';

