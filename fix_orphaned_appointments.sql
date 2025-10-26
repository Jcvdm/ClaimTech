-- ============================================================================
-- FIX: Orphaned Appointments for Engineer "Jakes" (vandermerwe.jaco194@gmail.com)
-- ============================================================================
-- Date: 2025-10-25
-- Issue: 3 appointments stuck in 'in_progress' with no associated assessments
-- Cause: Race condition in assessment creation workflow
-- ============================================================================

-- OPTION 1: RESET APPOINTMENTS TO 'scheduled' (RECOMMENDED)
-- This allows the user to retry "Start Assessment" through the UI
-- ============================================================================

BEGIN;

-- Verify the orphaned appointments before fixing
SELECT
    a.id,
    a.appointment_number,
    a.status,
    a.appointment_date,
    a.engineer_id,
    e.name as engineer_name,
    e.email as engineer_email,
    ass.id as assessment_id
FROM appointments a
LEFT JOIN assessments ass ON ass.appointment_id = a.id
LEFT JOIN engineers e ON e.id = a.engineer_id
WHERE a.id IN (
    '1ffc584c-ec07-4ddd-a537-60aae4720978', -- APT-2025-008
    'e321de0f-5580-40c1-8436-17a6164ea16d', -- APT-2025-009
    'a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'  -- APT-2025-010
)
ORDER BY a.appointment_date;

-- Expected output: 3 rows with NULL assessment_id

-- Reset appointments to 'scheduled' status
UPDATE appointments
SET
    status = 'scheduled',
    updated_at = NOW()
WHERE id IN (
    '1ffc584c-ec07-4ddd-a537-60aae4720978', -- APT-2025-008
    'e321de0f-5580-40c1-8436-17a6164ea16d', -- APT-2025-009
    'a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'  -- APT-2025-010
);

-- Verify the fix
SELECT
    a.id,
    a.appointment_number,
    a.status,
    a.updated_at,
    'FIXED - Ready to start' as note
FROM appointments
WHERE id IN (
    '1ffc584c-ec07-4ddd-a537-60aae4720978',
    'e321de0f-5580-40c1-8436-17a6164ea16d',
    'a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'
);

-- Expected output: 3 rows with status = 'scheduled'

COMMIT;

-- ============================================================================
-- VERIFICATION: Check for any remaining orphaned appointments system-wide
-- ============================================================================

-- Run this after applying the fix
SELECT
    a.id,
    a.appointment_number,
    a.status,
    e.name as engineer_name,
    e.email as engineer_email,
    a.appointment_date,
    a.created_at
FROM appointments a
LEFT JOIN assessments ass ON ass.appointment_id = a.id
LEFT JOIN engineers e ON e.id = a.engineer_id
WHERE a.status = 'in_progress'
  AND ass.id IS NULL
ORDER BY a.created_at DESC;

-- Expected result: 0 rows (no orphaned appointments)

-- ============================================================================
-- OPTION 2: MANUALLY CREATE ASSESSMENTS (USE ONLY IF NECESSARY)
-- ============================================================================
-- Uncomment and run this INSTEAD of Option 1 if you need to preserve
-- the 'in_progress' status and create assessments manually.
-- ============================================================================

/*
BEGIN;

-- Get the next assessment number
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
    ('1ffc584c-ec07-4ddd-a537-60aae4720978'::uuid), -- APT-2025-008
    ('e321de0f-5580-40c1-8436-17a6164ea16d'::uuid), -- APT-2025-009
    ('a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'::uuid)  -- APT-2025-010
) AS orphaned(appointment_id)
JOIN appointments a ON a.id = orphaned.appointment_id
CROSS JOIN next_numbers;

-- Verify assessments were created
SELECT
    ass.id,
    ass.assessment_number,
    ass.status,
    a.appointment_number,
    a.status as appointment_status
FROM assessments ass
JOIN appointments a ON a.id = ass.appointment_id
WHERE a.id IN (
    '1ffc584c-ec07-4ddd-a537-60aae4720978',
    'e321de0f-5580-40c1-8436-17a6164ea16d',
    'a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'
);

-- Expected output: 3 rows with new assessment numbers

COMMIT;
*/

-- ============================================================================
-- AUDIT LOG (Optional - for tracking)
-- ============================================================================

-- Log the fix in audit_logs table
INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by,
    metadata,
    created_at
)
SELECT
    'appointment',
    id,
    'status_changed',
    'status',
    'in_progress',
    'scheduled',
    'system_fix',
    json_build_object(
        'reason', 'Fixed orphaned appointments due to race condition',
        'fix_date', NOW(),
        'engineer_email', 'vandermerwe.jaco194@gmail.com'
    )::jsonb,
    NOW()
FROM appointments
WHERE id IN (
    '1ffc584c-ec07-4ddd-a537-60aae4720978',
    'e321de0f-5580-40c1-8436-17a6164ea16d',
    'a0bc642f-91e3-4cc7-9508-dc1fdf2b210c'
);

-- ============================================================================
-- END OF FIX SCRIPT
-- ============================================================================
