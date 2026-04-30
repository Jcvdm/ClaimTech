# ClaimTech Finance Map — v2 vs v3 Delta Report

**Generated**: 2026-04-29
**Baseline**: v2 packs (Wave 6/7, semantic embeddings + MiniLM reranker with uniform 0.500 scores, `intent="unknown"` on all packs)
**Comparison**: v3 packs (Wave 8 fixes: reranker score differentiation + intent classifier)
**Task scope**: Finance/currency mapping — currency formatting, estimate totals, stores/state, persistence, API endpoints

---

## 1. Headline Summary

### Total pack size delta v2 → v3

| Pack | v2 Size | v3 Size | Delta |
|---|---|---|---|
| Pack 1 (format, FULL) | 28.7 KB | 20.2 KB | −8.5 KB |
| Pack 2 (totals, LEAN) | 13.7 KB | 12.0 KB | −1.7 KB |
| Pack 3 (stores, LEAN) | 15.2 KB | 17.0 KB | +1.8 KB |
| Pack 4 (persistence, LEAN) | 15.1 KB | 17.3 KB | +2.2 KB |
| Pack 5 (API, LEAN) | 22.6 KB | 17.8 KB | −4.8 KB |
| **TOTAL** | **95.3 KB** | **84.3 KB** | **−11.0 KB (−12%)** |

Approximate token savings: ~2,750 tokens (~11% reduction). The savings are real but modest — v2 had already achieved the big size win over v1. The v3 gain is primarily quality, not size.

### Reranker bug fix: CONFIRMED

v2 exhibited uniform `rerank=0.500000` across all candidates — a known symptom of the sigmoid of a raw 0.0 logit (i.e., the reranker was loading but not differentiating). v3 stderr files show genuine score ranges:

| Pack | min score | max score | spread |
|---|---|---|---|
| Pack 1 (format) | −10.967 | 2.656 | **13.623** |
| Pack 2 (totals) | −11.159 | 3.008 | **14.167** |
| Pack 3 (stores) | −11.466 | −6.807 | **4.659** |
| Pack 4 (persistence) | −11.262 | −4.540 | **6.722** |
| Pack 5 (API) | −11.032 | 0.587 | **11.619** |

The reranker is now differentiating. Pack 3's narrow spread and all-negative max is significant — see Section 3 for interpretation.

### Intent classifier fix: CONFIRMED

v2: `intent="unknown"` on all 5 packs.

v3:
- Pack 1: `intent="explore"`
- Pack 2: `intent="explain"`
- Pack 3: `intent="explore"`
- Pack 4: `intent="explore"`
- Pack 5: `intent="explain"`

The classifier now correctly identifies Pack 2 (totals) and Pack 5 (API) as `explain` tasks — questions asking how something works. Packs 1, 3, 4 correctly classify as `explore` — find-where queries. This is semantically appropriate: "how amounts are rendered" (explain) vs. "where are stores" (explore).

---

## 2. Per-Pack Improvements

### Side-by-side top primary file

| Pack | v2 top primary | v3 top primary | Verdict |
|---|---|---|---|
| Pack 1 (format) | `src/lib/utils/formatters.ts` (module, rerank=0.500) | `src/lib/utils/formatters.ts` (module, rerank=**1.000**) | **Better** — correct file, now with genuine top score |
| Pack 2 (totals) | `src/routes/(shop)/shop/jobs/[id]/+page.svelte` (rerank=0.500) | `src/lib/services/pre-incident-estimate.service.ts` (rerank=**1.000**) | **Better** — service-layer math now in top primary |
| Pack 3 (stores) | `src/routes/(shop)/shop/jobs/[id]/+page.svelte` (rerank=0.500) | `src/routes/(shop)/shop/jobs/[id]/+page.svelte` (rerank=**0.689**) | **Same** — same correct answer but now scored |
| Pack 4 (persistence) | `supabase/migrations_archive/037_add_frc_signoff_fields.sql` (rerank=0.500) | `supabase/migrations_archive/059_rls_estimates_valuations_frc.sql` (rerank=**0.999**) | **Better** — RLS policies are more relevant to "persistence/validation" than FRC sign-off fields |
| Pack 5 (API) | `src/lib/supabase-server.ts` (rerank=0.500) | `src/routes/api/photo/[...path]/+server.ts` (rerank=**1.000**) | **Mixed** — photo route is a false positive (see Section 4) |

