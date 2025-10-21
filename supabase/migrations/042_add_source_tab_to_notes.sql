-- Add source_tab field to assessment_notes table
-- Migration: 042_add_source_tab_to_notes.sql
-- This adds tracking for which assessment tab a note was created from

-- Step 1: Add source_tab field to track which tab the note was added from
ALTER TABLE assessment_notes 
ADD COLUMN IF NOT EXISTS source_tab TEXT;

-- Step 2: Create index for efficient querying by source_tab
CREATE INDEX IF NOT EXISTS idx_assessment_notes_source_tab ON assessment_notes(source_tab);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN assessment_notes.source_tab IS 'The assessment tab ID where this note was created (e.g., "summary", "identification", "360", "interior", "tyres", "damage", "values", "pre-incident", "estimate", "finalize", "additionals", "frc")';

-- Step 4: Update existing notes to have NULL source_tab (they were created before this feature)
-- No action needed - new column defaults to NULL for existing rows

-- Step 5: Update table comment
COMMENT ON TABLE assessment_notes IS 'Assessment notes - supports multiple notes per assessment with different types (manual, betterment, system). Each note tracks which tab it was created from. Displayed as chat-style bubbles in UI.';

