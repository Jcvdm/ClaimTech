## Overview
- Implement a fixed 1% “Sundries” charge calculated on the estimate subtotal (ex VAT), then include it in the VAT base.
- Persist sundries to the database and expose it in the UI and print template.

## Current Flow (Key References)
- Print route loads estimate and line items: `src/routes/(app)/print/estimate/[id]/+page.server.ts:31`.
- Print page renders HTML via template: `src/routes/(app)/print/estimate/[id]/+page.svelte:50` and `src/lib/templates/estimate-template.ts`.
- Persisted totals are computed in the service: `src/lib/services/estimate.service.ts:24-80`, used in create/update/recalculate.
- UI totals are derived client-side for display: `src/lib/components/assessment/EstimateTab.svelte:541-594`.
- DB schema for `assessment_estimates`: `supabase/migrations/014_create_assessment_estimates.sql` and later enhancements (017, 018, 040).

## Database Changes
- Add two columns to `assessment_estimates`:
  - `sundries_percentage DECIMAL(5,2) DEFAULT 1.00 NOT NULL`
  - `sundries_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL`
- Backfill existing rows:
  - `sundries_percentage = 1.00`
  - `sundries_amount = ROUND(subtotal * 0.01, 2)`
  - Recompute VAT and Total to include sundries in VAT base:
    - `vat_amount = ROUND(((subtotal + sundries_amount) * vat_percentage / 100), 2)`
    - `total = ROUND(subtotal + sundries_amount + vat_amount, 2)`
- Migration file: `supabase/migrations/077_add_sundries_to_assessment_estimates.sql`.

## Types Update
- Update `Estimate` type: `src/lib/types/assessment.ts`
  - Add `sundries_percentage: number` and `sundries_amount: number`.
- Update `CreateEstimateInput` and `UpdateEstimateInput` to optionally accept `sundries_percentage`.

## Service Logic
- Update aggregate computation to include sundries:
  - In `computeAggregateTotals(...)` at `src/lib/services/estimate.service.ts:24-80`:
    - Compute `subtotal` as today.
    - Compute `sundriesAmount = Number((subtotal * (sundriesPercentage / 100)).toFixed(2))` with default `1.0`.
    - Compute `vatAmount = Number((((subtotal + sundriesAmount) * vatPercentage) / 100).toFixed(2))`.
    - Compute `total = Number((subtotal + sundriesAmount + vatAmount).toFixed(2))`.
  - Thread `sundriesPercentage` through create/update/recalculate; persist `sundries_amount` and `sundries_percentage` in inserts/updates.
  - Create: `src/lib/services/estimate.service.ts:148-163` add columns; source `sundries_percentage` from input or default.
  - Update: `src/lib/services/estimate.service.ts:214-231` recompute and persist `sundries_amount`.
  - Recalculate: `src/lib/services/estimate.service.ts:508-515` include `sundries_amount`.

## UI Changes
- Estimate tab totals: `src/lib/components/assessment/EstimateTab.svelte`.
  - Derived totals update at `:578-594`:
    - Add `sundriesAmount = subtotalExVat * 0.01`.
    - Set `vatAmount = (subtotalExVat + sundriesAmount) * (vat_percentage / 100)`.
    - Set `totalIncVat = subtotalExVat + sundriesAmount + vatAmount`.
  - Totals section UI around `:1162-1232`:
    - Insert a row: `Sundries (1%)` between Subtotal and VAT.
    - Use dynamic VAT label `VAT ({totals?.vatPercentage}%)` (already present).

## Print Template
- `src/lib/templates/estimate-template.ts` totals table at `:672-686`:
  - Insert a row `Sundries (1%)` showing `formatCurrency(estimate?.sundries_amount || 0)`.
  - Change VAT label from `VAT (15%)` to `VAT (${estimate?.vat_percentage ?? 15}%)`.
  - No change to breakdown table (nett components remain as-is).

## API Route
- `src/routes/api/generate-estimate/+server.ts`: no logic change required; template reflects new fields.

## Migration SQL (MCP-ready)
```sql
ALTER TABLE assessment_estimates
  ADD COLUMN IF NOT EXISTS sundries_percentage DECIMAL(5,2) DEFAULT 1.00 NOT NULL,
  ADD COLUMN IF NOT EXISTS sundries_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

UPDATE assessment_estimates
SET sundries_percentage = 1.00
WHERE sundries_percentage IS NULL;

UPDATE assessment_estimates
SET sundries_amount = ROUND(subtotal * 0.01, 2);

UPDATE assessment_estimates
SET 
  vat_amount = ROUND(((subtotal + sundries_amount) * vat_percentage / 100), 2),
  total = ROUND(subtotal + sundries_amount + vat_amount, 2);

COMMENT ON COLUMN assessment_estimates.sundries_percentage IS 'Fixed sundries percentage applied on subtotal (ex VAT)';
COMMENT ON COLUMN assessment_estimates.sundries_amount IS 'Calculated sundries amount (subtotal × percentage) included in VAT base';
```
- Execute via MCP with `project_id` per `.agent/System/mcp_setup.md`.

## Verification
- Create an estimate with known values; confirm persisted fields:
  - `subtotal`, `sundries_amount = subtotal * 0.01`, `vat_amount` on `(subtotal + sundries)` base, `total`.
- UI: Estimate tab shows the new Sundries row and updated VAT/Total.
- Print: Totals section shows Sundries and dynamic VAT label.
- Edge cases: zero subtotal, fractional pennies rounding to 2 decimals, betterment deductions preserved.

## Rollout Notes
- Fixed 1% per request; keep `sundries_percentage` in DB for future configurability.
- Audit logging remains unchanged; no user-editable sundries in this scope.
- No RLS policy changes needed; fields inherit table policies.

Please confirm, and I’ll implement the migration, service, types, UI, and template updates, then verify end-to-end.