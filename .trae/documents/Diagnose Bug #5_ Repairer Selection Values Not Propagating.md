## Summary
- Bug 5 describes: selecting a repairer in the Estimate tab does not pull through values (markup, rates) or update calculations.
- Source: `.agent/Tasks/bugs.md` lines 287–319.

## Code Paths
- Parent page wires handlers and passes `repairers`:
  - `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:842–870` (EstimateTab props: `repairers`, `onUpdateRates`, `onUpdateRepairer`).
  - Rates update handler: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:520–546`.
  - Repairer update handler: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:548–564`.
- Estimate tab local buffering and handlers:
  - Props include `onUpdateRepairer`: `src/lib/components/assessment/EstimateTab.svelte:60`.
  - Local rate update recalculates line totals: `src/lib/components/assessment/EstimateTab.svelte:620–637`.
  - Local repairer update only sets `repairer_id` (no rate sync): `src/lib/components/assessment/EstimateTab.svelte:638–642`.
  - Rates UI includes `RatesAndRepairerConfiguration`: `src/lib/components/assessment/EstimateTab.svelte:696–710`.
- Repairer selection UI and auto-populate logic:
  - `handleRepairerChange()` updates local rates from selected repairer defaults and calls only `onUpdateRepairer`: `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:117–136`.
  - Quick Add flow sets local rates and calls only `onUpdateRepairer`: `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:166–177`.

## Diagnosis
- Selecting a repairer updates `repairer_id` via `onUpdateRepairer` but the updated default rates/markups remain local to `RatesAndRepairerConfiguration` and are not propagated to the EstimateTab state.
- Because `onUpdateRates` is never called from `handleRepairerChange()`, EstimateTab’s `handleLocalUpdateRates()` (which recalculates all line item totals) is not triggered.
- Evidence:
  - Local only update in `EstimateTab.svelte:638–642` and absence of rate propagation in `RatesAndRepairerConfiguration.svelte:135`.
  - Recalculation exists and works when `onUpdateRates` is invoked manually (yellow banner), but is not invoked automatically on repairer change.

## Fix Approach (No edits yet)
- Preferred: call `onUpdateRates(...)` immediately after auto-populating local rates when a repairer is selected.
  - In `handleRepairerChange()` at `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:117–136`, after line 135, add a call:
    - `onUpdateRates(localLabourRate, localPaintRate, localVatPercentage, localOemMarkup, localAltMarkup, localSecondHandMarkup, localOutworkMarkup)`.
  - Also call `onUpdateRates(...)` in Quick Add after setting local rates: `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:166–176`.
- Alternative (less ideal due to duplication): update `EstimateTab.svelte:638–642` to also pull the selected repairer from `repairers` and set `localEstimate` rates and recompute totals; still keep `onUpdateRates` as the single recalculation entry point.

## Verification
- Select an existing repairer; confirm:
  - Rates/markup fields reflect the repairer defaults immediately in the UI.
  - Line item totals recalculate instantly without needing the “Update Rates” banner.
  - Persisted estimate (`saveAll`) contains new rates and revised totals.
- Quick Add a repairer; confirm same behavior and that `repairers` list refresh works.
- Regression: manual rate edits continue to show the banner and recalc on “Update Rates”.
