# ClaimTech Finance/Currency Map

**Generated**: 2026-04-29  
**Source**: 5 Context Engine packs (format, totals, stores, persistence, API)

---

## 1. Display Layer

### Components that render money

All monetary rendering flows through `formatCurrency` from `src/lib/utils/formatters.ts`. Components confirmed to import and call it:

- `src/lib/components/assessment/FRCLinesTable.svelte` — renders `formatCurrency(line.quoted_total)` and delta display (`±formatCurrency(delta)`) in `<Table.Cell>` for each FRC line item. Also colors deltas: positive = `text-red-600`, negative = `text-green-600`.
- `src/lib/components/assessment/FRCLineCard.svelte` — mobile card version of the above; same `formatCurrency` import.
- `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte` — renders `formatCurrency` for removed-line totals.
- `src/lib/components/shop/ShopAdditionalsPanel.svelte` — renders line-item amounts with `formatCurrency`; also holds markup/rate props: `labourRate`, `paintRate`, `oemMarkup`, `altMarkup`, `secondHandMarkup`, `outworkMarkup`.
- `src/lib/components/assessment/EstimateTab.svelte` — imports `formatCurrency, formatDate`; renders estimate subtotal/VAT/total rows.
- `src/routes/(shop)/shop/jobs/[id]/+page.svelte` — renders shop job estimate totals using `formatCurrency` and reactive derived variables (`estimateSubtotal`, `estimateVatAmount`).
- `src/routes/(shop)/shop/invoices/[id]/+page.svelte` — renders invoice line items and payment amounts with `formatCurrency`.
- `src/lib/templates/shop-estimate-template.ts` — PDF HTML template uses a local `formatCurrency` call (interpolated as `${formatCurrency(partsNett)}` etc.) in "TOTALS BREAKDOWN" section.
- `src/lib/templates/shop-invoice-template.ts` (outline only) — has `generateShopInvoiceHTML`; presumed same pattern.

### Canonical formatter

**One canonical formatter**: `src/lib/utils/formatters.ts` → `formatCurrency(value, currency = 'ZAR')`.

```ts
// src/lib/utils/formatters.ts:27-35
export function formatCurrency(value: number | null | undefined, currency = 'ZAR'): string {
    if (value === null || value === undefined) return 'R0.00';
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}
```

The `currency` parameter is defaulted to `'ZAR'` but never overridden in any observed call site — it is always called as `formatCurrency(value)`.

### Locale and currency symbol handling

- Locale: `en-ZA` hardcoded throughout all `Intl.NumberFormat` and `toLocaleDateString` calls.
- Currency: `ZAR` (South African Rand). The `Intl.NumberFormat` with `en-ZA` + `ZAR` outputs `R` as the symbol (e.g., `R1,234.56`).
- The null-guard returns the bare string `'R0.00'` rather than going through `Intl`, meaning locale-aware zero formatting is bypassed for null/undefined inputs.
- PDF templates use the same `formatCurrency` helper function, so print output is consistent with screen.

---

## 2. Calculation Layer

### Primary calculation module

**`src/lib/utils/estimateCalculations.ts`** — the single authoritative math library. All financial functions:

| Function | Purpose |
|---|---|
| `calculateBetterment(item)` | Sums betterment deductions across part/SA/labour/paint/outwork percentages |
| `calculateLineItemTotal(item, labourRate, paintRate)` | Per-line total by process type (N/R/P/B/A/O), net of betterment |
| `calculatePartSellingPrice(nettPrice, markupPct)` | `nettPrice * (1 + markup/100)` |
| `calculateSACost(hours, labourRate)` | `hours * labourRate` |
| `calculateOutworkSellingPrice(nettPrice, markupPct)` | Same markup formula as parts |
| `calculateLabourCost(hours, labourRate)` | `hours * labourRate` |
| `calculatePaintCost(panels, paintRate)` | `panels * paintRate` |
| `calculateSubtotal(lineItems)` | Sum of `item.total` across all items |
| `calculateVAT(subtotal, vatPct)` | `(subtotal * vatPct) / 100` |
| `calculateTotal(subtotal, vatAmount)` | `subtotal + vatAmount` |
| `recalculateLineItem(item, labourRate, paintRate)` | Returns updated item with recalculated fields |
| `recalculateAllLineItems(items, labourRate, paintRate)` | Maps `recalculateLineItem` over all items |
| `createEmptyLineItem()` | Factory for new line items |
| `calculateEstimateThreshold(...)` | (imported via `estimateThresholds.ts`) write-off threshold |

