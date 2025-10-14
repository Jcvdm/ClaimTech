-- Add province column to repairers table
ALTER TABLE repairers
ADD COLUMN province TEXT;

-- Create index on province for filtering
CREATE INDEX idx_repairers_province ON repairers(province);

-- Add comment
COMMENT ON COLUMN repairers.province IS 'South African province where repairer operates';

