# ClaimTech Finance Map — v1 vs v2 Delta Report

**Generated**: 2026-04-29
**Baseline**: claimtech-finance-map.md (v1, deterministic/lexical-only engine)
**Comparison**: claimtech-finance-map-v2.md (v2, semantic embeddings + MiniLM reranker, Wave 6 symbol-tier primary)

---

## Token / Size Delta

### Pack sizes side-by-side

| Pack | Query | v1 Size | v1 Approx Tokens | v2 Size | v2 Approx Tokens | Mode |
|---|---|---|---|---|---|---|
| Pack 1 (format) | Currency formatting | ~37 KB | ~9,300 | 28.7 KB | ~7,200 | FULL |
| Pack 2 (totals) | Estimate/invoice totals | ~37 KB | ~9,300 | 13.7 KB | ~3,400 | LEAN |
| Pack 3 (stores) | Stores/state/derived | ~37 KB | ~9,300 | 15.2 KB | ~3,800 | LEAN |
| Pack 4 (persistence) | Validation/persistence | ~37 KB | ~9,300 | 15.1 KB | ~3,800 | LEAN |
| Pack 5 (API) | API route handlers | ~37 KB | ~9,300 | 22.6 KB | ~5,700 | LEAN |
| **TOTAL** | | **~185 KB** | **~46,500** | **~95.3 KB** | **~23,900** | |

**Net reduction**: ~90.7 KB less (~49% smaller) and ~22,600 fewer tokens (~49% reduction).

_v1 sizes reconstructed from average: the v1 engine produced 5 packs each approximately 37 KB based on the 184 KB total. v2 byte sizes taken from the task specification._

### Why the reduction

LEAN mode packs (2–5) strip secondary excerpts down to signatures rather than full bodies, and the symbol-tier primary means each primary slot carries one function body rather than a 100-line file chunk. Pack 1 is FULL mode (still smaller than v1 because the reranker eliminates weaker candidates).

---

## Coverage Delta

### Files cited in v1 report

1. `src/lib/utils/formatters.ts`
2. `src/lib/components/assessment/FRCLinesTable.svelte`
3. `src/lib/components/assessment/FRCLineCard.svelte`
4. `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte`
5. `src/lib/components/shop/ShopAdditionalsPanel.svelte`
6. `src/lib/components/assessment/EstimateTab.svelte`
7. `src/routes/(shop)/shop/jobs/[id]/+page.svelte`
8. `src/routes/(shop)/shop/invoices/[id]/+page.svelte`
9. `src/lib/templates/shop-estimate-template.ts`
10. `src/lib/templates/shop-invoice-template.ts`
11. `src/lib/utils/estimateCalculations.ts`
12. `src/lib/services/estimate.service.ts`
13. `src/lib/utils/frcCalculations.ts`
14. `src/lib/services/shop-additionals.service.ts`
15. `src/lib/utils/vehicleValuesCalculations.ts`
16. `src/lib/services/shop-invoice.service.ts`
17. `src/lib/utils/validation.ts`
18. `src/routes/(shop)/shop/jobs/[id]/+page.server.ts`
19. `src/routes/(shop)/shop/invoices/[id]/+page.server.ts`
20. `src/routes/api/generate-shop-invoice/+server.ts`
21. `src/routes/api/generate-report/+server.ts`
22. `src/routes/api/generate-frc-report/+server.ts`
23. `src/routes/(shop)/shop/estimates/+page.server.ts`
24. `src/routes/(shop)/shop/invoiced/+page.server.ts`
25. Various supabase migrations (015, 021, 024, 030, 036, 040, 059, 20260324_005/006, 20260407_003)

### Files cited in v2 report

