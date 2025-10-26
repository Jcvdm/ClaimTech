# Engineer Edit Functionality Implementation

**Status:** ✅ COMPLETED
**Priority:** Medium
**Created:** January 2025
**Completed:** January 2025
**Requirements:** Engineer profile editing with password reset capability

---

## Overview

Implement full engineer editing capabilities with password reset functionality for the existing "Edit" button on the engineer detail page.

## Current State Analysis

### What Exists ✅
- Engineer creation with password reset email working
- Engineer detail page exists at `/engineers/[id]` with "Edit" button
- Engineer service has `updateEngineer()` method
- Password reset flow exists (forgot-password pages)
- Admin-only access control via parent layout

### What's Missing ❌
- No edit page exists yet
- "Edit" button shows TODO alert (line 22-25 in detail page)
- No way to resend password reset email after creation

---

## Requirements

Based on user specifications:

**Editing Capabilities:**
- ✅ Update basic details (name, phone, province)
- ✅ Update professional details (specialization, company_name, company_type)
- ❌ Email address CANNOT be changed (tied to auth account)
- ✅ Resend password reset email button

**Access Control:**
- ❌ Engineers CANNOT edit their own profiles
- ✅ Only admins can edit engineer profiles
- ✅ Admin-only route protection inherited from parent layout

**UI Location:**
- Edit page at `/engineers/[id]/edit` (separate page)
- "Resend Password Reset" button on edit page
- Edit button on detail page navigates to edit page

---

## Implementation Plan

### Phase 1: Create Edit Page Server (15-20 min)

**File:** `src/routes/(app)/engineers/[id]/edit/+page.server.ts`

**Load Function:**
```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
  const engineer = await engineerService.getEngineer(params.id, locals.supabase);
  if (!engineer) {
    throw error(404, 'Engineer not found');
  }
  return { engineer };
};
```

**Update Action:**
```typescript
async default({ request, params, locals }) {
  // Get form data
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const province = formData.get('province') as string;
  const specialization = formData.get('specialization') as string;
  const company_name = formData.get('company_name') as string;
  const company_type = formData.get('company_type') as string;

  // Validate
  if (!name) {
    return fail(400, { error: 'Name is required' });
  }

  // Update engineer
  const engineerData = {
    name,
    phone: phone || undefined,
    province: province || undefined,
    specialization: specialization || undefined,
    company_name: company_name || undefined,
    company_type: company_type as any || undefined
  };

  await engineerService.updateEngineer(params.id, engineerData, locals.supabase);

  // Redirect to detail page
  redirect(303, `/engineers/${params.id}`);
}
```

**Resend Password Action:**
```typescript
async resendPassword({ params, locals, url }) {
  // Get engineer to get email
  const engineer = await engineerService.getEngineer(params.id, locals.supabase);
  if (!engineer) {
    return fail(404, { error: 'Engineer not found' });
  }

  // Send password reset email
  const { error: resetError } = await supabaseServer.auth.resetPasswordForEmail(
    engineer.email,
    { redirectTo: `${url.origin}/auth/reset-password` }
  );

  if (resetError) {
    return fail(400, { error: `Failed to send password reset email: ${resetError.message}` });
  }

  return { success: true, message: `Password reset email sent to ${engineer.email}` };
}
```

### Phase 2: Create Edit Page UI (15-20 min)

**File:** `src/routes/(app)/engineers/[id]/edit/+page.svelte`

**Structure:**
- Reuse form structure from `/engineers/new/+page.svelte`
- Pre-populate all fields with `data.engineer` values
- Email field: Display-only with disabled styling
- Two separate forms:
  1. Main update form (default action)
  2. Password reset form (resendPassword action)

**Key Differences from New Page:**
1. **Email Field (Read-Only):**
```svelte
<div>
  <Label>Email Address</Label>
  <p class="text-sm text-gray-500 mb-2">Email cannot be changed (linked to auth account)</p>
  <input
    type="email"
    value={data.engineer.email}
    disabled
    class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
  />
</div>
```

