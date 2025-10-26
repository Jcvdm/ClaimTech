-- Fix RLS policies to allow engineers to work on their assigned assessments
-- The previous migrations (059-061) were too restrictive (admin-only)
-- Engineers need to create/modify assessment data for appointments they're assigned to
-- Pattern: Admins (full access) + Engineers (assigned work only)

-- ============================================================================
-- ASSESSMENT_ESTIMATES TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert assessment_estimates" ON assessment_estimates;
DROP POLICY IF EXISTS "Only admins can update assessment_estimates" ON assessment_estimates;

-- Admins can insert estimates
CREATE POLICY "Admins can insert assessment_estimates"
ON assessment_estimates FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert estimates for their assessments
CREATE POLICY "Engineers can insert assessment_estimates"
ON assessment_estimates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_estimates.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update estimates
CREATE POLICY "Admins can update assessment_estimates"
ON assessment_estimates FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update estimates for their assessments
CREATE POLICY "Engineers can update assessment_estimates"
ON assessment_estimates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_estimates.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- ASSESSMENT_VEHICLE_VALUES TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert assessment_vehicle_values" ON assessment_vehicle_values;
DROP POLICY IF EXISTS "Only admins can update assessment_vehicle_values" ON assessment_vehicle_values;

-- Admins can insert vehicle values
CREATE POLICY "Admins can insert assessment_vehicle_values"
ON assessment_vehicle_values FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert vehicle values for their assessments
CREATE POLICY "Engineers can insert assessment_vehicle_values"
ON assessment_vehicle_values FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_vehicle_values.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update vehicle values
CREATE POLICY "Admins can update assessment_vehicle_values"
ON assessment_vehicle_values FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update vehicle values for their assessments
CREATE POLICY "Engineers can update assessment_vehicle_values"
ON assessment_vehicle_values FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_vehicle_values.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- PRE_INCIDENT_ESTIMATES TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert pre_incident_estimates" ON pre_incident_estimates;
DROP POLICY IF EXISTS "Only admins can update pre_incident_estimates" ON pre_incident_estimates;

-- Admins can insert pre-incident estimates
CREATE POLICY "Admins can insert pre_incident_estimates"
ON pre_incident_estimates FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert pre-incident estimates for their assessments
CREATE POLICY "Engineers can insert pre_incident_estimates"
ON pre_incident_estimates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = pre_incident_estimates.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update pre-incident estimates
CREATE POLICY "Admins can update pre_incident_estimates"
ON pre_incident_estimates FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update pre-incident estimates for their assessments
CREATE POLICY "Engineers can update pre_incident_estimates"
ON pre_incident_estimates FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = pre_incident_estimates.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- PRE_INCIDENT_ESTIMATE_PHOTOS TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert pre_incident_estimate_photos" ON pre_incident_estimate_photos;
DROP POLICY IF EXISTS "Only admins can update pre_incident_estimate_photos" ON pre_incident_estimate_photos;

-- Admins can insert pre-incident estimate photos
CREATE POLICY "Admins can insert pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert pre-incident estimate photos for their assessments
CREATE POLICY "Engineers can insert pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pre_incident_estimates
    JOIN assessments ON pre_incident_estimates.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE pre_incident_estimates.id = pre_incident_estimate_photos.estimate_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update pre-incident estimate photos
CREATE POLICY "Admins can update pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update pre-incident estimate photos for their assessments
CREATE POLICY "Engineers can update pre_incident_estimate_photos"
ON pre_incident_estimate_photos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pre_incident_estimates
    JOIN assessments ON pre_incident_estimates.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE pre_incident_estimates.id = pre_incident_estimate_photos.estimate_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- ASSESSMENT_ADDITIONALS TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert assessment_additionals" ON assessment_additionals;
DROP POLICY IF EXISTS "Only admins can update assessment_additionals" ON assessment_additionals;