1. `src/lib/utils/formatters.ts`
2. `src/lib/components/assessment/FRCLinesTable.svelte`
3. `src/lib/components/assessment/FRCLineCard.svelte`
4. `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte`
5. `src/lib/components/shop/ShopAdditionalsPanel.svelte`
6. `src/lib/components/assessment/EstimateTab.svelte`
7. `src/routes/(shop)/shop/jobs/[id]/+page.svelte`
8. `src/routes/(shop)/shop/invoices/[id]/+page.svelte`
9. `src/lib/templates/shop-invoice-template.ts`
10. `src/lib/utils/estimateCalculations.ts`
11. `src/lib/services/estimate.service.ts`
12. `src/lib/utils/frcCalculations.ts`
13. `src/lib/services/shop-additionals.service.ts`
14. `src/lib/utils/vehicleValuesCalculations.ts`
15. `src/lib/services/shop-invoice.service.ts`
16. `src/routes/(shop)/shop/jobs/[id]/+page.server.ts`
17. `src/routes/(shop)/shop/invoices/[id]/+page.server.ts`
18. `src/routes/(shop)/shop/estimates/+page.server.ts`
19. `src/routes/(shop)/shop/invoices/+page.server.ts`
20. `src/routes/api/generate-shop-invoice/+server.ts`
21. `src/lib/components/assessment/PreIncidentEstimateTab.svelte` (**only in v2**)
22. `src/lib/components/assessment/RatesConfiguration.svelte` (**only in v2**)
23. `src/lib/components/shop/ShopAdditionalLineItemCard.svelte` (**only in v2**)
24. `src/lib/services/shop-estimate.service.ts` (ShopEstimateTotals interface) (**only in v2**)
25. `supabase/migrations_archive/025_create_assessment_vehicle_values.sql` — full column schema (**only in v2 with detail**)
26. `supabase/migrations/20260407_003_add_original_estimate_snapshot.sql` (**only in v2**)
27. `supabase/migrations_archive/037_add_frc_signoff_fields.sql` (**new in v2 primary**)
28. Various supabase migrations (015, 021, 024, 059)

### Coverage sets

**Only in v1** (missed by v2):
- `src/lib/utils/validation.ts` — v1 mentioned it (outline only); v2 didn't surface it at all. The `validateEstimate` function remains unexamined in both, but v1 at least noted its existence.
- `src/lib/templates/shop-estimate-template.ts` — cited in v1 with PDF totals breakdown context; v2 Pack 3 secondary shows a fragment but didn't promote it as a primary citation.
- `src/routes/api/generate-report/+server.ts` and `src/routes/api/generate-frc-report/+server.ts` — assessment-side PDF generation routes appeared in v1 but not v2.
- `src/routes/(shop)/shop/invoiced/+page.server.ts` — auto-overdue-marking logic noted in v1; not in v2.

**Only in v2** (missed by v1):
- `src/lib/components/assessment/PreIncidentEstimateTab.svelte` — `normalizeMoneyInput` / `parseLocaleNumber` pattern is new and significant (input normalization).
- `src/lib/components/assessment/RatesConfiguration.svelte` — the rates-edit UI component; imports `formatCurrency` and manages `localLabourRate` etc.
- `src/lib/components/shop/ShopAdditionalLineItemCard.svelte` — additional line item display component using `formatCurrency`.
- `src/lib/services/shop-estimate.service.ts → ShopEstimateTotals` interface — typed shape of shop estimate aggregate totals; entirely absent in v1.
- `supabase/migrations/20260407_003_add_original_estimate_snapshot.sql` — `original_subtotal/vat_amount/total DECIMAL(12,2)` on `shop_additionals`; new table-level financial schema detail.
- Full `assessment_vehicle_values` column listing (18+ monetary DECIMAL columns from migration 025).

**In both**: All core files (formatters, estimateCalculations, estimate.service, FRC components, shop job/invoice pages, key migrations).

---

## Quality Observations Per Pack

### Pack 1 — Format (FULL mode, semantic+lexical)

**Primary files**: `formatters.ts` (module + `formatCurrency` symbol), `PreIncidentEstimateTab.svelte` (`normalizeMoneyInput`), `FRCLinesTable.svelte` (`getDeltaDisplay`), `FRCLineCard.svelte` (`getDeltaDisplay`).

