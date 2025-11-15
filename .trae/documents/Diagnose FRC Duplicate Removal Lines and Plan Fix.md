## Diagnosis
- FRC composition intentionally includes two entries for each removed original:
  1) Original estimate line marked `removed_via_additionals: true`
  2) The removal additional line carrying a negative total
- Purpose: audit trail + arithmetic net-zero of the removed cost in totals. This is why rerun yields the same visible duplication.
- Source code:
  - `composeFinalEstimateLines(...)` includes originals with removal marker and also includes all approved additionals (including removal negatives) `src/lib/utils/frcCalculations.ts:110–158` and removed originals `src/lib/utils/frcCalculations.ts:60–107`.
  - Breakdowns/totals include all lines by design for correct subtraction `src/lib/utils/frcCalculations.ts:227–271, 379–441`.

## Goal
- Show removed items only once in the FRC line table, while still keeping the negative removal line for correct totals.
- Keep removed lines read-only (already done) and avoid duplicate visual entries.

## Plan Options
1) UI-Only Grouping (Minimal change)
- Hide additional removal lines in the table (source='additional' with negative `quoted_total`).
- Show a "Deduction" chip/amount on the corresponding original estimate line (removed) to convey the subtraction.
- Risk: We need a robust way to pair removal additional to its original estimate line; current FRCLineItem lacks `original_line_id` for additional lines.

2) Add Pairing Metadata (Recommended)
- Enhance `composeFinalEstimateLines(...)` to add `removal_for_source_line_id` on FRC items created from additionals with `action==='removed'`.
- UI: Use this to group/hide the additional removal lines; show the deduction amount on the original line.
- Totals: Unchanged (additional negatives still counted).

3) Composition Collapse (Heavier change)
- Exclude removal additional rows from `lines` entirely and adjust breakdown math to subtract using a separate removal list.
- Risk: Larger refactor of totals and audit; not advised now.

## Recommended Steps
- Step 1: Add metadata on removal additional lines: `is_removal_additional: true`, `removal_for_source_line_id` (the original estimate line id).
- Step 2: Update FRCLinesTable to:
  - Not render rows with `is_removal_additional`.
  - Render the removed original line with a visible deduction chip using the paired removal line’s `quoted_total`.
- Step 3: Keep totals computation as-is; only change presentation.
- Step 4: Verify rerun/refresh produces single visible entry per removed line with correct savings reflected.

## Verification
- Remove an estimate line; run refresh: Table shows a single removed original with deduction shown; totals show savings.
- Reinstate removal (additionals reversal): Additional removal line excluded by reversal logic; original line no longer marked removed; table shows normal line item; totals restore.

## Notes
- This approach preserves the audit trail in data while eliminating confusing duplicates visually.
- If preferred, we can start with UI-only hiding based on `source==='additional' && quoted_total<0` and later add metadata for perfect pairing of deduction amounts.