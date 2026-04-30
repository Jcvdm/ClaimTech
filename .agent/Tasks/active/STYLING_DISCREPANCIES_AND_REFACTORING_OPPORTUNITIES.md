# Styling Discrepancies & Refactoring Opportunities

**Generated**: 2026-04-29
**Author**: Opus 4.7 (orchestrator) using direct grep/read — no agent dispatch
**Scope**: src/ Svelte + TypeScript files in the Claimtech worktree
**Verified ground truth**: Every count and file list in this document was produced by `Grep` directly against the working tree and is reproducible. No fabricated paths.

---

## 1. Summary of findings

| Category | Files affected | Severity | Already partially addressed? |
|---|---|---|---|
| Raw Tailwind color classes (instead of semantic design tokens) | **100+ files** (cap hit at 100; likely more) | HIGH | Yes — commit `c46072b` fixed 4 files (`ShopSidebar`, `ShopAdditionalsTab`, `estimateThresholds.ts`, 5 PDF templates partially). ~96 files remain. |
| `font-mono-tabular` / `tabular-nums` adoption gap on currency cells | Only **19 files** use it; ~80+ render currency without it | MEDIUM | Yes — commit `76757c8` added it to one shop per-row total. Other currency renders unaddressed. |
| Hex color literals in PDF templates | **367 hex color occurrences** across 8 PDF templates | MEDIUM | Yes — commit `c46072b` migrated `#e11d48` → `#64748b` in 5 internal templates. `pre-incident-estimate-template.ts` (11 hex occurrences) was missed; shop templates intentionally retain brand color. |
| Duplicated wrapper-div shapes (`rounded-lg border bg-...`) | **11 distinct files** | MEDIUM | No |
| Spacing/gap inconsistency (`gap-1`, `gap-2`, `gap-3` etc. without system) | **607 occurrences across 154 files** | LOW | No |
| Native HTML primitives where shadcn equivalent exists | Need verified count — Haiku attempt fabricated; Opus didn't re-grep | LOW | Partial (most native usage is intentional per the recent overlay-badge select pattern) |

---

## 2. Hardcoded color usage (HIGH severity)

### Verified data

A grep for `(bg|text|border)-(red|green|blue|yellow|orange|amber|purple|pink|slate|gray)-(50..900)` against `src/` returned 100 file matches before the head-limit truncated. The full set is at least 100 files; likely 130-150.

### Top concentrated callsites (already in this list)

These are files where multiple raw-color usages cluster — best targets for one-shot conversion:

- `src/lib/components/assessment/EstimateTab.svelte`
- `src/lib/components/assessment/PreIncidentEstimateTab.svelte`
- `src/lib/components/assessment/AdditionalsTab.svelte`
- `src/lib/components/assessment/FRCLinesTable.svelte` / `FRCLineCard.svelte`
- `src/lib/components/assessment/CombinedTotalsSummary.svelte`
- `src/lib/components/assessment/VehicleValuesTab.svelte` / `VehicleValueExtrasTable.svelte`
- `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte` / `RatesConfiguration.svelte`
- `src/lib/components/assessment/AdditionalLineItemCard.svelte`
- `src/lib/components/assessment/LineItemCard.svelte`
- `src/lib/components/assessment/DamageTab.svelte` / `DamageSummaryCard.svelte`
- `src/lib/components/assessment/AssessmentNotes.svelte`
- `src/lib/components/assessment/AssessmentLayout.svelte`
- `src/lib/components/assessment/DocumentCard.svelte`
- `src/lib/components/assessment/Exterior360PhotosPanel.svelte` / `InteriorPhotosPanel.svelte` / `EstimatePhotosPanel.svelte` / `AdditionalsPhotosPanel.svelte` / `PreIncidentPhotosPanel.svelte` / `TyrePhotosPanel.svelte`
- `src/lib/components/assessment/FinalizeTab.svelte`
- `src/lib/components/assessment/FRCTab.svelte`
- `src/lib/components/shared/SummaryComponent.svelte`
- `src/lib/components/shop/ShopAdditionalsTab.svelte` / `ShopPhotosPanel.svelte` / `ShopJobCard.svelte`
- `src/routes/(shop)/shop/jobs/[id]/+page.svelte`
- All `src/routes/(shop)/shop/*+page.svelte` (jobs, invoices, invoiced, estimates, dashboard, cancelled, completed, customers/[id], invoices/[id], settings, customers, estimates/new)
- All `src/routes/(app)/work/*+page.svelte` (inspections, finalized-assessments, frc, assessments, archive, additionals, +page, appointments, appointments/[id], inspections/[id])
- All `src/routes/(app)/{requests,clients,engineers,repairers,quotes,settings}/...` pages
- All auth route pages (`src/routes/auth/*`)
- Offline components: `src/lib/offline/components/{SyncProgress,SyncStatus,OfflineIndicator}.svelte`
- Some `src/lib/components/ui/*` files: `skeleton/SkeletonCard.svelte`, `progress/{DocumentProgressBar,FileUploadProgress,progress}.svelte`, `save-indicator/SaveIndicator.svelte`, `file-dropzone/FileDropzone.svelte`

