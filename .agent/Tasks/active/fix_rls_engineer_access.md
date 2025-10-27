# Fix RLS Engineer Access - Implementation Plan

**Status:** ✅ COMPLETED
**Priority:** CRITICAL - Application Broken
**Created:** October 25, 2025
**Completed:** October 25, 2025
**Issue:** Engineers cannot work on assessments due to overly restrictive RLS policies
**Resolution:** Applied migration 063 with corrected multi-policy RLS pattern

---

## Problem Statement

The RLS security hardening (migrations 058-062) implemented admin-only modification policies for 8 assessment-related tables. This is **too restrictive** and breaks core application functionality.

**Current Error:**
```
Error: new row violates row-level security policy for table "assessment_vehicle_values"
```

**Impact:**
- Engineers cannot open assessments
- Engineers cannot create assessment data (estimates, valuations, FRC, etc.)
- Application is effectively broken for engineers
- Only admins can work on assessments (not intended behavior)

---

## Root Cause Analysis

**What we did wrong:**
- Applied "admin-only modification" pattern to ALL 10 tables
- Did not distinguish between:
  - **System configuration tables** (repairers, company_settings) → Admin-only ✅ Correct
  - **Assessment data tables** (estimates, valuations, FRC, etc.) → Needs engineer access ❌ Wrong

**Why it happened:**
- Assumed all newly secured tables were "admin-only modification"
- Did not review existing RLS patterns for assessment-related tables
- Migration 046 shows `assessments` table has multi-policy pattern (admin + engineer)

**Correct Pattern (from migration 046):**
```sql
-- Admins can insert assessments
CREATE POLICY "Admins can insert assessments"
ON assessments FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Engineers can insert assessments for their appointments
CREATE POLICY "Engineers can insert their assessments"
ON assessments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);
```

---

## Affected Tables

### Tables Needing Engineer Access (8)

All assessment-related tables where engineers create/modify data:

1. **assessment_estimates** - Repair cost estimates
   - Engineers create and update estimates during assessments
   - Links to assessment via `assessment_id`

2. **assessment_vehicle_values** ⚠️ **Currently breaking**
   - Vehicle valuations and write-off calculations
   - Engineers create during assessment process
   - Links to assessment via `assessment_id`

3. **pre_incident_estimates** - Pre-incident repair estimates
   - Engineers create pre-incident data
   - Links to assessment via `assessment_id`

4. **pre_incident_estimate_photos** - Photos for pre-incident estimates
   - Engineers upload photos
   - Links to pre_incident_estimates via `pre_incident_estimate_id`
   - Indirectly links to assessment

5. **assessment_additionals** - Additional repair items
   - Engineers add additional items during assessment
   - Links to assessment via `assessment_id`

6. **assessment_additionals_photos** - Photos for additional items
   - Engineers upload photos
   - Links to assessment_additionals via `additional_id`
   - Indirectly links to assessment

7. **assessment_frc** - Final Repair Cost breakdown
   - Engineers create FRC records
   - Links to assessment via `assessment_id`

8. **assessment_frc_documents** - FRC supporting documents
   - Engineers upload FRC documents
   - Links to assessment_frc via `frc_id`
   - Indirectly links to assessment

### Tables Correctly Restricted (2)

System configuration - should remain admin-only:

9. **repairers** ✅ Keep admin-only
   - System configuration
   - Managed by admins in settings
   - Not part of assessment workflow

10. **company_settings** ✅ Keep admin-only
   - System configuration
   - Company branding and defaults
   - Not part of assessment workflow

---

## Solution Design

### Access Control Requirements

**Admins:**
- Full CRUD access to all tables
- Can manage all assessments
- Can manage system configuration

**Engineers:**
- Create/update assessment data for **their assigned appointments**
- Read-only access to system configuration (repairers, company_settings)
- Cannot modify assessments for other engineers

**Authenticated (non-engineer/non-admin):**
- Read-only access to everything
- Fallback for any authenticated user

### RLS Policy Pattern

**For each assessment-related table:**

```sql
-- SELECT: All authenticated users (unchanged)
CREATE POLICY "Authenticated users can view [table]"
ON [table] FOR SELECT TO authenticated
USING (true);

-- INSERT: Admins + Engineers for their assessments
CREATE POLICY "Admins can insert [table]"
ON [table] FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Engineers can insert [table] for their assessments"
ON [table] FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = [table].assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- UPDATE: Admins + Engineers for their assessments
CREATE POLICY "Admins can update [table]"
ON [table] FOR UPDATE TO authenticated
USING (is_admin());

CREATE POLICY "Engineers can update [table] for their assessments"
ON [table] FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessments
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE assessments.id = [table].assessment_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- DELETE: Admins only (unchanged)
CREATE POLICY "Only admins can delete [table]"
ON [table] FOR DELETE TO authenticated
USING (is_admin());
```