### Aggregate totals (assessment estimates)

`src/lib/services/estimate.service.ts` → `computeAggregateTotals(lineItems, vatPct, oemMarkup, altMarkup, secondHandMarkup, outworkMarkup, sundriesPct)` — applies markup only at aggregate level (not per-line), then adds sundries and VAT:

```
subtotal = partsSellingTotal + labourTotal + paintTotal + outworkSellingTotal  (after betterment)
sundriesAmount = subtotal * (sundriesPct / 100)
vatAmount = (subtotal + sundriesAmount) * vatPct / 100
total = subtotal + sundriesAmount + vatAmount
```

All intermediate values are rounded via `Number((x).toFixed(2))`.

### FRC calculation module

`src/lib/utils/frcCalculations.ts` — separate module for Final Repair Costing:

| Function | Purpose |
|---|---|
| `composeFinalEstimateLines(...)` | Merges estimate and additionals lines into FRC view |
| `calculateBreakdownTotals(...)` | Computes parts/SA/labour/paint subtotals |
| `applyMarkupToTotals(...)` | Applies per-category markup to breakdown |
| `calculateEstimateBreakdown(...)` | Breakdown for original estimate portion |
| `calculateAdditionalsBreakdown(...)` | Breakdown for additionals portion |
| `calculateFRCAggregateTotals(...)` | Grand totals for FRC document |

### Shop additionals

`src/lib/services/shop-additionals.service.ts` → `calculateApprovedTotals(lineItems, rates)` — handles reversal filtering before applying markup, then computes `subtotal_approved`, `vat_amount_approved`, `total_approved`.

### Vehicle values

`src/lib/utils/vehicleValuesCalculations.ts` — handles write-off math:
- `calculateAdjustedValue`, `calculateConditionAdjustmentPercentage`, `calculateExtrasTotals`, etc.
- Inputs: `VehicleValuesCalculationInput` (retail/trade values, extras, condition).
- Output: `VehicleValuesCalculationResult` (adjusted values, write-off percentages, salvage).

### Precision convention

- All monetary math uses plain JS `number` (IEEE 754 float64).
- Rounding applied at each intermediate step via `.toFixed(2)` wrapped in `Number(...)`.
- No `Decimal.js` / `big.js` / integer-cents — this is a risk (see Section 8).

---

## 3. State Layer

### No global Svelte stores for financial data

The codebase does **not** use Svelte stores (`writable`, `readable`, `$store`) for monetary state. All financial data is managed as:

1. **Server-loaded page data** (`data.estimate`, `data.invoice`) passed as props.
2. **`$derived` computed values** in the component script — recalculated reactively from props.

Key reactive financial variables in `src/routes/(shop)/shop/jobs/[id]/+page.svelte`:

```ts
const estimate = $derived(data.estimate)
// ...
const estimateSubtotal = $derived(calculateSubtotal(lineItems))
const estimateVatAmount = $derived(calculateVAT(estimateSubtotal, vatRate))
const estimateTotal = $derived(calculateTotal(estimateSubtotal, estimateVatAmount))
```

`lineItems` itself is `$state` initialized from `data.estimate.line_items` then mutated locally:

```ts
// src/routes/(shop)/shop/jobs/[id]/+page.svelte:293-297
let lineItems = $state<EstimateLineItem[]>(...)
```

In `src/lib/components/assessment/EstimateTab.svelte`, the component maintains a full local buffer of `localLineItems` as `$state`, with totals recalculated via `$derived`. Parent receives changes only on explicit save callbacks (`onAddLineItem`, `onUpdateLineItem`, `onDeleteLineItem`).

The assessment app route `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte` holds:

```ts
let estimate = $derived(...)     // from loaded data
let preIncidentEstimate = $derived(...)
```

No cross-component financial store — each page/tab manages its own copy.

---

## 4. Validation Layer

### Zod schemas

No Zod schemas for monetary fields were surfaced in any of the 5 packs. The `src/lib/utils/validation.ts` file (outline visible) contains:

- `validateVehicleIdentification`, `validateExterior360`, `validateInteriorMechanical`, `validateTyres`, `validateEstimate` (inferred from outline symbols)
- These appear to be custom `ValidationResult / TabValidation` objects, not Zod schemas.

