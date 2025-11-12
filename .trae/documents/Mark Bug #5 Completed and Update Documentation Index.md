## Objectives
- Update `.agent/Tasks/bugs.md` to mark Bug #5 as RESOLVED with details (fix summary, implementation references, testing).
- Remove Bug #5 from Active Bugs.
- Ensure `.agent/README.md` continues to provide a clear index; add a short pointer to `Tasks/bugs.md` if missing.

## Edits
- `.agent/Tasks/bugs.md`
  - Add a new entry under “Resolved Bugs”:
    - Title: “5. Estimate Tab - Repairer Selection Pulls Through Values ✅ RESOLVED”
    - Status: RESOLVED, Severity: Medium, Resolution Date: Today
    - Fix Summary: Call `onUpdateRates(...)` on repairer selection and Quick Add; auto-apply rate changes on blur; add recalculating overlay; persist rates immediately from EstimateTab.
    - Implementation Details with code references:
      - `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:117–136` (handleRepairerChange)
      - `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:166–177` (Quick Add)
      - `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:306–314, 328–336, 349–357, 379–388, 403–411, 426–434, 449–457` (onblur auto-apply)
      - `src/lib/components/assessment/EstimateTab.svelte:620–644` (persist + recalc)
      - `src/lib/components/assessment/EstimateTab.svelte:668–669, 1258–1265` (overlay structure)
    - Testing checklist.
  - Remove the Bug #5 section from “Active Bugs”.
- `.agent/README.md`
  - If not already present, add a brief pointer to `Tasks/bugs.md` under documentation navigation.

## Verification
- Open `.agent/Tasks/bugs.md` and confirm Bug #5 appears under Resolved and no longer under Active.
- Ensure links and file references are accurate.

## Notes
- Follow existing doc style; no new files are created. Ready to implement immediately.