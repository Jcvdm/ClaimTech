-- Migrate existing tyre photos from assessment_tyres columns to assessment_tyre_photos table
-- Then drop the old photo columns

-- Migrate Face photos
INSERT INTO assessment_tyre_photos (tyre_id, assessment_id, photo_url, photo_path, label, display_order)
SELECT 
  id as tyre_id,
  assessment_id,
  face_photo_url as photo_url,
  face_photo_url as photo_path,
  'Face/Sidewall' as label,
  1 as display_order
FROM assessment_tyres
WHERE face_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate Tread photos
INSERT INTO assessment_tyre_photos (tyre_id, assessment_id, photo_url, photo_path, label, display_order)
SELECT 
  id as tyre_id,
  assessment_id,
  tread_photo_url as photo_url,
  tread_photo_url as photo_path,
  'Tread Pattern' as label,
  2 as display_order
FROM assessment_tyres
WHERE tread_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate Measurement photos
INSERT INTO assessment_tyre_photos (tyre_id, assessment_id, photo_url, photo_path, label, display_order)
SELECT 
  id as tyre_id,
  assessment_id,
  measurement_photo_url as photo_url,
  measurement_photo_url as photo_path,
  'Measurement' as label,
  3 as display_order
FROM assessment_tyres
WHERE measurement_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old photo columns from assessment_tyres
ALTER TABLE assessment_tyres 
  DROP COLUMN IF EXISTS face_photo_url,
  DROP COLUMN IF EXISTS tread_photo_url,
  DROP COLUMN IF EXISTS measurement_photo_url;

-- Add comment documenting the migration
COMMENT ON TABLE assessment_tyres IS 'Individual tyre inspection records. Photos are now stored in assessment_tyre_photos table (migration completed Nov 10, 2025)';

