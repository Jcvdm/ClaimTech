## Diagnosis
- Symptom: Finalization report flags outstanding fields that users have completed.
- Where validation runs: `src/lib/components/assessment/FinalizeTab.svelte:100–111` calls `getTabCompletionStatus(...)`.
- Validation logic: `src/lib/utils/validation.ts:326–357` expects `interiorPhotos`, `exterior360Photos`, and optionally `tyrePhotos` to compute completeness for Interior, Exterior 360, and Tyres tabs:
  - Exterior photo requirement: `src/lib/utils/validation.ts:36–46` (requires ≥4 photos)
  - Interior photo requirement: `src/lib/utils/validation.ts:57–71` (requires ≥2 photos)
  - Tyres photo requirement: `src/lib/utils/validation.ts:84–114` (requires ≥1 photo per tyre using `tyrePhotosMap`)
- Root cause: FinalizeTab does not pass these photo arrays to `getTabCompletionStatus`, so validation sees empty lists and reports missing fields even when completed.
  - Props exclude photos: `src/lib/components/assessment/FinalizeTab.svelte:24–38` (no `interiorPhotos`, `exterior360Photos`, `tyrePhotos` props)
  - Parent does not pass photos to FinalizeTab: `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:876–890` (passes only data objects; other tabs do receive photos: `740–767`, `768–790`, `820–835`).
- Secondary consideration: If any tabs use local buffers not persisted, validation may read stale DB state; ensure recent changes are persisted or use the page’s reactive `data.*` arrays updated by photo services.

## Fix Plan
1) Update FinalizeTab props to accept photo arrays:
   - Add `interiorPhotos?: any[]; exterior360Photos?: any[]; tyrePhotos?: any[]` to `Props` in `src/lib/components/assessment/FinalizeTab.svelte`.
2) Pass photo arrays into `getTabCompletionStatus`:
   - Update call at `FinalizeTab.svelte:100–111` to include `interiorPhotos`, `exterior360Photos`, `tyrePhotos`.
3) Wire parent to provide photo arrays:
   - In `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte:876–890`, pass `interiorPhotos={data.interiorPhotos}`, `exterior360Photos={data.exterior360Photos}`, `tyrePhotos={data.tyrePhotos}` to `<FinalizeTab ... />`.
4) Verify:
   - With completed photos, Finalization report shows no false missing fields.
   - Add/remove photos in their tabs, navigate to Finalize; status should reflect accurately.
   - Ensure rate/estimate and values validations still behave correctly.

## Optional Hardening
- Before finalization, trigger lightweight refresh of `data.*` arrays or ensure auto-save flows completed to avoid stale state.
- Consider surfacing per-tab completion badges on Finalize for clarity (reuse `tabValidations`).