The `validateEstimate` function is imported in `EstimateTab.svelte` and used for tab completion checks, but its internals were not surfaced — it likely checks required fields rather than monetary range constraints.

### Where validation runs

- **Form/component level**: `validateEstimate` in `EstimateTab.svelte` triggers validation before save.
- **Server actions**: `src/routes/(shop)/shop/invoices/[id]/+page.server.ts` reads `parseFloat(formData.get('amount'))` for payment recording with no explicit range guard visible in the excerpts.
- **Database level**: Monetary columns use `DECIMAL(10,2)` in migrations (e.g., `labour_rate DECIMAL(10,2) DEFAULT 500.00`), which enforces 2 decimal places at the DB layer.
- **No explicit min/max/positive constraints** on monetary inputs were observed in the surfaced code.

---

## 5. Persistence Layer

### Supabase tables with monetary columns

| Table | Monetary Columns | Type | Notes |
|---|---|---|---|
| `assessment_estimates` | `labour_rate`, `paint_rate` | `DECIMAL(10,2)` | Defaults 500/2000; added in migration `015_enhance_estimate_structure` |
| `assessment_estimates` | `subtotal`, `sundries_amount`, `vat_amount`, `total` | (DECIMAL, inferred) | Computed aggregates persisted |
| `assessment_estimates` | `oem_markup_percentage`, `alt_markup_percentage`, `second_hand_markup_percentage`, `outwork_markup_percentage`, `sundries_percentage` | DECIMAL | Rate/markup columns |
| `assessment_estimates` | `line_items` | `JSONB` | Per-line monetary fields stored as JSON — no DB-level precision enforcement on individual fields |
| `pre_incident_estimates` | `subtotal`, `vat_amount`, `total`, `labour_rate`, `paint_rate` | DECIMAL | Same shape as assessment_estimates |
| `pre_incident_estimates` | `line_items` | `JSONB` | Same JSONB pattern |
| `clients` | `borderline_writeoff_percentage`, `total_writeoff_percentage`, `salvage_percentage` | `DECIMAL(5,2)` | Added in migration `024`; defaults 65/70/28 |
| `assessment_frc` | FRC totals (subtotal, vat, total breakdowns) | (DECIMAL, inferred from migration 030/036) | Separate breakdown columns added in migration `036` |
| `shop_estimates` | `total`, `subtotal`, `vat_amount` | (DECIMAL, inferred) | Shop-side estimate; migration `20260324_005` |
| `shop_invoices` | `total`, `amount_due`, `amount_paid`, `vat_amount` | (DECIMAL, inferred) | Migration `20260324_006`; tracks payment state |
| `company_settings` | `sundries_percentage`, `default_labour_rate`, `default_paint_rate`, `default_vat_rate`, markup percentages | DECIMAL | Global defaults; migration `033` |

### Key migrations touching financial schema

- `supabase/migrations/014_create_assessment_estimates.sql` — baseline estimate table
- `supabase/migrations/015_enhance_estimate_structure.sql` — adds `labour_rate`, `paint_rate`; documents JSONB line-item structure
- `supabase/migrations/021_create_pre_incident_estimates.sql` — pre-incident estimate table with same monetary shape
- `supabase/migrations/024_add_writeoff_percentages_to_clients.sql` — write-off thresholds on clients
- `supabase/migrations/030_create_assessment_frc.sql` — FRC table
- `supabase/migrations/036_add_frc_separate_breakdowns.sql` — FRC breakdown columns
- `supabase/migrations/040_add_betterment_to_estimates.sql` — betterment percentage columns
- `supabase/migrations_archive/20251128_add_frozen_rates_markups.sql` — frozen rates/markups snapshot on estimate
- `supabase/migrations/20260324_005_create_shop_estimates.sql` — shop estimate table
- `supabase/migrations/20260324_006_create_shop_invoices.sql` — shop invoice table with payment tracking
- `supabase/migrations/20260407_003_add_original_estimate_snapshot.sql` — snapshot of original estimate at FRC time

### RLS on financial tables

`supabase/migrations/059_rls_estimates_valuations_frc.sql` — enables RLS on `assessment_estimates`, valuation, and FRC tables. Pattern: authenticated users can view; admins/owners can modify.

### RPC calls touching money

No stored procedures (RPCs) touching financial calculations were surfaced. All math runs in TypeScript service layer before writing to Supabase.

---

## 6. API Surface

