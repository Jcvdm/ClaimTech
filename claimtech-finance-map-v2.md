# ClaimTech Finance/Currency Map — v2

**Generated**: 2026-04-29
**Source**: 5 Context Engine packs v2 (semantic embeddings + MiniLM reranker, Wave 6 symbol-tier primary, LEAN mode packs 2-5)

---

## 1. Display Layer

### Canonical formatter

`src/lib/utils/formatters.ts` → `formatCurrency(value, currency = 'ZAR')` is the single formatter for all monetary display. Pack 1 surfaced the full function body at symbol granularity:

```ts
function formatCurrency(value: number | null | undefined, currency = 'ZAR'): string {
    if (value === null || value === undefined) return 'R0.00';
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
```

The null-guard returns the bare string `'R0.00'` rather than routing through `Intl`, creating a locale-consistency gap for null/undefined inputs.

### Components that render money

v2 Pack 1 retrieved all the same display components as v1, plus two new ones surfaced via semantic channels:

- `src/lib/components/assessment/FRCLinesTable.svelte` — `getDeltaDisplay(quoted, actual)` function body confirmed; colors: positive delta = `text-red-600`, negative = `text-green-600`.
- `src/lib/components/assessment/FRCLineCard.svelte` — identical `getDeltaDisplay` mirror; confirmed as a direct code duplicate.
- `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte` — renders removed-line totals via `formatCurrency`.
- `src/lib/components/shop/ShopAdditionalsPanel.svelte` — renders line-item amounts; imports `formatCurrency`.
- `src/lib/components/shop/ShopAdditionalLineItemCard.svelte` — **new in v2** — imports and renders `formatCurrency` per additional line item. Not cited in v1.
- `src/lib/components/assessment/RatesConfiguration.svelte` — **new in v2** — imports `formatCurrency`; provides the rate-edit panel (`localLabourRate`, `localPaintRate`, VAT, markup sliders). Not cited in v1.
- `src/lib/components/assessment/PreIncidentEstimateTab.svelte` — **new in v2** — `normalizeMoneyInput(value)` helper: parses locale-formatted user input, routes through `formatCurrencyValue`. Adds `parseLocaleNumber` as the input counterpart to `formatCurrency`.
- `src/lib/templates/shop-invoice-template.ts` — outline only; `generateShopInvoiceHTML` (line 62–499) confirmed; monetary totals embedded in HTML template.

### Locale and currency symbol

- Locale: `en-ZA` hardcoded in all `Intl.NumberFormat` calls.
- Currency: `ZAR` throughout; the `currency` param on `formatCurrency` is never overridden in any observed call site.
- Input parsing: `parseLocaleNumber` in `PreIncidentEstimateTab.svelte` is the inverse of `formatCurrency` — handles locale-aware input entry (commas, currency symbols).

---

## 2. Calculation Layer

### Primary calculation module

`src/lib/utils/estimateCalculations.ts` (312 lines) — the authoritative math library. v2 Pack 2 surfaced this in secondary (module-level outline). Key functions:

| Function | Purpose |
|---|---|
| `calculateLineItemTotal(item, labourRate, paintRate)` | Per-line total by process type (N/R/P/B/A/O) net of betterment |
| `calculateSubtotal(lineItems)` | Sum of `item.total` across all items |
| `calculateVAT(subtotal, vatPct)` | `(subtotal * vatPct) / 100` |
| `calculateTotal(subtotal, vatAmount)` | `subtotal + vatAmount` |
| `recalculateLineItem / recalculateAllLineItems` | Recalc pipeline for line-item mutations |
| `createEmptyLineItem()` | Factory for new line items |

### Reactive totals in Shop job page

v2 Pack 3 (stores query) correctly identified these `$derived` financial variables in `src/routes/(shop)/shop/jobs/[id]/+page.svelte`:

```ts
estimateVatAmount = $derived(calculateVAT(estimateSubtotal, vatRate))
estimateTotal = $derived(calculateTotal(estimateSubtotal, estimateVatAmount))
```

`lineItems` is `$state` initialized from `data.estimate.line_items`, mutated locally, then auto-saved via `saveEstimateLineItemsNow()` (debounced fetch to `?/saveEstimateLineItems`).

### FRC calculation module

