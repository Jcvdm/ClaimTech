-- Enable RLS and create policies for pre-incident estimates and assessment additionals
-- Pattern: Authenticated users can view, admins only can modify

-- ============================================================================
-- PRE_INCIDENT_ESTIMATES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE pre_incident_estimates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all pre-incident estimates
CREATE POLICY "Authenticated users can view pre_incident_estimates"
ON pre_incident_estimates FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert pre-incident estimates
CREATE POLICY "Only admins can insert pre_incident_estimates"
ON pre_incident_estimates FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update pre-incident estimates
CREATE POLICY "Only admins can update pre_incident_estimates"
ON pre_incident_estimates FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete pre-incident estimates
CREATE POLICY "Only admins can delete pre_incident_estimates"
ON pre_incident_estimates FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- PRE_INCIDENT_ESTIMATE_PHOTOS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE pre_incident_estimate_photos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all pre-incident estimate photos
CREATE POLICY "Authenticated users can view pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert pre-incident estimate photos
CREATE POLICY "Only admins can insert pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update pre-incident estimate photos
CREATE POLICY "Only admins can update pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete pre-incident estimate photos
CREATE POLICY "Only admins can delete pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ASSESSMENT_ADDITIONALS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE assessment_additionals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all assessment additionals
CREATE POLICY "Authenticated users can view assessment_additionals"
ON assessment_additionals FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert assessment additionals
CREATE POLICY "Only admins can insert assessment_additionals"
ON assessment_additionals FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update assessment additionals
CREATE POLICY "Only admins can update assessment_additionals"
ON assessment_additionals FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete assessment additionals
CREATE POLICY "Only admins can delete assessment_additionals"
ON assessment_additionals FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ASSESSMENT_ADDITIONALS_PHOTOS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE assessment_additionals_photos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all assessment additionals photos
CREATE POLICY "Authenticated users can view assessment_additionals_photos"
ON assessment_additionals_photos FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert assessment additionals photos
CREATE POLICY "Only admins can insert assessment_additionals_photos"
ON assessment_additionals_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update assessment additionals photos
CREATE POLICY "Only admins can update assessment_additionals_photos"
ON assessment_additionals_photos FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete assessment additionals photos
CREATE POLICY "Only admins can delete assessment_additionals_photos"
ON assessment_additionals_photos FOR DELETE
TO authenticated
USING (is_admin());

-- Add comments for documentation
COMMENT ON TABLE pre_incident_estimates IS 'Pre-incident vehicle estimates - RLS enabled, admin-only modifications';
COMMENT ON TABLE pre_incident_estimate_photos IS 'Photos for pre-incident estimates - RLS enabled, admin-only modifications';
COMMENT ON TABLE assessment_additionals IS 'Additional assessment repair items - RLS enabled, admin-only modifications';
COMMENT ON TABLE assessment_additionals_photos IS 'Photos for assessment additionals - RLS enabled, admin-only modifications';