**Assessment**: Better than v1. The symbol-tier primary correctly zoomed in on `formatCurrency` body (lines 12–20) rather than serving the entire 140-line formatters.ts. New in v2: `normalizeMoneyInput` from `PreIncidentEstimateTab.svelte` — a genuine win, revealing the input-parsing counterpart to `formatCurrency` that v1 missed entirely. The `RatesConfiguration.svelte` entry in secondary is also a correct addition.

**False positives**: `sidebar-menu-skeleton.svelte` and `select-separator.svelte` appeared in secondary via semantic channel — clearly irrelevant. The reranker should have pushed these lower; it assigned all entries `rerank=0.500000`, suggesting the MiniLM reranker scores were either uniform or not differentiating at this granularity. This is a reranker-effectiveness concern.

**Symbol-tier verdict**: Win. The `formatCurrency` function body at the exact right lines is more useful than a whole-file dump.

---

### Pack 2 — Totals (LEAN mode, lexical+semantic)

**Primary files**: Shop jobs page (`saveEstimateLineItemsNow`, `lineItems`), shop invoices page (`lineItems`), `EstimateTab.svelte` (`localLineItems`), migration 20260407_003.

**Assessment**: Comparable to v1 but different focus. v1 Pack 2 put `estimate.service.ts` and `computeAggregateTotals` in primary (very high value). v2 demotes those to secondary. The primary instead focuses on page-layer state and the auto-save pattern (`saveEstimateLineItemsNow`) — useful, but the service-layer math was more architecturally relevant. Secondary recovers `estimate.service.ts` module, `calculateFRCAggregateTotals`, `calculateApprovedTotals`, `ShopEstimateTotals` — so the information is present, but in secondary (signature-only in LEAN mode) rather than full bodies.

**LEAN mode loss**: `computeAggregateTotals` body not surfaced. This was the key function showing the aggregate markup + sundries + VAT formula. LEAN secondary only provides a module-level reference. This is a genuine regression vs. v1.

**Symbol-tier verdict**: Mixed. Primary got the right files but wrong symbol priority (page-layer state over service-layer math).

---

### Pack 3 — Stores (LEAN mode, lexical+semantic)

**Primary files**: Shop jobs page (`estimateVatAmount`, `estimateTotal` derived variables), migrations for `pre_incident_estimate_photos` and `assessment_vehicle_values`, migration 015 (estimate structure).

**Assessment**: Still poor for the intended query, but the outcome is correct by accident. There are no Svelte stores (`writable`, `readable`) in this codebase — the query intends `$state`/`$derived`. The pack found the `$derived` financial variables in the shop job page (`estimateVatAmount`, `estimateTotal`), which is the correct answer. However, the remaining primary slots went to photo and vehicle-values migrations — irrelevant to the stores/reactivity question.

**Query/codebase mismatch remains**: The query uses terms like "stores", "writable", "readable" — none of which exist in the codebase. The engine correctly included `$state` and `$derived` as query tokens but the retrieval still drifted to migration files via lexical matching of unrelated terms. v2 was no better than v1 here.

**Recommendation**: This is the strongest case for a `per-repo concepts.json` overlay. A concepts file mapping `"financial state"` → `["$state", "$derived", "localLineItems", "estimateSubtotal"]` would fix this pack's drift for every future query in this repository.

**Symbol-tier verdict**: The two `$derived` variables as symbols (single line each) are precisely correct — more useful than a 100-line file chunk. But only 2 of 5 primary slots were on-target.

---

### Pack 4 — Persistence/Validation (LEAN mode, lexical+semantic)

**Primary files**: Migration 037 (FRC sign-off fields — archives + live), migration 059 (RLS policies on estimates/valuations/FRC), migration 024 (write-off percentages on clients), migration 081 (exterior photo column removal).

**Assessment**: Better than v1 for DB schema coverage. v2 surfaced the full RLS policy text for `assessment_estimates`, `assessment_vehicle_values`, and `assessment_frc` — v1 only mentioned migration 059 without the full policy bodies. The write-off percentage defaults (65/70/28) are now documented from the migration body.

