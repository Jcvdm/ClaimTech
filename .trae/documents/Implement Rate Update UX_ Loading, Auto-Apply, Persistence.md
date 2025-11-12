## Goals
- Prevent edits during rate recalculation with a loading state.
- Show live recalculated totals immediately when rates change.
- Persist rate changes right away, clearing the Save banner for rate-only updates.

## Changes
- EstimateTab.svelte
  - Add `recalculating` state and pass `disabled={saving || recalculating}` to Rates panel.
  - Update `handleLocalUpdateRates(...)` to:
    1) set `recalculating = true` and `dirty = true`
    2) update local rates and recompute line item totals
    3) call `props.onUpdateRates(...)` to persist
    4) set `dirty = false` and `recalculating = false`
- RatesAndRepairerConfiguration.svelte
  - Add `onblur={handleUpdateRates}` to all rate/markup inputs to auto-apply after a field loses focus.

## Verification
- Edit a rate and blur: totals update immediately, inputs disable briefly, Save banner does not stay visible.
- Select a repairer: defaults propagate, totals recalc, and persist occurs.
- Navigate away/back: rates remain correct without needing manual Save.