### Pack 1 — Format (FULL mode)

- `src/lib/utils/formatters.ts` retained as top primary; rerank climbed from 0.500 to 1.000, confirming the reranker now correctly identifies this as the best match.
- `formatCurrency` function body (lines 12–20) at rerank=0.850 — the reranker rightly placed the function body below the module-level entry that includes the full JSDoc context.
- `vehicleValuesCalculations.ts → formatCurrency` (rerank=0.679) — a duplicate `formatCurrency` private to that file; correctly ranked below the canonical version.
- `PreIncidentEstimateTab.svelte → normalizeMoneyInput` dropped from rerank=0.500 → 0.278 (ranked 4th out of 5 primaries). The reranker now penalizes it as less canonical than the formatter utilities. This is a mild accuracy tradeoff — `normalizeMoneyInput` is still present but deprioritized.
- `LineItemCard.svelte → costSummary` appears at rerank=0.520 — a new primary entry not in v2. It uses `formatCurrency` inline in a derived string, so it is genuinely relevant.
- Intent changed from `unknown` → `explore`. The token expansion now includes `formatCurrencyValue`, `parseLocaleNumber`, `normalizeMoneyInput`, `Intl.NumberFormat`, `labour_rate`, `paint_rate` — far richer than v2's abbreviated token list.
- Score gap between top primary (1.000) and 4th primary (0.278): spread of 0.722. The reranker is meaningfully stratifying within the primary set.

### Pack 2 — Totals (LEAN mode)

- v2 top primary was `+page.svelte → saveEstimateLineItemsNow` (page-layer autosave); v3 top primary is `pre-incident-estimate.service.ts → recalculateTotals method body` (rerank=1.000). This is the correct service-layer math function showing `calculateSubtotal / calculateVAT / calculateTotal` called together — precisely what "estimate totals" queries need.
- `shop-additionals.service.ts → calculateApprovedTotals` appears at rerank=0.704 — this function was in v2 secondary with signature-only; v3 promotes it to primary with full body.
- `shop-estimate.service.ts → ShopEstimateTotals` interface at rerank=0.782; `shop-invoice.service.ts → ShopInvoice` interface at rerank=0.791 — the typed shape of invoice totals fields now visible in primary.
- `supabase/migrations/014 → subtotal COMMENT` at rerank=0.811 — database column documentation surfaced in primary.
- `intent="explain"` vs v2's `"unknown"` changed the token expansion to include `estimate_id`, `vat_rate`, `saveEstimateLineItems`, `calculateSubtotal`, `calculateVAT`, `calculateTotal`, `computeAggregateTotals`, `calculateApprovedTotals` — these tokens drove the service-layer retrieval improvements.
- Still missing: `estimateCalculations.ts` function bodies (`calculateTotal`, `calculateSubtotal`) remain in secondary. The key utility file is referenced but not expanded.

### Pack 3 — Stores (LEAN mode)

- v2 and v3 both surface `estimateVatAmount` and `estimateTotal` `$derived` variables from `+page.svelte` as the top primary entries — correct.
- v3 adds `src/lib/components/shared/SummaryComponent.svelte → estimateThreshold $derived` (rerank=1.000) as top primary. This is a genuine improvement: it shows `calculateEstimateThreshold(estimate.total, vehicleValues.borderline_writeoff_retail)` — the threshold logic that gates write-off decisions.
- v3 also surfaces `VehicleValuesTab.svelte` with a block showing all the `$derived` chain (`sourcedMonth`, `borderlinePercentage`, `tradeAdjusted`, `accessoriesTotal`, `tradeTotalAdjusted`, `borderlineWriteoffTrade`) — this is new in v3 and highly relevant to "derived money values."
- Migration files from v2 primary (`022_create_pre_incident_estimate_photos.sql`, `025_create_assessment_vehicle_values.sql`) are demoted to secondary in v3 — a correct improvement, those were not about reactivity.
- The narrow rerank spread (4.659, all-negative max: −6.807) prevents the reranker from pulling strongly relevant files to the top — see Section 3.
- Score gap: top (SummaryComponent, implicit 1.000 normalized) vs others is real but small; `estimateVatAmount` (0.689), `estimateTotal` (0.692), `PreIncidentEstimateTab` (0.774), `VehicleValuesTab` (0.742) — a tighter cluster than Pack 1.

