# Mobile Responsiveness — Outstanding Work

**Created**: 2026-04-18
**Branch**: `claude/confident-mendel`
**Last shipped commit**: `166a3ce` (Phase 3C)
**Master plan**: `C:\Users\Jcvdm\.claude\plans\validated-zooming-lampson.md`

## ⚠️ Immediate — uncommitted changes in working tree

Phase 3D implementation is **complete and in the working tree** but not committed, not verified, not pushed.

**Uncommitted files** (Phase 3D):
- `src/app.css` — Z-Index hierarchy documentary comment (+8 lines)
- `src/lib/components/photo-viewer/FormFieldPhotoViewer.svelte` — `visualViewport` listener + inline `bottom` style + landscape media query (+43 lines)
- `src/lib/components/photo-viewer/PhotoViewer.svelte` — `visualViewport` listener + inline `bottom` style (+21 lines)

**Remaining orchestrator work** (in order):
1. `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -60` — expect 0 new errors, 29 pre-existing warnings.
2. `npm run build 2>&1 | tail -15` — expect success.
3. Commit + push to `claude/confident-mendel` with task ref `.agent/Tasks/active/MOBILE_RESPONSIVE_PHASE_3D.md`.
4. Also: `PHOTO_MOBILE_INVESTIGATION.md` has been moved from `active/` → `completed/` but the rename isn't committed yet — include it in the commit.

Task doc with full spec: `.agent/Tasks/active/MOBILE_RESPONSIVE_PHASE_3D.md`.

## 📋 Remaining phases

### Phase 3C batch 2 — wider / complex dialogs (MEDIUM priority)

~12 dialog callsites deferred from Phase 3C. Each requires case-by-case evaluation before migrating to `ResponsiveDialog` — not a mechanical swap because of size / complexity / multi-dialog files.

**Files with deferred dialogs:**
- `src/routes/(app)/work/appointments/+page.svelte` — `max-h-[90vh] overflow-y-auto sm:max-w-[600px]` schedule form
- `src/routes/(app)/work/inspections/[id]/+page.svelte` — 2 dialogs (`sm:max-w-[500px]` engineer selection + `max-h-[90vh] sm:max-w-[600px]` create appointment)
- `src/routes/(app)/work/finalized-assessments/+page.svelte` — `max-w-2xl` assessment summary
- `src/routes/(shop)/shop/estimates/new/+page.svelte` — 2 dialogs
- `src/routes/(shop)/shop/jobs/[id]/+page.svelte` — Parts List Modal (`max-w-2xl`); the `sm:max-w-md` sibling already migrated in 3C
- `src/lib/components/forms/PdfUpload.svelte` — dynamic width (`class={modalSizeClass}`) — special case
- Inline assessment row-action dialogs in: `EstimateTab.svelte`, `FRCTab.svelte`, `FRCLinesTable.svelte`, `TyresTab.svelte`, `RatesAndRepairerConfiguration.svelte`, `OriginalEstimateLinesPanel.svelte`, `FinalizeTab.svelte`

**Approach when picked up**: triage in two batches — "form-input dialogs that would benefit from being bottom sheets" (high value) vs. "complex multi-step / full-screen-ish" (keep as Dialog, possibly just verify they don't overflow). A fresh Explore pass should re-grep and re-triage before spec.

### Phase 3C photo-polish follow-ups (LOW, deferred from 3D)

Items captured during photo investigation but explicitly excluded from Phase 3D:
- Exterior360Tab optimistic-queue retry handler audit (verify retry actually works on failed photo uploads).
- Placeholder text on label inputs (VIN, mileage, etc).
- Bump validation-warning icon size on mobile so users notice before saving invalid data.
- 2000ms debounce → add visible "saving…" indicator so users don't navigate mid-debounce.
- Skeleton/loading state on the 7 `*PhotosPanel` components.
- `photo-prefetch.ts` exists but isn't wired into viewers — integrate if performance budget justifies.

### Phase 4 — Touch & a11y polish

From master plan, untouched:
- Audit form input heights — `h-8`/`h-9` on primary mobile form fields → `h-10`.
- Icon-only buttons get `aria-label` (grep `size="icon"` callsites).
- Sticky headers/footers respect `env(safe-area-inset-bottom)` (viewport-fit=cover already set in Phase 1).
- Focus-ring visibility review — `ring-ring` tokens may be too subtle on certain backgrounds.
- Keyboard navigation through the 13 assessment tabs.

### Phase 5 — Desktop polish

From master plan, untouched:
- Add `xl:` / `2xl:` grid variants on dashboards and data tables for density at 1920+.
- Max-width readability caps on prose-heavy pages (`max-w-prose` / `max-w-[75ch]`) — request detail description, assessment notes.
- Refined grid densities (`xl:grid-cols-6`) on the large overview pages.

### Playwright visual baseline (blocked)

`tests/visual/pre-phase-3.spec.ts` exists as `test.skip(...)`. Activation requires adding a `storageState` auth fixture to `playwright.config.ts`. One-flip-to-active once auth is wired. Not urgent — manual testing has carried us through Phase 1–3C without it.

## ✅ Shipped so far on `claude/confident-mendel`

```
166a3ce  Phase 3C: 5 small dialogs → ResponsiveDialog + photo investigation doc
929789a  Phase 3B: PageContainer wraps + ActionBar on request detail
b3be12a  Phase 3A: Mobile card fallback — PreIncident + FRC tables
2ef4ebd  Phase 2: Responsive primitives + demo + Playwright scaffold
f27ca67  Phase 1: Foundation (CSS safety nets, min-w-0, h-dvh sweep, button sizes)
```

**PENDING COMMIT**: Phase 3D (see top of file).

## Recommended next-session entry points

1. **Finish 3D** — orchestrator runs build gates + commits the working-tree changes. Smallest unit of work. Do this first.
2. **3C batch 2 triage pass** — fresh Explore agent to triage the 12 deferred dialogs. Medium effort.
3. **Phase 4** — touch & a11y polish. Good for device testing sessions.
4. **Phase 5** — desktop polish. Lowest priority; wait for user-driven pain signal.