-- Admins can insert assessment additionals
CREATE POLICY "Admins can insert assessment_additionals"
ON assessment_additionals FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert assessment additionals for their assessments
CREATE POLICY "Engineers can insert assessment_additionals"
ON assessment_additionals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_additionals.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update assessment additionals
CREATE POLICY "Admins can update assessment_additionals"
ON assessment_additionals FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update assessment additionals for their assessments
CREATE POLICY "Engineers can update assessment_additionals"
ON assessment_additionals FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_additionals.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- ASSESSMENT_ADDITIONALS_PHOTOS TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert assessment_additionals_photos" ON assessment_additionals_photos;
DROP POLICY IF EXISTS "Only admins can update assessment_additionals_photos" ON assessment_additionals_photos;

-- Admins can insert assessment additionals photos
CREATE POLICY "Admins can insert assessment_additionals_photos"
ON assessment_additionals_photos FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert assessment additionals photos for their assessments
CREATE POLICY "Engineers can insert assessment_additionals_photos"
ON assessment_additionals_photos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessment_additionals
    JOIN assessments ON assessment_additionals.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessment_additionals.id = assessment_additionals_photos.additionals_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update assessment additionals photos
CREATE POLICY "Admins can update assessment_additionals_photos"
ON assessment_additionals_photos FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update assessment additionals photos for their assessments
CREATE POLICY "Engineers can update assessment_additionals_photos"
ON assessment_additionals_photos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_additionals
    JOIN assessments ON assessment_additionals.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessment_additionals.id = assessment_additionals_photos.additionals_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- ASSESSMENT_FRC TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert assessment_frc" ON assessment_frc;
DROP POLICY IF EXISTS "Only admins can update assessment_frc" ON assessment_frc;

-- Admins can insert FRC records
CREATE POLICY "Admins can insert assessment_frc"
ON assessment_frc FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert FRC records for their assessments
CREATE POLICY "Engineers can insert assessment_frc"
ON assessment_frc FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_frc.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update FRC records
CREATE POLICY "Admins can update assessment_frc"
ON assessment_frc FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update FRC records for their assessments
CREATE POLICY "Engineers can update assessment_frc"
ON assessment_frc FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_frc.assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- ============================================================================
-- ASSESSMENT_FRC_DOCUMENTS TABLE
-- ============================================================================

-- Drop overly restrictive policies
DROP POLICY IF EXISTS "Only admins can insert assessment_frc_documents" ON assessment_frc_documents;
DROP POLICY IF EXISTS "Only admins can update assessment_frc_documents" ON assessment_frc_documents;

-- Admins can insert FRC documents
CREATE POLICY "Admins can insert assessment_frc_documents"
ON assessment_frc_documents FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert FRC documents for their assessments
CREATE POLICY "Engineers can insert assessment_frc_documents"
ON assessment_frc_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessment_frc
    JOIN assessments ON assessment_frc.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessment_frc.id = assessment_frc_documents.frc_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update FRC documents
CREATE POLICY "Admins can update assessment_frc_documents"
ON assessment_frc_documents FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update FRC documents for their assessments
CREATE POLICY "Engineers can update assessment_frc_documents"
ON assessment_frc_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_frc
    JOIN assessments ON assessment_frc.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessment_frc.id = assessment_frc_documents.frc_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Update table comments
COMMENT ON TABLE assessment_estimates IS 'Assessment repair estimates - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE assessment_vehicle_values IS 'Vehicle valuations - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE pre_incident_estimates IS 'Pre-incident estimates - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE pre_incident_estimate_photos IS 'Pre-incident photos - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE assessment_additionals IS 'Assessment additionals - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE assessment_additionals_photos IS 'Additionals photos - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE assessment_frc IS 'Final Repair Cost - RLS: Admins (full) + Engineers (assigned work)';
COMMENT ON TABLE assessment_frc_documents IS 'FRC documents - RLS: Admins (full) + Engineers (assigned work)';
