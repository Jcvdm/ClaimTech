## Findings
- Additionals table currently renders columns for Type, Description, Part, S&A, Labour, Paint, Outwork, Total, Status, Actions (`src/lib/components/assessment/AdditionalsTab.svelte:653–665`). No Part-Type column is present.
- Service logic already uses `part_type` (OEM/ALT/2ND) to apply markup for parts in Additionals totals (`src/lib/services/additionals.service.ts` — parts markup in totals calculation). Pending-line updates persist via `updatePending(assessmentId, lineItemId, patch)` (`src/lib/components/assessment/AdditionalsTab.svelte:65–69`).
- Estimate UI shows badges/icons for `part_type`; Additionals imports only status/action icons and does not render part-type badges (`src/lib/components/assessment/AdditionalsTab.svelte:12`).

## Goals
- Display `part_type` badges (OEM/ALT/2ND) on Additionals parts lines, matching Estimate visuals.
- Allow editing `part_type` for pending parts lines; persist changes; recompute totals via existing service path.

## Implementation Steps
1) UI Column
- Add a new `Part Type` column header after `Type` in Additionals table (`src/lib/components/assessment/AdditionalsTab.svelte:655`).
- For each row:
  - If `item.process_type === 'N'`:
    - Pending, non-removed/non-reversal: show a native `select` (`OEM/ALT/2ND`) alongside a badge renderer.
    - Approved/declined/reversal/removed: show read-only badge.
  - Else: render empty cell or `—`.

2) Event Wiring (Svelte 5)
- `oninput` on the `select` updates local UI immediately (set `item.part_type` in local `additionals` state).
- `onblur` persists via `updatePending(item.id!, { part_type: e.currentTarget.value })`.

3) Badge Renderer
- Reuse Estimate’s visual conventions: text + icon (e.g., `OEM` → shield, `ALT` → package, `2ND` → recycle), small color-coded badge.
- Import the same icons used in Estimate; minimal inline renderer for consistency.

4) Service Confirmation
- `updatePendingLineItem(...)` already recalculates totals when fields change; ensure `part_type` patch triggers recompute (existing behavior in service parts calculation).

5) Verification
- Add a pending parts line in Additionals; change `part_type` and blur; confirm subtotal/total updates and persist across reload.
- For approved/declined lines, badges display read-only as expected.
- Confirm removed original lines remain visually distinct and totals continue to reflect negative entries.

## Notes
- Sundries remain Estimate-only; CombinedTotals reflect `estimate.total + additionals.total_approved`. Differences between removed line totals and Estimate are expected due to sundries being aggregate not per-line.

## Deliverables
- Updated Additionals table with `Part Type` badges and editable select for pending parts lines.
- Event wiring and persistence through existing `updatePending` path.
- Consistent visuals with Estimate to reduce cognitive load.