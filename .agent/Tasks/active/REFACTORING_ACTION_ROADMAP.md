# Styling Refactor — Action Roadmap

**Generated**: 2026-04-29
**Scope**: Concrete, prioritized, executable tasks. Each task is a self-contained Haiku coder dispatch with an estimated time, risk level, and acceptance criteria.

---

## Quick wins — execute first (≈75 min total, very low risk)

These are 1-file-or-less, 0-judgement-call edits. Ship them as one batch commit. No design decisions required.

### QW1 — Migrate `pre-incident-estimate-template.ts` to slate palette

- **File**: `src/lib/templates/pre-incident-estimate-template.ts`
- **Action**: Replace all `#e11d48` → `#64748b` and `#fff1f2` → `#f8fafc` (matches commit `c46072b` for the other 5 internal templates)
- **Effort**: 5 min
- **Risk**: very low (string replace inside HTML template literal)
- **Acceptance**: `grep -c '#e11d48' src/lib/templates/pre-incident-estimate-template.ts` returns 0; svelte-check 0 errors

### QW2 — `font-mono-tabular` adoption sweep across remaining shop pages

- **Files (7)**:
  - `src/routes/(shop)/shop/invoices/+page.svelte`
  - `src/routes/(shop)/shop/invoices/[id]/+page.svelte`
  - `src/routes/(shop)/shop/invoiced/+page.svelte`
  - `src/routes/(shop)/shop/completed/+page.svelte`
  - `src/routes/(shop)/shop/dashboard/+page.svelte`
  - `src/lib/components/forms/ItemTable.svelte`
  - `src/lib/components/shop/ShopJobCard.svelte`
- **Action**: For each `formatCurrency` / `formatCurrencyValue` callsite NOT already inside a `<CostCell>` / `<TotalsStrip>` / `<TotalsBreakdownDialog>`, add `font-mono-tabular` to the wrapping element's class string. Pattern from commit `76757c8`.
- **Effort**: 30 min total (~3-5 min per file)
- **Risk**: very low (additive class only, no logic change)
- **Acceptance**: Visual decimal-point alignment in shop currency columns. svelte-check 0 errors.

### QW3 — Trash button color tokens across remaining files

- **Files**: any in section 2 of the discrepancies doc still using `text-red-600 hover:bg-red-50` for icon buttons
- **Action**: Replace with `text-destructive hover:bg-destructive/10 hover:text-destructive`. Same pattern as commits `c46072b` and `5807a5c`.
- **Effort**: ~20 min (find + replace in ~5-10 files)
- **Risk**: very low

### QW4 — Rename orphan `.bg-rose` / `.text-rose` / `.border-rose` class names in `report-template.ts`

- **File**: `src/lib/templates/report-template.ts`
- **Action**: Rename `.bg-rose` → `.bg-slate`, `.text-rose` → `.text-slate`, `.border-rose` → `.border-slate` (in both definitions and usages). Values are already slate per commit `c46072b`; only the names lie.
- **Effort**: 10 min, 1 file, ~6 occurrences
- **Risk**: very low (internal-only; no external consumers)
- **Acceptance**: `grep -c 'rose' src/lib/templates/report-template.ts` returns 0; PDF visual unchanged

**Quick wins single-commit summary**: ~75 min, 4 atomic fixes, all verified pre-existing patterns. One Haiku coder dispatch per quick win, one Sonnet review for the batch commit.

---

## Phase 1 — Card primitive migration (≈90 min, low risk)

### P1.1 — Migrate the 11 `rounded-lg border bg-` div wrappers to `<Card.Root>` + `<Card.Content>`

- **Files (11, sequence by lowest-risk first)**:
  1. `src/lib/components/data/DataTable.svelte` (small, isolated)
  2. `src/lib/components/forms/ItemTable.svelte`
  3. `src/lib/components/assessment/AuditTab.svelte`
  4. `src/lib/components/assessment/CombinedTotalsSummary.svelte`
  5. `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte`
  6. `src/routes/(app)/work/[type]/+page.svelte`
  7. `src/routes/(app)/clients/+page.svelte`
  8. `src/routes/(app)/engineers/+page.svelte`
  9. `src/routes/(app)/work/inspections/[id]/+page.svelte`
  10. `src/routes/(shop)/shop/invoices/+page.svelte`
  11. `src/routes/(shop)/shop/jobs/[id]/+page.svelte`
- **Action**: For each file, identify the `<div class="rounded-lg border bg-...">` block and replace with the appropriate shadcn Card primitive composition. Preserve all child content + classes that aren't part of the wrapper shape.
- **Per-file effort**: 5-10 min
- **Total effort**: ~90 min
- **Risk**: low — `Card` primitive is mature; one-time per-file visual verification needed
- **Acceptance**: each file has 0 raw `rounded-lg border bg-` patterns; svelte-check 0 errors; visual smoke test on Vercel preview shows identical layout

### P1.2 — Sonnet reviewer for the batch

- After all 11 files committed, dispatch one Sonnet reviewer over the whole diff
- Watch for: dropped child classes, broken nested layouts, accidental Card composition errors

---

## Phase 2 — Color token migration (≈4-6 hours, medium risk)

### P2.1 — High-density component sweep (~25 files, batch by feature)

