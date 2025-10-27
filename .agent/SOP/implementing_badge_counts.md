# SOP: Implementing Badge Counts in ClaimTech

**Last Updated:** 2025-01-27
**Status:** ✅ Active
**Related Documents:**
- [Working with Assessment-Centric Architecture](.agent/SOP/working_with_assessment_centric_architecture.md)
- [Badge Count Mismatch Fix Task](.agent/Tasks/active/fix_badge_count_mismatches.md)

---

## Purpose

This SOP defines the standard approach for implementing badge counts in ClaimTech's sidebar navigation. Badge counts must use the **assessment-centric architecture** to ensure accuracy and consistency.

---

## Core Principles

### 1. Always Query the `assessments` Table

❌ **INCORRECT** - Old table-centric approach:
```typescript
// DON'T query appointments, inspections, or requests tables directly
const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled');
```

✅ **CORRECT** - Assessment-centric approach:
```typescript
// DO query assessments table with stage filters
const { count } = await supabase
    .from('assessments')
    .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
    .in('stage', ['appointment_scheduled', 'assessment_in_progress']);
```

### 2. Use Stage Filters, Not Status Filters

- Assessment pipeline has **10 stages** (request_submitted → archived/cancelled)
- Each badge represents assessments at specific stages
- Use `.eq('stage', ...)` or `.in('stage', [...])` filters

### 3. Join Appropriately for Engineer Filtering

Two join options depending on the stage:

**Appointments Join** - For stages with appointments:
```typescript
.select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
.eq('appointments.engineer_id', engineer_id)  // If filtering by engineer
```

**Requests Join** - For early stages before appointments:
```typescript
.select('*, requests!inner(assigned_engineer_id)', { count: 'exact', head: true })
.eq('requests.assigned_engineer_id', engineer_id)  // If filtering by engineer
```

---

## Implementation Pattern

### Standard Badge Count Function

```typescript
async function loadBadgeCount() {
    try {
        // 1. Build query on assessments table
        let query = $page.data.supabase
            .from('assessments')
            .select('*, JOIN_TABLE!inner(ENGINEER_FIELD)', { count: 'exact', head: true })
            .STAGE_FILTER;  // .eq('stage', ...) or .in('stage', [...])

        // 2. Apply engineer filter if needed (role-based)
        if (role === 'engineer' && engineer_id) {
            query = query.eq('JOIN_TABLE.ENGINEER_FIELD', engineer_id);
        }

        // 3. Execute query
        const { count, error } = await query;

        // 4. Handle errors gracefully
        if (error) {
            console.error('Error loading badge count:', error);
            badgeCount = 0;
        } else {
            badgeCount = count || 0;
        }
    } catch (error) {
        console.error('Error loading badge count:', error);
        badgeCount = 0;
    }
}
```

### Variables to Replace

| Placeholder | Value | Notes |
|------------|-------|-------|
| `JOIN_TABLE` | `appointments` or `requests` | Depends on stage |
| `ENGINEER_FIELD` | `engineer_id` or `assigned_engineer_id` | Depends on join table |
| `STAGE_FILTER` | `.eq('stage', 'X')` or `.in('stage', ['X', 'Y'])` | Single or multiple stages |
| `badgeCount` | Your state variable name | e.g., `appointmentCount` |

---

## Badge-Specific Examples

### Example 1: Requests Badge (Single Stage)

**Badge:** New Requests
**Stages:** `request_submitted`
**Join:** `requests` (early stage, before appointment)

```typescript
async function loadNewRequestCount() {
    try {
        let query = $page.data.supabase
            .from('assessments')
            .select('*, requests!inner(assigned_engineer_id)', { count: 'exact', head: true })
            .eq('stage', 'request_submitted');

        if (role === 'engineer' && engineer_id) {
            query = query.eq('requests.assigned_engineer_id', engineer_id);
        }

        const { count, error } = await query;

        if (error) {
            console.error('Error loading new request count:', error);
            newRequestCount = 0;
        } else {
            newRequestCount = count || 0;
        }
    } catch (error) {
        console.error('Error loading new request count:', error);
        newRequestCount = 0;
    }
}
```

