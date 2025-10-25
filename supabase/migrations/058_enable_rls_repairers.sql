-- Enable RLS on repairers table
-- Migration 046 created policies but never enabled RLS on the table
-- This makes the existing policies effective

-- Enable Row Level Security
ALTER TABLE repairers ENABLE ROW LEVEL SECURITY;

-- Verify policies exist (they were created in migration 046):
-- - "Authenticated users can view repairers" (SELECT)
-- - "Only admins can insert repairers" (INSERT)
-- - "Only admins can update repairers" (UPDATE)
-- - "Only admins can delete repairers" (DELETE)

-- Add comment
COMMENT ON TABLE repairers IS 'Repair shops - RLS enabled with admin-only modifications';
