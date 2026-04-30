# Codebase Refactoring Efficiency Plan — Styling & Components

**Generated**: 2026-04-29
**Author**: Opus 4.7 (orchestrator) — direct grep extraction + native synthesis. No agent dispatch.
**Companion docs**:
- `STYLING_DISCREPANCIES_AND_REFACTORING_OPPORTUNITIES.md` — verified findings (the WHAT)
- `REFACTORING_ACTION_ROADMAP.md` — prioritized executable tasks (the HOW)

---

## Executive summary

Six categories of styling/component drift identified across the Claimtech codebase. **One-quarter** is high-impact and worth fixing immediately; **half** is medium-impact and should be batched; **one-quarter** is intentional architectural divergence that should NOT be consolidated.

**Total fixable files**: ~50-75
**Total estimated lines changed**: ~600
**Total estimated effort**: 7-9 hours, splittable into 5 phases

**Highest ROI single fix**: 75-min "Quick Wins" batch — knocks out 4 verified-low-risk patterns affecting 12 files. Recommended ship-today.

---

## Architectural boundaries — what NOT to consolidate

These are intentional divergences. Treat as load-bearing.

| Boundary | Why it stays | Reference |
|---|---|---|
| Assessment `(app)` ↔ Shop `(shop)` route groups | Independent workflows, separate users, separate state machines, will diverge further | `src/routes/(app)/` vs `src/routes/(shop)/` |
| Assessment photo schema (`display_order`/`label`) ↔ Shop photo schema (`sort_order`/`category`/`storage_path`) | Different DB columns, different storage paths, different FK structures | `src/lib/services/{assessment,shop}-photos.service.ts` |
| Service singleton pattern (assessment) ↔ Factory function pattern (shop) | Per-request isolation requirements differ | `src/lib/services/*.service.ts` |
| `shop-customer-facing` PDF brand color (`#e11d48`) | Customer-facing documents legitimately carry shop brand | `shop-invoice-template.ts`, `shop-estimate-template.ts` |
| Overlay-badge `<select>` UX pattern | Native select with invisible overlay + visible pill is intentional, not a candidate for shadcn migration | `EstimateTab.svelte`, `PreIncidentEstimateTab.svelte`, `AdditionalsTab.svelte`, shop estimate skeleton row |

---

## What's already shipped this session (do NOT redo)

| Commit | Change | Files affected |
|---|---|---|
| `5807a5c` | PreIncident Type/Part badges + count + trash token | 1 |
| `a30706c` | PreIncident inline skeleton add-row | 1 |
| `adeb4d1` | PreIncident header select-all checkbox | 1 |
| `c46072b` | Token cleanup batch (PDF rose, threshold tokens, ShopSidebar bands, ShopAdditionalsTab process badges) | 8 |
| `deec905` | Shop estimate adopts shared `<CostCell>` | 1 |
| `3aabd21` | Shop estimate adopts `<TotalsStrip>` + `<TotalsBreakdownDialog>` | 1 |
| `27bb71d` | Extract `getPartTypeBadgeClass` + `getPartTypeIcon` helpers | 3 |
| `76757c8` | `font-mono-tabular` on shop per-row total | 1 |

**Net delivered so far**: ~17 files modified across 8 commits. The remaining roadmap covers the long tail (~50-75 more files).

---

## Tier-based file-modification strategy

### Tier 1 — Already-shared components (NEVER touch these directly)

These are the trusted shared primitives. Any styling change here propagates to all callsites — and they're already audited.

- `src/lib/components/assessment/CostCell.svelte`
- `src/lib/components/assessment/TotalsStrip.svelte`
- `src/lib/components/assessment/TotalsBreakdownDialog.svelte`
- `src/lib/components/ui/*` (shadcn primitives — Button, Card, Input, Select, etc.)

If a styling fix needs to land here, treat it as an architectural decision — separate planning, separate review.

### Tier 2 — Hotspot files (batch-fix target)

These files have the highest density of raw-color / orphan-pattern issues. Fixing them first delivers the most visible progress.

- `src/routes/(shop)/shop/jobs/[id]/+page.svelte`
- `src/lib/components/assessment/EstimateTab.svelte`
- `src/lib/components/assessment/PreIncidentEstimateTab.svelte`
- `src/lib/components/assessment/AdditionalsTab.svelte`
- `src/lib/components/assessment/FRCTab.svelte`
- `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte`
- `src/lib/components/shared/SummaryComponent.svelte`

### Tier 3 — Page-route files (per-batch, lower priority)

Routes have high count but lower per-file density. Migrate during Phase 2 batch sweeps.

- `src/routes/(app)/work/*+page.svelte` (10+ files)
- `src/routes/(shop)/shop/*+page.svelte` (12+ files)
- `src/routes/(app)/{requests,clients,engineers,repairers}/*+page.svelte`

### Tier 4 — Auth + offline + low-traffic (defer)

Auth pages and offline indicators are visited rarely; styling drift here is least visible.

