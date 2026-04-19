# Refactor PR 5 — Adopt `formatters.ts` at Bypass Sites (scoped)

**Created**: 2026-04-18
**Status**: Planning → In Progress
**Complexity**: Simple-to-moderate (mechanical import + replace across ~25 files; no new logic)
**Source plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`
**Branch**: `claude/confident-mendel`
**Depends on**: PR 1 (`e5bb64b`), PR 2 (`b4c5838`), PR 3 (`bd9d3a4`), PR 4 (`e0e6ed5`)

## Overview

Audit 2C found **`src/lib/utils/formatters.ts` has 53 callsites but 87 bypass sites** where components/services inline currency and date formatting instead of using the utility. The Explore-triage agent for PR 5 enumerated each bypass and classified it. This PR adopts the **scoped high-confidence subset**: ~65 replacements across service layer + already-formatters-importing files + shop-route pages.

**Zero new code.** Add imports where needed, replace inline patterns with existing formatter calls, delete dead variables.

## `formatters.ts` exports (verified 2026-04-18)

All 8 functions live in `src/lib/utils/formatters.ts`:

| Function | Signature | Use |
|----------|-----------|-----|
| `formatCurrency(value, currency='ZAR')` | number\|null\|undefined → string | ZAR with R prefix, 2 decimals, null→'R0.00' |
| `formatDate(dateString)` | string\|null → string | `'15 Jan 2025'` or `'N/A'` |
| `formatDateLong(dateString)` | string\|null → string | `'15 January 2025'` or `'N/A'` |
| `formatDateTime(dateString)` | string\|null → string | `'15 Jan 2025, 14:30'` or `'N/A'` |
| `formatDateNumeric(dateString)` | string\|null → string | `'15/01/2025'` or `'N/A'` |
| `formatRelativeTime(dateString)` | string → string | `'2 hours ago'` |
| `formatDateWithWeekday(dateString)` | string\|null → string | `'Monday, 15 January 2025'` or `'N/A'` |
| `formatVehicle(year?, make?, model?)` | → string | `'2020 Toyota Corolla'` or `'N/A'` |

## Scope — IN

Three tiers, all IN scope for this PR:

### Tier A — Service layer (3 files, 8 hits)

| File | Lines | Replace |
|------|-------|---------|
| `src/lib/services/estimate.service.ts` | 77–80 | `value.toFixed(2)` → `formatCurrency(value)` |
| `src/lib/services/frc.service.ts` | 194, 590 | `value.toFixed(2)` → `formatCurrency(value)` |
| `src/lib/services/shop-additionals.service.ts` | 62, 65 | `value.toFixed(2)` → `formatCurrency(value)` |

Add `import { formatCurrency } from '$lib/utils/formatters';` to each if missing.

### Tier B — Components that already import `formatters` or are adjacent to import (high-confidence)

Currency:

| File | Lines | Replace |
|------|-------|---------|
| `src/lib/components/assessment/AdditionalsTab.svelte` | 1004, 1008, 1032, 1036, 1060, 1064, 1088, 1092, 1117, 1121, 1127 (11 hits) | `.toFixed(2)` → `formatCurrency(value)` — already imports `formatCurrency` per Explore findings |
| `src/lib/components/shop/ItemTable.svelte` | 117, 145 | `.toFixed(2)` → `formatCurrency(value)` — verify import; add if missing |
| `src/routes/(app)/work/additionals/+page.svelte` | 255 | `.toLocaleString('en-ZA', { style: 'currency' })` → `formatCurrency(value)` |

Dates — `.toLocaleDateString()` (no-arg, browser-default) → `formatDate`:

| File | Lines | Replace |
|------|-------|---------|
| `src/routes/(app)/work/[type]/+page.svelte` | 26 | `.toLocaleDateString()` → `formatDate(dateString)` |
| `src/lib/components/assessment/EstimateTab.svelte` | 826, 828 | `.toLocaleDateString()` → `formatDate(dateString)` |
| `src/lib/components/assessment/FRCTab.svelte` | 594, 596, 1014 (3 hits) | `.toLocaleDateString()` → `formatDate(dateString)` |
| `src/lib/components/assessment/FRCLinesTable.svelte` | 435 | `.toLocaleDateString()` → `formatDate(dateString)` |
| `src/lib/components/shared/SummaryComponent.svelte` | 203, 425, 427 (3 hits) | `.toLocaleDateString()` → `formatDate(dateString)` |
| `src/lib/components/assessment/VehicleValuesTab.svelte` | 353 | `.toLocaleDateString()` → `formatDate(dateString)` |
| `src/routes/(app)/clients/[id]/+page.svelte` | 191, 203 | `.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })` → `formatDate(dateString)` |
| `src/routes/(app)/work/appointments/[id]/+page.svelte` | 181, 258 | `.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })` → `formatDateLong(dateString)` |

### Tier C — Shop route pages (high-value cluster, likely share an import style)

These 10 shop-scoped pages all have identical `.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })` patterns + `new Intl.NumberFormat('en-ZA', { style: 'currency' })` patterns. Batch them:

| File | Dates | Currency |
|------|-------|----------|
| `src/routes/(shop)/shop/jobs/[id]/+page.svelte` | 128, 221, 1110, 1324, 1955, 1984, 2096, 2125, 2154 (9 hits) | 413, 498, 569, 573 (4 hits `.toFixed(2)`) |
| `src/routes/(shop)/shop/jobs/[id]/+page.server.ts` | — | 465 (1 hit `.toFixed(2)`) |
| `src/routes/(shop)/shop/jobs/+page.svelte` | 42 | — |
| `src/routes/(shop)/shop/invoices/[id]/+page.svelte` | 50 | 45 (`Intl.NumberFormat`) |
| `src/routes/(shop)/shop/invoices/+page.svelte` | 42 | 37 (`Intl.NumberFormat`) |
| `src/routes/(shop)/shop/invoiced/+page.svelte` | 16 | 25 (`Intl.NumberFormat`) |
| `src/routes/(shop)/shop/estimates/+page.svelte` | 46 | 41 (`Intl.NumberFormat`) |
| `src/routes/(shop)/shop/dashboard/+page.svelte` | 79 | 88 (`Intl.NumberFormat`) |
| `src/routes/(shop)/shop/customers/[id]/+page.svelte` | 63 | — |
| `src/routes/(shop)/shop/completed/+page.svelte` | 15 | 24 (`Intl.NumberFormat`) |
| `src/routes/(shop)/shop/cancelled/+page.svelte` | 41 | 36 (`Intl.NumberFormat`) |
| `src/lib/components/shop/ShopJobCard.svelte` | 25, 35 | — |

For dates: `.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })` → `formatDate(dateString)`. The en-ZA short format + day-2-digit vs day-numeric is a tiny semantic diff (`15` vs `15` — both produce the same output for a double-digit day; single-digit days will show as `1 Jan 2025` with `formatDate` vs `01 Jan 2025` in the current code). **This is acceptable — both are valid and `formatDate` matches the app's main date style.** Document this in the report.

For currency: `new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value)` → `formatCurrency(value)`. Exact match.

Add `import { formatCurrency, formatDate } from '$lib/utils/formatters';` to each file that doesn't already have it.

## Scope — OUT (explicit skips)

**DO NOT replace** these patterns:

### Semantic skips (different meaning, not formatter candidates)

1. **Form-input value bindings**: `.toFixed(2)` inside `<input bind:value>` or similar — those are precision guarantees for form state, not display formatting. Specifically:
   - `src/lib/components/assessment/PreIncidentEstimateTab.svelte:338, 362`
   - `src/lib/components/assessment/EstimateTab.svelte:566, 593`

2. **Percentage displays**: `.toFixed(2)` for percentage values (not currency):
   - `src/lib/components/assessment/VehicleValuesTab.svelte:644, 647, 650`

3. **Data transformation for SQL** (`.toISOString().split('T')[0]` producing `YYYY-MM-DD`): SKIP ALL. Not a display concern.
   - All service-layer hits (`task.service.ts`, `shop-job.service.ts`, `shop-invoice.service.ts`, `shop-estimate.service.ts`)
   - All component/route form-date-initialization hits

4. **Non-ZA locale**: `.toLocaleTimeString('en-US')` in `/work/assessments/[appointment_id]/+page.svelte:171, 220` — intentional en-US, not an oversight.

5. **Settings precision**: `src/routes/(app)/settings/+page.server.ts:70` — `.toFixed(2)` for config storage precision, not display.

### Deferred — require new formatter helpers (OUT of this PR)

1. **Time-only displays**: `.toLocaleTimeString('en-ZA')` hits in `src/routes/(shop)/shop/jobs/[id]/+page.svelte` (7 hits at lines 129, 1111, 1956, 1985, 2097, 2126, 2155) and `src/lib/components/shop/ShopJobNotes.svelte:44, 45, 76, 77`. There is NO existing `formatTime()` in formatters.ts. **SKIP this PR.** A future PR 5.5 can add `formatTime()` + adopt these.

### Large-scale skips — leave for a dedicated future PR

1. **Calculation utility libraries**: `src/lib/utils/frcCalculations.ts` (~25 hits of `.toFixed(2)`) and `src/lib/utils/estimateCalculations.ts` (~10 hits). These are intermediate calculation values, often wrapped in string templates or stored. **SKIP this PR** — treat as a separate cleanup pass.

### Infrastructure skips (always)

- `src/lib/utils/formatters.ts` itself (source of truth)
- `src/lib/utils/table-helpers.ts` (has its own intentional en-ZA date call)
- `src/lib/templates/*.ts` (PDF templates with intentional formatting)
- `*.test.ts`, `*.spec.ts`
- `src/service-worker.ts`, `src/app.html`, config files

## Use Serena MCP to save tokens

Pattern detection is grep's job. Context-checking is Serena's:

- `mcp__serena__get_symbols_overview` on any file before reading — get method/function list + line ranges.
- `mcp__serena__find_symbol` with `include_body=True` only on the function containing the bypass — confirms surrounding context (e.g. is this inside a `{#each}` loop where the replacement makes sense, or inside a form binding where it shouldn't be touched).
- **Don't read entire files** unless the bypass is isolated and you need the full import block — a single `Read` of the top 20-30 lines is usually enough for that.

## Implementation approach

Work in 3 batches, each verifiable independently:

### Batch 1 — Service layer (8 hits, 3 files)
Safest starting point. Already-imported-formatters likely. Type-check after this batch.

### Batch 2 — Already-importing components (~22 hits, 9 files)
Mostly assessment tabs + `/work/additionals` + `/clients/[id]`. Type-check.

### Batch 3 — Shop route pages (~35 hits, 13 files)
Biggest cluster. The pattern is stable — each shop page has near-identical `toLocaleDateString` + `Intl.NumberFormat` usage. Add the import to each file, replace, type-check. If any file exhibits unusual behavior, skip it and note in report.

## Hard constraints

1. **Zero behavior change.** The inline patterns and the formatter calls must produce visually identical output (modulo tiny leading-zero differences on single-digit days — acceptable, document in report).
2. **Don't touch out-of-scope files** listed above.
3. **Don't introduce new formatters** (no `formatTime`, no `formatPercentage`). That's for a future PR.
4. **Don't change imports to re-export forms** — just add the imports needed.
5. **Don't commit or push** — orchestrator handles.
6. If a bypass is INSIDE a dead code path (e.g. an `{#if false}` branch), skip it and flag.
7. For `.toFixed(2)` in `<input value={}>` or similar bindings: skip unless clearly a display label.

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -80` — 0 new errors (baseline: 0 + 29 pre-existing warnings).
2. `npm run build 2>&1 | tail -15` — succeeds.
3. **Adoption metric**: `grep -rn "from '\\$lib/utils/formatters'" src --include='*.ts' --include='*.svelte' | wc -l` should increase by roughly the number of files modified (~20-25 new imports if not already present).
4. **Bypass reduction**: `grep -rcn '.toFixed(2)' src --include='*.svelte' --include='*.ts' | grep -v ':0$' | wc -l` — compare pre/post. Expect a notable drop on the modified files. Leftover hits are either in skip-list files or semantic skips.
5. **Spot visual check** (optional): open one of the modified shop route pages (e.g. `/shop/jobs`) in dev. Date and currency columns should render identically to before.

## Report back (≤600 words)

Break down by batch:

### Batch 1 summary
- Files touched + hit counts.
- Import additions needed.
- Any deviations.

### Batch 2 summary
- Same fields.

### Batch 3 summary
- Same fields.
- Note any shop route page that was skipped (with reason).

### Net metrics
- Total hits replaced (target: ~60-65).
- Total files modified (target: ~25).
- Net line delta (expected: modest — imports add a line, inline replacements remove minimal chars).
- svelte-check + build results.
- Any skipped hits beyond the spec's SKIP list (with justification).
- Any formatter that appeared to be a better choice than the one I recommended (e.g. you used `formatDateLong` where I said `formatDate`).

## Notes

- Target scope: **65 replacements, ~25 files, 3 batches.**
- If the total replacements drop to <50, that's fine — either some files didn't actually have the bypass at the expected lines (code has moved) or the triage over-counted slightly.
- If the total exceeds 70, stop and report — that means the scoping rules were too generous.
- Branch: `claude/confident-mendel`. Append commits. No new branch.
