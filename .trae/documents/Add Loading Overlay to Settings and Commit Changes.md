## Goal
- Show a blur overlay with a spinner while Company Settings are saving, consistent with Estimate and document generation patterns.
- Commit current repository state after implementation.

## References
- Overlay pattern in Estimate: `src/lib/components/assessment/EstimateTab.svelte:1267–1271` (absolute overlay, `backdrop-blur-sm`, spinner `RefreshCw` with `animate-spin`).
- Current settings form state: `src/routes/(app)/settings/+page.svelte` uses `loading` flag during `use:enhance` and disables the submit button.

## Implementation
1. Wrap the settings form content in a `relative` container so overlay can be absolutely positioned.
2. Add an overlay element that shows when `loading === true`:
   - `absolute inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm`
   - Inner box: `px-4 py-3 rounded-lg bg-white shadow border` with spinner icon (`Loader2` or `RefreshCw`) and status text (`Saving…`).
3. Keep `invalidateAll()` post-save and `form.settings` → local T&Cs sync already implemented.

## Commit
- Stage all changes and create a commit:
  - Message: "Settings: add saving overlay; immediate T&Cs sync; unify T&Cs blocks and Executive Summary updates"
- No push unless requested.

## Validation
- Trigger a settings save and verify overlay appears during save and disappears on completion.
- Confirm immediate reflection of Company Settings and T&Cs after save with no page refresh.

## On Approval
- Implement the overlay in `+page.svelte` and commit the current state.