## Summary
- Enable full editing of Additionals line items (description, quantity, rate and per-process fields) with consistent Svelte 5 events, auto-save on blur/Enter, and immediate UI feedback comparable to Estimate.

## Likely Root Causes
- Over-restrictive edit gating: rows editable only when `status === 'pending'`, `!isRemoved`, `!isReversal`, and sometimes only if an `id` exists.
- New items without a server `id` blocked from editing until first persistence.
- Inconsistent event wiring or missing `oninput` causing no local UI update until blur commit.

## Fix Steps
1. Relax ID gating for new rows
- In `src/lib/components/assessment/AdditionalsTab.svelte`, remove the `id` requirement for rendering description and numeric editors.
- Generate a temporary `localId` client-side for newly added items; render editors immediately.

2. First-edit auto-create flow
- On first edit of a row without `id`, call `additionalsService.createPendingLineItem(assessmentId, draftItem)` to obtain a real `id`.
- Replace `localId` with the returned `id` and proceed with subsequent patch calls.

3. Standardize Svelte 5 handlers
- Ensure all editors use `oninput` (for live local updates) and `onblur` or Enter/Escape handling to commit/cancel:
  - Description: `oninput` updates local item, `onblur` calls `updatePending(itemId, { description })`.
  - Numeric editors: `bind:value` with `oninput` and `onblur`→ `handle*Save(itemId)`; Enter submits, Escape cancels.

4. Consistent auto-save pipeline
- Keep persistence via `updatePending(lineItemId, patch)` → `additionalsService.updatePendingLineItem(...)` → update local `additionals` → `await onUpdate()`.
- Ensure the same pipeline is used for description and all numeric/process fields.

5. Edit gating clarity
- Maintain business rules (only `pending` items editable) but:
  - Ensure freshly added items are initialized as `status: 'pending'` client-side.
  - If a user needs to correct an approved/declined line, show a clear action (Reverse/Reinstate) that returns it to an editable state, then re-approve.

6. UI feedback
- Keep inline editing cues and status badges; ensure read-only rows show clear visual state.
- Apply the same debounce/overlay pattern used elsewhere only for network actions; local edits must stay responsive.

## Technical Changes
- `src/lib/components/assessment/AdditionalsTab.svelte`
  - Remove `id` check from editor rendering; introduce `localId` for new items.
  - Add `oninput` to all editors for immediate local updates; keep existing `onblur`/Enter/Escape commits.
  - Add first-edit create flow: if `!item.id`, call `createPendingLineItem(...)`, then continue with `updatePending(...)`.
- `src/lib/services/additionals.service.ts`
  - Add `createPendingLineItem(assessmentId, draft)` returning `{ id, ... }`.
  - Ensure `updatePendingLineItem(...)` accepts patches across description and numeric/process fields.
- Shared utilities (if present)
  - Add helpers to swap `localId`→`id` after create and reconcile local list.

## Validation
- Add a new line item and immediately edit description/quantity/rate before any save; confirm local UI updates during typing and commit on blur/Enter.
- Reload the page; verify edits persisted and the line has a real `id`.
- Attempt edit on approved/declined rows: verify read-only state and that Reverse/Reinstate returns the row to `pending` and editable.
- Confirm totals and derived amounts recompute correctly after numeric edits.

## Risks & Mitigations
- Race on first create: debounce first-edit network call and lock the row until `id` returns, with subtle inline spinner.
- Reconciliation bugs: ensure `localId` replacement is atomic, with list update and focus restoration.

## Deliverables
- Updated Additionals editing to match Estimate’s responsiveness and consistency.
- Service support for first-edit creation and patching.
- Tests for pending/approved/declined edit flows and persistence behavior.