- **Files**: the 25 most-saturated raw-Tailwind-color files identified in section 2 of the discrepancies doc
- **Action**: Replace raw color usages with semantic tokens per the canonical mapping table
- **Recommended batches**:
  - Batch A — Estimate-tab family (`EstimateTab`, `PreIncidentEstimateTab`, `AdditionalsTab`, `LineItemCard`, `AdditionalLineItemCard`)
  - Batch B — FRC family (`FRCTab`, `FRCLinesTable`, `FRCLineCard`, `FRCSignOffModal`, `FinalizeTab`)
  - Batch C — Vehicle/Damage family (`VehicleValuesTab`, `VehicleValueExtrasTable`, `DamageTab`, `DamageSummaryCard`)
  - Batch D — Photo panels (`InteriorPhotosPanel`, `EstimatePhotosPanel`, `Exterior360PhotosPanel`, `AdditionalsPhotosPanel`, `PreIncidentPhotosPanel`, `TyrePhotosPanel`, `ShopPhotosPanel`)
  - Batch E — Shop pages (jobs, invoices, dashboard, completed, etc.)
  - Batch F — Auth + offline + UI primitives
- **Per-batch effort**: 30-45 min
- **Risk**: medium — some color choices encode semantics that might not map cleanly (e.g., a status pill that uses `bg-blue-500` because "blue = pending" — there's no `pending` semantic token; needs a decision per case)
- **Acceptance per batch**: `grep -E '(bg|text|border)-(red|green|blue|...)-[0-9]+' <files>` returns 0 for files in the batch; visual smoke in light + dark mode

### P2.2 — Add missing semantic tokens to `app.css` if needed

- **Likely additions**: `--info` / `--info-soft` / `--info-border` (currently no clean replacement for `bg-blue-100` style "info" callouts that aren't `text-primary`)
- **Effort**: 15 min
- **Risk**: low (additive only, doesn't break existing tokens)

---

## Phase 3 — Spacing convention documentation (≈30 min, no code changes)

### P3.1 — Document the spacing system in CLAUDE.md or new `STYLING.md`

- **Action**: Pick a canonical 4-step spacing scale (e.g., `gap-1.5` icon-text, `gap-3` form-row, `gap-4` form-section, `gap-6` page-section) and document it
- **Effort**: 30 min (no code change; just doc)
- **Risk**: zero
- **Follow-on**: when touching files in Phase 2 batches, opportunistically normalize the gap-N usage to match the convention

---

## Phase 4 — Native primitive audit (≈1 hour, deferred)

### P4.1 — Audit native `<button>` / `<input>` / `<textarea>` / `<select>` usage with strict exclusions

- The earlier Haiku attempt fabricated this audit. Re-do via direct grep with explicit exclusions for the intentional patterns (overlay-badge select, file inputs, etc.)
- **Effort**: 30 min
- **Action**: produce a verified file list. Decide migration vs preserve per file.
- **Risk**: low — the audit itself is read-only

---

## Phase 5 — Future / deferred

- **Sundries `.toFixed(2)` rounding consistency** — flagged as medium-severity by earlier audits. Out of scope for the styling refactor; belongs in a separate "calculation-layer cleanup" task.
- **PDF template neutral hex consolidation** — moving `#ffffff`, `#000000`, `#cccccc` etc. into in-template `--report-*` CSS variables. Lower ROI; defer.
- **Three separate markup-application implementations** (`estimate.service.ts`, `shop-additionals.service.ts`, `frcCalculations.ts`) — code refactor, not styling. Worth its own roadmap.

---

## Execution policy (per CLAUDE.md)

For each task:
1. Dispatch Haiku coder-agent with the spec + file list above
2. Verify diff + svelte-check
3. Commit + push
4. Dispatch Sonnet reviewer over the diff
5. Loop fix → review until clean

Quick wins can be batched into one commit if desired. Phase 1 and Phase 2 batches should commit per-batch (one commit per ~5-10 files) for review tractability.

---

## Time + risk summary

| Phase | Effort | Risk | Files touched | Lines changed (est) |
|---|---|---|---|---|
| Quick wins (QW1-QW4) | 75 min | very low | 12 | ~80 lines |
| Phase 1 — Card primitive | 90 min | low | 11 | ~50 lines |
| Phase 2 — Color tokens | 4-6 hrs | medium | 25-50 | ~400 lines |
| Phase 3 — Spacing docs | 30 min | none | 1 (doc) | ~50 lines |
| Phase 4 — Native primitive audit | 1 hr | low (audit only) | 0 | 0 |
| **Total** | **~7-9 hrs** | | **~50-75 files** | **~600 lines** |

---

## Rollout options

1. **Quick wins only** — 75 min, ship today. Highest ROI / lowest risk slice.
2. **Quick wins + Phase 1** — 165 min. Adds Card primitive consistency without color decisions.
3. **All five phases** — 7-9 hrs spread across multiple sessions. Comprehensive cleanup.

Recommendation: **Option 2** as a single-day target. Phase 2 (color tokens) deserves its own dedicated session because of the per-case semantic decisions required.

---

## Rollback plan

Every task is a separate commit. To roll back any individual change:

```bash
git revert <sha>
```

The Quick Wins batch and each Phase 1 file should each be its own commit, so the smallest possible rollback unit is one file. Phase 2 batch commits are the larger rollback units (5-10 files each).

If any commit causes visual regression on Vercel preview that's not caught by svelte-check:
1. Identify the offending commit via Vercel preview history
2. `git revert <sha> -m "revert: <reason>"`
3. Re-dispatch with tighter constraints

No DB migrations, no schema changes, no service-layer changes — pure UI styling. Rollback cost is near-zero.