### Example 2: Inspections Badge (Single Stage)

**Badge:** Inspections / Assigned Work
**Stages:** `inspection_scheduled`
**Join:** `appointments` (has appointment)

```typescript
async function loadInspectionCount() {
    try {
        let query = $page.data.supabase
            .from('assessments')
            .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
            .eq('stage', 'inspection_scheduled');

        if (role === 'engineer' && engineer_id) {
            query = query.eq('appointments.engineer_id', engineer_id);
        }

        const { count, error } = await query;

        if (error) {
            console.error('Error loading inspection count:', error);
            inspectionCount = 0;
        } else {
            inspectionCount = count || 0;
        }
    } catch (error) {
        console.error('Error loading inspection count:', error);
        inspectionCount = 0;
    }
}
```

### Example 3: Appointments Badge (Multiple Stages)

**Badge:** Appointments
**Stages:** `appointment_scheduled`, `assessment_in_progress`
**Join:** `appointments` (has appointment)

```typescript
async function loadAppointmentCount() {
    try {
        let query = $page.data.supabase
            .from('assessments')
            .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
            .in('stage', ['appointment_scheduled', 'assessment_in_progress']);

        if (role === 'engineer' && engineer_id) {
            query = query.eq('appointments.engineer_id', engineer_id);
        }

        const { count, error } = await query;

        if (error) {
            console.error('Error loading appointment count:', error);
            appointmentCount = 0;
        } else {
            appointmentCount = count || 0;
        }
    } catch (error) {
        console.error('Error loading appointment count:', error);
        appointmentCount = 0;
    }
}
```

---

## Alternative: Using Service Methods

For consistency and reusability, you can use the `assessmentService` methods:

### Service Methods Available

```typescript
// Single stage
async getCountByStage(
    client: ServiceClient | undefined,
    stage: AssessmentStage,
    engineer_id?: string | null,
    joinTable: 'appointments' | 'requests' = 'appointments'
): Promise<number>

// Multiple stages
async getCountByStages(
    client: ServiceClient | undefined,
    stages: AssessmentStage[],
    engineer_id?: string | null,
    joinTable: 'appointments' | 'requests' = 'appointments'
): Promise<number>
```

### Example Using Service Method

```typescript
import { assessmentService } from '$lib/services/assessment.service';

async function loadInspectionCount() {
    try {
        const engineerIdFilter = role === 'engineer' ? engineer_id : null;
        inspectionCount = await assessmentService.getCountByStage(
            $page.data.supabase,
            'inspection_scheduled',
            engineerIdFilter,
            'appointments'
        );
    } catch (error) {
        console.error('Error loading inspection count:', error);
        inspectionCount = 0;
    }
}
```

**When to use service methods vs direct queries:**
- ✅ Service methods: When the badge logic is complex or used in multiple places
- ✅ Direct queries: When the badge is unique and needs custom filtering (recommended for most cases)

---

## Stage-to-Badge Mapping

Reference table for all ClaimTech badges:

| Badge | Stages | Join Table | Notes |
|-------|--------|------------|-------|
| **New Requests** | `request_submitted` | `requests` | Early stage, no appointment yet |
| **Inspections** | `inspection_scheduled` | `appointments` | Scheduled inspection |
| **Appointments** | `appointment_scheduled`, `assessment_in_progress` | `appointments` | Upcoming or active appointments |
| **Open Assessments** | `assessment_in_progress`, `estimate_review`, `estimate_sent` | `appointments` | Work in progress |
| **Finalized** | `estimate_finalized` | `appointments` | Completed estimates |
| **FRC** | Tracked in `frc` table | N/A | Uses separate FRC service |
| **Additionals** | Tracked in `additionals` table | N/A | Uses separate additionals service |

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Querying Old Tables
```typescript
// DON'T do this
await supabase.from('appointments').select('*', { count: 'exact' }).eq('status', 'scheduled');
```
**Why wrong:** Misses assessments that may be orphaned or in different stages.