### Special Cases

**Photo tables (indirect assessment link):**
- `pre_incident_estimate_photos` → Links via `pre_incident_estimate_id`
- `assessment_additionals_photos` → Links via `additional_id`
- `assessment_frc_documents` → Links via `frc_id`

**Policy adjustment:**
```sql
-- For pre_incident_estimate_photos:
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pre_incident_estimates
    JOIN assessments ON pre_incident_estimates.assessment_id = assessments.id
    JOIN appointments ON assessments.appointment_id = appointments.id
    WHERE pre_incident_estimates.id = pre_incident_estimate_photos.pre_incident_estimate_id
    AND appointments.engineer_id = get_user_engineer_id()
  )
);

-- Similar pattern for other photo tables
```

---

## Implementation Plan

### Migration: `063_fix_rls_engineer_access.sql`

**Step 1: Drop overly restrictive policies**
```sql
-- For each of 8 assessment-related tables:
DROP POLICY "Only admins can insert [table]" ON [table];
DROP POLICY "Only admins can update [table]" ON [table];
```

**Step 2: Create admin + engineer policies**
```sql
-- For each of 8 assessment-related tables:
-- Create separate policies for admins and engineers
-- Use multi-policy pattern (PostgreSQL ORs policies together)
```

**Step 3: Keep delete policies (admin-only)**
```sql
-- DELETE policies remain unchanged (admins only)
```

**Step 4: Add documentation comments**
```sql
COMMENT ON TABLE [table] IS 'Description - RLS: Admins (full) + Engineers (assigned work)';
```

---

## Testing Plan

### Test Scenarios

**Test 1: Engineer creates assessment (should succeed)**
1. Log in as engineer
2. Navigate to assigned appointment
3. Open assessment page
4. Verify assessment data loads without errors
5. Verify vehicle values created successfully

**Test 2: Engineer modifies assessment data (should succeed)**
1. Update estimate line items
2. Modify vehicle valuations
3. Add additional items
4. Upload photos
5. Verify all changes saved

**Test 3: Engineer accesses other engineer's assessment (should fail)**
1. Attempt to load assessment for different engineer
2. Should see 404 or empty data (RLS blocks access)

**Test 4: Admin access (should succeed)**
1. Log in as admin
2. Access any assessment
3. Verify full CRUD operations work

**Test 5: Authenticated non-engineer (should be read-only)**
1. Log in as regular user
2. Can view assessment data
3. Cannot create/modify data (fails with RLS error)

### Validation

**Before migration:**
- ❌ Engineers cannot create assessments
- ❌ Error: RLS policy violation
- ❌ Application broken for engineers

**After migration:**
- ✅ Engineers can create/modify their assessments
- ✅ No RLS policy violations
- ✅ Application works normally
- ✅ Security maintained (engineers only access their work)

**Verification commands:**
```sql
-- Check all policies are in place
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'assessment_estimates',
  'assessment_vehicle_values',
  'pre_incident_estimates',
  'pre_incident_estimate_photos',
  'assessment_additionals',
  'assessment_additionals_photos',
  'assessment_frc',
  'assessment_frc_documents'
)
ORDER BY tablename, policyname;

-- Should show 5 policies per table (1 SELECT, 2 INSERT, 2 UPDATE, 1 DELETE)
```

---

## Rollback Plan

If issues occur, rollback is simple:

```sql
-- Revert to admin-only policies
DROP POLICY "Engineers can insert [table] for their assessments" ON [table];
DROP POLICY "Engineers can update [table] for their assessments" ON [table];

CREATE POLICY "Only admins can insert [table]"
ON [table] FOR INSERT TO authenticated
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update [table]"
ON [table] FOR UPDATE TO authenticated
USING (is_admin());
```

**Note:** Rollback would restore broken state. Fix forward instead.

---

## Success Criteria

- [x] Migration created and applied successfully ✅
- [x] All 8 assessment-related tables have engineer access policies ✅
- [x] Column names corrected (estimate_id, additionals_id, frc_id) ✅
- [ ] Engineers can create and modify assessment data for their appointments (NEEDS USER TESTING)
- [ ] Engineers cannot access other engineers' assessments (NEEDS USER TESTING)
- [x] Admins retain full access ✅
- [ ] No RLS policy violations in logs (NEEDS USER TESTING)
- [x] Supabase security advisors show 0 RLS errors ✅
- [ ] Application loads assessments without errors (NEEDS USER TESTING)

---

## Timeline

**Total Time:** 20-30 minutes

1. **Create migration** (10 min)
   - Write SQL for 8 tables
   - Handle direct and indirect assessment links
   - Add comments