### Route handlers reading/writing money

**Shop job estimate save** (`src/routes/(shop)/shop/jobs/[id]/+page.server.ts` → `saveEstimate` action):
- Reads line items from form data, calls `calculateVAT` and `calculateTotal` server-side.
- Writes: `line_items`, `subtotal`, `vat_rate`, `vat_amount`, `total`, `parts_total`, `labor_total`, `sublet_total`, `sundries_total`, `discount_amount` to `shop_estimates` via `estimateService.updateEstimate(...)`.

**Invoice payment recording** (`src/routes/(shop)/shop/invoices/[id]/+page.server.ts` → `recordPayment` action):
- `parseFloat(formData.get('amount'))` — raw float parse, no Zod, no range check.
- Writes payment to `shop_invoice_payments` via `invoiceService.recordPayment(...)`.

**Invoice send/void** — same file, `send` and `void` actions modify invoice status only (no monetary fields).

**Shop invoice PDF generation** (`src/routes/api/generate-shop-invoice/+server.ts` → `POST`):
- Reads invoice data including monetary totals from DB.
- Generates HTML via `src/lib/templates/shop-invoice-template.ts`, streams SSE progress events back.

**Assessment document generation**:
- `src/routes/api/generate-report/+server.ts` — generates assessment report PDF (reads estimate totals).
- `src/routes/api/generate-frc-report/+server.ts` — generates FRC report PDF (reads FRC totals/breakdown).

**Shop estimate list** (`src/routes/(shop)/shop/estimates/+page.server.ts`):
- Selects `shop_estimates(id, estimate_number, status, total)` — monetary `total` exposed to list view.

**Shop invoiced/completed list** (`src/routes/(shop)/shop/invoiced/+page.server.ts`):
- Auto-marks overdue invoices via direct `supabase.from('shop_invoices').update({ status: 'overdue' })` — no financial recalculation, status change only.

### External service calls

No external payment gateways, FX APIs, or third-party financial service integrations were observed in any pack. All financial operations are internal.

---

## 7. Cross-Cutting Concerns

### Currency conversion

**Does not exist.** Currency is hardcoded to `ZAR` at every layer:
- `formatCurrency` defaults `currency = 'ZAR'`
- `EstimateService.createDefault` inserts `currency: 'ZAR'`
- No exchange rate tables, no conversion functions, no multi-currency UI observed.

### Rounding strategy

Consistent `.toFixed(2)` wrapped in `Number(...)` at every computation step in `estimateCalculations.ts` and `estimate.service.ts`. This rounds to 2 decimal places after each intermediate calculation, which can accumulate rounding differences across many line items (e.g., 100 items each with a half-cent error = R0.50 total drift).

Betterment calculations (`calculateBetterment`) also apply `.toFixed(2)` per item before aggregation — this is correct but compounds rounding in aggregate.

### Multi-currency support state

**Single currency, hardcoded ZAR.** The `currency` column exists on `assessment_estimates` (value always `'ZAR'`) and the `formatCurrency` function accepts a `currency` parameter but no code ever passes a non-ZAR value. Multi-currency is a framework-only scaffold, not an active feature.

### Test coverage of financial code

No test files were surfaced in any of the 5 packs. The `src/lib/utils/estimateCalculations.ts` module — which is the mathematical core — has no visible test coverage. The `testing-workflow.md` command exists but no test files referencing financial calculations appeared in any pack outline or recent changes.

---

## 8. Risks & Gaps

### 1. Float math, no Decimal library

All monetary calculations use native JS `number`. IEEE 754 floating-point arithmetic can produce `0.1 + 0.2 = 0.30000000000000004`. The `.toFixed(2)` mitigation catches most display-level issues, but intermediate calculations before `.toFixed(2)` are susceptible. For an insurance assessment platform processing hundreds of line items, this is a material risk.

**Recommendation**: Adopt `Decimal.js` or integer-cent representation in `estimateCalculations.ts`.

### 2. Markup applied at two different levels

Assessment estimates apply markup **at aggregate level** only (`computeAggregateTotals` in `estimate.service.ts`). Shop estimates/additionals apply markup differently (per `calculateApprovedTotals` in `shop-additionals.service.ts`). FRC has yet another path via `frcCalculations.ts → applyMarkupToTotals`. Three separate markup-application implementations increase the risk of divergence.

### 3. No Zod validation on monetary inputs

