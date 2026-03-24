# New Quote Flow for Autobody/Mechanical Modes

**Created**: 2026-01-17
**Status**: Completed
**Complexity**: Moderate

## Overview

When app mode is Autobody or Mechanical, sidebar shows "New Quote" instead of "New Request". Clicking opens a simplified form that creates a job and redirects to estimate tab.

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `src/lib/components/layout/Sidebar.svelte` | Modify - conditional nav |
| `src/routes/(app)/quotes/new/+page.svelte` | Create - form page |
| `src/routes/(app)/quotes/new/+page.server.ts` | Create - server load |
| `src/lib/services/request.service.ts` | Modify - add createQuoteJob |

---

## Step 1: Update Sidebar.svelte

Import `appModeStore` and make the "New Request" nav item conditional:

```svelte
import { appModeStore } from '$lib/stores/app-mode.svelte';

// In navigation items, the Requests group item for "New Requests" should become:
{
  label: appModeStore.mode === 'insurance' ? 'New Requests' : 'New Quote',
  href: appModeStore.mode === 'insurance' ? '/requests' : '/quotes/new',
  ...
}
```

## Step 2: Create +page.server.ts

Copy pattern from `/requests/new/+page.server.ts` - just load clients list.

## Step 3: Create +page.svelte

Reuse existing components:
- `VehicleInfoSection` from `$lib/components/forms/VehicleInfoSection.svelte`
- `OwnerInfoSection` from `$lib/components/forms/OwnerInfoSection.svelte` (hide third party)
- `FormField` for client type radio
- `FormActions` for buttons
- `Card` for sections
- `PageHeader` for title

Form state:
```typescript
let clientType = $state<'private' | 'insurance'>('private');
let claimNumber = $state('');
// Vehicle fields from VehicleInfoSection (bindable)
// Owner fields from OwnerInfoSection (bindable)
```

## Step 4: Add createQuoteJob to request.service.ts

```typescript
async createQuoteJob(input: {
  job_type: 'autobody' | 'mechanical';
  client_type: 'private' | 'insurance';
  claim_number?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  // ... other vehicle/owner fields
}): Promise<{ assessment: Assessment }> {
  // 1. Generate request number (use existing generateUniqueRequestNumber)
  // 2. Insert minimal request record
  // 3. Create assessment with notes containing job_type/client_type as JSON
  // 4. Create default estimate (use assessmentService.findOrCreateByRequest pattern)
  // 5. Return assessment for redirect
}
```

## Step 5: Form Submit Handler

```typescript
async function handleSubmit() {
  // Validate required fields
  // Get current mode from appModeStore
  // Call requestService.createQuoteJob()
  // Redirect to /work/assessments/[id]?tab=estimate
}
```

---

## Key Patterns to Follow

### From requests/new/+page.svelte:
- Form structure with Card sections
- Error handling and display
- Loading state during submit
- goto() for redirect

### From request.service.ts:
- generateUniqueRequestNumber pattern
- createRequest transaction pattern
- Assessment creation via assessmentService

---

## Verification

- [x] Sidebar shows "New Quote" in autobody/mechanical mode
- [x] Form loads with all sections
- [x] Client type select works
- [x] Claim number shows only for insurance
- [x] Submit creates job and redirects to estimate
- [x] `npm run check` passes

## Implementation Summary

All steps completed successfully:

1. **Sidebar.svelte** - Made navigation conditional based on `appModeStore.mode`
   - Insurance mode: Shows "New Requests" → `/requests`
   - Autobody/Mechanical mode: Shows "New Quote" → `/quotes/new`

2. **+page.server.ts** - Created server load function to fetch clients list

3. **+page.svelte** - Created quote form with:
   - Reused VehicleInfoSection and OwnerInfoSection components
   - Added hideThirdParty prop to OwnerInfoSection
   - Client type select (Private/Insurance)
   - Conditional claim number field
   - Validates minimum required info
   - Redirects to `/work/assessments/[id]?tab=estimate` on success

4. **request.service.ts** - Added `createQuoteJob` method:
   - Generates request number based on client_type
   - Creates minimal request record
   - Creates assessment via `findOrCreateByRequest`
   - Logs audit trail
   - Returns assessment for redirect

5. **OwnerInfoSection.svelte** - Added `hideThirdParty` prop to conditionally hide third party fields

TypeScript check passes with 0 errors (13 pre-existing warnings).
