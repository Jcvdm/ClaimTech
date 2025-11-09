-- Migration: Remove interior photo columns from interior_mechanical table
-- Migrates existing photos to assessment_interior_photos table before dropping columns
-- Date: 2025-01-XX

-- Step 1: Migrate existing photos to assessment_interior_photos table
-- Front Interior Photo
INSERT INTO assessment_interior_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
  assessment_id,
  interior_front_photo_url as photo_url,
  CASE 
    WHEN interior_front_photo_url LIKE '/api/photo/%' THEN 
      SUBSTRING(interior_front_photo_url FROM 12) -- Remove '/api/photo/' prefix
    ELSE 
      interior_front_photo_url -- Use URL as path if not proxy URL format
  END as photo_path,
  'Front Interior' as label,
  0 as display_order
FROM assessment_interior_mechanical
WHERE interior_front_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Rear Interior Photo
INSERT INTO assessment_interior_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
  assessment_id,
  interior_rear_photo_url as photo_url,
  CASE 
    WHEN interior_rear_photo_url LIKE '/api/photo/%' THEN 
      SUBSTRING(interior_rear_photo_url FROM 12) -- Remove '/api/photo/' prefix
    ELSE 
      interior_rear_photo_url -- Use URL as path if not proxy URL format
  END as photo_path,
  'Rear Interior' as label,
  1 as display_order
FROM assessment_interior_mechanical
WHERE interior_rear_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Dashboard Photo
INSERT INTO assessment_interior_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
  assessment_id,
  dashboard_photo_url as photo_url,
  CASE 
    WHEN dashboard_photo_url LIKE '/api/photo/%' THEN 
      SUBSTRING(dashboard_photo_url FROM 12) -- Remove '/api/photo/' prefix
    ELSE 
      dashboard_photo_url -- Use URL as path if not proxy URL format
  END as photo_path,
  'Dashboard' as label,
  2 as display_order
FROM assessment_interior_mechanical
WHERE dashboard_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 2: Drop columns from interior_mechanical table
ALTER TABLE assessment_interior_mechanical 
  DROP COLUMN IF EXISTS interior_front_photo_url,
  DROP COLUMN IF EXISTS interior_rear_photo_url,
  DROP COLUMN IF EXISTS dashboard_photo_url;