### ❌ Mistake 2: Using Status Instead of Stage
```typescript
// DON'T do this
await supabase.from('assessments').select('*', { count: 'exact' }).eq('status', 'in_progress');
```
**Why wrong:** `status` is deprecated; use `stage` for pipeline tracking.

### ❌ Mistake 3: Wrong Join Table
```typescript
// DON'T do this for request_submitted stage
.select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
```
**Why wrong:** At `request_submitted` stage, no appointment exists yet. Use `requests` table join.

### ❌ Mistake 4: Not Handling Errors
```typescript
// DON'T do this
const { count } = await query;
badgeCount = count;
```
**Why wrong:** If query fails, `count` is undefined and badge shows nothing. Always handle errors:
```typescript
if (error) {
    console.error('Error:', error);
    badgeCount = 0;
} else {
    badgeCount = count || 0;
}
```

---

## Testing Checklist

After implementing a badge count:

- [ ] **Admin view:** Badge shows count across all engineers
- [ ] **Engineer view:** Badge shows count for assigned engineer only
- [ ] **Zero state:** Badge hidden when count is 0
- [ ] **Error handling:** Badge shows 0 on error (not undefined or crash)
- [ ] **Stage accuracy:** Count matches page query results exactly
- [ ] **Database verification:** Run SQL query to verify count manually:

```sql
-- Example verification query for Appointments badge
SELECT COUNT(*)
FROM assessments a
INNER JOIN appointments ap ON a.appointment_id = ap.id
WHERE ap.engineer_id = 'YOUR_ENGINEER_ID'
  AND a.stage IN ('appointment_scheduled', 'assessment_in_progress');
```

- [ ] **Polling works:** Badge updates every 10 seconds (check network tab)
- [ ] **Navigation refresh:** Badge updates when navigating to `/work/*` pages

---

## Troubleshooting

### Badge shows incorrect count

**Symptoms:** Badge shows 4, page shows 1
**Diagnosis:** Badge querying old table or using status instead of stage
**Fix:** Follow this SOP - query `assessments` table with `stage` filter

### Badge shows 0 for engineer but admin sees data

**Symptoms:** Admin badge shows 5, engineer badge shows 0
**Diagnosis:** Missing or incorrect engineer filter join
**Fix:** Verify join table and engineer field:
- For `appointments` join: `.eq('appointments.engineer_id', engineer_id)`
- For `requests` join: `.eq('requests.assigned_engineer_id', engineer_id)`

### Badge not updating after action

**Symptoms:** Created new assessment, badge doesn't reflect it
**Diagnosis:** Polling paused on edit routes or cache issue
**Fix:**
1. Navigate away from edit route (polling resumes automatically)
2. Check browser network tab for polling requests
3. Verify stage matches badge stage filter

### Badge shows negative number or null

**Symptoms:** Badge displays "-" or weird value
**Diagnosis:** Count query failed, not handling error properly
**Fix:** Always wrap in try/catch and set to 0 on error (see pattern above)

### REAL BUG EXAMPLE: Engineer Shows Zero Assigned Work (Jan 2025)

**Symptoms:** Engineer has 6 inspections assigned but sidebar badge shows 0

**Root Cause:** Sidebar joins with WRONG TABLE for the stage
```typescript
// BUG - Wrong join table for inspection_scheduled stage
.select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
.eq('stage', 'inspection_scheduled');
// At stage 3 (inspection_scheduled), appointment_id is NULL
// INNER JOIN with appointments fails → returns 0
```