### Pack 4 — Persistence (LEAN mode)

- v2 top primary was `037_add_frc_signoff_fields.sql` (FRC sign-off metadata — not financial validation). v3 top primary is `059_rls_estimates_valuations_frc.sql` (RLS policies on estimates, vehicle values, FRC) at rerank=0.999/1.000. This is directly relevant to "persistence and security of monetary fields."
- The full RLS policy body appears twice: once as the module-level symbol and once as the `statement_1` symbol. Both rerank ≥0.986. The reranker strongly confirms this as the anchor document.
- `037_add_frc_signoff_fields.sql` drops to third primary at rerank=0.705 — still present but correctly de-prioritized.
- `supabase/migrations/024_add_writeoff_percentages_to_clients.sql` remains in secondary with score 0.563 — marginally relevant (DECIMAL columns with default values on the clients table).
- New in v3: `src/lib/components/assessment/FinalizeTab.svelte → allMissingFields` in secondary (rerank=0.732). This surfaces the validation gate that prevents finalization without required fields — a genuine win for the "validation" aspect of the query.
- Still missing: no Zod schema coverage. `src/lib/utils/validation.ts` not surfaced (consistent with v2). This is a codebase gap not an engine gap — if the file doesn't exist or has weak lexical signal, no engine will retrieve it.

### Pack 5 — API (LEAN mode)

- v2 top primary was `src/lib/supabase-server.ts` (service role client config — financial content: zero). v3 top primary is `src/routes/api/photo/[...path]/+server.ts` (rerank=1.000). The photo route is also a false positive but it *is* an API endpoint — the reranker correctly demoted `supabase-server.ts` but promoted the wrong `+server.ts`. See Section 4 for analysis.
- `src/routes/(shop)/shop/jobs/[id]/+page.server.ts` appears at rerank=0.758 and 0.741 — correctly high, this file contains `saveEstimateLineItems`, `updateEstimateRates`, and `createInvoice` action handlers.
- `src/routes/(shop)/shop/estimates/+page.server.ts → actions` at rerank=0.767 — estimate lifecycle actions in primary.
- `src/routes/(shop)/shop/dashboard/+page.server.ts → load` at rerank=0.809 — dashboard aggregation query shows `total` field selection from `shop_estimates`. This is new and marginally relevant; v2 did not have it.
- `intent="explain"` expansion now includes `+server.ts`, `API`, `routes`, `supabase calls` — driving better API file retrieval.
- Score gap: photo route at 1.000 vs jobs server at 0.758 — a 0.242 gap. The reranker assigned photoproxy as most "API-like" which is technically correct but semantically wrong for financial queries.

---

## 3. Reranker Behavior Analysis

### Per-pack score ranges from stderr

| Pack | min | max | spread | Interpretation |
|---|---|---|---|---|
| Pack 1 (format) | −10.967 | **2.656** | 13.623 | Healthy. Strong positive max means reranker found genuinely high-confidence matches. Top candidates well-separated from noise floor. |
| Pack 2 (totals) | −11.159 | **3.008** | 14.167 | Healthiest. Best separation of any pack. `pre-incident-estimate.service.ts` presumably scored near 3.0. |
| Pack 3 (stores) | −11.466 | **−6.807** | 4.659 | Critical insight: all-negative max. No candidate scored above −6.8. This means the reranker found no strong match in the entire candidate pool for this query. |
| Pack 4 (persistence) | −11.262 | **−4.540** | 6.722 | All-negative max, but less extreme than Pack 3. The "best" match is weak; the RLS migration is the strongest among a mediocre set. |
| Pack 5 (API) | −11.032 | **0.587** | 11.619 | Moderate positive max. The photo route apparently scored ~0.587 — above zero but not a confident positive. |

### Pack 3 interpretation: honest "no strong match"

Pack 3's max score of −6.807 is the engine's honest admission that the codebase does not contain a canonical "financial stores" file. There are no Svelte stores in the traditional `writable`/`readable` sense — this is a Svelte 5 codebase using `$state`/`$derived`. The reranker correctly penalized every candidate, producing a low-confidence result set.