`src/lib/utils/frcCalculations.ts` — `calculateFRCAggregateTotals` function (lines 389–451) surfaced in v2 Pack 2 secondary via semantic channel. v1 missed the body entirely; v2 at least surfaces the function signature and location. Functions: `composeFinalEstimateLines`, `calculateBreakdownTotals`, `applyMarkupToTotals`, `calculateEstimateBreakdown`, `calculateAdditionalsBreakdown`, `calculateFRCAggregateTotals`.

### Estimate service aggregation

`src/lib/services/estimate.service.ts` (557 lines) — surfaced at module level in v2 Pack 2 secondary. `computeAggregateTotals` applies markup at aggregate level; `bulkDeleteLineItems` method signature confirmed (lines 454–486).

### Shop additionals

`src/lib/services/shop-additionals.service.ts` — `calculateApprovedTotals(lineItems, rates)` function (lines 17–71) surfaced in v2 Pack 2 secondary. Handles reversal filtering before applying markup, produces `subtotal_approved`, `vat_amount_approved`, `total_approved`.

### Shop estimate service

`src/lib/services/shop-estimate.service.ts` → `ShopEstimateTotals` interface (lines 59–69) surfaced for the first time in v2 Pack 2 secondary via semantic channel — **not in v1**. This is the typed aggregate totals shape for shop estimates.

### Rate fallback chain (API layer)

`src/routes/(shop)/shop/jobs/[id]/+page.server.ts` load function (lines 17–166) shows the rate resolution order:

```
estimate.labour_rate → settings.default_labour_rate → 450 (hardcoded)
estimate.paint_rate  → settings.default_paint_rate  → 350 (hardcoded)
oem/alt/second_hand/outwork markup → settings.* → 25 (hardcoded)
vat_rate             → settings.default_vat_rate    → 15 (hardcoded)
```

### Vehicle values

`src/lib/utils/vehicleValuesCalculations.ts` — `VehicleValuesCalculationResult` interface (lines 27–55) surfaced in v2 Pack 3 secondary. Functions: `calculateAdjustedValue`, `calculateConditionAdjustmentPercentage`, `calculateExtrasTotals`, `calculateWriteOffValue`, `calculateVehicleValues`.

---

## 3. State Layer

### No global Svelte stores for financial data

The codebase does not use Svelte stores (`writable`, `readable`) for monetary state. All financial state is managed as:

1. **Server-loaded page data** — `data.estimate`, `data.invoice` passed as Svelte 5 props.
2. **`$state` variables** — `lineItems`, `paymentAmount`, etc., mutated locally per component.
3. **`$derived` computed values** — `estimateSubtotal`, `estimateVatAmount`, `estimateTotal` recalculated reactively.

v2 Pack 3 (stores query) correctly landed on the shop job page and confirmed this `$derived` pattern:

```ts
estimate = $derived(data.estimate)
estimateVatAmount = $derived(calculateVAT(estimateSubtotal, vatRate))
estimateTotal = $derived(calculateTotal(estimateSubtotal, estimateVatAmount))
```

Pack 3 then diverged into migration files (pre_incident_estimate_photos, assessment_vehicle_values), which are tangentially related but not the reactive state the query intended.

`src/lib/components/assessment/EstimateTab.svelte` holds `localEstimate` as `$state` and `localLineItems` as `$derived.by(...)` with a filter for items that have IDs.

---

## 4. Validation Layer

### No Zod schemas on monetary fields

v2 Pack 4 did not surface any Zod schemas for monetary inputs — confirming the v1 finding. The pack instead retrieved migration files (FRC sign-off fields, RLS policies, write-off percentages).

### RLS policies on financial tables

`supabase/migrations_archive/059_rls_estimates_valuations_frc.sql` (102 lines) fully surfaced in v2 Pack 4 primary. This migration enables RLS on `assessment_estimates`, `assessment_vehicle_values`, and `assessment_frc`. Pattern: authenticated users can SELECT; only `is_admin()` can INSERT/UPDATE/DELETE.

### Server-side rate parsing (no Zod)

In `+page.server.ts → updateEstimateRates`, each rate field is parsed with:
```ts
const parsed = parseFloat(val as string);
if (!isNaN(parsed)) { rateFields[field] = parsed; }
```
No range check, no schema validation. Same `parseFloat` pattern observed for payment amounts (v1 finding confirmed).

