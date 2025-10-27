# Investigation: Missing Assessments for vandermerwe.jaco194@gmail.com

**Date:** 2025-10-25
**User Email:** vandermerwe.jaco194@gmail.com
**User ID:** 868d5230-2136-4d12-850b-5d320165065c
**Engineer ID:** ad521f89-720e-4082-8600-f523fbd26ed5
**Engineer Name:** Jakes

---

## Summary

**CONFIRMED:** Race condition causing orphaned appointments.

- **Total Appointments:** 3
- **In Progress Appointments:** 3
- **Total Assessments:** 0
- **Orphaned Appointments:** 3 (100% failure rate)

All 3 appointments were updated to `status = 'in_progress'` but the corresponding assessment creation failed, leaving orphaned appointments with no associated assessments.

---

## Orphaned Appointments

### 1. APT-2025-008
- **ID:** 1ffc584c-ec07-4ddd-a537-60aae4720978
- **Appointment Number:** APT-2025-008
- **Status:** in_progress
- **Appointment Date:** 2025-10-27
- **Created:** 2025-10-25 12:12:58 UTC
- **Request ID:** bcd9479b-1610-4d01-87ff-2fa0ce0146e6
- **Inspection ID:** a13293a8-09e6-4c9e-9863-29e7adb6572c

### 2. APT-2025-009
- **ID:** e321de0f-5580-40c1-8436-17a6164ea16d
- **Appointment Number:** APT-2025-009
- **Status:** in_progress
- **Appointment Date:** 2025-10-24
- **Created:** 2025-10-25 12:46:25 UTC
- **Request ID:** c405785a-7966-4985-a63a-fb78e00aa1bc
- **Inspection ID:** 06104421-15cd-4e6d-935f-1189cc53a2c0

### 3. APT-2025-010
- **ID:** a0bc642f-91e3-4cc7-9508-dc1fdf2b210c
- **Appointment Number:** APT-2025-010
- **Status:** in_progress
- **Appointment Date:** 2025-10-27
- **Created:** 2025-10-25 13:20:26 UTC
- **Request ID:** 1d69abcb-ab97-461a-ba61-0ca003415c03
- **Inspection ID:** 71664552-a3fb-4a1e-96cd-95d4be17480f

---

## Root Cause

This is a **race condition** in the appointment start workflow:

1. User clicks "Start Assessment" on an appointment
2. Backend updates appointment status to `'in_progress'` (succeeds)
3. Backend attempts to create assessment record (fails)
4. No rollback occurs - appointment remains in `'in_progress'` with no assessment

Possible causes for assessment creation failure:
- RLS policy blocking insert (most likely - see `.agent/Tasks/active/fix_assessment_race_condition.md`)
- Database constraint violation
- Network/timeout issue during transaction
- Missing required fields

---

## Recommended Fix

### Option 1: Reset Appointments to 'scheduled' (Recommended)

This allows the user to retry the "Start Assessment" action:

```sql
-- Reset orphaned appointments back to 'scheduled' status
UPDATE appointments
SET
  status = 'scheduled',
  updated_at = NOW()
WHERE id IN (
  '1ffc584c-ec07-4ddd-a537-60aae4720978', -- APT-2025-008
  'e321de0f-5580-40c1-8436-17a6164ea16d', -- APT-2025-009
  'a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'  -- APT-2025-010
);
```

**Benefits:**
- Safe and reversible
- Allows natural retry through UI
- Maintains data integrity
- User-friendly

### Option 2: Manually Create Assessments (Alternative)

Only use if you need to preserve the `'in_progress'` status:

```sql
-- Manually create assessments for orphaned appointments
-- WARNING: Ensure assessment numbering is correct!

WITH next_numbers AS (
  SELECT
    COALESCE(MAX(CAST(SUBSTRING(assessment_number FROM 'ASS-2025-(.*)') AS INTEGER)), 0) + 1 as next_num
  FROM assessments
  WHERE assessment_number LIKE 'ASS-2025-%'
)
INSERT INTO assessments (
  id,
  assessment_number,
  appointment_id,
  inspection_id,
  request_id,
  status,
  current_tab,
  tabs_completed,
  started_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'ASS-2025-' || LPAD((next_numbers.next_num + row_number() OVER () - 1)::TEXT, 3, '0'),
  a.id,
  a.inspection_id,
  a.request_id,
  'in_progress',
  'identification',
  '[]'::jsonb,
  NOW(),
  NOW(),
  NOW()
FROM (VALUES
  ('1ffc584c-ec07-4ddd-a537-60aae4720978'::uuid),
  ('e321de0f-5580-40c1-8436-17a6164ea16d'::uuid),
  ('a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'::uuid)
) AS orphaned(appointment_id)
JOIN appointments a ON a.id = orphaned.appointment_id
CROSS JOIN next_numbers;
```

---

## System-Wide Fix Required

This issue reveals a systemic problem that needs addressing:

### 1. Database Transaction Integrity

See `.agent/Tasks/active/fix_assessment_race_condition.md` for details.

**Backend Fix (SvelteKit form action):**
```typescript
// Use database transaction to ensure atomicity
const { error: appointmentError } = await supabase.rpc('start_assessment_transaction', {
  p_appointment_id: appointmentId,
  p_assessment_number: assessmentNumber,
  // ... other params
});
```

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION start_assessment_transaction(
  p_appointment_id UUID,
  p_assessment_number TEXT,
  p_inspection_id UUID,
  p_request_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_assessment_id UUID;
BEGIN
  -- Update appointment status
  UPDATE appointments
  SET status = 'in_progress', updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Create assessment (in same transaction)
  INSERT INTO assessments (
    id, assessment_number, appointment_id, inspection_id, request_id,
    status, current_tab, tabs_completed, started_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_assessment_number, p_appointment_id, p_inspection_id, p_request_id,
    'in_progress', 'identification', '[]'::jsonb, NOW(), NOW(), NOW()
  )
  RETURNING id INTO v_assessment_id;

  RETURN json_build_object('success', true, 'assessment_id', v_assessment_id);
EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. RLS Policy Review

Check if assessment insert policy is blocking engineers:

```sql
-- Review current RLS policies on assessments table
SELECT * FROM pg_policies WHERE tablename = 'assessments';
```

Expected policy should allow:
- Admins: Full access
- Engineers: Insert/update for their assigned appointments

### 3. Error Handling

Add better error handling in frontend:
- Display specific error messages
- Prevent status change if assessment creation fails
- Log failures for debugging

---

## Verification Query

After applying fix, verify no orphaned appointments remain:

```sql
SELECT
    a.id,
    a.appointment_number,
    a.status,
    ass.id as assessment_id,
    ass.assessment_number
FROM appointments a
LEFT JOIN assessments ass ON ass.appointment_id = a.id
WHERE a.status = 'in_progress' AND ass.id IS NULL;
```

Expected result: **0 rows** (no orphaned appointments)

---

## Next Steps

1. **Immediate:** Apply Option 1 fix to reset appointments
2. **Short-term:** Implement database transaction function
3. **Medium-term:** Review and fix RLS policies
4. **Long-term:** Add monitoring/alerting for orphaned records

---

## Related Documentation

- `.agent/Tasks/active/fix_assessment_race_condition.md` - Detailed race condition analysis
- `.agent/SOP/handling_race_conditions_in_number_generation.md` - Number generation patterns
- `.agent/SOP/fixing_rls_insert_policies.md` - RLS policy fixes