Payment amount in `src/routes/(shop)/shop/invoices/[id]/+page.server.ts` is read as `parseFloat(formData.get('amount'))`. No min/max constraints, no negative value rejection, no schema validation. A submission of `-1000` or `NaN` would reach the service layer unchecked.

### 4. JSONB line items bypass DB precision

`line_items` is stored as `JSONB` in both `assessment_estimates` and `pre_incident_estimates`. Individual monetary fields inside the JSON (e.g., `part_price_nett`, `labour_cost`, `paint_cost`) have no DB-level type enforcement. Any JS float can be written; PostgreSQL `DECIMAL` constraints do not apply to JSONB sub-fields.

### 5. Null-guard in formatter returns hardcoded string

`formatCurrency(null)` returns `'R0.00'` as a bare string, bypassing `Intl.NumberFormat`. This means locale-specific formatting (digit grouping, symbol position) is not applied to zero/null values, creating a subtle inconsistency if locale ever changes.

### 6. Duplicate null-check patterns

`FRCLinesTable.svelte:getDeltaDisplay` and `FRCLineCard.svelte:getDeltaDisplay` are described as "mirrors" of each other in the pack. Logic duplication means a bug fix in one may not propagate to the other.

### 7. Shop-side DB types not typed

Multiple server files note `// NOTE: shop tables not in database.types.ts` and cast with `as any`. This removes TypeScript safety from shop invoice/estimate monetary fields at the API layer.

### 8. No financial unit tests

The mathematical core (`estimateCalculations.ts`, `frcCalculations.ts`, `vehicleValuesCalculations.ts`) appears to have zero automated test coverage. For a platform that computes insurance assessment totals, this is high-risk.

---

## Engine Feedback

### Embedding failure

All 5 packs opened with the same error: `transformer embedding load failed ... Unauthorized access to file: "https://huggingface.co/Xenova/jina-embeddings-v2-base-code/..."`. The engine fell back to deterministic (non-semantic) embeddings for all queries. Every pack's `<planner>` shows `intent="unknown"` — semantic understanding was completely absent.

### Query quality

- **Pack 1 (format)**: Retrieved the correct canonical formatter (`formatters.ts`) and FRC components. Score: **good**. The sidebar skeleton component was a false positive from lexical matching of unrelated tokens.
- **Pack 2 (totals)**: Retrieved `estimate.service.ts`, `pre-incident-estimate.service.ts`, `shop-additionals.service.ts`, and the shop job page. Score: **very good** — best-performing pack. The `computeAggregateTotals` function body was fully captured.
- **Pack 3 (stores)**: Failed to find actual Svelte stores (none exist). Retrieved migration files and shop page fragments instead. The correct conclusion (no dedicated stores — `$derived` pattern used) required inference, not direct retrieval. Score: **poor for the intended query, indirectly useful**.
- **Pack 4 (persistence/Zod)**: Found relevant migrations (FRC signoff, write-off percentages, estimate structure). Did **not** find `validation.ts` body or any Zod schemas. Retrieved exterior photo migration cleanup as filler. Score: **partial** — found DB schema but missed validation layer entirely.
- **Pack 5 (API)**: Retrieved the correct server files (`+page.server.ts` for shop jobs/invoices, `generate-shop-invoice` API route). Score: **good** — correctly identified the financial API surface.

### Files the engine missed

- `src/lib/utils/frcCalculations.ts` — appeared only in outline lists, never as primary. Its full symbol table shows 6+ financial functions but no bodies were retrieved. Required manual disk read of `estimateCalculations.ts` to fill the gap.
- `src/lib/services/shop-invoice.service.ts` — outline only (`ShopInvoice`, `ShopInvoiceLineItem` types, `createShopInvoiceService`). The full service logic was not surfaced.
- `src/lib/utils/validation.ts` — appeared in pack 4 outline only; `validateEstimate` body never retrieved.
- `src/lib/templates/estimate-template.ts` — outline only; similar to `shop-invoice-template.ts`.

### Overall engine verdict

**Marginally useful** with deterministic embeddings. Lexical retrieval found the right files for obvious keyword queries (VAT, labour_rate, formatCurrency). Semantic queries (stores, Zod schemas) returned near-random results because intent was `unknown`. With working HuggingFace embeddings this engine would likely score **useful** — the infrastructure and pack structure are sound. The current HuggingFace authorization failure is the single biggest problem and should be fixed before relying on semantic search.