**Still missing**: `src/lib/utils/validation.ts` — not surfaced. The query explicitly asks for "Zod schemas" but none exist, and the validation file was not retrieved. Also, migration 081 (exterior photo cleanup) is irrelevant to financial validation — a false positive.

**Reranker observation**: All entries score `rerank=0.500000`. The MiniLM reranker is not differentiating between candidates — either all candidates score near 0.5 on the cross-encoder or the reranker is not running properly. This is the same behavior as v1's `intent="unknown"` fallback.

**Symbol-tier verdict**: Marginal improvement. Full migration bodies in primary are useful for schema documentation but the lack of Zod or validation.ts coverage leaves the key question unanswered.

---

### Pack 5 — API (LEAN mode, lexical+semantic)

**Primary files**: `src/lib/supabase-server.ts` (service client config), `src/routes/(shop)/shop/jobs/[id]/+page.server.ts` (load function + 3 action blocks).

**Assessment**: Better than v1. The symbol-tier primary correctly decomposed the 741-line `+page.server.ts` into 4 targeted symbols: the load function showing the rate cascade, plus 3 action blocks covering `declineEstimate`, `updateEstimateRates`, `saveEstimateLineItems`, `createInvoice`. v1 described the same file but as a whole-file excerpt. The symbol decomposition exposes the exact field writes in `saveEstimateLineItems` (lines 468–568) — much more useful for audit.

**New detail**: The rate fallback chain (`estimate → settings → hardcoded default`) is now visible in the load function body. This was implicit in v1 but explicit in v2.

**False positive**: `src/lib/supabase-server.ts` as primary #1 is incorrect — it describes the service role client configuration, not financial API handlers. The reranker placed it at score 0.650 (the boosted top position) but it adds no finance-specific information.

**Secondary wins**: `src/routes/(shop)/shop/invoices/[id]/+page.server.ts` actions (load + `recordPayment`), `src/routes/(shop)/shop/estimates/+page.server.ts` actions — all correct and relevant.

**Symbol-tier verdict**: Strong win for multi-symbol decomposition of the large server file. The targeted action block bodies are precisely the right granularity for an API audit.

---

## Engine Feedback (v2-specific)

### Intent classification

All 5 packs: `intent="unknown"`, `test_shaped="false"`. Identical to v1. The semantic embedding and MiniLM reranker are running (channels show `"lexical+semantic"` and `"semantic"` alongside `"lexical"`) but the intent classifier still fails to categorize queries. This suggests the intent classifier is a separate component that was not updated or fixed as part of this upgrade.

**Practical impact**: Planner tokens (query expansion, identifier extraction) are still lexical-only. `ZAR` is the only identifier extracted across all packs. Concept drift in Pack 3 (stores → migration files) is a direct consequence of failed intent classification.

### Pack 3 (stores) — query/codebase mismatch diagnosis

The stores pack result is still poor due to the same structural mismatch as v1: the query vocabulary ("stores", "writable", "readable") does not appear in the codebase. The semantic channel helps (it found `$derived` variables), but the remaining primary slots drift to tangentially-related migration files.

**Recommended fix**: Implement a `per-repo concepts.json` overlay. For this repo specifically:

```json
{
  "financial_state": {
    "description": "How financial values are held in memory in this Svelte 5 codebase",
    "synonyms": ["stores", "writable", "reactive state", "financial stores"],
    "maps_to": ["$state", "$derived", "localLineItems", "localEstimate", "estimateSubtotal"]
  }
}
```

This would redirect the "stores" query to the `$derived` variables without needing to fix intent classification.

### Reranker effect

The MiniLM reranker is present (`rerank` scores in all pack entries) but all scores are uniformly `0.500000`. This means the reranker is either:
- Not differentiating candidates (all at decision boundary)
- Outputting raw logit 0.0 which maps to sigmoid(0) = 0.5
- Running but its output is not being used to re-sort candidates