### Database-level enforcement

- `assessment_estimates`: `labour_rate`, `paint_rate` → `DECIMAL(10,2)` (migration 015)
- `clients`: write-off percentages → `DECIMAL(5,2)` (defaults 65/70/28, migration 024)
- `shop_additionals`: `original_subtotal`, `original_vat_amount`, `original_total` → `DECIMAL(12,2)` (migration 20260407_003)
- `assessment_vehicle_values`: `trade_value`, `market_value`, `retail_value` etc. → `DECIMAL(12,2)` (migration 025)

---

## 5. Persistence Layer

### Supabase tables with monetary columns

| Table | Monetary Columns | Type | Notes |
|---|---|---|---|
| `assessment_estimates` | `labour_rate`, `paint_rate` | `DECIMAL(10,2)` | Defaults 500/2000 |
| `assessment_estimates` | `subtotal`, `vat_amount`, `total`, markup/sundries rates | DECIMAL | Computed aggregates persisted |
| `assessment_estimates` | `line_items` | `JSONB` | Per-line monetary fields; no DB-level precision enforcement |
| `pre_incident_estimates` | `subtotal`, `vat_amount`, `total`, `labour_rate`, `paint_rate` | DECIMAL | Same shape as assessment_estimates |
| `assessment_vehicle_values` | `trade_value`, `market_value`, `retail_value` + 12 other monetary columns | `DECIMAL(12,2)` | **v2 new: full column list from migration 025** |
| `assessment_frc` | FRC totals and breakdown columns | DECIMAL | sign-off tracking added in migration 037 |
| `shop_additionals` | `original_subtotal`, `original_vat_amount`, `original_total` | `DECIMAL(12,2)` | **v2 new: from migration 20260407_003** |
| `clients` | `borderline_writeoff_percentage`, `total_writeoff_percentage`, `salvage_percentage` | `DECIMAL(5,2)` | Defaults 65/70/28 |
| `shop_estimates` | `total`, `subtotal`, `vat_amount` etc. | DECIMAL | Shop estimate table |
| `shop_invoices` | `total`, `amount_due`, `amount_paid`, `vat_amount` | DECIMAL | Payment tracking |
| `company_settings` | `default_labour_rate`, `default_paint_rate`, `default_vat_rate`, markup percentages | DECIMAL | Global rate defaults |

v2 notably surfaced the full `assessment_vehicle_values` schema with all 18+ monetary DECIMAL(12,2) columns — v1 mentioned this table without the column detail.

### Key migrations

Same set as v1, plus v2 adds:
- `supabase/migrations/20260407_003_add_original_estimate_snapshot.sql` — adds `original_line_items JSONB`, `original_subtotal/vat_amount/total DECIMAL(12,2)` to `shop_additionals`.
- `supabase/migrations_archive/025_create_assessment_vehicle_values.sql` — full vehicle values schema now available.

### RLS on financial tables

`supabase/migrations_archive/059_rls_estimates_valuations_frc.sql` — enables RLS on `assessment_estimates`, `assessment_vehicle_values`, `assessment_frc`. Policy: SELECT for all `authenticated`; INSERT/UPDATE/DELETE requires `is_admin()`. Separate migration (`061_rls_company_settings_frc_documents.sql`) covers company settings and FRC documents (outline in secondary).

---

## 6. API Surface

### Route handlers reading/writing money

**Shop job load** (`src/routes/(shop)/shop/jobs/[id]/+page.server.ts`):
- Rate cascade: `estimate → settings → hardcoded defaults` for `labourRate`, `paintRate`, all markup percentages, `vatRate`.
- Service calls: `createShopEstimateService`, `createShopAdditionalsService`, `createShopInvoiceService` all instantiated here.

**Save estimate line items** (`?/saveEstimateLineItems` action, lines 247–430):
- Reads `line_items` JSON, markup percentages, `vat_rate` from form data.
- Calls `estimateService.updateEstimate(...)` writing `line_items`, `subtotal`, `vat_rate`, `vat_amount`, `total`, `parts_total`, `labor_total`, `sublet_total`, `sundries_total`, `discount_amount`.

**Update estimate rates** (`?/updateEstimateRates` action):
- Parses `labour_rate`, `paint_rate`, `oem_markup_pct`, `alt_markup_pct`, `second_hand_markup_pct`, `outwork_markup_pct` with `parseFloat`. No Zod, no bounds checking.

