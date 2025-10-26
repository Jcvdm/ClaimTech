# SOP: Working with Assessment-Centric Architecture

## Overview

This SOP provides step-by-step guidance for working with ClaimTech's assessment-centric architecture. The assessment is the canonical "case" record that exists from request creation through FRC completion.

**When to use this SOP:**
- Implementing new features that involve assessments
- Updating assessment workflow stages
- Querying assessments by pipeline stage
- Understanding the assessment lifecycle
- Implementing Phase 3 (stage-based list pages)

**Related Documentation:**
- [Assessment-Centric Architecture PRD](../Tasks/active/assessment_centric_architecture_refactor.md)
- [All Fixes Complete](../Tasks/active/assessment_centric_fixes_complete.md)
- [Database Schema](../System/database_schema.md)

---

## Assessment Lifecycle

### Stage-Based Pipeline

Assessments progress through 10 distinct stages:

```
1. request_submitted (default)
     ↓ (Admin reviews)
2. request_reviewed
     ↓ (Admin schedules inspection)
3. inspection_scheduled
     ↓ (Admin/Engineer creates appointment)
4. appointment_scheduled
     ↓ (Engineer clicks "Start Assessment")
5. assessment_in_progress
     ↓ (Engineer completes all tabs, estimate under review)
6. estimate_review
     ↓ (Estimate sent to client)
7. estimate_sent
     ↓ (Admin finalizes estimate)
8. estimate_finalized
     ↓ (Admin starts FRC)
9. frc_in_progress
     ↓ (Admin archives)
10. archived

(Can be cancelled at any stage → cancelled)
```

**Stage Transitions (Jan 2025):**
- Stages 1-2: Request management (admin-only)
- Stage 3: Inspection scheduling (admin-only)
- Stage 4: Appointment creation (admin or engineer)
- Stages 5-7: Active assessment work (engineer)
- Stage 8: Finalized estimate (ready for documents/FRC)
- Stage 9: FRC in progress (admin)
- Stage 10: Archived or cancelled (terminal states)

### Key Principles

1. **Assessment created with request** - No more creation at "Start Assessment"
2. **One assessment per request** - Enforced by unique constraint
3. **Stage-based workflow** - Use `stage` field for pipeline tracking
4. **Nullable foreign keys** - `appointment_id` and `inspection_id` can be null initially
5. **Idempotent operations** - All creation methods are safe to call multiple times

---

## Common Patterns

### Pattern 1: Find or Create Assessment by Request

**When:** You need to get or create an assessment for a request

```typescript
import { assessmentService } from '$lib/services/assessment.service';

// Idempotent - safe to call multiple times
const assessment = await assessmentService.findOrCreateByRequest(
  requestId,
  locals.supabase
);
```

**Why this works:**
- Checks for existing assessment first
- Creates only if not found
- Returns existing assessment if found
- Handles backward compatibility with old requests

---

### Pattern 2: Update Assessment Stage

**When:** Moving assessment through the pipeline

```typescript
import { assessmentService } from '$lib/services/assessment.service';

// Always check current stage first
if (assessment.stage === 'request_reviewed') {
  // Update to next stage
  const updated = await assessmentService.updateStage(
    assessment.id,
    'inspection_scheduled',
    locals.supabase
  );
}
```

**Important:**
- Use `updateStage()` not `updateAssessment()` for stage changes
- `updateStage()` includes audit logging
- Always pass authenticated client (`locals.supabase`)

---

### Pattern 3: Link Assessment to Appointment

**When:** Scheduling an appointment for an assessment

```typescript
import { assessmentService } from '$lib/services/assessment.service';

// CRITICAL: Link appointment BEFORE updating stage
// The check constraint requires appointment_id for later stages
if (!assessment.appointment_id) {
  assessment = await assessmentService.updateAssessment(
    assessment.id,
    { appointment_id: appointmentId },
    locals.supabase
  );
}

// THEN update stage
if (assessment.stage === 'request_reviewed') {
  assessment = await assessmentService.updateStage(
    assessment.id,
    'appointment_scheduled',
    locals.supabase
  );
}
```

**Why order matters:**
- Migration 068 has check constraint: `require_appointment_when_scheduled`
- Stages 'inspection_scheduled' and beyond REQUIRE `appointment_id IS NOT NULL`
- Updating stage before linking appointment will FAIL