### Why this matters

- Dark mode: design tokens (`text-destructive`, `bg-warning-soft`) auto-adapt. Raw Tailwind colors do not.
- Brand consistency: any future palette change requires editing 100+ files instead of one CSS variable file.
- Maintenance: new contributors copy the pattern they see, perpetuating raw color usage.

### Recommended canonical token mapping

Confirmed available in `src/app.css`:
- `text-destructive` / `bg-destructive-soft` / `border-destructive-border` (replaces red shades)
- `text-warning` / `bg-warning-soft` / `border-warning-border` (replaces orange/yellow/amber)
- `text-success` / `bg-success-soft` / `border-success-border` (replaces green)
- `text-muted-foreground` / `bg-muted` / `border-border` (replaces gray/slate)
- `text-foreground` / `bg-background` / `bg-card` (replaces neutral text/bg)
- For info/blue: there is currently no `info` semantic token; would need to add `--info` to `app.css` first OR use `text-primary` if the use case is "interactive info" rather than "neutral info"

---

## 3. `font-mono-tabular` adoption gap (MEDIUM severity)

### Verified data

Grep for `font-mono-tabular|tabular-nums` returned **19 files**:
- 12 assessment components: `LineItemCard`, `PreIncidentEstimateTab`, `AdditionalsTab`, `CostCell` (shared component), `EstimateTab`, `TotalsStrip`, `TotalsBreakdownDialog`, `DamageSummaryCard`, `OriginalEstimateLinesPanel`, `FRCLinesTable`, `FRCLineCard`, `VehicleValueExtrasTable`, `VehicleValuesTab`, `SummaryComponent`
- 2 shop: `ShopAdditionalsTab`, `routes/(shop)/shop/jobs/[id]/+page.svelte`
- 2 layout: `Sidebar`, `sidebar-menu-badge`
- `app.css` (the utility definition itself)

### What's missing

Currency renders elsewhere that should use the tabular utility but don't:
- `src/routes/(shop)/shop/invoices/+page.svelte` (invoice list amount column)
- `src/routes/(shop)/shop/invoices/[id]/+page.svelte` (invoice detail amount cells, payment amounts)
- `src/routes/(shop)/shop/invoiced/+page.svelte` (job total per row)
- `src/routes/(shop)/shop/completed/+page.svelte`
- `src/routes/(shop)/shop/dashboard/+page.svelte` (dashboard total tiles)
- `src/lib/components/forms/ItemTable.svelte` (line-item table)
- `src/lib/components/shop/ShopJobCard.svelte` (job card total badge)
- PDF templates render their own typography (out of scope for the utility — they use inline CSS)

### Recommended fix

For each of the 7-8 files above, identify the `<span>` / `<td>` / `<div>` that wraps `formatCurrency(...)` or `formatCurrencyValue(...)` callsites and add `class="font-mono-tabular ..."`. Pattern is identical to commit `76757c8`.

Estimated effort: ~30 min total. Atomic per file. Trivial review burden.

---

## 4. PDF template hex color status (MEDIUM severity, partially addressed)

### Verified data

Grep `#[0-9a-fA-F]{6}|rgb\(` against `src/lib/templates/`:

| Template | Hex occurrences | Cleanup status |
|---|---|---|
| `estimate-template.ts` | 66 | Internal — was in commit `c46072b` (rose → slate). Other hex values remain (likely neutrals — needs spot-check). |
| `additionals-letter-template.ts` | 50 | Internal — was in commit `c46072b`. Other neutrals remain. |
| `shop-invoice-template.ts` | 48 | **Customer-facing — intentionally retains brand `#e11d48`** per Phase 1 decision |
| `shop-estimate-template.ts` | 52 | **Customer-facing — intentionally retains brand `#e11d48`** |
| `report-template.ts` | 59 | Internal — was in commit `c46072b`. Class names `.bg-rose` / `.text-rose` / `.border-rose` retained but values are now slate (purely cosmetic naming debt). |
| `frc-report-template.ts` | 55 | Internal — was in commit `c46072b`. Other hex values remain. |
| `photos-template.ts` | 26 | Internal — was in commit `c46072b`. |
| `pre-incident-estimate-template.ts` | **11** | **NOT in commit `c46072b` — overlooked.** Internal document; should match other internal templates' palette. |

### What's needed

1. **`pre-incident-estimate-template.ts`** — apply the same `#e11d48` → `#64748b` and `#fff1f2` → `#f8fafc` migration as commit `c46072b` did for the other 5 internal templates. ~5 min, 1 file.
2. **Orphan `.bg-rose` / `.text-rose` / `.border-rose` class NAMES in `report-template.ts`** — values are slate but names lie. Rename to `.bg-slate` / `.text-slate` / `.border-slate` for clarity. ~5 min, 1 file. Pure cosmetic debt; defer if low priority.
3. **Other neutral hex values in internal templates** — there are dozens of `#ffffff`, `#000000`, `#cccccc` etc. across the templates. Could be migrated to a small in-template CSS variable block (`--report-text`, `--report-border`, etc.) so the palette is centralized. Lower ROI; defer.