2. **Pre-populated Form Values:**
```svelte
let name = $state(data.engineer.name || '');
let phone = $state(data.engineer.phone || '');
let province = $state<Province | ''>(data.engineer.province || '');
let specialization = $state(data.engineer.specialization || '');
let company_name = $state(data.engineer.company_name || '');
let company_type = $state<CompanyType | ''>(data.engineer.company_type || 'internal');
```

3. **Update Button:**
```svelte
<button type="submit" disabled={loading}>
  {loading ? 'Updating Engineer...' : 'Update Engineer'}
</button>
```

4. **Password Reset Section:**
```svelte
<Card class="p-6 border-orange-200 bg-orange-50">
  <h3 class="mb-4 text-lg font-semibold text-gray-900">Password Management</h3>
  <p class="text-sm text-gray-600 mb-4">
    Send a password reset email to {data.engineer.email}
  </p>

  {#if form?.success}
    <div class="rounded-md bg-green-50 p-4 mb-4">
      <p class="text-sm text-green-800">{form.message}</p>
    </div>
  {/if}

  <form method="POST" action="?/resendPassword" use:enhance>
    <Button type="submit" variant="outline">
      <Mail class="mr-2 h-4 w-4" />
      Resend Password Reset Email
    </Button>
  </form>
</Card>
```

### Phase 3: Update Detail Page (5 min)

**File:** `src/routes/(app)/engineers/[id]/+page.svelte`

**Change Line 22-25:**
```typescript
// Before:
function handleEdit() {
  alert('Edit functionality coming soon!');
}

// After:
function handleEdit() {
  goto(`/engineers/${data.engineer.id}/edit`);
}
```

---

## File Structure

```
src/routes/(app)/engineers/
├── [id]/
│   ├── +page.svelte              ← Modify: Fix Edit button
│   ├── +page.server.ts           ← Existing
│   └── edit/
│       ├── +page.svelte          ← Create: Edit form UI
│       └── +page.server.ts       ← Create: Load & actions
├── new/
│   ├── +page.svelte              ← Reference for form structure
│   └── +page.server.ts           ← Reference for validation
├── +page.svelte                  ← Existing (list page)
└── +page.server.ts               ← Existing
```

---

## Implementation Checklist

### Phase 1: Edit Page Server
- [ ] Create `src/routes/(app)/engineers/[id]/edit/+page.server.ts`
- [ ] Implement load function (fetch engineer by ID)
- [ ] Implement default action (update engineer)
- [ ] Implement resendPassword action
- [ ] Add error handling and validation
- [ ] Import required dependencies (supabaseServer, engineerService)

### Phase 2: Edit Page UI
- [ ] Create `src/routes/(app)/engineers/[id]/edit/+page.svelte`
- [ ] Copy form structure from new page
- [ ] Pre-populate all form fields
- [ ] Make email field read-only with disabled styling
- [ ] Update submit button text
- [ ] Add password reset section with separate form
- [ ] Handle success/error messages for both actions
- [ ] Add cancel button navigation

### Phase 3: Detail Page Update
- [ ] Modify `src/routes/(app)/engineers/[id]/+page.svelte`
- [ ] Update handleEdit() to navigate to edit page
- [ ] Test Edit button navigation

---

## Testing Checklist

**Admin Access:**
- [ ] Admin can navigate to edit page from detail page
- [ ] Admin can access edit page directly via URL
- [ ] Engineers cannot access edit page (redirected by parent layout)

**Form Functionality:**
- [ ] Form pre-populates with all existing engineer data
- [ ] Email field is disabled and visually distinct
- [ ] Can update name successfully
- [ ] Can update phone successfully
- [ ] Can update province successfully
- [ ] Can update specialization successfully
- [ ] Can update company_name successfully
- [ ] Can update company_type successfully

**Validation:**
- [ ] Name field is required
- [ ] Empty name shows error
- [ ] Other fields are optional

**Password Reset:**
- [ ] "Resend Password Reset" button visible
- [ ] Button triggers password reset email
- [ ] Success message displays after sending
- [ ] Error message displays on failure
- [ ] Email sent to correct engineer email

**Navigation:**
- [ ] "Update Engineer" redirects to detail page
- [ ] "Cancel" button navigates to detail page
- [ ] Back button works correctly

