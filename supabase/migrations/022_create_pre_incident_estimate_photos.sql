-- Create pre_incident_estimate_photos table
-- This table stores photos for pre-incident damage estimates

CREATE TABLE pre_incident_estimate_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES pre_incident_estimates(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  label TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pre_incident_estimate_photos_estimate_id ON pre_incident_estimate_photos(estimate_id);
CREATE INDEX idx_pre_incident_estimate_photos_order ON pre_incident_estimate_photos(estimate_id, display_order);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_pre_incident_estimate_photos_updated_at
  BEFORE UPDATE ON pre_incident_estimate_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE pre_incident_estimate_photos IS 'Photos for pre-incident damage estimates';
COMMENT ON COLUMN pre_incident_estimate_photos.estimate_id IS 'Reference to pre_incident_estimates table';
COMMENT ON COLUMN pre_incident_estimate_photos.photo_url IS 'Public URL of the photo';
COMMENT ON COLUMN pre_incident_estimate_photos.photo_path IS 'Storage path of the photo';
COMMENT ON COLUMN pre_incident_estimate_photos.label IS 'Optional label/description for the photo';
COMMENT ON COLUMN pre_incident_estimate_photos.display_order IS 'Order in which photos should be displayed';