---

### Pattern 4: Create Child Records Idempotently

**When:** Creating default child records (tyres, estimates, etc.)

```typescript
import { tyresService } from '$lib/services/tyres.service';
import { estimateService } from '$lib/services/estimate.service';
import { vehicleValuesService } from '$lib/services/vehicle-values.service';

// All these methods are idempotent - safe to call multiple times
await Promise.all([
  tyresService.createDefaultTyres(assessmentId, locals.supabase),
  estimateService.createDefault(assessmentId, locals.supabase),
  vehicleValuesService.createDefault(assessmentId, locals.supabase),
  damageService.createDefault(assessmentId, locals.supabase),
  preIncidentEstimateService.createDefault(assessmentId, locals.supabase)
]);
```

**Why this is safe:**
- Migration 069 added unique constraints
- Services use check-then-create or upsert patterns
- Returns existing records if already created
- No duplicate errors

---

### Pattern 5: Query Assessments by Stage

**When:** Implementing list pages (Phase 3)

```typescript
import { supabase } from '$lib/supabase';

// Query assessments in specific stage
const { data: assessments, error } = await locals.supabase
  .from('assessments')
  .select(`
    *,
    request:requests!inner(*),
    appointment:appointments(*)
  `)
  .eq('stage', 'assessment_in_progress')
  .order('updated_at', { ascending: false });
```

**Stage-based queries (Phase 3 - Jan 2025):**
```typescript
// Requests page
.in('stage', ['request_submitted', 'request_reviewed'])

// Inspections page
.eq('stage', 'inspection_scheduled')

// Appointments page
.in('stage', ['appointment_scheduled', 'assessment_in_progress'])

// Open Assessments page
.in('stage', ['assessment_in_progress', 'estimate_review', 'estimate_sent'])

// Finalized Assessments page
.eq('stage', 'estimate_finalized')

// FRC page
.eq('stage', 'frc_in_progress')

// Archive page
.in('stage', ['archived', 'cancelled'])
```

---

## Implementing New Features

### Checklist for Assessment-Related Features

- [ ] **1. Read the PRD** - Understand assessment lifecycle
- [ ] **2. Identify stage transitions** - Which stages are affected?
- [ ] **3. Check constraints** - Does feature need appointment_id?
- [ ] **4. Use authenticated client** - Always pass `locals.supabase`
- [ ] **5. Make it idempotent** - Safe to call multiple times?
- [ ] **6. Log stage transitions** - Use `updateStage()` for audit trail
- [ ] **7. Test error cases** - What if assessment not found?
- [ ] **8. Test backward compat** - Works with old requests?

### Example: Adding a New Stage

**Scenario:** Add "quality_review" stage between "estimate_sent" and "estimate_finalized"

**Step 1: Update Enum Type**
```sql
-- Migration 075_add_quality_review_stage.sql
ALTER TYPE assessment_stage ADD VALUE 'quality_review' BEFORE 'estimate_finalized';

COMMENT ON TYPE assessment_stage IS 'Updated: Added quality_review stage for QA process';
```

**Step 2: Update TypeScript Types**
```typescript
// src/lib/types/assessment.ts
export type AssessmentStage =
  | 'request_submitted'
  | 'request_reviewed'
  | 'inspection_scheduled'
  | 'appointment_scheduled'
  | 'assessment_in_progress'
  | 'estimate_review'
  | 'estimate_sent'
  | 'quality_review' // NEW - Added after estimate_sent
  | 'estimate_finalized'
  | 'frc_in_progress'
  | 'archived'
  | 'cancelled';
```

**Step 3: Update Stage Transitions**
```typescript
// In assessment completion handler
if (allTabsCompleted) {
  await assessmentService.updateStage(
    assessmentId,
    'quality_review', // Changed from 'estimate_finalized'
    locals.supabase
  );
}
```

**Step 4: Add Quality Review Page**
```typescript
// src/routes/(app)/work/quality-review/+page.server.ts
const { data: assessments } = await locals.supabase
  .from('assessments')
  .select('*')
  .eq('stage', 'quality_review')
  .order('updated_at', { ascending: false });
```

