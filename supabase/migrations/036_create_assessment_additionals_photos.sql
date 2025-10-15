-- Migration: Create assessment_additionals_photos table
-- Description: Store photos for additional items requested after estimate finalization
-- Date: 2025-10-15

-- Create assessment_additionals_photos table
CREATE TABLE IF NOT EXISTS assessment_additionals_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    additionals_id UUID NOT NULL REFERENCES assessment_additionals(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_path TEXT NOT NULL,
    label TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_additionals_photos_additionals_id ON assessment_additionals_photos(additionals_id);
CREATE INDEX idx_additionals_photos_display_order ON assessment_additionals_photos(additionals_id, display_order);

-- Add comments
COMMENT ON TABLE assessment_additionals_photos IS 'Photos for additional items requested after estimate finalization';
COMMENT ON COLUMN assessment_additionals_photos.additionals_id IS 'Reference to the assessment_additionals record';
COMMENT ON COLUMN assessment_additionals_photos.photo_url IS 'Public URL to access the photo';
COMMENT ON COLUMN assessment_additionals_photos.photo_path IS 'Storage path for the photo file';
COMMENT ON COLUMN assessment_additionals_photos.label IS 'Optional label/description for the photo';
COMMENT ON COLUMN assessment_additionals_photos.display_order IS 'Order in which photos should be displayed';

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_assessment_additionals_photos_updated_at
    BEFORE UPDATE ON assessment_additionals_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