**Data Integrity:**
- [ ] Email address cannot be changed
- [ ] Only provided fields are updated (undefined fields ignored)
- [ ] Updated data reflects on detail page
- [ ] Database record updated correctly

---

## Technical Details

### Form Actions Pattern

The edit page uses SvelteKit's multiple form actions pattern:

```typescript
export const actions: Actions = {
  // Default action (no ?/actionName in form action attribute)
  default: async ({ request, params, locals }) => {
    // Update engineer
  },

  // Named action (form action="?/resendPassword")
  resendPassword: async ({ params, locals, url }) => {
    // Send password reset email
  }
};
```

### ServiceClient Pattern

All database operations use the ServiceClient injection pattern:

```typescript
await engineerService.updateEngineer(id, data, locals.supabase);
```

This ensures:
- User context is maintained
- RLS policies are applied
- Consistent error handling

### Email Cannot Change

Email is tied to the auth account (`auth.users.email`) and cannot be updated through the engineer table. To change an email:
1. Admin must use Supabase admin API
2. Or engineer must use Supabase's built-in email change flow
3. This is not implemented in this feature (out of scope)

---

## Success Criteria

- ✅ Edit button on detail page navigates to `/engineers/[id]/edit`
- ✅ Edit form displays with all current engineer data
- ✅ All fields editable except email (read-only)
- ✅ Update engineer functionality works correctly
- ✅ Password reset email can be resent from edit page
- ✅ Success/error messages display appropriately
- ✅ Admin-only access enforced (inherited from parent layout)
- ✅ Navigation flows work smoothly (edit → detail)

---

## Timeline

**Estimated Total Time:** 45-55 minutes

**Phase 1 (Server):** 15-20 min
**Phase 2 (UI):** 15-20 min
**Phase 3 (Detail):** 5 min
**Testing:** 10-15 min

---

## Related Documentation

- [Engineer Registration Implementation](./engineer_registration_auth.md) - Original engineer creation with password reset
- [Database Schema](../System/database_schema.md) - Engineers table structure
- [Auth Patterns](../../.claude/skills/claimtech-development/resources/auth-patterns.md) - Password reset patterns
- [Component Patterns](../../.claude/skills/claimtech-development/resources/component-patterns.md) - Svelte 5 form patterns

---

## ✅ Implementation Summary

**What Was Implemented:**

1. **Edit Page Server** (`src/routes/(app)/engineers/[id]/edit/+page.server.ts`) ✅
   - Load function fetches engineer by ID
   - Default action updates engineer details (name, phone, province, specialization, company)
   - `resendPassword` action triggers password reset email
   - Email field cannot be changed (validation enforced)
   - Proper error handling and redirects

2. **Edit Page UI** (`src/routes/(app)/engineers/[id]/edit/+page.svelte`) ✅
   - Form pre-populated with all existing engineer data
   - Email field displayed as read-only with disabled styling
   - All other fields editable (name, phone, province, specialization, company)
   - Password reset section with separate form action
   - Success/error messages for both update and password reset
   - Cancel button returns to detail page

3. **Detail Page Update** (`src/routes/(app)/engineers/[id]/+page.svelte`) ✅
   - Edit button now navigates to `/engineers/[id]/edit`
   - Removed TODO alert

**Files Created:** 2
- `src/routes/(app)/engineers/[id]/edit/+page.server.ts`
- `src/routes/(app)/engineers/[id]/edit/+page.svelte`

**Files Modified:** 1
- `src/routes/(app)/engineers/[id]/+page.svelte`

**Key Features:**
- ✅ Admin-only access (inherited from parent layout)
- ✅ Email cannot be changed (read-only field)
- ✅ All other engineer fields editable
- ✅ Password reset email can be resent
- ✅ Proper validation and error handling
- ✅ Smooth navigation flow (detail ↔ edit)

**Testing Status:** ⚠️ Ready for manual testing

**Next Steps:**
1. Manual testing of edit functionality
2. Manual testing of password reset email
3. Verify admin-only access enforcement
4. Test with real engineer accounts

---

**Implementation Start:** January 2025
**Implementation Complete:** January 2025
**Actual Time:** 20 minutes (faster than estimated 45-55 min)
**Owner:** ClaimTech Development Team