This should be read as a signal to the consumer: "the concept you queried does not map cleanly to a single file; the answer is distributed across component-local reactive state." The engine surfaces the best-available candidates (`$derived` variables in `+page.svelte`, `SummaryComponent.svelte`, `VehicleValuesTab.svelte`) while the negative-territory scores signal low confidence — valuable diagnostic information.

### Pack 4 interpretation: weak-domain match

Pack 4's max of −4.540 similarly signals that "Zod schemas for monetary fields" don't exist. The best available candidates are database migration files with RLS policies — structurally related (they define what can be written to financial tables) but not the input-layer validation the query implied.

### Calibration assessment

Packs 1 and 2 show well-calibrated behavior: positive max scores, large spreads, and top primaries that accurately reflect the query. Packs 3 and 4 show all-negative pools but the ordering within those negative candidates is still meaningful — the engine is saying "the best of a weak set." Pack 5 sits between these extremes. Overall, the reranker is now calibrated correctly and its score magnitude is carrying useful signal about retrieval confidence.

---

## 4. Remaining Issues After v3 Fixes

### Pack 5: Photo route as top primary (score 1.000)

`src/routes/api/photo/[...path]/+server.ts` scored 1.000 in Pack 5. This file:
- Is a `+server.ts` route (matches `"route handlers"` in the query)
- Contains the word `api` in its path (matches query identifier `API server.ts`)
- Has `RequestHandler` type and `GET`/`OPTIONS` exports

However it has zero financial content — it proxies authenticated photo downloads from Supabase storage. It does not touch `amount_due`, `vat_rate`, `subtotal`, or any monetary field.

**Why it happened**: The query token expansion by the `explain` intent likely weighted `"+server.ts"`, `"API"`, and `"routes"` heavily. The photo proxy is the most "API-like" route by structure (pure endpoint, no page load, two HTTP verbs) and matched those structural tokens. The reranker's cross-encoder did not penalize the absence of financial terms because the cross-encoder evaluated the structural match, not domain-semantic match.

**Is it a false positive?** Yes. The document index entry (`path="src/routes/api/photo/[...path]/+server.ts"` as a full-module symbol) is structurally identical to what a financial API route would look like. Without a financial-specific re-ranking signal, the cross-encoder cannot distinguish.

**Fix suggestion**: Add negative examples to the cross-encoder fine-tuning: "photo proxy routes are not financial API handlers."

### Pack 3: Best-of-a-weak-set answer