- `src/routes/auth/*+page.svelte`
- `src/lib/offline/components/*`

---

## Reusable utilities inventory (use these, don't roll your own)

### Confirmed-good shared components

| Component | Path | Used by |
|---|---|---|
| `<CostCell>` | `src/lib/components/assessment/CostCell.svelte` | EstimateTab, PreIncident, Additionals, shop estimate page (4 callsites, 5 cells each = 20 cells) |
| `<TotalsStrip>` | `src/lib/components/assessment/TotalsStrip.svelte` | EstimateTab, PreIncident, shop estimate page |
| `<TotalsBreakdownDialog>` | `src/lib/components/assessment/TotalsBreakdownDialog.svelte` | Same as above |
| `getProcessTypeBadgeColor()` | `src/lib/constants/processTypes.ts` | EstimateTab, PreIncident, ShopAdditionalsTab |
| `getPartTypeBadgeClass()` + `getPartTypeIcon()` | `src/lib/constants/processTypes.ts` (after commit `27bb71d`) | LineItemCard, shop jobs page |
| `formatCurrency()` / `formatCurrencyValue()` | `src/lib/utils/formatters.ts` | 100+ callsites |

### Confirmed-good design tokens

Available in `src/app.css`:
- `--destructive` / `--destructive-soft` / `--destructive-border`
- `--warning` / `--warning-soft` / `--warning-border`
- `--success` / `--success-soft` / `--success-border`
- `--muted` / `--muted-foreground` / `--border`
- `--foreground` / `--background` / `--card`
- `--primary` / `--primary-foreground`

Tailwind classes: `bg-destructive`, `text-warning`, `border-success-border`, etc.

**Missing tokens (would need adding)**: `--info` for blue-ish "neutral info" use cases (currently bg-blue-50/100/etc.).

### Confirmed-good shadcn primitives in repo

`src/lib/components/ui/`:
- `card`, `button`, `input`, `textarea`, `select`, `checkbox`, `dialog`, `sheet`, `badge`, `alert`, `table`, `tabs`, `dropdown-menu`, `tooltip`, `popover`, `breadcrumb`, `calendar`, `date-picker`, `progress`, `skeleton`, `sidebar`, `step-rail`, `responsive-tabs`, `field-grid`, `file-dropzone`, `label`, `action-bar`, `save-indicator`

Most are well-adopted. Card is under-adopted (11 callsites still using raw div).

---

## Success criteria

### Per-task

- `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5` → 0 errors
- Visual smoke test on Vercel preview matches pre-change appearance (light + dark mode)
- Sonnet reviewer reports PASS

### Per-phase

- All target files in the phase are migrated; grep verifies pattern absence
- No regressions in adjacent functionality (forms still work, totals still calculate, etc.)
- Documented in commit messages with file lists for traceability

### End-of-program

- `grep -rE '(bg|text|border)-(red|green|blue|yellow|orange|amber|purple|pink|gray|slate)-[0-9]+' src/ | wc -l` reduced from current 100+ to <20 (acceptable residual: shadcn defaults, intentional brand uses, edge cases)
- All currency renders use `font-mono-tabular`
- All "card-shaped div" callsites use `<Card.Root>`
- No orphan `.bg-rose` / `.text-rose` class names in templates
- Spacing convention documented; new code follows it

---

## Verification commands

After each phase:

```bash
# Color token compliance check
grep -rE '(bg|text|border)-(red|green|blue|yellow|orange|amber|purple|pink|gray|slate)-[0-9]+' src/ --include='*.svelte' | wc -l

# Tabular numerics adoption
grep -rl 'font-mono-tabular' src/ --include='*.svelte' | wc -l

# Card primitive adoption
grep -rl '<Card.Root' src/ --include='*.svelte' | wc -l

# PDF templates internal-only have no rose
grep -c '#e11d48' src/lib/templates/{report,frc-report,photos,estimate,additionals-letter,pre-incident-estimate}-template.ts
# Expected: all zero. shop-invoice and shop-estimate intentionally retain their rose.

# Build sanity
npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -5
```

---

## Stop gates

The user can stop at any of these breakpoints with no half-finished state:

- **After Quick Wins** — 75 min in. Highest-ROI low-risk wins shipped. Codebase is strictly more consistent.
- **After Phase 1 (Card primitive)** — 165 min in. Card pattern consolidated.
- **After Phase 2 batch A** — Estimate-tab family fully tokenized.
- **After Phase 2 (all)** — All identified raw-color hotspots fixed.
- **After Phase 3** — Spacing convention documented.

Each phase commits independently. No cross-phase dependencies.

---

## Next action

Recommended: dispatch Quick Wins as a single Haiku coder batch, with the precise file list and acceptance criteria from `REFACTORING_ACTION_ROADMAP.md`. Sonnet reviewer over the batch commit. Then evaluate Phase 1 vs stop.

This is decided by the user, not by this plan.
