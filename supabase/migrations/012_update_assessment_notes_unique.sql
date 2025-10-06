-- Update assessment_notes table to ensure only one note per assessment
-- Migration: 012_update_assessment_notes_unique.sql

-- Add unique constraint on assessment_id (only one note per assessment)
ALTER TABLE assessment_notes 
  ADD CONSTRAINT assessment_notes_assessment_id_unique UNIQUE (assessment_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT assessment_notes_assessment_id_unique ON assessment_notes 
  IS 'Ensures only one note record per assessment - use upsert pattern for updates';

-- Enable realtime for assessment_notes table
ALTER PUBLICATION supabase_realtime ADD TABLE assessment_notes;

