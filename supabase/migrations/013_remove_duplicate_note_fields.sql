-- Remove duplicate note fields now that we have a global assessment notes system
-- Migration: 013_remove_duplicate_note_fields.sql

-- Remove mechanical_notes and interior_notes from assessment_interior_mechanical table
-- These are now replaced by the global assessment_notes system
ALTER TABLE assessment_interior_mechanical 
  DROP COLUMN IF EXISTS mechanical_notes,
  DROP COLUMN IF EXISTS interior_notes;

-- Remove repair_notes from assessment_damage table
-- General notes should go in the global assessment_notes system
-- Note: mismatch_notes is kept as it serves a specific purpose (explaining damage mismatches)
ALTER TABLE assessment_damage 
  DROP COLUMN IF EXISTS repair_notes;

-- Add comments explaining the change
COMMENT ON TABLE assessment_interior_mechanical IS 
  'Interior condition and mechanical systems check. Use assessment_notes table for general notes.';

COMMENT ON TABLE assessment_damage IS 
  'Damage identification and repair assessment records. Use assessment_notes table for general notes. mismatch_notes is kept for explaining specific damage mismatches.';