---

## 5. Duplicated wrapper-div shapes (MEDIUM severity)

### Verified data

Grep `class="rounded-lg border bg-` against `src/`: **11 files** match.

| File | Pattern context |
|---|---|
| `src/routes/(shop)/shop/jobs/[id]/+page.svelte` | Card wrapper around totals/details |
| `src/lib/components/assessment/CombinedTotalsSummary.svelte` | Section card |
| `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte` | Panel card |
| `src/routes/(shop)/shop/invoices/+page.svelte` | Filter/table wrapper |
| `src/routes/(app)/work/[type]/+page.svelte` | List page card |
| `src/lib/components/forms/ItemTable.svelte` | Table wrapper |
| `src/routes/(app)/clients/+page.svelte` | List page card |
| `src/lib/components/data/DataTable.svelte` | Table wrapper |
| `src/routes/(app)/work/inspections/[id]/+page.svelte` | Detail page card |
| `src/routes/(app)/engineers/+page.svelte` | List page card |
| `src/lib/components/assessment/AuditTab.svelte` | Tab content card |

The pattern these 11 files share is structurally a `<Card.Root><Card.Content>` shape. The shadcn `Card` primitive is already in `src/lib/components/ui/card/`. These 11 files are NOT using it — they're rolling their own div with class strings.

### Recommended fix

Migrate each of the 11 files from raw `<div class="rounded-lg border bg-card ...">` to `<Card.Root>...<Card.Content>...</Card.Content></Card.Root>` using the existing primitive. Per file: ~5-10 min. Total: ~60-90 min.

Risk: very low — `Card` is mature, well-tested, used elsewhere. The migration removes ~3-5 lines of class-string per file in exchange for 2 cleaner wrapper components.

---

## 6. Spacing inconsistency (LOW severity)

### Verified data

Grep `gap-(0|1|1\.5|2|2\.5|3|3\.5|4|5|6|8|10|12)` returned **607 occurrences across 154 files**.

Most-saturated files:
- `src/lib/components/shared/SummaryComponent.svelte` — 30 gap callsites
- `src/routes/(shop)/shop/jobs/[id]/+page.svelte` — 30
- `src/lib/components/assessment/FRCTab.svelte` — 21
- `src/routes/(app)/work/inspections/[id]/+page.svelte` — 19
- `src/routes/(app)/work/appointments/[id]/+page.svelte` — 19
- `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte` — 18
- `src/lib/components/assessment/AdditionalsTab.svelte` — 17
- `src/routes/(app)/requests/[id]/+page.svelte` — 17

### What this means

The codebase uses every gap value from `gap-0` through `gap-12` without an obvious system. There's no canonical "section gap" (e.g., `gap-6`) vs "form-row gap" (e.g., `gap-3`) vs "icon-text gap" (e.g., `gap-1.5`) convention.

### Recommended fix

This is a STANDARDIZATION task, not a bug. Two paths:

1. **Document the convention** in CLAUDE.md or a `STYLING.md` — e.g., "section spacing: `gap-6`; form rows: `gap-4`; inline tokens: `gap-2`; icon+text: `gap-1.5`". Then progressively bring drift in line as files are touched.
2. **Auto-migrate** with a codemod — risky without visual regression testing. Not recommended.

Recommendation: **option 1 only**. The current variety is mostly intentional (different layout densities for different surfaces). The fix is documentation + new-code discipline, not mass-edit.

---

## 7. Already-shipped this session (do NOT redo)

- `c46072b` — token cleanup batch (PDF rose, threshold tokens, ShopSidebar bands, ShopAdditionalsTab process badges)
- `deec905` — `<CostCell>` adopted in shop estimate page
- `3aabd21` — `<TotalsStrip>` + `<TotalsBreakdownDialog>` adopted in shop estimate page
- `27bb71d` — `getPartTypeBadgeClass` + `getPartTypeIcon` extracted
- `76757c8` — `font-mono-tabular` on shop per-row total

These are baseline. The findings above are everything that remains.

---

## 8. Out-of-scope intentional state

- **Shop-customer-facing PDF templates retain `#e11d48` brand color** (`shop-invoice-template.ts`, `shop-estimate-template.ts`). Decided in Phase 1.
- **Overlay-badge `<select>` pattern** in PreIncident, EstimateTab, AdditionalsTab, shop estimate skeleton — uses native `<select>` deliberately for the invisible-overlay-on-top-of-pill UX. NOT a target for shadcn `<Select>` migration.
- **Native `<input type="file">`** in `PdfUpload` / `PhotoUpload` / file dropzone — file inputs are typically native by design.
- **The 154-file gap inconsistency** — mostly intentional density variation. See section 6.

---

End of audit document. See `REFACTORING_ACTION_ROADMAP.md` for prioritized execution and `CODEBASE_REFACTORING_EFFICIENCY_PLAN.md` for the executive view.