**Step 5: Update Sidebar Badge**
```typescript
// Get count for quality review
const { count } = await locals.supabase
  .from('assessments')
  .select('*', { count: 'exact', head: true })
  .eq('stage', 'quality_review');
```

---

## Phase 3 Implementation Guide

### Goal
Replace status-based queries with stage-based queries across all list pages.

### Pages to Update

1. **Requests Page** (`/requests`)
   ```typescript
   // OLD (status-based)
   .eq('status', 'draft')

   // NEW (stage-based - Phase 3, Jan 2025)
   .in('stage', ['request_submitted', 'request_reviewed'])
   ```

2. **Inspections Page** (`/work/inspections`)
   ```typescript
   // OLD (table-centric - queried inspections table)
   .from('inspections')
   .eq('status', 'pending')

   // NEW (assessment-centric - Phase 3, Jan 2025)
   .from('assessments')
   .eq('stage', 'inspection_scheduled')
   ```

3. **Appointments Page** (`/work/appointments`)
   ```typescript
   // OLD (table-centric - queried appointments table)
   .from('appointments')
   .eq('status', 'scheduled')

   // NEW (assessment-centric - Phase 3, Jan 2025)
   .from('assessments')
   .in('stage', ['appointment_scheduled', 'assessment_in_progress'])
   ```

4. **Open Assessments Page** (`/work/assessments`)
   ```typescript
   // OLD (status-based)
   .eq('status', 'in_progress')

   // NEW (stage-based - Phase 3, Jan 2025)
   .in('stage', ['assessment_in_progress', 'estimate_review', 'estimate_sent'])
   ```

5. **Finalized Assessments Page** (`/work/finalized`)
   ```typescript
   // OLD (status-based)
   .eq('status', 'submitted')

   // NEW (stage-based - Phase 3, Jan 2025)
   .eq('stage', 'estimate_finalized')
   ```

6. **FRC Page** (`/work/frc`)
   ```typescript
   // OLD (status-based, multiple stages)
   .in('status', ['frc_in_progress', 'frc_completed'])

   // NEW (stage-based - Phase 3, Jan 2025)
   .eq('stage', 'frc_in_progress')
   ```

7. **Archive Page** (`/archive`)
   ```typescript
   // OLD
   .in('status', ['archived', 'cancelled'])

   // NEW
   .in('stage', ['archived', 'cancelled'])
   ```

### Sidebar Badge Updates

```typescript
// src/routes/(app)/+layout.server.ts

// OLD
const openCount = await assessmentService.getInProgressCount(locals.supabase);

// NEW
const { count: openCount } = await locals.supabase
  .from('assessments')
  .select('*', { count: 'exact', head: true })
  .eq('stage', 'assessment_in_progress');
```

---

## Database Constraints Reference

### Migration 068: Assessment Stage

**Unique Constraints:**
- `uq_assessments_request` - One assessment per request

**Check Constraints:**
- `require_appointment_when_scheduled` - appointment_id required for stages 4-9:
  - appointment_scheduled (stage 4)
  - assessment_in_progress (stage 5)
  - estimate_review (stage 6)
  - estimate_sent (stage 7)
  - estimate_finalized (stage 8)
  - frc_in_progress (stage 9)

**Indexes:**
- `idx_assessments_stage` - Fast stage queries
- `idx_assessments_request_id` - Fast request lookups

### Migration 069: Child Record Constraints

**Unique Constraints:**
- `uq_assessment_tyres_position` - (assessment_id, position)
- `uq_assessment_vehicle_values` - (assessment_id)
- `uq_pre_incident_estimates` - (assessment_id)
- `uq_assessment_estimates` - (assessment_id) - pre-existing
- `uq_assessment_damage` - (assessment_id) - pre-existing

---

## Troubleshooting

### Error: "violates check constraint 'require_appointment_when_scheduled'"

**Cause:** Trying to update stage to 'inspection_scheduled' or later without appointment_id

**Solution:**
```typescript
// Link appointment FIRST
assessment = await assessmentService.updateAssessment(
  assessment.id,
  { appointment_id: appointmentId },
  locals.supabase
);

// THEN update stage
assessment = await assessmentService.updateStage(
  assessment.id,
  'inspection_scheduled',
  locals.supabase
);
```

---

### Error: "duplicate key value violates unique constraint 'uq_assessments_request'"

**Cause:** Trying to create second assessment for same request

