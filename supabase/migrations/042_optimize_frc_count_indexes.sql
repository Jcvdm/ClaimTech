-- Migration: Optimize FRC Count Query Performance
-- Purpose: Add indexes to support fast FRC count queries and reduce connection timeouts
-- Related Bug: #7 - Finalize Force Click Supabase Auth Connection Timeout
-- Date: 2025-01-12
-- Applied: 2025-01-12 via Supabase MCP

-- Drop existing idx_assessment_frc_status and recreate as partial index for better performance
-- Partial indexes are smaller and faster for queries that filter on specific values
DROP INDEX IF EXISTS idx_assessment_frc_status;
CREATE INDEX idx_assessment_frc_status
ON assessment_frc(status)
WHERE status IN ('not_started', 'in_progress', 'completed');

-- Add partial index on assessments.stage for filtering finalized assessments
-- This is more specific than the existing idx_assessments_stage
CREATE INDEX IF NOT EXISTS idx_assessments_stage_finalized
ON assessments(stage)
WHERE stage = 'estimate_finalized';

-- Add composite index for engineer filtering on appointments with inspection_id
-- This supports queries that need to filter by engineer assignment
-- Note: appointments table has inspection_id, not assessment_id
CREATE INDEX IF NOT EXISTS idx_appointments_engineer_inspection
ON appointments(engineer_id, inspection_id)
WHERE engineer_id IS NOT NULL;

-- Note: idx_assessment_frc_assessment_id already exists as a UNIQUE index
-- No need to create it again

-- Analyze tables to update query planner statistics
ANALYZE assessment_frc;
ANALYZE assessments;
ANALYZE appointments;

