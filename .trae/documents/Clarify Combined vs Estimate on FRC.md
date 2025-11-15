## Objectives
- Remove Combined totals.
- Show Baseline (Original Estimate only) and New Total (decided lines + automatic removals), then Delta = New Total − Baseline.
- Ensure removed lines affect New Total automatically without needing decisions; excluded from Baseline.

## Totals Semantics
- Baseline (Original Estimate):
  - Use estimate-only breakdown (`source='estimate'`), compute `baseline_subtotal = quoted_estimate_subtotal` and `baseline_vat = baseline_subtotal × vat%`, `baseline_total = baseline_subtotal + baseline_vat`.
- New Total:
  - Include only decided lines (decision ≠ 'pending').
  - Exclude removed original estimate lines (`source='estimate'` with `removed_via_additionals`).
  - Include removal additional lines automatically (negative), even if not decided.
  - Calculate with actuals for decided lines and quoted values for auto-removals; apply markup at aggregate level to parts/outwork, then VAT.
- Delta:
  - `delta_total = new_total − baseline_total` (positive = additional cost, negative = savings).

## Implementation
1) Utilities
- Add helper `calculateFRCNewTotals(lineItems, vat%, markups)`:
  - Filter lines: `decided || is_removal_additional` and exclude `source='estimate' && removed_via_additionals`.
  - For each line:
    - Use actual components for decided lines.
    - Use quoted components for removal additional lines.
  - Aggregate nett components → apply markups (parts/outwork) → subtotal → VAT → total.
- Reuse existing markup/VAT logic; implement a small per-line selector function.

2) UI (FRCTab)
- Remove Combined totals section.
- Add cards:
  - Baseline (Original Estimate): subtotal, VAT, total.
  - New Total (Decided + Auto Removals): subtotal, VAT, total.
  - Delta: New − Baseline with up/down indicator.
- Update deltas and header text to reflect Baseline vs New Total, not Combined vs Actual.

3) Decisions & Removed Lines
- Keep removed lines read-only and auto-included in New Total.
- Completion check remains: only non-removed lines must be decided (already implemented).

## Verification
- Scenario A: Removed line present, no decisions → Baseline unchanged; New includes deduction; Delta negative (savings).
- Scenario B: Additional parts line agreed → New increases by agreed amount; Delta positive.
- Scenario C: Adjusted values → New reflects actual entries; Delta displays variance.
- Reopen/Refresh: Snapshot updates; totals recalc accordingly.

## Notes
- No schema changes required beyond existing metadata (`is_removal_additional`, `removed_via_additionals`).
- Maintain audit trail by preserving both original and removal lines in data; only change totals computation scope and UI presentation.