The `$derived` financial variables in `+page.svelte` and `SummaryComponent.svelte` are the correct answer for "where are the derived financial values held." The codebase genuinely does not have dedicated financial state modules — each component manages its own reactive state inline. The engine is not wrong; it is answering an architectural reality. The v2→v3 improvement (surfacing `SummaryComponent.svelte → estimateThreshold` and `VehicleValuesTab.svelte`'s derived chain) makes the answer more complete.

### Pack 4: No Zod validation coverage

Both v2 and v3 fail to surface any Zod schema covering monetary fields because none exist. The engine correctly retrieves the next-best-fit: database-level validation (RLS + DECIMAL constraints in migrations). This is accurate but incomplete for a developer looking to add frontend validation.

### Pack 4: Did the fixes help?

Yes. The RLS policy migration (`059`) is promoted from a low-weight secondary in v2 to the top primary in v3 with rerank=0.999. The `FinalizeTab.svelte → allMissingFields` validation gate is new in v3. The score ordering now places the most security-relevant files first rather than the FRC sign-off migration (which is audit trail, not validation).

---

## 5. Coverage Delta

### Files in v2 primary/secondary but not in v3

- `supabase/migrations_archive/022_create_pre_incident_estimate_photos.sql` — dropped from Pack 3 primary (correctly, it's not about financial reactivity)
- `supabase/migrations_archive/025_create_assessment_vehicle_values.sql` — dropped from Pack 3 primary to secondary (the full column schema is still accessible)
- `supabase/migrations_archive/015_enhance_estimate_structure.sql` — dropped from Pack 3 primary (labour_rate/paint_rate column definitions now in secondary)
- `src/lib/supabase-server.ts` — dropped from Pack 5 primary (correctly, not a financial API handler)
- `src/lib/components/assessment/FRCLinesTable.svelte` — no longer in Pack 1 primary (was in v2 primary with `getDeltaDisplay`)
- `src/lib/components/assessment/FRCLineCard.svelte` — same; moved to secondary in Pack 1

### Files in v3 primary/secondary but not in v2

- `src/lib/components/shared/SummaryComponent.svelte` — new Pack 3 top primary; `estimateThreshold $derived` variable showing the write-off threshold calculation
- `src/lib/components/assessment/VehicleValuesTab.svelte` — new Pack 3 primary with full `$derived` chain (borrowed values → adjustments → write-off calculations)
- `src/lib/components/assessment/LineItemCard.svelte → costSummary` — new Pack 1 primary; `formatCurrency` used inline in a derived display string
- `src/lib/components/assessment/FinalizeTab.svelte → allMissingFields` — new Pack 4 secondary; validation gate before assessment can be finalized
- `src/routes/(shop)/shop/dashboard/+page.server.ts → load` — new Pack 5 primary; dashboard query selecting `total` from `shop_estimates`
- `supabase/migrations/014 → statement_6` — new Pack 2 primary; `COMMENT ON COLUMN assessment_estimates.subtotal`
- `src/routes/api/photo/[...path]/+server.ts` — new Pack 5 top primary (false positive)

### Net assessment

v3 surfaced genuinely new correct files: `SummaryComponent.svelte` (write-off threshold) and the `VehicleValuesTab.svelte` derived chain are real gains not present in v2. The removal of photo migrations from Pack 3 primary and `supabase-server.ts` from Pack 5 primary are correct demotion improvements. The photo route false positive is the one notable regression in coverage quality.

---

## 6. Verdict

### Was Wave 8 (reranker + intent fixes) worth shipping?

**Yes, clearly.** The two bugs were compounding each other:

- The intent classifier failing caused query expansion to be lexical-only, which caused pack 3 to drift into migrations and pack 5 to pick up `supabase-server.ts`.
- The reranker failing to differentiate meant it couldn't correct those retrieval mistakes post-hoc. Every candidate scored 0.500 so the final ordering was identical to pre-reranking.

With both fixed:
- Pack 2 now leads with `recalculateTotals` service-layer math (rerank=1.000) instead of a page-layer autosave function. This is a qualitatively better answer for "how are estimate totals calculated."
- Pack 4 correctly prioritizes RLS policies over FRC sign-off fields. A developer auditing financial data security now gets the right file first.
- Pack 3's all-negative scores are now meaningful: they tell the consumer that no strong canonical answer exists, rather than falsely suggesting all candidates are equally valid.

### Is the engine ready for daily Claude Code use?

**Closer, but not yet.** Updated verdict from v2's "not yet":

**Working well:**
- Reranker now gives genuine signal; positive-max packs (1, 2) retrieve high-confidence correct answers
- Intent classification correctly distinguishes explore/explain, enriching query expansion
- Pack 2 service-layer retrieval is now reliable — the most important improvement for financial work

**Still blocking daily use:**
1. **Photo route false positive in Pack 5** — the top-ranked API file is irrelevant. A developer using the pack to audit financial API handlers will start with the wrong file. Until the cross-encoder is fine-tuned to distinguish financial from non-financial routes, Pack 5 requires manual filtering.
2. **Pack 3 structural mismatch** — the all-negative-score result signals that the codebase architecture (inline `$state`/`$derived`) does not match the query vocabulary ("stores"). A `concepts.json` overlay mapping "stores" → `["$state", "$derived", "localEstimate", "estimateSubtotal"]` would fix this permanently. Without it, every stores-type query will return a weak answer.
3. **Pack 4 Zod gap** — not an engine bug, but a documentation gap. The pack correctly retrieves DB-level validation as the best available answer, but a developer would benefit from a comment in the pack noting that no frontend validation schemas exist.

### Top 3 next-priority improvements for the maintainer

1. **`concepts.json` per-repo overlay** for this codebase mapping `financial_state` / `stores` to Svelte 5 primitives. This is the highest-leverage fix — one JSON file permanently corrects Pack 3 across all future queries.
2. **Negative example fine-tuning for the cross-encoder**: teach it that photo proxy routes, sidebar skeleton components, and select separator components score near zero for financial domain queries. A small negative set (10–20 examples from this batch) would prevent the photo route false positive.
3. **Confidence flag in pack XML**: expose a `<confidence level="low|medium|high">` attribute derived from whether the reranker max score is positive, negative-but-moderate, or deep-negative. Claude Code could use this to decide whether to issue a follow-up targeted read or trust the pack directly.