**Solution:** Use `findOrCreateByRequest()` instead of `createAssessment()`
```typescript
// DON'T DO THIS
const assessment = await assessmentService.createAssessment({...});

// DO THIS
const assessment = await assessmentService.findOrCreateByRequest(
  requestId,
  locals.supabase
);
```

---

### Error: "duplicate key value violates unique constraint 'uq_assessment_tyres_position'"

**Cause:** Trying to create duplicate tyre for same position

**Solution:** Services are already idempotent after migration 069, but if manually inserting:
```typescript
// Use upsert instead of insert
await locals.supabase
  .from('assessment_tyres')
  .upsert(
    { assessment_id, position, position_label },
    { onConflict: 'assessment_id,position' }
  );
```

---

### Error: "column assessments.stage does not exist"

**Cause:** Migration 068 not applied

**Solution:**
```bash
# Apply migration
supabase db push

# Or using Supabase MCP
# Use mcp__supabase__apply_migration tool
```

---

## Testing Checklist

When working with assessment-centric features:

**Unit Tests:**
- [ ] Test findOrCreateByRequest with new request
- [ ] Test findOrCreateByRequest with existing request
- [ ] Test updateStage with valid transitions
- [ ] Test updateStage logs audit trail
- [ ] Test child record creation is idempotent

**Integration Tests:**
- [ ] Test full request → assessment → appointment flow
- [ ] Test stage transitions enforce constraints
- [ ] Test appointment_id requirement for later stages
- [ ] Test RLS policies with admin and engineer users

**Manual Tests:**
- [ ] Create request → verify assessment created
- [ ] Start Assessment → verify stage updated
- [ ] Refresh page multiple times → verify idempotent
- [ ] Double-click "Start Assessment" → verify no errors
- [ ] Test as admin and engineer → verify RLS

---

## Code Review Checklist

When reviewing assessment-related code:

**Stage Handling:**
- [ ] Uses `stage` field, not just `status`
- [ ] Uses `updateStage()` for stage transitions
- [ ] Logs stage changes in audit trail

**Constraint Compliance:**
- [ ] Links appointment_id before updating to later stages
- [ ] Uses authenticated client (`locals.supabase`)
- [ ] Handles constraint violations gracefully

**Idempotency:**
- [ ] Child record creation is idempotent
- [ ] Uses findOrCreateByRequest() not createAssessment()
- [ ] Safe to call multiple times

**Error Handling:**
- [ ] Handles "assessment not found" gracefully
- [ ] Handles constraint violations
- [ ] Provides clear error messages

**Testing:**
- [ ] Tests cover stage transitions
- [ ] Tests verify idempotency
- [ ] Tests cover error cases

---

## Performance Considerations

**Query Optimization:**
- Use `idx_assessments_stage` index for stage queries
- Use `idx_assessments_request_id` for request lookups
- Combine with `.select()` to fetch related data in one query

**Example Optimized Query:**
```typescript
const { data } = await locals.supabase
  .from('assessments')
  .select(`
    *,
    request:requests!inner(*, client:clients(*)),
    appointment:appointments(*, engineer:engineers(*))
  `)
  .eq('stage', 'assessment_in_progress')
  .order('updated_at', { ascending: false });
```

**Avoid:**
```typescript
// ❌ N+1 queries
const assessments = await getAssessments();
for (const assessment of assessments) {
  const request = await getRequest(assessment.request_id);
  const appointment = await getAppointment(assessment.appointment_id);
}

// ✅ Single query with joins
const assessments = await getAssessmentsWithRelations();
```

---

## Migration Strategy

**For Existing Features:**
1. Identify status-based queries
2. Map to equivalent stage-based queries
3. Update incrementally (one page at a time)
4. Keep backward compatibility temporarily
5. Monitor for issues
6. Remove old status-based code

**For New Features:**
- Always use stage-based queries
- Don't use status field except for backward compatibility
- Follow patterns in this SOP

---

## Related SOPs

- [Working with Services](./working_with_services.md)
- [Adding Database Migrations](./adding_migration.md)
- [Handling Race Conditions](./handling_race_conditions_in_number_generation.md)

---

**Last Updated:** January 26, 2025
**Author:** Claude Code (Sonnet 4.5)
**Status:** Active - Phase 3 implementation pending
