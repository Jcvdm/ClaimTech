-- Fix RLS policy for engineer vehicle values creation
-- Bug: Policy referenced assessment_vehicle_values.assessment_id (table-qualified) during INSERT
-- This caused RLS violations because table-qualified column references don't work in INSERT context
-- The policy should check if the assessment_id being inserted belongs to the engineer's appointment

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Engineers can insert assessment_vehicle_values" ON assessment_vehicle_values;

-- Create correct policy
-- Engineers can insert vehicle values for assessments from their appointments
CREATE POLICY "Engineers can insert assessment_vehicle_values"
ON assessment_vehicle_values FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = assessment_id  -- ✅ Fixed: Use bare column name from INSERT context
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

