-- Update assessment_tyres table to support 3 photos per tyre
-- Add new photo columns for face, tread, and measurement
ALTER TABLE assessment_tyres 
  ADD COLUMN face_photo_url TEXT,
  ADD COLUMN tread_photo_url TEXT,
  ADD COLUMN measurement_photo_url TEXT;

-- Migrate existing photo_url data to face_photo_url (if any exists)
UPDATE assessment_tyres 
SET face_photo_url = photo_url 
WHERE photo_url IS NOT NULL;

-- Drop the old single photo column
ALTER TABLE assessment_tyres DROP COLUMN photo_url;

-- Add comments for documentation
COMMENT ON COLUMN assessment_tyres.face_photo_url IS 'Photo of the tyre face/sidewall showing brand and condition';
COMMENT ON COLUMN assessment_tyres.tread_photo_url IS 'Photo of the tyre tread showing wear pattern and depth';
COMMENT ON COLUMN assessment_tyres.measurement_photo_url IS 'Photo of tread depth measurement with gauge';

