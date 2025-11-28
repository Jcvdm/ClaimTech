-- Add excess_amount column to requests table
-- This field stores the excess payment amount for insurance claims
-- The excess flows through to estimate totals and FRC calculations

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS excess_amount DECIMAL(12,2);

-- Add comment for documentation
COMMENT ON COLUMN requests.excess_amount IS 'Excess payment amount for insurance claims - deducted from final settlement';

