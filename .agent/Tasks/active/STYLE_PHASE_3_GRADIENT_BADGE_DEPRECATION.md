# Phase 3 — GradientBadge Deprecation + Photo Progress Bars

**Created**: 2026-04-22
**Status**: In Progress
**Prerequisite**: Phase 1 + 2 committed (411c967, e5312bb)

Scope: migrate all `<GradientBadge>` callsites to `<Badge variant="tone">` using the new soft-tone variants added in Phase 1, then delete `GradientBadge.svelte`. Also migrate the 6 photo panels' rose progress bars. Also review and clean `shop/jobs/[id]/+page.svelte` rose usage.

---

## GradientBadge → Badge tone mapping

GradientBadge variants with actual gradient classes (from `GradientBadge.svelte`):

| GradientBadge `variant` | Actual gradient | New `<Badge variant>` | Rationale |
|---|---|---|---|
| `blue` | `from-rose-500 to-rose-600` (misnamed pre-existing) | `info` | User intent: "primary/info emphasis". Maps to accent-blue soft. |
| `green` | `from-green-500 to-emerald-600` | `success` | Success/live/approved. |
| `yellow` | `from-yellow-400 to-orange-500` | `warning` | Pending/attention needed. |
| `red` | `from-red-500 to-pink-600` | `destructive-soft` | Error/declined/failed. |
| `purple` | `from-purple-500 to-indigo-600` | `info` | No direct match; use info as neutral emphasis. |
| `indigo` | `from-slate-500 to-slate-600` | `muted` | Slate-gray, neutral emphasis. |
| `pink` | `from-pink-500 to-rose-600` | `muted` | Decorative; treat as neutral. |
| `gray` | `from-slate-400 to-slate-600` | `muted` | Clearly muted/disabled. |

---

## API migration pattern

### Simple label

```svelte
<!-- before -->
<GradientBadge variant="green" label="Paid" />

<!-- after -->
<Badge variant="success">Paid</Badge>
```

### Label + icon

```svelte
<!-- before -->
<GradientBadge variant="yellow" label="Inspection Scheduled" icon={Calendar} />

<!-- after -->
<Badge variant="warning">
  <Calendar class="h-3 w-3" />
  Inspection Scheduled
</Badge>
```

### Pulse (animated dot)

```svelte
<!-- before -->
<GradientBadge variant="green" label="Live" pulse />

<!-- after -->
<Badge variant="success" class="animate-pulse">
  <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
  Live
</Badge>
```

### Dynamic variant + label (e.g. `{variant} {label}`)

```svelte
<!-- before -->
<GradientBadge {variant} {label} />

<!-- after — you need to map the old variant to new tone -->
<!-- Option A: inline map helper in the same file -->
{@const tone = { blue: 'info', green: 'success', yellow: 'warning', red: 'destructive-soft',
                 purple: 'info', indigo: 'muted', pink: 'muted', gray: 'muted' }[variant]}
<Badge variant={tone}>{label}</Badge>

<!-- Option B — if the component already has a helper like getStatusBadge(row), update it to return the new tone name. Check the callsite's data shape first. -->
```

For callsites where `variant` is a dynamic string prop from data, you need a mapping. Often the callsite has a helper function (e.g. `badgeVariantFor(status)` or similar) — update the helper to return the new tone names directly.

---

## Badge import path

The shadcn Badge is at `$lib/components/ui/badge`. Typical import:

```ts
import { Badge } from '$lib/components/ui/badge';
```

Remove the existing `import GradientBadge from '$lib/components/data/GradientBadge.svelte';` from each file.

---

## Files to migrate (15 route files)

