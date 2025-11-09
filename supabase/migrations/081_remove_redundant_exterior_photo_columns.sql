-- Migration: Remove redundant exterior photo columns from assessment_360_exterior
-- WARNING: Only run this after verifying no data exists in these columns
-- Run migration 080_check_redundant_exterior_photo_fields.sql first to check for data

-- Step 1: Migrate any existing photo URLs to the new assessment_exterior_360_photos table
-- (Only if you want to preserve old data - otherwise skip this step)

-- Front Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    front_photo_url as photo_url,
    CASE 
        WHEN front_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(front_photo_url FROM 12) -- Remove '/api/photo/' prefix
        ELSE 
            front_photo_url -- Use URL as path if not proxy URL format
    END as photo_path,
    'Front' as label,
    0 as display_order
FROM assessment_360_exterior
WHERE front_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Front Left Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    front_left_photo_url as photo_url,
    CASE 
        WHEN front_left_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(front_left_photo_url FROM 12)
        ELSE 
            front_left_photo_url
    END as photo_path,
    'Front Left' as label,
    1 as display_order
FROM assessment_360_exterior
WHERE front_left_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Left Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    left_photo_url as photo_url,
    CASE 
        WHEN left_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(left_photo_url FROM 12)
        ELSE 
            left_photo_url
    END as photo_path,
    'Left' as label,
    2 as display_order
FROM assessment_360_exterior
WHERE left_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Rear Left Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    rear_left_photo_url as photo_url,
    CASE 
        WHEN rear_left_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(rear_left_photo_url FROM 12)
        ELSE 
            rear_left_photo_url
    END as photo_path,
    'Rear Left' as label,
    3 as display_order
FROM assessment_360_exterior
WHERE rear_left_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Rear Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    rear_photo_url as photo_url,
    CASE 
        WHEN rear_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(rear_photo_url FROM 12)
        ELSE 
            rear_photo_url
    END as photo_path,
    'Rear' as label,
    4 as display_order
FROM assessment_360_exterior
WHERE rear_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Rear Right Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    rear_right_photo_url as photo_url,
    CASE 
        WHEN rear_right_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(rear_right_photo_url FROM 12)
        ELSE 
            rear_right_photo_url
    END as photo_path,
    'Rear Right' as label,
    5 as display_order
FROM assessment_360_exterior
WHERE rear_right_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Right Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    right_photo_url as photo_url,
    CASE 
        WHEN right_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(right_photo_url FROM 12)
        ELSE 
            right_photo_url
    END as photo_path,
    'Right' as label,
    6 as display_order
FROM assessment_360_exterior
WHERE right_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Front Right Photo
INSERT INTO assessment_exterior_360_photos (assessment_id, photo_url, photo_path, label, display_order)
SELECT 
    assessment_id,
    front_right_photo_url as photo_url,
    CASE 
        WHEN front_right_photo_url LIKE '/api/photo/%' THEN 
            SUBSTRING(front_right_photo_url FROM 12)
        ELSE 
            front_right_photo_url
    END as photo_path,
    'Front Right' as label,
    7 as display_order
FROM assessment_360_exterior
WHERE front_right_photo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 2: Drop redundant columns from assessment_360_exterior table
ALTER TABLE assessment_360_exterior 
    DROP COLUMN IF EXISTS front_photo_url,
    DROP COLUMN IF EXISTS front_left_photo_url,
    DROP COLUMN IF EXISTS left_photo_url,
    DROP COLUMN IF EXISTS rear_left_photo_url,
    DROP COLUMN IF EXISTS rear_photo_url,
    DROP COLUMN IF EXISTS rear_right_photo_url,
    DROP COLUMN IF EXISTS right_photo_url,
    DROP COLUMN IF EXISTS front_right_photo_url,
    DROP COLUMN IF EXISTS additional_photos;

-- Step 3: Update table comment
COMMENT ON TABLE assessment_360_exterior IS 'Exterior vehicle condition assessment (photos now stored in assessment_exterior_360_photos table)';