**Stage-Based FK Lifecycle:**
| Stage | inspection_id | appointment_id | Correct Join Table |
|-------|--------------|----------------|-------------------|
| 1-2. request_submitted/reviewed | NULL | NULL | N/A (no engineer yet) |
| 3. inspection_scheduled | **SET** ✓ | NULL ❌ | **inspections** |
| 4. appointment_scheduled | SET | **SET** ✓ | **appointments** |
| 5+ assessment_in_progress+ | SET | SET | **appointments** |

**Fix:**
```typescript
// CORRECT - Join with inspections table for stage 3
.select('*, inspections!inner(assigned_engineer_id)', { count: 'exact', head: true })
.eq('stage', 'inspection_scheduled');
if (role === 'engineer' && engineer_id) {
  query = query.eq('inspections.assigned_engineer_id', engineer_id);
}
```

**Key Lesson:** Match your JOIN TABLE to the foreign key that's actually SET at that stage:
- Stage 3 (`inspection_scheduled`) → Join `inspections` (inspection_id is set)
- Stage 4+ (`appointment_scheduled`+) → Join `appointments` (appointment_id is set)

**Database Verification:**
```sql
-- Verify FK state at inspection_scheduled stage
SELECT
  a.id,
  a.stage,
  a.inspection_id,  -- Should be SET
  a.appointment_id  -- Should be NULL
FROM assessments a
WHERE a.stage = 'inspection_scheduled';

-- Test INNER JOIN behavior with NULL FK
SELECT COUNT(*)
FROM assessments a
INNER JOIN appointments ap ON a.appointment_id = ap.id  -- FAILS when NULL
WHERE a.stage = 'inspection_scheduled';
-- Returns: 0 (incorrect - should return count of inspections)

SELECT COUNT(*)
FROM assessments a
INNER JOIN inspections i ON a.inspection_id = i.id  -- WORKS
WHERE a.stage = 'inspection_scheduled';
-- Returns: 1+ (correct - returns actual inspection count)
```

**References:**
- [Fix Sidebar and Stage Update Bugs Task](../Tasks/active/fix_sidebar_and_stage_update_bugs.md)
- [Working with Assessment-Centric Architecture](./working_with_assessment_centric_architecture.md#design-rationale)

---

## Related Changes

When you add or modify badges:

1. **Update this SOP** if pattern changes
2. **Update Stage-to-Badge Mapping** table above
3. **Document in task** if fixing architectural mismatch
4. **Test both roles** (admin and engineer)
5. **Verify database state** with SQL queries

---

## Migration Notes

### Migrating Old Badge to New Pattern

If you find a badge using old table-centric approach:

1. **Identify current query:**
   ```typescript
   // Old way
   await appointmentService.getAppointmentCount({ status: 'scheduled' }, client);
   ```

2. **Map status to stages:**
   - `status: 'scheduled'` → `stage: ['appointment_scheduled', 'assessment_in_progress']`

3. **Choose join table:**
   - Has appointment? → `appointments` join
   - No appointment yet? → `requests` join

4. **Implement new query:**
   ```typescript
   // New way
   let query = supabase
       .from('assessments')
       .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
       .in('stage', ['appointment_scheduled', 'assessment_in_progress']);
   ```

5. **Test thoroughly** (see Testing Checklist above)

---

## Summary

**Golden Rule:** Badge counts MUST query the `assessments` table with `stage` filters.

**Key Steps:**
1. Query `assessments` table
2. Use `stage` filters (not `status`)
3. Join to appropriate table (`appointments` or `requests`)
4. Filter by engineer if role is engineer
5. Handle errors gracefully (default to 0)
6. Test with admin and engineer roles

**When in doubt:** Refer to [src/lib/components/layout/Sidebar.svelte](../../src/lib/components/layout/Sidebar.svelte) for working examples.

---

**Document Status:** ✅ Implemented and tested
**Last Verified:** 2025-01-27
**Next Review:** When adding new badges or pipeline stages
