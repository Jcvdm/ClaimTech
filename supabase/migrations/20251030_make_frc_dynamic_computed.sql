-- Make FRC dynamic/computed: Remove line_items storage
--
-- Purpose: Change FRC from storing static line_items snapshot to computing lines
--          dynamically from current estimate + additionals state (auto-sync).
--
-- Migration Date: October 30, 2025
--
-- IMPORTANT: This migration drops the line_items column. Existing FRC records
--            will lose their stored line items, but lines will be recomputed fresh
--            from estimate + additionals on every FRC page load.
--
-- Benefits:
--   - FRC always reflects current additionals state (auto-sync)
--   - Removed lines via additionals show correctly with visual indicators
--   - Totals accurately include all lines (removed, declined, active)
--   - Simplified data model (additionals = source of truth)

-- Step 1: Add column to store initial estimate total (for reference/audit)
ALTER TABLE assessment_frc
    ADD COLUMN IF NOT EXISTS initial_estimate_total NUMERIC(12,2);

-- Step 2: Populate initial_estimate_total from existing line_items before dropping
-- This preserves a reference to the original quoted total
UPDATE assessment_frc
SET initial_estimate_total = quoted_total
WHERE initial_estimate_total IS NULL;

-- Step 3: Drop the line_items column (no longer stored, computed dynamically)
-- Line items will be computed fresh from estimate + additionals via getFRCWithLiveLines()
ALTER TABLE assessment_frc
    DROP COLUMN IF EXISTS line_items CASCADE;

-- Step 4: Update table comment to document new dynamic behavior
COMMENT ON TABLE assessment_frc IS
'FRC metadata only - line items computed dynamically from estimate + additionals.
This ensures FRC always reflects current additionals state (auto-sync).
Use frcService.getFRCWithLiveLines(assessmentId) to get FRC with fresh lines.';

COMMENT ON COLUMN assessment_frc.initial_estimate_total IS
'Reference: quoted total when FRC was first started (for audit trail).';

-- Step 5: Ensure index exists for fast FRC lookups by assessment
CREATE INDEX IF NOT EXISTS idx_assessment_frc_assessment_id
    ON assessment_frc(assessment_id);

-- Step 6: Ensure index exists for status-based queries
CREATE INDEX IF NOT EXISTS idx_assessment_frc_status
    ON assessment_frc(status);

-- Migration Complete
-- After applying this migration:
-- 1. FRC service uses getFRCWithLiveLines() to compute lines fresh on every load
-- 2. FRCTab component receives lines separately (not from frc.line_items)
-- 3. All line item decisions will be lost (acceptable - FRC is now live view)
-- 4. Removed lines will show with strikethrough and be included in totals
-- 5. Additionals changes automatically update FRC display