**Create invoice from estimate** (`?/createInvoice` action):
- Queries `shop_estimates` for approved/sent/draft estimate by `job_id`, then calls `invoiceService.createFromEstimate(estimate.id, job.id)`.

**Invoice payment recording** (`src/routes/(shop)/shop/invoices/[id]/+page.server.ts → ?/recordPayment`):
- `parseFloat(formData.get('amount'))` — no range validation. Shop invoice service used: `createShopInvoiceService`.

**PDF generation endpoints**:
- `src/routes/api/generate-shop-invoice/+server.ts` — SSE-based invoice PDF generation.
- `src/routes/api/photo/[...path]/+server.ts` — photo proxy (no monetary fields, but appeared in v2 secondary).

**Shop estimates list** (`src/routes/(shop)/shop/estimates/+page.server.ts`):
- Load + actions (approve/decline estimate). `actions` variable (lines 22–64) confirmed.

**Shop invoices list** (`src/routes/(shop)/shop/invoices/+page.server.ts`):
- Load (lines 5–17); `outstandingInvoices` derived in the page component.

---

## 7. Cross-Cutting Concerns

### Currency conversion

Does not exist. `ZAR` is hardcoded at every layer. The `currency` param on `formatCurrency` is framework scaffolding — no call site passes a non-ZAR value.

### Rounding strategy

Consistent `.toFixed(2)` wrapped in `Number(...)` at each intermediate step in `estimateCalculations.ts` and `estimate.service.ts`. Rounding accumulates across large line-item sets. No `Decimal.js` or integer-cents representation.

### Input normalization

`PreIncidentEstimateTab.svelte → normalizeMoneyInput(value)` uses `parseLocaleNumber` then `formatCurrencyValue` — a locale-aware round-trip for user input. This pattern is only implemented in the pre-incident tab; the shop estimate tab uses raw `parseFloat` at the server action level.

### Multi-currency support state

Single currency. ZAR hardcoded across formatter, service defaults, and DB column.

### Test coverage

No test files surfaced in any v2 pack. The mathematical core (`estimateCalculations.ts`, `frcCalculations.ts`, `vehicleValuesCalculations.ts`) has no visible automated test coverage.

---

## 8. Risks and Gaps

### 1. Float math, no Decimal library

All monetary calculations use native JS `number` (IEEE 754). `.toFixed(2)` mitigates display-level issues but intermediate calculations before rounding are susceptible. Material risk for an insurance assessment platform. **Recommendation**: Adopt `Decimal.js` or integer-cent representation.

### 2. Three separate markup-application paths

Assessment estimates apply markup at aggregate level (`computeAggregateTotals`). Shop additionals use `calculateApprovedTotals`. FRC uses `applyMarkupToTotals`. Three separate implementations risk divergence.

### 3. No input validation on monetary fields

`parseFloat` is used directly in server actions for `amount`, `labour_rate`, `paint_rate`, and markup fields. No Zod schemas, no min/max guards, no negative-value rejection. `-1000` or `NaN` would reach the service layer.

### 4. JSONB line items bypass DB precision

`line_items` stored as JSONB in `assessment_estimates` and `pre_incident_estimates`. Individual monetary sub-fields have no DB-level type enforcement.

### 5. Null-guard inconsistency in formatter

`formatCurrency(null)` returns the bare string `'R0.00'` rather than going through `Intl.NumberFormat`, creating locale-consistency gaps.

### 6. Duplicate `getDeltaDisplay` logic

`FRCLinesTable.svelte` and `FRCLineCard.svelte` each define identical `getDeltaDisplay` functions. Bug fixes must be applied to both.

### 7. Shop-side types untyped

Several shop server files cast with `as any` because shop tables are not in `database.types.ts`. No TypeScript safety on shop invoice/estimate monetary fields at the API layer.

### 8. No financial unit tests

`estimateCalculations.ts`, `frcCalculations.ts`, `vehicleValuesCalculations.ts` appear to have zero automated test coverage.

### 9. Hardcoded fallback rates in server load

The shop job page load has hardcoded fallback rates (`450`, `350`, `25`, `15`). If `company_settings` is missing these defaults, the hardcoded values silently take effect with no warning to the user.