1. `src/routes/(app)/requests/+page.svelte`
2. `src/routes/(app)/work/additionals/+page.svelte`
3. `src/routes/(app)/work/appointments/+page.svelte`
4. `src/routes/(app)/work/archive/+page.svelte`
5. `src/routes/(app)/work/assessments/+page.svelte`
6. `src/routes/(app)/work/finalized-assessments/+page.svelte`
7. `src/routes/(app)/work/frc/+page.svelte`
8. `src/routes/(app)/work/inspections/+page.svelte`
9. `src/routes/(shop)/shop/cancelled/+page.svelte`
10. `src/routes/(shop)/shop/dashboard/+page.svelte`
11. `src/routes/(shop)/shop/estimates/+page.svelte`
12. `src/routes/(shop)/shop/invoiced/+page.svelte`
13. `src/routes/(shop)/shop/invoices/+page.svelte`
14. `src/routes/(shop)/shop/jobs/+page.svelte`
15. `src/routes/(shop)/shop/jobs/[id]/+page.svelte` — **also clean rose usage here** (6 rose hits deferred from Phase 2)

Grep confirmed count = 15 files with `GradientBadge` import/callsites.

## Also update: `src/lib/utils/table-helpers.ts`

Line 4 references `GradientBadge`. Check what type/helper is defined there and update it to reference `Badge` tone names (`'muted' | 'info' | 'success' | 'warning' | 'destructive-soft'`) instead of GradientBadge variant names.

If the helper function returns the old variant names, update every caller that uses them — or better, change the helper's return type + values in one place.

## Delete

`src/lib/components/data/GradientBadge.svelte` — delete the file after all callsites are migrated.

---

## Photo progress bars (6 files)

The 6 `*PhotosPanel.svelte` files have rose progress bars:
- `src/lib/components/assessment/TyrePhotosPanel.svelte`
- `src/lib/components/assessment/AdditionalsPhotosPanel.svelte`
- `src/lib/components/assessment/PreIncidentPhotosPanel.svelte`
- `src/lib/components/assessment/Exterior360PhotosPanel.svelte`
- `src/lib/components/assessment/InteriorPhotosPanel.svelte`
- `src/lib/components/assessment/EstimatePhotosPanel.svelte`

Grep each for `bg-rose-*`, `text-rose-*`, `from-rose-*`, `to-rose-*`. Apply the same semantic-aware replacement as Phase 2:
- Progress bar fill that represents "upload progress" → `bg-primary` (it's an affordance/active state)
- "Required photo missing" warning → `bg-warning-soft text-warning` or `destructive-soft` depending on severity — read the surrounding label
- "Upload failed" destructive → `destructive-soft text-destructive`
- Neutral counter/badge → `bg-muted text-muted-foreground`

When in doubt, prefer `bg-primary` for progress (blue fill) and `bg-muted` for counters.

---

## shop/jobs/[id]/+page.svelte

Has 6 rose hits, deferred from Phase 2. Grep it, apply the Phase 2 semantic rules, fix. This is a single-file cleanup inside the Phase 3 commit.

---

## Verification

After all migrations:

1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -40` — 0 new errors.
2. `npm run build 2>&1 | tail -15` — exit 0.
3. Grep checks:
   ```
   grep -rEn "GradientBadge" src/ 2>&1 | wc -l     # should be 0
   grep -rEn "bg-rose-|text-rose-|from-rose-" src/routes/\(app\) src/routes/\(shop\) src/lib/components/ 2>&1 | wc -l  # should be 0
   ```
4. Confirm `src/lib/components/data/GradientBadge.svelte` is deleted.

---

## Do NOT

- Do not add dev deps.
- Do not touch `src/routes/auth/**`.
- Do not touch anything in `src/app.css`, `button.svelte`, `badge.svelte`, or `Sidebar.svelte` (prior phases).
- Do not edit `ModernDataTable.svelte` — Phase 4 handles that.
- Do not touch `TableCell.svelte` yet — Phase 4.
- Do not commit. Orchestrator commits.

---

## Budget

Larger sweep than Phase 2. ~15 route files + 6 photo panels + 1 type file + 1 delete = ~23 files. Most are pure import-swap + JSX rewrite. Expect 150–250 lines of changes.

Ambiguous cases → default to `muted` for neutral, `info` for emphasis, `success`/`warning`/`destructive-soft` for semantics. Flag anything you had to guess at.
