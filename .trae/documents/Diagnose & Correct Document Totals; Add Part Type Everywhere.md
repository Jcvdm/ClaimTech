## Goals
- Fix totals mismatch and presentation in Additionals Letter and FRC.
- Ensure removed original lines are clearly shown and excluded from payable totals.
- Display part type (OEM/ALT/2ND) on all relevant documents (Estimate, Additionals Letter, FRC; Pre‑Incident optional).
- Align calculations (nett → selling → VAT) consistently with service logic.

## Current Issues
1. Additionals Letter shows nett columns while totals are selling-based (nett + markup + VAT), causing perceived discrepancies; removed lines not separated.
2. FRC includes some `pending` lines in actual totals and doesn’t treat `removed_via_additionals`/`declined_via_additionals` as deductions.
3. Part type not shown in PDFs, reducing audit clarity.

## Changes by Area
### Additionals Letter (`src/lib/templates/additionals-letter-template.ts`)
- Add sections:
  - Approved Additionals (included in totals)
  - Declined Additionals (notes; excluded)
  - Removed Original Lines (clearly labeled; excluded)
- Show part type for `process_type='N'` items (badge/column).
- Columns: either switch parts/outwork to selling values to match totals OR keep nett labels and add a clear "Markup Total" breakdown panel.
- Totals panel: `subtotal_approved`, `vat_amount_approved`, `total_approved` only from approved lines; explicitly exclude `action='reversal'`.

### FRC Calculations & UI
- `src/lib/utils/frcCalculations.ts`:
  - Update `calculateFRCNewTotals(...)` and helpers to:
    - Include only `decision='agree' | 'adjust'` in actual totals
    - Exclude `pending`
    - Treat `removed_via_additionals` and `declined_via_additionals` as deductions using quoted values, surfaced separately
- `src/lib/components/assessment/FRCTab.svelte`:
  - Ensure `allLinesDecided` does not bypass removed/declined lines; require explicit decisions where applicable, or mark them non-actionable with proper flags.
  - Keep settlement banner using `frc.actual_total` (incl. VAT).
- `src/lib/templates/frc-report-template.ts`:
  - Show part type for `N` items
  - Add "Deductions" section for removed/declined-origin lines (quoted values), excluded from actual totals

### Estimate Template (`src/lib/templates/estimate-template.ts`)
- Display part type for `N` items (badge/column).
- Clarify column labels as nett for parts/outwork; retain aggregate markup breakdown and VAT to explain total.

### Pre‑Incident (Optional)
- If needed, add `pre-incident-estimate-template.ts` mirroring Estimate, with part type display and breakdown; wire endpoint and Finalize card.

## Data & Calculation Parity
- Selling values derived from nett + markup by `part_type` (parts) and outwork markup; VAT applied consistently using `vat_percentage`.
- Additionals totals use approved‑only items; FRC actual totals use decided lines only; removed/declined treated as quoted deductions.

## Implementation Steps
1. Update Additionals Letter template for sections, part type, and breakdown clarity.
2. Adjust FRC calculation utilities to exclude `pending` and handle removed/declined correctly.
3. Update FRC tab decision logic and ensure settlement banner accuracy.
4. Add part type display to Estimate and FRC templates.
5. (Optional) Add Pre‑Incident template and endpoint.

## Verification
- Create a test scenario: original line removed via additionals; approved replacement; one declined with reason; one reversal.
- Generate Additionals Letter: totals equal `total_approved`; removed and declined excluded and labeled.
- Generate FRC: actual total equals baseline – removed quoted + approved agreed/adjusted; no pending counted; settlement equals `assessment_frc.actual_total`.
- Estimate/FRC PDFs show part type for `N` items; breakdown labels clarify nett vs markup.

## Risks & Mitigations
- Risk: changing FRC totals logic affects reported figures — mitigate with explicit unit tests and snapshot comparisons.
- Risk: confusion about nett vs selling in Additionals Letter — mitigate by clear labeling and including a markup breakdown panel.

## Milestones
- M1: Additionals Letter sections and part type; totals clarity.
- M2: FRC calculations and template deductions; UI decision validation.
- M3: Estimate part type update.
- M4 (optional): Pre‑Incident template and generation.

## Deliverables
- Updated templates (Additionals, FRC, Estimate) with part type and sections.
- Updated FRC calculation logic respecting decisions and removed/declined handling.
- Verification results with example PDFs and totals parity notes.