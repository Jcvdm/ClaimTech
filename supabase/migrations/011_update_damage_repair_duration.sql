-- Update damage records table to change repair duration from hours to days
-- Migration: 011_update_damage_repair_duration.sql

-- Rename repair_duration_hours to estimated_repair_duration_days
ALTER TABLE assessment_damage 
  RENAME COLUMN repair_duration_hours TO estimated_repair_duration_days;

-- Update the column comment to reflect the change
COMMENT ON COLUMN assessment_damage.estimated_repair_duration_days IS 'Estimated repair duration in days';

