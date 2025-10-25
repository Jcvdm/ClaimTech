-- Enable RLS and create policies for estimates, valuations, and FRC tables
-- These tables contain critical financial and assessment data
-- Pattern: Authenticated users can view, admins only can modify

-- ============================================================================
-- ASSESSMENT_ESTIMATES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE assessment_estimates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all estimates
CREATE POLICY "Authenticated users can view assessment_estimates"
ON assessment_estimates FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert estimates
CREATE POLICY "Only admins can insert assessment_estimates"
ON assessment_estimates FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update estimates
CREATE POLICY "Only admins can update assessment_estimates"
ON assessment_estimates FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete estimates
CREATE POLICY "Only admins can delete assessment_estimates"
ON assessment_estimates FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ASSESSMENT_VEHICLE_VALUES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE assessment_vehicle_values ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all valuations
CREATE POLICY "Authenticated users can view assessment_vehicle_values"
ON assessment_vehicle_values FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert valuations
CREATE POLICY "Only admins can insert assessment_vehicle_values"
ON assessment_vehicle_values FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update valuations
CREATE POLICY "Only admins can update assessment_vehicle_values"
ON assessment_vehicle_values FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete valuations
CREATE POLICY "Only admins can delete assessment_vehicle_values"
ON assessment_vehicle_values FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ASSESSMENT_FRC TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE assessment_frc ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all FRC records
CREATE POLICY "Authenticated users can view assessment_frc"
ON assessment_frc FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert FRC records
CREATE POLICY "Only admins can insert assessment_frc"
ON assessment_frc FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update FRC records
CREATE POLICY "Only admins can update assessment_frc"
ON assessment_frc FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete FRC records
CREATE POLICY "Only admins can delete assessment_frc"
ON assessment_frc FOR DELETE
TO authenticated
USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE assessment_estimates IS 'Assessment repair estimates with JSONB line items - RLS enabled, admin-only modifications';
COMMENT ON TABLE assessment_vehicle_values IS 'Vehicle valuations and write-off calculations - RLS enabled, admin-only modifications';
COMMENT ON TABLE assessment_frc IS 'Final Repair Cost (FRC) breakdown - RLS enabled, admin-only modifications';
