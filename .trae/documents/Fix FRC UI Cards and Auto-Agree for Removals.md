## Findings
- Legacy delta cards remain: “Quoted Delta (Combined − Original)”, “Actual Delta (Combined − Original)”, “VAT Difference” still rendered in FRCTab `src/lib/components/assessment/FRCTab.svelte:760–772`. These should be removed since we now show Baseline vs New Total.
- Removed additional lines are composed with `decision: 'pending'` `src/lib/utils/frcCalculations.ts:121–156, 169–207`. Because we hide removal rows, the visible original removed line still shows a Pending decision badge, which contradicts the desired “Agreed” status.
- mergeAdditionals preserves existing decisions; newly added removal lines keep pending unless we normalize.

## Plan
1) Remove legacy Combined delta cards
- Delete the card grid at `FRCTab.svelte:760–772` (Quoted/Actual Delta and VAT Difference), so only Baseline/New/Delta sections remain.

2) Auto-agree removal additional lines
- In `composeFinalEstimateLines(...)`, set `decision: 'agree'` for additionals where `action==='removed'` and set actual components equal to quoted nett values.
- In `mergeAdditionals(...)`, after `mergeNewAdditionals`, normalize mergedLines:
  - For any line with `is_removal_additional===true`, force `decision='agree'` and set actuals to quoted nett values.
  - Do not override if a removal line was adjusted (rare but safe guard: if `decision==='adjust'`, keep as-is).

3) Show “Agreed” on visible removed rows
- In `FRCLinesTable.svelte`, for original estimate rows with `removed_via_additionals`, render an “Agreed (Removed)” badge irrespective of `line.decision`.
- Keep actions disabled for removed/declined lines.

4) Supabase persistence & refresh
- Confirm refresh uses `frcService.refreshFRC(...)` (already added) and updates `assessment_frc.line_items` with normalized decisions and actuals.
- Ensure optimistic locking (`line_items_version`) is respected.

## Verification
- Remove an estimate line → refresh FRC:
  - Legacy cards gone; Baseline/New/Delta shown.
  - Visible removed rows show “Agreed (Removed)” badge and deduction chip.
  - New Total includes auto removal deductions; Delta reflects savings vs Baseline.
- Add and agree a new additional → New increases; Delta positive.
- Reopen/refresh persists decisions and normalization, no pending status on removals.

## Notes
- Minimal impact on calculations; normalization only affects decision status and actuals for removal additional lines to align display and business intent.
- RLS/DB: changes occur within the `assessment_frc` record’s `line_items` array; no schema changes beyond the already-added pairing fields.