## Findings
- Settings page uses `use:enhance` to submit to `?/update` and only sets `loading` and shows `form.success`.
  - `src/routes/(app)/settings/+page.svelte:46–55`
- The server action saves settings and returns `{ success: true }` without reloading or returning updated settings.
  - `src/routes/(app)/settings/+page.server.ts:59–66`
- Inputs for company info rely on `FormField` with `value={data.settings?...}` and are not bound to local state; T&Cs textareas are bound to local `$state` (so they keep typed values).
  - Company fields: `+page.svelte:71–115, 118–157`
  - T&Cs fields: `+page.svelte:173–238`
- Other parts of the app handle immediate reflection via invalidation/navigation.
  - Examples: `goto(..., { invalidateAll: true })` and `invalidateAll()` usage
    - `src/routes/(app)/work/inspections/[id]/+page.svelte:221`
    - `src/routes/(app)/work/assessments/+page.svelte:3, 40, 54, 169`
- Estimate live update pattern: local buffer (`localEstimate`), `$effect` sync when parent changes, `markDirty`/`saveAll` to persist, ensuring immediate UI updates.
  - `src/lib/components/assessment/EstimateTab.svelte:104–156, 173–206`

## Root Cause
- After saving, the page does not refetch `data.settings` because the form action does not trigger load invalidation or return updated settings.
- Result: fields tied to `data.settings` (company info) keep stale server values until navigation/refresh.

## Proposed Fix
- Minimal: call `invalidateAll()` after `update()` in `use:enhance` to refetch `load` and update `data.settings` immediately.
  - Update `+page.svelte` to `import { invalidateAll } from '$app/navigation'` and run `await invalidateAll()` after `await update()`.
- Optional improvement: have the server action return the updated `settings` object and in the `enhance` callback, update local T&Cs state (`assessmentTCs`, `estimateTCs`, `frcTCs`) and any local copies if added later, avoiding a full invalidation.

## Implementation Steps
1. Modify `src/routes/(app)/settings/+page.svelte`:
   - Import `invalidateAll`.
   - In `use:enhance`, after `await update()`, call `await invalidateAll()` and then set `loading = false`.
2. (Optional) Modify `src/routes/(app)/settings/+page.server.ts`:
   - Return `{ success: true, settings: updated }` where `updated` is the latest settings fetched/saved, for more granular client updates.
3. Keep T&Cs bindings; they already use `$state` and will continue to show user input instantly.
4. Verify: Save settings then confirm fields reflect changes without navigation.

## Validation
- Save changes to company name and T&Cs; confirm success message appears and all fields show updated values immediately.
- Confirm no regressions in form submission or sanitization.

## Request for Approval
- Approve adding `invalidateAll()` to the settings form’s `enhance` callback for immediate refresh.
- Optionally approve returning updated settings from the server action for finer control without full invalidation. 