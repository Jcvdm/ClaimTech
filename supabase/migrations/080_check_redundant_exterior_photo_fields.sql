-- Migration: Check for redundant exterior photo fields
-- This migration checks for data in old photo URL columns before removal

-- Step 1: Check structure and data in old photo URL columns
SELECT 
    'assessment_360_exterior photo columns check' as check_type,
    COUNT(*) as total_rows,
    COUNT(front_photo_url) as has_front_photo,
    COUNT(front_left_photo_url) as has_front_left_photo,
    COUNT(left_photo_url) as has_left_photo,
    COUNT(rear_left_photo_url) as has_rear_left_photo,
    COUNT(rear_photo_url) as has_rear_photo,
    COUNT(rear_right_photo_url) as has_rear_right_photo,
    COUNT(right_photo_url) as has_right_photo,
    COUNT(front_right_photo_url) as has_front_right_photo,
    COUNT(CASE WHEN additional_photos IS NOT NULL AND additional_photos != '[]'::jsonb THEN 1 END) as has_additional_photos_jsonb
FROM assessment_360_exterior;

-- Step 2: Show sample rows with photo data (if any exist)
SELECT 
    assessment_id,
    front_photo_url IS NOT NULL as has_front,
    front_left_photo_url IS NOT NULL as has_front_left,
    left_photo_url IS NOT NULL as has_left,
    rear_left_photo_url IS NOT NULL as has_rear_left,
    rear_photo_url IS NOT NULL as has_rear,
    rear_right_photo_url IS NOT NULL as has_rear_right,
    right_photo_url IS NOT NULL as has_right,
    front_right_photo_url IS NOT NULL as has_front_right,
    additional_photos
FROM assessment_360_exterior
WHERE 
    front_photo_url IS NOT NULL OR
    front_left_photo_url IS NOT NULL OR
    left_photo_url IS NOT NULL OR
    rear_left_photo_url IS NOT NULL OR
    rear_photo_url IS NOT NULL OR
    rear_right_photo_url IS NOT NULL OR
    right_photo_url IS NOT NULL OR
    front_right_photo_url IS NOT NULL OR
    (additional_photos IS NOT NULL AND additional_photos != '[]'::jsonb)
LIMIT 10;

-- Step 3: Compare with new table data
SELECT 
    'assessment_exterior_360_photos count' as check_type,
    COUNT(*) as total_photos,
    COUNT(DISTINCT assessment_id) as assessments_with_photos
FROM assessment_exterior_360_photos;

