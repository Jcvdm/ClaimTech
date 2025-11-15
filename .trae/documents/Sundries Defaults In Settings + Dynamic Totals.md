## Goals
- Make the 1% Sundries configurable at organization level via Settings.
- Use the configured percentage when computing and displaying totals (UI and print/PDF).
- Keep persisted `sundries_amount` authoritative for value while labeling uses the effective percentage.

## Database
- Add `sundries_percentage DECIMAL(5,2) DEFAULT 1.00 NOT NULL` to `company_settings`.
- Backfill existing settings to `1.00`.
- Migration file: `supabase/migrations/078_add_sundries_to_company_settings.sql`.

## Types
- Update `CompanySettings` interface in `src/lib/types/assessment.ts` to include `sundries_percentage: number`.

## Service Logic
- In `EstimateService.create(...)` and `update(...)`, when `input.sundries_percentage` is undefined, fetch `company_settings` once and use `company_settings.sundries_percentage` (fallback 1.0).
- In `createDefault(...)`, set the estimate’s `sundries_percentage` from `company_settings`.
- No change to persisted value selection: `sundries_amount` continues to be computed and stored.

## Settings Page UI
- In `src/routes/(app)/settings/+page.svelte`, add a `FormField` for `Sundries Percentage (%)` with range validation (0–100), saving into `company_settings.sundries_percentage`.

## Estimate UI (Totals)
- In `src/lib/components/assessment/EstimateTab.svelte`:
  - Use effective percentage: `localEstimate?.sundries_percentage ?? estimate?.sundries_percentage ?? companySettings?.sundries_percentage ?? 1`.
  - Compute sundries as `subtotalExVat * (effectivePct / 100)`.
  - Label row: `Sundries (${effectivePct}%)`.

## Print/PDF Template
- In `src/lib/templates/estimate-template.ts`:
  - Label row as `Sundries (${estimate?.sundries_percentage ?? companySettings?.sundries_percentage ?? 1}%)`.
  - Value remains `estimate.sundries_amount`.

## Verification
- Update settings to e.g. 2.5%; create/update an estimate without specifying sundries; confirm totals and labels reflect 2.5%.
- Check browser print route `/print/estimate/[id]` and generated PDF via `/api/generate-estimate` show Sundries row with the configured percentage.

## Rollback / Safety
- If settings missing, default to 1.0%; all calculations still succeed.
- No RLS changes required; settings uses existing policies.