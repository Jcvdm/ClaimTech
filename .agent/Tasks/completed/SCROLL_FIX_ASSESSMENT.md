# Scroll-Trap Fix — Assessment Routes

**Created**: 2026-04-25
**Status**: In Progress
**Complexity**: Moderate (~9 files, low per-file risk)
**Branch**: `claude/confident-mendel`
**Origin in sync**: Verified at task creation. **Coder must NOT run any `git pull`/`git fetch --autostash` operations** — orchestrator handles git.

---

## Problem

Users (especially on Firefox) report that scrolling on assessment pages feels broken: when the pointer is over the estimate table or a photo grid, the wheel scrolls *that* inner region instead of the page. When the inner region hits its bottom, the page does not pick up the wheel — feels stuck.

Root cause: a global CSS rule at [`src/app.css:226-228`](src/app.css#L226-L228) applies `overscroll-behavior: contain` to **every** `.overflow-y-auto`, blocking scroll chaining. Combined with multiple `max-h-... overflow-y-auto` regions inside the assessment `<main>`, this creates 8 confirmed scroll traps.

---

## User-confirmed decisions

1. **Panel UX**: Remove `max-h` + inner scroll from photo panels. They grow inline; page scrolls naturally. Existing `bigger-picture` library handles per-photo fullscreen on click. No modal-for-grid build.
2. **Opt-in scroll-isolation**: Add a Tailwind utility `.scroll-isolate { overscroll-behavior: contain; }` to `src/app.css`. Apply it explicitly on Dialog/Sheet content callsites that want isolation.
3. **Reach**: Assessment routes only. `src/lib/components/assessment/*` + `src/app.css`. Other route trees (work queue, shop, admin) are out of scope — they may have legitimate inner scroll regions worth keeping.

---

## Files to modify

### `src/app.css` — narrow the global rule

Replace lines 226-228:
```css
/* BEFORE */
.overflow-y-auto, .overflow-auto, .overflow-y-scroll {
  overscroll-behavior: contain;
}
```
with:
```css
/* AFTER — opt-in only */
.scroll-isolate {
  overscroll-behavior: contain;
}
```

This removes the global trap and exposes `.scroll-isolate` for explicit isolation on modals/drawers.

### Assessment files — remove inner scroll traps

Drop `max-h-[…] overflow-y-auto` (keep `overflow-x-auto` where present). For the EstimateTab table, also drop the sticky-header behavior since that depended on the bounded scroll.

| File | Current | Change |
|---|---|---|
| `src/lib/components/assessment/EstimateTab.svelte:1126` | `class="hidden rounded-sm border overflow-x-auto max-h-[70vh] overflow-y-auto md:block"` | → `class="hidden rounded-sm border overflow-x-auto md:block"` (keep horizontal scroll for wide tables; drop vertical bound) |
| `src/lib/components/assessment/EstimateTab.svelte:1920` | `<pre class="… max-h-96 overflow-y-auto">` | Drop `max-h-96 overflow-y-auto` — let the parts list grow with the page |
| `src/lib/components/assessment/Exterior360PhotosPanel.svelte:259` | `class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto p-1"` | → drop `max-h-[600px] overflow-y-auto` |
| `src/lib/components/assessment/EstimatePhotosPanel.svelte:260` | same shape | → drop `max-h-[600px] overflow-y-auto` |
| `src/lib/components/assessment/InteriorPhotosPanel.svelte:261` | same shape | → drop `max-h-[600px] overflow-y-auto` |
| `src/lib/components/assessment/PreIncidentPhotosPanel.svelte:235` | same shape | → drop `max-h-[600px] overflow-y-auto` |
| `src/lib/components/assessment/AdditionalsPhotosPanel.svelte:227` | same shape | → drop `max-h-[600px] overflow-y-auto` |
| `src/lib/components/assessment/AssessmentNotes.svelte:116` | `class="max-h-[250px] min-h-[100px] space-y-3 overflow-y-auto p-3 sm:max-h-[400px] sm:min-h-[150px] sm:p-4"` | → drop `max-h-[250px]`, `overflow-y-auto`, and `sm:max-h-[400px]`. Keep `min-h-[100px]` and `sm:min-h-[150px]` for empty-state padding. |

### Apply `.scroll-isolate` to legitimate modal scroll regions

These are intentionally bounded — when a Dialog/Sheet with internal scroll reaches its end, we don't want the wheel to chain to the page behind. Add `scroll-isolate` to the existing class string.

| File | Current | Change |
|---|---|---|
| `src/lib/components/assessment/OriginalEstimateLinesPanel.svelte:81` | `<Dialog.Content class="sm:max-w-4xl max-h-[80vh] overflow-y-auto">` | → add `scroll-isolate` |
| `src/lib/components/assessment/RatesAndRepairerConfiguration.svelte:528` | `<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">` | → add `scroll-isolate` |
| `src/lib/components/assessment/FRCTab.svelte:1052` | `<Dialog.Content class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">` | → add `scroll-isolate` |
| `src/lib/components/assessment/FinalizeTab.svelte:585` | `<DialogContent class="max-h-[80vh] max-w-2xl overflow-y-auto">` | → add `scroll-isolate` |

Also: `src/lib/components/assessment/AssessmentLayout.svelte` — the mobile `<Sheet>` drawer at line ~298-310. Check whether `SheetContent` already isolates by default (bits-ui usually does); if it does NOT and the StepRail in the drawer ever overflows, add `scroll-isolate` there too. This is defensive only — likely no-op since the rail is short.

---

## Files NOT to touch

- `src/lib/components/assessment/AssessmentLayout.svelte` `<main>` and `<aside>` — they are intentionally `overflow-y-auto` because the outer container is `h-screen overflow-hidden`. They are the topmost scroll containers; nothing to chain to. Leave alone.
- Any file outside `src/lib/components/assessment/` — out of scope.
- `package.json` — no new dependencies.

---

## Implementation steps

1. **Edit `src/app.css`** — replace the global `.overflow-y-auto, .overflow-auto, .overflow-y-scroll { overscroll-behavior: contain; }` rule with the `.scroll-isolate` utility. Don't change any other CSS in that file.

2. **Strip inner scroll** from the 7 assessment files in the table above (EstimateTab table + parts pre, AssessmentNotes, 5 photo panels). Each is a single-class-string edit.

3. **Add `scroll-isolate`** to the 4 Dialog/Sheet content elements listed.

4. **Inspect the mobile Sheet in AssessmentLayout** — read lines ~298-310. If `SheetContent` does not already get `overscroll-behavior: contain` from its own primitive (check `src/lib/components/ui/sheet/sheet-content.svelte`), append `scroll-isolate` to its class. Otherwise, no change.

5. **Run `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`**. Must be 0 errors. Report any new warnings on touched files.

6. **Report back** with: every file modified, confirmation `package.json` is unchanged, the svelte-check tail, and any deviations.

7. **STOP** — do not commit, do not push, do not run `git pull`/`git fetch --autostash`. Orchestrator handles git.

---

## Verification (orchestrator + user, on Vercel preview)

After commit + push, on the Vercel preview URL for `claude/confident-mendel`:

1. **Firefox desktop, EstimateTab** — open an assessment with a long estimate. Hover over the table, wheel up/down. Page should scroll naturally; the table should not trap the wheel.
2. **Chrome/Edge sanity** — same behavior.
3. **Photo panels** — open 360°/Interior/Estimate Photos tabs. Hover over the photo grid, wheel. Page scrolls. Tap a photo → existing fullscreen viewer (`bigger-picture`) opens.
4. **Mobile viewport** — swipe up/down on each tab; page moves predictably.
5. **Mobile drawer** — open the StepRail sheet, scroll, close. Page scroll still works.
6. **Modal regression** — open the QuickAdd dialog (RatesAndRepairer), the FRC adjust modal, the OriginalEstimateLines dialog, and the Finalize dialog. Each should scroll internally without forcing the background page to move (proves `scroll-isolate` is doing its job).
7. **AssessmentNotes (in SummaryTab)** — long notes list grows inline; user scrolls page to reach it.

---

## Risks / things to watch

- **Long pages on photo-heavy assessments**. If a panel has 50+ photos, the page becomes very tall. User accepted this — `bigger-picture` still gives per-photo zoom. If post-deploy review shows it's annoying, follow-up is a "Show all/fewer" toggle (out of scope here).
- **EstimateTab tables with 200+ line items** become very tall (per design-system "spreadsheet speed at 200-row scale"). Same reasoning — `<main>` scrolls; sticky totals (Mac's Phase 8b) stay visible. Acceptable.
- **`SheetContent` default** — bits-ui may already set `overscroll-behavior: contain` on its sheet primitive. If so, adding `scroll-isolate` is harmless duplication. If not, this defensive add prevents the mobile drawer from chaining when the rail overflows on a small-height device.
- **`.scroll-isolate` is a global utility** — adding it to non-modal callsites in the future would re-introduce the trap. Document the rule in the CSS comment: "opt-in only — apply to Dialog/Sheet content with bounded internal scroll, not to inline page sections."

---

## Coder convention

- Touch ONLY the files listed above.
- No new dependencies.
- No formatter sweeps over unrelated files.
- No "while I'm here" cleanups.
- **Do NOT run any `git pull`, `git fetch --autostash`, or any git command that changes the working tree.** Read-only `git status` / `git diff` is fine for self-verification.
- Stop after step 7. Orchestrator commits and pushes.
