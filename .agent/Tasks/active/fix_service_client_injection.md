# Fix Service Client Injection - RLS Policy Violations

**Status:** 🔄 IN PROGRESS
**Priority:** 🔴 CRITICAL
**Created:** January 25, 2025
**Estimated Time:** 50 minutes

---

## 🎯 **Objective**

Fix RLS policy violations (error 42501) when creating assessment-related records from server-side routes by ensuring all services accept and use the authenticated `ServiceClient` (locals.supabase) instead of the global unauthenticated client.

---

## 🔍 **Problem Summary**

### **Error:**
```
Error creating vehicle values: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "assessment_vehicle_values"'
}
```

### **Root Cause:**

Multiple services use the global `supabase` client (unauthenticated browser context) instead of accepting `locals.supabase` (authenticated server context). This causes RLS policies to reject INSERT/UPDATE operations because the database sees an anonymous user.

**Example from vehicle-values.service.ts:**
```typescript
// ❌ PROBLEM: No client parameter, always uses global supabase
async createDefault(assessmentId: string): Promise<VehicleValues> {
  return this.create({ assessment_id: assessmentId, extras: [] });
}

async create(input: CreateVehicleValuesInput): Promise<VehicleValues> {
  const { data, error } = await supabase  // ❌ Global client, not authenticated
    .from('assessment_vehicle_values')
    .insert({...})
```

**Call site tries to pass client but service ignores it:**
```typescript
// In +page.server.ts
await vehicleValuesService.createDefault(assessment.id, locals.supabase);
// Service signature: createDefault(assessmentId: string) - client param ignored!
```

---

## 📋 **Implementation Plan**

### **Phase 1: Fix VehicleValuesService** 🔴 **CRITICAL** (15 min)

**File:** `src/lib/services/vehicle-values.service.ts`

**Changes:**
1. Add `import type { ServiceClient } from '$lib/types/service';`
2. Add `client?: ServiceClient` parameter to all methods
3. Use `const db = client ?? supabase;` pattern for all queries

**Methods to Update:**
- `getByAssessment(assessmentId, client?)`
- `createDefault(assessmentId, client?)`
- `create(input, client?)`
- `update(id, input, writeOffPercentages, client?)`
- `addExtra(id, extra, writeOffPercentages, client?)`
- `updateExtra(id, extraId, updatedExtra, writeOffPercentages, client?)`
- `deleteExtra(id, extraId, writeOffPercentages, client?)`
- `getById(id, client?)` (private method)
- `recalculate(id, writeOffPercentages, client?)`

---

### **Phase 2: Update Call Sites** (5 min)

**File:** `src/routes/(app)/work/assessments/[appointment_id]/+page.server.ts`

**Changes:**
- Line 55: Pass `locals.supabase` to first-time creation
- Line 112: Already passes client (will work after service fix)
- Line 126: Already passes client (will work after service fix)

---

### **Phase 3: Fix Other Critical Services** (30 min)

Apply same pattern to services called during assessment creation:

1. **TyresService** (`src/lib/services/tyres.service.ts`)
   - Methods: `create()`, `update()`, `listByAssessment()`, `createDefaultTyres()`
   - Called at line 49 in +page.server.ts

2. **DamageService** (`src/lib/services/damage.service.ts`)
   - Methods: `create()`, `update()`, `getByAssessment()`, `createDefault()`
   - Called at line 52 in +page.server.ts

3. **PreIncidentEstimateService** (`src/lib/services/pre-incident-estimate.service.ts`)
   - Methods: `getByAssessment()`, `createDefault()`, `create()`, `update()`
   - Called at line 58 in +page.server.ts

4. **EstimateService** (`src/lib/services/estimate.service.ts`)
   - Methods: `getByAssessment()`, `createDefault()`, `create()`, `update()`
   - Called at line 61 in +page.server.ts

5. **VehicleIdentificationService** (`src/lib/services/vehicle-identification.service.ts`)
   - Methods: `create()`, `update()`, `getByAssessment()`
   - Used in assessment tabs

6. **AccessoriesService** (`src/lib/services/accessories.service.ts`)
   - Methods: `create()`, `update()`, `delete()`, `listByAssessment()`
   - Used in assessment tabs

7. **Exterior360Service** (`src/lib/services/exterior-360.service.ts`)
   - Methods: `create()`, `update()`, `getByAssessment()`
   - Used in assessment tabs

8. **InteriorMechanicalService** (`src/lib/services/interior-mechanical.service.ts`)
   - Methods: `create()`, `update()`, `getByAssessment()`
   - Used in assessment tabs

---

## 🔧 **Implementation Pattern**

### **Standard Pattern for All Services:**

```typescript
import type { ServiceClient } from '$lib/types/service';

export class SomeService {
  async getByAssessment(assessmentId: string, client?: ServiceClient): Promise<Entity | null> {
    const db = client ?? supabase;
    const { data, error } = await db
      .from('table')
      .select('*')
      .eq('assessment_id', assessmentId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching entity:', error);
      return null;
    }
    
    return data;
  }

  async createDefault(assessmentId: string, client?: ServiceClient): Promise<Entity> {
    return this.create({ assessment_id: assessmentId, ...defaults }, client);
  }

  async create(input: CreateInput, client?: ServiceClient): Promise<Entity> {
    const db = client ?? supabase;
    const { data, error } = await db
      .from('table')
      .insert(input)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating entity:', error);
      throw new Error(`Failed to create entity: ${error.message}`);
    }
    
    // Audit logging...
    return data;
  }

  async update(id: string, input: UpdateInput, client?: ServiceClient): Promise<Entity> {
    const db = client ?? supabase;
    const { data, error } = await db
      .from('table')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating entity:', error);
      throw new Error(`Failed to update entity: ${error.message}`);
    }
    
    return data;
  }
}
```

