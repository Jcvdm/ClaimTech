## Goal
Add a manual "Refresh Snapshot" (force re-merge) and optional "Rerun FRC" (reset and recreate) so engineers/admins can update FRC to the latest Estimate + Additionals without waiting for auto-merge.

## Current Mechanics
- Auto-merge runs via `frcService.getFRCWithSnapshot()` and `mergeAdditionals(...)` when `additionals.updated_at > frc.last_merge_at`.
- Decisions are preserved using fingerprint matching in `mergeNewAdditionals(...)`.
- Reopen flow exists for completed FRC (`/api/frc/[id]/reopen`).

## UI Changes (FRCTab)
- Snapshot banner section `src/lib/components/assessment/FRCTab.svelte:558–586`:
  - Add a "Refresh Snapshot" button when status is `in_progress` to force re-merge.
  - When status is `completed`, show "Reopen FRC" (already present) and then enable Refresh after reopening.
- Add small progress feedback (spinner/message) and success toast/banner: "Snapshot refreshed; decisions preserved".

## Service API
- Add `refreshFRC(assessmentId: string)`:
  - Fetch current FRC by assessment; fetch current Estimate and Additionals and frozen rates from `assessments`.
  - Call existing `mergeAdditionals(frc.id, estimate, additionals, frozenRates)` regardless of `needsSync`.
  - Return updated FRC with merged lines and recalculated totals (quoted/actual).
- Optional: Add `restartFRC(assessmentId: string)` (advanced):
  - Delete existing FRC and call `startFRC(...)` to recreate fresh snapshot (loses decisions; guarded by confirm modal and admin-only).

## UX Rules
- Refresh allowed only in `in_progress`.
- Completed FRC: require "Reopen" first, then allow refresh.
- Disable refresh when adjust modal is open or while generating report.

## Implementation Steps
1) Service:
- Implement `refreshFRC(assessmentId)` that wraps fetching estimate/additionals and calls `mergeAdditionals(...)` unconditionally.
- Return `{ frc, lines }` to UI.

2) UI:
- Add `handleRefreshFRC()` in `FRCTab.svelte` with loading state; call `frcService.refreshFRC(assessmentId)`; update `frc` and `lines`; set `wasMerged=true` and show confirmation.
- Add button to snapshot banner with clear labeling and disabled state logic.

3) Optional Restart:
- Add `handleRestartFRC()` with confirm modal; calls `frcService.restartFRC(assessmentId)`; updates UI with fresh snapshot; warns about losing decisions.

## Verification
- Modify Additionals; click Refresh → merged lines include changes, decisions preserved, removed lines count updates.
- Completed FRC → Reopen → Refresh works; snapshot reflects latest Additionals.
- Totals and deltas update accordingly.

## Risks & Mitigation
- Concurrent merges: use existing optimistic locking on `line_items_version` in `mergeAdditionals`.
- Decision loss on restart: guard with confirm and role checks; keep refresh as primary.

## Deliverables
- UI buttons and handlers for Refresh (and optional Restart), service method to refresh regardless of `needsSync`, and progress/success feedback.