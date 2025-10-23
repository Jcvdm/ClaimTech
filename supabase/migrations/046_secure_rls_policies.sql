-- Secure RLS Policies Migration
-- Replaces permissive development policies with role-based access control
-- Admins: Full access to all data
-- Engineers: Access only to assigned work

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get engineer_id for current user
CREATE OR REPLACE FUNCTION public.get_user_engineer_id()
RETURNS UUID AS $$
DECLARE
  eng_id UUID;
BEGIN
  SELECT id INTO eng_id
  FROM public.engineers
  WHERE auth_user_id = auth.uid();
  
  RETURN eng_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on clients for now" ON clients;

-- Authenticated users can view all clients
CREATE POLICY "Authenticated users can view clients"
ON clients FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert clients
CREATE POLICY "Only admins can insert clients"
ON clients FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update clients
CREATE POLICY "Only admins can update clients"
ON clients FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete clients
CREATE POLICY "Only admins can delete clients"
ON clients FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ENGINEERS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on engineers for now" ON engineers;

-- Authenticated users can view all engineers
CREATE POLICY "Authenticated users can view engineers"
ON engineers FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert engineers
CREATE POLICY "Only admins can insert engineers"
ON engineers FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update engineers
CREATE POLICY "Only admins can update engineers"
ON engineers FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete engineers
CREATE POLICY "Only admins can delete engineers"
ON engineers FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- REPAIRERS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on repairers for now" ON repairers;

-- Authenticated users can view all repairers
CREATE POLICY "Authenticated users can view repairers"
ON repairers FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert repairers
CREATE POLICY "Only admins can insert repairers"
ON repairers FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update repairers
CREATE POLICY "Only admins can update repairers"
ON repairers FOR UPDATE
TO authenticated
USING (is_admin());

-- Only admins can delete repairers
CREATE POLICY "Only admins can delete repairers"
ON repairers FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- REQUESTS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on requests for now" ON requests;

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON requests FOR SELECT
TO authenticated
USING (is_admin());

-- Engineers can view requests assigned to them
CREATE POLICY "Engineers can view assigned requests"
ON requests FOR SELECT
TO authenticated
USING (
  assigned_engineer_id = get_user_engineer_id()
);

-- Only admins can insert requests
CREATE POLICY "Only admins can insert requests"
ON requests FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can update all requests
CREATE POLICY "Admins can update all requests"
ON requests FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update their assigned requests (limited fields)
CREATE POLICY "Engineers can update assigned requests"
ON requests FOR UPDATE
TO authenticated
USING (assigned_engineer_id = get_user_engineer_id());

-- Only admins can delete requests
CREATE POLICY "Only admins can delete requests"
ON requests FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- INSPECTIONS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on inspections for now" ON inspections;

-- Admins can view all inspections
CREATE POLICY "Admins can view all inspections"
ON inspections FOR SELECT
TO authenticated
USING (is_admin());

-- Engineers can view inspections for their assigned requests
CREATE POLICY "Engineers can view assigned inspections"
ON inspections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = inspections.request_id
    AND requests.assigned_engineer_id = get_user_engineer_id()
  )
);

-- Only admins can insert inspections
CREATE POLICY "Only admins can insert inspections"
ON inspections FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can update all inspections
CREATE POLICY "Admins can update all inspections"
ON inspections FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update their assigned inspections
CREATE POLICY "Engineers can update assigned inspections"
ON inspections FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = inspections.request_id
    AND requests.assigned_engineer_id = get_user_engineer_id()
  )
);

-- Only admins can delete inspections
CREATE POLICY "Only admins can delete inspections"
ON inspections FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on appointments for now" ON appointments;

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments"
ON appointments FOR SELECT
TO authenticated
USING (is_admin());

-- Engineers can view their own appointments
CREATE POLICY "Engineers can view their appointments"
ON appointments FOR SELECT
TO authenticated
USING (engineer_id = get_user_engineer_id());

-- Admins can insert appointments
CREATE POLICY "Admins can insert appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Admins can update all appointments
CREATE POLICY "Admins can update all appointments"
ON appointments FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update their own appointments (limited fields)
CREATE POLICY "Engineers can update their appointments"
ON appointments FOR UPDATE
TO authenticated
USING (engineer_id = get_user_engineer_id());

-- Only admins can delete appointments
CREATE POLICY "Only admins can delete appointments"
ON appointments FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- ASSESSMENTS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on assessments for now" ON assessments;

-- Admins can view all assessments
CREATE POLICY "Admins can view all assessments"
ON assessments FOR SELECT
TO authenticated
USING (is_admin());

-- Engineers can view assessments for their appointments
CREATE POLICY "Engineers can view their assessments"
ON assessments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = assessments.appointment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can insert assessments
CREATE POLICY "Admins can insert assessments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert assessments for their appointments
CREATE POLICY "Engineers can insert their assessments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Admins can update all assessments
CREATE POLICY "Admins can update all assessments"
ON assessments FOR UPDATE
TO authenticated
USING (is_admin());

-- Engineers can update their assessments
CREATE POLICY "Engineers can update their assessments"
ON assessments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = assessments.appointment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Only admins can delete assessments
CREATE POLICY "Only admins can delete assessments"
ON assessments FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on audit_logs for now" ON audit_logs;

-- Authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- No one can update or delete audit logs (immutable)

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin IS 'Helper function to check if current user has admin role';
COMMENT ON FUNCTION public.get_user_engineer_id IS 'Helper function to get engineer_id for current authenticated user';

