-- Refactor assessment_notes to support multiple notes per assessment
-- Migration: 041_refactor_assessment_notes_multiple.sql
-- This changes the notes system from single-note-per-assessment to multiple-notes-per-assessment
-- Enables chat-style UI with individual note management (add, edit, delete)

-- Step 1: Remove the unique constraint that enforces one note per assessment
ALTER TABLE assessment_notes 
DROP CONSTRAINT IF EXISTS assessment_notes_assessment_id_unique;

-- Step 2: Add note_type field to distinguish between different types of notes
ALTER TABLE assessment_notes 
ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'manual' 
CHECK (note_type IN ('manual', 'betterment', 'system'));

-- Step 3: Add note_title field for optional note titles (e.g., "Betterment: Towbar")
ALTER TABLE assessment_notes 
ADD COLUMN IF NOT EXISTS note_title TEXT;

-- Step 4: Add fields to track if note has been edited
ALTER TABLE assessment_notes 
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

ALTER TABLE assessment_notes 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Step 5: Add edited_by field to track who edited the note
ALTER TABLE assessment_notes 
ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES auth.users(id);

-- Step 6: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_assessment_notes_type ON assessment_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_assessment_notes_title ON assessment_notes(note_title);
CREATE INDEX IF NOT EXISTS idx_assessment_notes_created_by ON assessment_notes(created_by);

-- Step 7: Update RLS policies (existing policies should still work)
-- No changes needed - existing policies allow authenticated users to read/create/update/delete

-- Step 8: Add comments for documentation
COMMENT ON COLUMN assessment_notes.note_type IS 'Type of note: manual (user-created), betterment (auto-generated from betterment), system (auto-generated system notes)';
COMMENT ON COLUMN assessment_notes.note_title IS 'Optional title for the note, useful for betterment notes (e.g., "Betterment: Towbar")';
COMMENT ON COLUMN assessment_notes.is_edited IS 'Flag indicating if the note has been edited after creation';
COMMENT ON COLUMN assessment_notes.edited_at IS 'Timestamp when the note was last edited';
COMMENT ON COLUMN assessment_notes.edited_by IS 'User who last edited the note';

-- Step 9: Update table comment
COMMENT ON TABLE assessment_notes IS 'Assessment notes - supports multiple notes per assessment with different types (manual, betterment, system). Displayed as chat-style bubbles in UI.';