**Observed outcome**: Pack 1 top-primary is correctly `formatters.ts` at score 0.650 (pre-boost dominates, not reranker). Pack 5 top-primary is `supabase-server.ts` at score 0.650 (lexical boost, wrong answer the reranker should have corrected). The reranker did not push the obviously-wrong `supabase-server.ts` entry down — which it should have, since it has no financial field content.

**Verdict on reranker**: The semantic channels are working (new files found via `"channels": "semantic"`) but the cross-encoder reranker is not functioning as a discriminator. All the real quality gains come from the semantic retrieval embedding, not the MiniLM reranking step.

### Cases where v2 reranker improved over v1

- Pack 1: `normalizeMoneyInput` from `PreIncidentEstimateTab.svelte` found via semantic channel — correct addition, missed by v1's pure lexical retrieval.
- Pack 2: `ShopEstimateTotals` interface from `shop-estimate.service.ts` found via semantic channel — adds typed shape info v1 missed.
- Pack 5: Multi-symbol decomposition of `+page.server.ts` shows individual action bodies — far more useful than v1's whole-file approach.

### Cases where v2 regressed vs v1

- Pack 2: `computeAggregateTotals` body demoted to secondary (outline only in LEAN). v1 had the full function body in primary — this was the most useful single piece of information in the totals query.
- Pack 5: `supabase-server.ts` as the top primary is a false positive the reranker should have suppressed. v1 led with `estimate.service.ts` which was more relevant.

---

## Verdict — Was the Upgrade Worth It?

### The upgrade produced real gains

- **49% token reduction** (23,900 vs ~46,500 tokens) while maintaining comparable coverage. This is the most unambiguous win: 5 packs that cost half as many tokens.
- **Symbol-tier primary is a genuine improvement** for large files. `+page.server.ts` decomposed into 4 targeted action blocks instead of one 100-line chunk. `formatCurrency` body surfaced at exact lines instead of the whole formatters module. This is the right direction.
- **Semantic channel found 3 new relevant files**: `PreIncidentEstimateTab.svelte (normalizeMoneyInput)`, `RatesConfiguration.svelte`, `ShopAdditionalLineItemCard.svelte`. These were real gaps in v1's lexical-only retrieval.
- **Vehicle values schema completeness**: Full 18-column DECIMAL breakdown in migration 025 — useful schema documentation that v1 missed.

### The upgrade has real limitations

- **Intent classifier still broken**: `intent="unknown"` on all 5 packs. The semantic embeddings partially compensate, but concept drift (Pack 3 drifting to photo migrations) persists.
- **MiniLM reranker not differentiating**: All `rerank=0.500000`. The reranker is not correcting the false-positive `supabase-server.ts` placement or the Pack 3 drift. Effectively, the reranker contributed no observable quality improvement in this batch.
- **LEAN mode loses key function bodies**: `computeAggregateTotals` in Pack 2 was the highest-value body in v1; v2 LEAN secondary gives only a module reference. For deep financial audits, LEAN mode packs should be used alongside at least one FULL mode follow-up pack for the service layer.
- **22-minute cold index + 570 MB download** is a one-time cost for a shared codebase. Amortized over multiple queries, the per-query cost drops. But for a small codebase (ClaimTech) the incremental quality gain over well-crafted lexical queries is moderate, not transformative.

### Is the engine usable for daily Claude Code workflows?

**Not yet, with current settings.** Blocking issues:
1. The reranker needs to actually differentiate scores (investigate sigmoid calibration or temperature on the cross-encoder).
2. A `concepts.json` overlay for this repo would fix the Pack 3 structural mismatch and pay dividends on every stores/state query.
3. For daily use, LEAN mode should be the default (token budget is the right trade-off) but at least one pack per session should be FULL mode to ensure service-layer function bodies are available.

**With those fixes**: The engine would be usable for daily workflows. The semantic retrieval (channel `"semantic"` entries) is already finding files that lexical search cannot — that value compounds over time as the codebase grows and keyword density decreases relative to semantic similarity.

**Current verdict**: Marginally better than v1 for this task (more files found, fewer tokens consumed), but not yet at the quality threshold where it reliably outperforms a skilled human using grep + targeted file reads.