### **Call Site Pattern:**

```typescript
// In +page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  // Always pass locals.supabase for server-side operations
  const entity = await someService.getByAssessment(assessmentId, locals.supabase);
  await someService.createDefault(assessmentId, locals.supabase);
  await someService.update(id, input, locals.supabase);
};
```

---

## ✅ **Verification Checklist**

### **Phase 1: VehicleValuesService**
- [ ] Import ServiceClient type added
- [ ] All methods accept optional client parameter
- [ ] All queries use `const db = client ?? supabase`
- [ ] Call sites in +page.server.ts pass locals.supabase
- [ ] Test: Admin creates assessment - no 42501 error
- [ ] Test: Engineer creates assessment - no 42501 error

### **Phase 2: Other Services**
- [ ] TyresService updated and tested
- [ ] DamageService updated and tested
- [ ] PreIncidentEstimateService updated and tested
- [ ] EstimateService updated and tested
- [ ] VehicleIdentificationService updated and tested
- [ ] AccessoriesService updated and tested
- [ ] Exterior360Service updated and tested
- [ ] InteriorMechanicalService updated and tested

### **Phase 3: Integration Testing**
- [ ] Create new assessment - all defaults created successfully
- [ ] Refresh assessment page - no errors
- [ ] Update vehicle values - no errors
- [ ] Update tyres - no errors
- [ ] Update damage record - no errors
- [ ] Update estimates - no errors
- [ ] Console shows no RLS violations

---

## 📊 **Expected Results**

**Before:**
```
Error creating vehicle values: {
  code: '42501',
  message: 'new row violates row-level security policy for table "assessment_vehicle_values"'
}
Error loading assessment: Error: Failed to create vehicle values...
```

**After:**
- ✅ Vehicle values created successfully
- ✅ All default records created (tyres, damage, estimates)
- ✅ Assessment loads without errors
- ✅ No RLS violations in console
- ✅ Both admin and engineer users can create assessments

---

## 🎓 **Technical Details**

### **Why This Happens**

1. **Global supabase client** = Browser client with no auth context
2. **locals.supabase** = Server client with authenticated user session
3. **RLS policies** check the authenticated user's role/permissions
4. **Without auth context**, RLS sees anonymous user and rejects operations

### **Why RLS Policies Are Correct**

The policies in migration 067 are correct:
- Admins can insert/update (via `is_admin()`)
- Engineers can insert/update their own assessments (via `get_user_engineer_id()`)

The issue is NOT the policies - it's that services don't use the authenticated client.

---

## 📚 **Related Documentation**

- **Pattern Reference:** `.agent/SOP/working_with_services.md` - ServiceClient injection pattern
- **Similar Fix:** `.agent/Tasks/active/fix_vehicle_values_rls_and_company_settings.md` - Company settings service fix
- **RLS Policies:** `supabase/migrations/067_fix_vehicle_values_insert_policy.sql` - Correct policies
- **Type Definition:** `src/lib/types/service.ts` - ServiceClient type

---

## 🚀 **Implementation Progress**

- [x] Phase 1: VehicleValuesService (CRITICAL) ✅
- [x] Phase 2: Update call sites ✅
- [x] Phase 3: TyresService ✅
- [x] Phase 3: DamageService ✅
- [x] Phase 3: PreIncidentEstimateService ✅
- [x] Phase 3: EstimateService ✅
- [ ] Phase 3: VehicleIdentificationService
- [ ] Phase 3: AccessoriesService
- [ ] Phase 3: Exterior360Service
- [ ] Phase 3: InteriorMechanicalService
- [ ] Testing and verification

## 📝 **Implementation Notes**

### Completed (January 25, 2025)

**Phase 1 & 2: Critical Services Fixed**
- ✅ VehicleValuesService - All methods now accept `client?: ServiceClient`
- ✅ TyresService - All methods updated including `createDefaultTyres()`
- ✅ DamageService - All methods updated including `createDefault()`
- ✅ PreIncidentEstimateService - `getByAssessment()`, `createDefault()`, `create()` updated
- ✅ EstimateService - `getByAssessment()`, `createDefault()`, `create()` updated
- ✅ Call sites in `+page.server.ts` updated to pass `locals.supabase`

**Files Modified:**
1. `src/lib/services/vehicle-values.service.ts` - Added ServiceClient to all 9 methods
2. `src/lib/services/tyres.service.ts` - Added ServiceClient to all 6 methods
3. `src/lib/services/damage.service.ts` - Added ServiceClient to all 6 methods
4. `src/lib/services/pre-incident-estimate.service.ts` - Added ServiceClient to 3 critical methods
5. `src/lib/services/estimate.service.ts` - Added ServiceClient to 3 critical methods
6. `src/routes/(app)/work/assessments/[appointment_id]/+page.server.ts` - Updated 5 call sites

**Pattern Applied:**
```typescript
import type { ServiceClient } from '$lib/types/service';

async method(params, client?: ServiceClient): Promise<Type> {
  const db = client ?? supabase;
  const { data, error } = await db.from('table')...
}
```

**Ready for Testing:**
The critical path for assessment creation is now fixed. When a user clicks "Start Assessment":
1. Assessment created with authenticated client ✅
2. Tyres created with authenticated client ✅
3. Damage record created with authenticated client ✅
4. Vehicle values created with authenticated client ✅
5. Pre-incident estimate created with authenticated client ✅
6. Estimate created with authenticated client ✅

All RLS policies should now properly authenticate the user and allow the operations.