2. **Apply migration** (2 min)
   - Apply to live database
   - Verify no SQL errors

3. **Test** (10 min)
   - Test as engineer (should work)
   - Test as admin (should work)
   - Test as other engineer (should fail)
   - Verify logs clean

4. **Verify** (5 min)
   - Check Supabase advisors
   - Verify policy counts
   - Update documentation

---

## Related Files

**Code:**
- `src/routes/(app)/work/assessments/[appointment_id]/+page.server.ts:102` - Where error occurs
- `src/lib/services/vehicle-values.service.ts:51` - INSERT that fails
- All assessment-related services that create/update data

**Migrations:**
- `046_secure_rls_policies.sql` - Original RLS (has correct pattern for assessments)
- `059_rls_estimates_valuations_frc.sql` - Created overly restrictive policies
- `060_rls_pre_incident_additionals.sql` - Created overly restrictive policies
- `061_rls_company_settings_frc_documents.sql` - Created overly restrictive policies
- `063_fix_rls_engineer_access.sql` - **NEW** - This fix

**Documentation:**
- `.agent/System/security_recommendations.md` - Will need update
- `.agent/Tasks/active/rls_security_hardening.md` - Will need update

---

## Lessons Learned

**What went wrong:**
1. Applied blanket "admin-only" pattern without reviewing use cases
2. Did not test with engineer role before committing
3. Did not review existing RLS patterns for similar tables

**What to do differently:**
1. Always review existing RLS policies for similar tables
2. Test with all user roles before applying RLS
3. Distinguish between system config tables and workflow tables
4. Consider who needs to modify data in normal application flow

**Best practices going forward:**
1. System config tables → Admin-only modification
2. Workflow data tables → Multi-policy (admin + role-based)
3. Always test RLS with actual user roles
4. Document access patterns in comments

---

**Implementation Start:** October 25, 2025
**Target Completion:** October 25, 2025
**Owner:** ClaimTech Development Team

---

## Implementation Results

### ✅ Migration Applied Successfully

**Migration:** `063_fix_rls_engineer_access.sql`
**Applied:** October 25, 2025
**Status:** Success

### Issues Fixed During Implementation

**Issue 1: Incorrect Column Names**
- **Problem:** Migration initially used wrong column names
  - `pre_incident_estimate_photos.pre_incident_estimate_id` ❌
  - `assessment_additionals_photos.additional_id` ❌
- **Resolution:** Corrected to actual schema column names
  - `pre_incident_estimate_photos.estimate_id` ✅
  - `assessment_additionals_photos.additionals_id` ✅
- **Method:** Examined table definitions in migrations 022 and 036

### Policies Created

**8 Tables Updated:**
1. `assessment_estimates` - 2 INSERT + 2 UPDATE policies (admin + engineer)
2. `assessment_vehicle_values` - 2 INSERT + 2 UPDATE policies (admin + engineer)
3. `pre_incident_estimates` - 2 INSERT + 2 UPDATE policies (admin + engineer)
4. `pre_incident_estimate_photos` - 2 INSERT + 2 UPDATE policies (admin + engineer)
5. `assessment_additionals` - 2 INSERT + 2 UPDATE policies (admin + engineer)
6. `assessment_additionals_photos` - 2 INSERT + 2 UPDATE policies (admin + engineer)
7. `assessment_frc` - 2 INSERT + 2 UPDATE policies (admin + engineer)
8. `assessment_frc_documents` - 2 INSERT + 2 UPDATE policies (admin + engineer)

**Total Policies:** 32 new policies (8 tables × 4 policies each)

### Security Verification

**Supabase Security Advisors - After Migration:**
- ✅ 0 RLS disabled errors
- ✅ 0 Function search_path warnings
- ⚠️ 1 Leaked password protection warning (manual config, expected)

### Testing Required

**User must test:**
1. Open assessment as engineer → Should work without RLS errors
2. Create vehicle values → Should succeed
3. Modify assessment data → Should succeed for assigned work only
4. Try to access other engineer's assessment → Should fail (security test)
5. Verify logs show no RLS violations

**Testing Scenarios:**
- See "Testing Plan" section above for detailed test cases

### Lessons Learned

**Column Naming:**
- Always verify column names against actual schema before writing policies
- Use grep/search to find table definitions in migrations
- Don't assume column name patterns (e.g., `table_name_id` pattern not always followed)

**Migration Testing:**
- Test migrations locally first if possible
- Check for syntax errors before applying
- Have rollback plan ready

**RLS Policy Patterns:**
- System config tables → Admin-only modification
- Workflow data tables → Multi-policy (admin + role-based)
- Photo/document tables → May have indirect foreign key relationships
- Always test with actual user roles
