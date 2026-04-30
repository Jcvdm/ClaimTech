# Phase 2b — Decorative Cleanup Sweep

**Created**: 2026-04-22
**Status**: In Progress
**Complexity**: Mechanical sweep — high-volume low-decision edits
**Prerequisite**: Phase 1 committed (411c967), Phase 2a (Sidebar.svelte:413) done in working tree
**Scope**: Remove decorative rose/pink/fuchsia, scattered `bg-gradient-to-*`, heavy `shadow-lg/xl` on data cards, and overgrown `rounded-2xl/3xl` — everywhere EXCEPT the exclusions below.

---

## Excluded from this phase (DO NOT TOUCH)

1. `src/routes/auth/**` — auth pages keep rose/brand.
2. `src/lib/components/data/GradientBadge.svelte` — deferred to Phase 3.
3. Any `<GradientBadge>` callsite — don't refactor or remove, just leave. Phase 3 migrates these.
4. The 6 photo panels: `src/lib/components/assessment/*PhotosPanel.svelte` (6 files) — deferred to Phase 3 for batch rose-progress-bar migration.
5. `src/routes/(shop)/shop/jobs/[id]/+page.svelte` — uses rose for something, defer to Phase 3 review.
6. `src/lib/components/data/TableCell.svelte` — defer to Phase 4 (table density).

---

## Files in scope

Use `Grep` to find actual occurrences. Known offenders from prior audit:

**Rose/pink/fuchsia cleanup** — route files:
- `src/routes/(app)/dashboard/+page.svelte`
- `src/routes/(app)/work/+page.svelte`
- `src/routes/(app)/work/appointments/+page.svelte` (and `[id]/+page.svelte` if it has rose)
- `src/routes/(app)/work/assessments/+page.svelte`
- `src/routes/(app)/work/additionals/+page.svelte`
- `src/routes/(app)/work/finalized-assessments/+page.svelte`
- `src/routes/(app)/work/frc/+page.svelte`
- `src/routes/(app)/work/inspections/+page.svelte`
- `src/routes/(app)/work/archive/+page.svelte`
- `src/routes/(app)/requests/+page.svelte`
- `src/routes/(shop)/shop/dashboard/+page.svelte`
- `src/routes/(shop)/shop/estimates/+page.svelte`
- `src/routes/(shop)/shop/invoiced/+page.svelte`
- `src/routes/(shop)/shop/invoices/+page.svelte`
- `src/routes/(shop)/shop/cancelled/+page.svelte`
- `src/routes/(shop)/shop/jobs/+page.svelte` (list page only, NOT `[id]/+page.svelte`)

**Rose cleanup** — shared utilities/components:
- `src/lib/utils/table-helpers.ts`
- `src/lib/components/ui/tabs/FilterTabs.svelte`
- `src/lib/components/ui/progress/FileUploadProgress.svelte`
- `src/lib/components/ui/progress/DocumentProgressBar.svelte`
- `src/lib/components/ui/file-dropzone/FileDropzone.svelte`
- `src/lib/components/shop/ShopPhotosPanel.svelte`
- `src/lib/components/shop/ShopAdditionalsTab.svelte`
- `src/lib/components/layout/DocumentLoadingModal.svelte`
- `src/lib/components/forms/PhotoUpload.svelte`
- `src/lib/components/forms/PdfUpload.svelte`
- `src/lib/components/assessment/DocumentCard.svelte`
- `src/lib/components/assessment/DocumentGenerationProgress.svelte`
- `src/lib/components/assessment/AssessmentLayout.svelte`
- `src/lib/components/assessment/AdditionalLineItemCard.svelte`
- `src/lib/constants/processTypes.ts`

**Gradients in app chrome**:
- Grep for `bg-gradient-to-` across all `src/routes/(app)/**`, `src/routes/(shop)/**`, and `src/lib/components/**`. Skip auth. Skip GradientBadge.

**Shadows on data cards**:
- Grep for `shadow-lg` and `shadow-xl` across all scopes. Flag and remove only when the element is a **data card** (list item, row card, content panel). KEEP shadows on Dialog, Popover, Sheet, DropdownMenu, Tooltip, Toast.

**Overgrown radii**:
- Grep for `rounded-2xl` and `rounded-3xl`. Replace with `rounded-lg`.
- Keep `rounded-full` anywhere it's on an avatar, status dot, circular badge, or icon container. Don't touch.

---

## Semantic replacement rules for rose classes

Before blindly replacing, read the context. Determine intent:

| Original intent | Rose class | Token replacement |
|---|---|---|
| Error / destructive indicator | `bg-rose-50`, `bg-rose-100` | `bg-destructive-soft` |
| Error text | `text-rose-600`, `text-rose-700` | `text-destructive` |
| Error border | `border-rose-200`, `border-rose-300` | `border-destructive-border` |
| Warning (not error) | `bg-rose-50` used for "warning" badge | `bg-warning-soft` + `text-warning` + `border-warning-border` |
| Decorative "accent" (status info, non-semantic) | `bg-rose-100 text-rose-700 border-rose-200` (badge pattern) | `bg-muted text-muted-foreground border-border` OR `bg-accent text-accent-foreground` |
| Primary CTA color leftover | `bg-rose-500`, `bg-rose-600` | `bg-primary` |
| Hover state for primary | `hover:bg-rose-700` | `hover:bg-primary/90` |
| Link text | `text-rose-600 hover:text-rose-700` | `text-primary hover:text-primary/90` |
| Solid destructive button | `bg-rose-600 text-white` | `bg-destructive text-primary-foreground` |

**When in doubt**, prefer `bg-muted` / `text-muted-foreground` (neutral) over anything saturated. Utilitarian direction favors restraint.

For `text-rose-700` on a label/eyebrow where the intent is clearly "category color" (not error), use `text-foreground` or `text-muted-foreground`.

Do NOT invent new semantics. If you can't tell what the rose was for, read the surrounding JSX — if it's next to an icon like `AlertTriangle`/`XCircle` it's destructive; if it's in a progress bar at 100%, it's probably decorative; if it's in a header, it's marketing leftover.

---

## Gradient replacement rules

- `bg-gradient-to-r from-X-500 to-X-600` on a button → `bg-primary` (if CTA) or `bg-foreground` (if dark action).
- `bg-gradient-to-br from-slate-50 to-slate-100` or any subtle gradient on a page bg/card → replace with solid `bg-card` or `bg-background` or `bg-muted`.
- `bg-gradient-to-r from-rose-500 to-pink-500` → typically a "decorative" badge/pill → `bg-primary text-primary-foreground` or whatever the surrounding structure implies.

If the gradient is inside `GradientBadge.svelte` itself, **leave it** — Phase 3 deletes that component.

---

## Shadow replacement rules

- `shadow-lg` / `shadow-xl` on a data card (list row, content panel, form section) → remove entirely OR replace with `border border-border`.
- `shadow-lg` / `shadow-xl` on a dialog, sheet, popover, dropdown, tooltip → KEEP.
- `shadow-md` on interactive elements — leave; they're usually fine.
- `shadow-sm` — leave; it's subtle and not decorative.

Rule of thumb: the wireframes show flat cards with 1px borders. If you'd describe the element as "data" or "list" or "content panel", no shadow.

---

## Radius replacement rules

- `rounded-2xl` → `rounded-lg`
- `rounded-3xl` → `rounded-lg`
- `rounded-full` on an avatar, status dot, circular badge, icon button, logo → KEEP
- `rounded-full` on a pill/badge that's NOT circular but uses `rounded-full` for the pill shape → prefer `rounded-md`

---

## Verification

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -60` — 0 new errors. Baseline: 0 errors, 29 warnings.
2. `npm run build 2>&1 | tail -15` — exit 0.
3. Grep check — should return dramatically fewer matches than before:
   ```
   grep -rEn "bg-rose-|text-rose-|border-rose-" src/routes/\(app\)/ src/routes/\(shop\)/ src/lib/components/ 2>&1 | wc -l
   ```
   Before: ~130 lines. Expected after: under 40 (GradientBadge + deferred files only).
4. Dev server at http://localhost:5173 — visual sanity: open dashboard, work queue, an assessment. Nothing should be visibly broken.

---

## Out of scope (Phase 3 handles)

- `GradientBadge.svelte` deletion + migration of 49 callsites
- 6 `*PhotosPanel.svelte` rose progress bars (batch update)
- `shop/jobs/[id]/+page.svelte` rose usage (specific review)
- Table cell color logic (Phase 4)

---

## Do not

- Do not add new dev dependencies.
- Do not edit any Phase 1 or Phase 2a files (src/app.css, button.svelte, badge.svelte, Sidebar.svelte).
- Do not touch `src/routes/auth/**`.
- Do not touch `GradientBadge.svelte` or any `<GradientBadge>` callsite.
- Do not commit. Orchestrator commits after you report done.

---

## Budget

This is a sweep, not a design review. Move fast. Expect ~30 files touched, ~80 line changes. If a replacement feels ambiguous, default to `bg-muted`/`text-muted-foreground` and flag it in your report — Orchestrator can refine later.
