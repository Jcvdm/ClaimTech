-- Fix RLS policy for engineer assessment creation
-- Bug: Policy referenced assessment_id instead of appointment_id during INSERT
-- This caused RLS violations because assessment_id doesn't exist during INSERT
-- The policy should check if the appointment_id being inserted belongs to the engineer

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Engineers can insert their assessments" ON assessments;

-- Create correct policy
-- Engineers can insert assessments for appointments assigned to them
CREATE POLICY "Engineers can insert their assessments"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_id  -- ✅ Fixed: Use appointment_id from NEW row
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

