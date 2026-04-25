# Style Phase 8a — Assessment Step Rail

**Created**: 2026-04-25
**Status**: In Progress
**Complexity**: Complex (5+ files, structural layout change)
**Branch**: `claude/confident-mendel`
**Approved plan**: `C:\Users\Jcvdm\.claude\plans\lets-take-it-step-witty-glacier.md`

---

## Overview

Replace the horizontal 13-tab strip at the top of the assessment detail page with a **fixed 232px sticky vertical step rail on the left**, with status rings per the design system spec. Mobile (`<lg`) collapses to a hamburger-triggered left drawer.

This is Phase 8a in the style upgrade roadmap, the next item after the post-Phase-7 review gate per `.agent/Tasks/active/STYLE_UPGRADE_HANDOFF.md`.

---

## User-confirmed decisions

1. **Status logic**: Auto-derived from existing validation system.
   - `missingFields.length === 0` → `complete` (green tick ring)
   - validation entry exists & some fields filled → `in-progress` (arc proportional to filled/total)
   - no validation entry yet → `not-started` (empty outline)
   - Requires adding `totalFields?: number` to `TabValidation` (non-breaking, optional).
2. **Mobile**: Drawer at `<lg` (1024px). Persistent rail at `lg+`. Hamburger button in header opens left-side `<Sheet>` containing the same `<StepRail>`.
3. **Header layout**: Existing sticky header (assessment number + Save/Cancel/Exit) stays full-width on top. Rail sits below the header, on the left of the content area.
4. **Tab IDs unchanged**. Same `currentTab` / `onTabChange` API the parent page uses today.

---

## Files to create

| Path | Purpose | ~Lines |
|---|---|---|
| `src/lib/components/ui/step-rail/StepRail.svelte` | Rail container; renders the list of step rows; arrow-key keyboard nav. | ~80 |
| `src/lib/components/ui/step-rail/StepRailItem.svelte` | Single step row: ring + label + optional missing-count chip. | ~60 |
| `src/lib/components/ui/step-rail/StepRing.svelte` | 14px SVG ring, three states. | ~70 |
| `src/lib/components/ui/step-rail/index.ts` | Barrel export. | ~5 |

## Files to modify

| Path | Change |
|---|---|
| `src/lib/components/assessment/AssessmentLayout.svelte` | Replace `<Tabs>` block (line 268-299) with header (kept) + flex-row container: `<aside>` with `<StepRail>` (lg+) + `<main>` with children. Add hamburger + `<Sheet>` for `<lg`. Build `steps[]` derivation. |
| `src/lib/utils/validation.ts` | Add optional `totalFields?: number` to `TabValidation` interface. Update each of the 8 validators to count and return it. |

## Files NOT to touch

- `src/routes/(app)/work/assessments/[appointment_id]/+page.svelte` — `currentTab` / `onTabChange` / validation prop API stays identical.
- The 13 child tab components (SummaryTab, VehicleIdentificationTab, etc.) — no changes.
- `src/app.css` — uses existing tokens only.
- `package.json` — **no new dependencies**. If you find yourself wanting to add one, stop and ask.

---

## Component contracts

### `<StepRail>` props

```ts
interface StepRailProps {
  steps: Array<{
    id: string;            // existing tab id ('summary', 'identification', '360', ...)
    label: string;         // existing tab label
    status: 'complete' | 'in-progress' | 'not-started';
    progress?: number;     // 0-1, only when status === 'in-progress'
    missingCount?: number; // shown as muted chip when > 0
  }>;
  currentStep: string;
  onStepChange: (id: string) => void;
}
```

`AssessmentLayout` builds the `steps[]` array by mapping the existing `tabs()` derivation through the `tabValidations` derivation.

### `<StepRing>` props

```ts
interface StepRingProps {
  status: 'complete' | 'in-progress' | 'not-started';
  progress?: number; // 0-1
  size?: number;     // default 14
}
```

SVG geometry per spec (`design-system.md` §Step rail):
- 14px ring, radius 6, circumference ≈ 37.7
- **Complete**: filled circle `fill="var(--success)"` + Lucide `Check` icon centered, white stroke, `stroke-width="2.5"`.
- **In-progress**: outline circle (stroke `var(--foreground)`, width 1.5) + arc circle with `stroke-dasharray="${progress * 37.7} 37.7"`, rotated `-90deg` from the top so the arc starts at 12 o'clock.
- **Not-started**: outline only, stroke `var(--border-strong)`, width 1.5.

### `<StepRailItem>` styling

Per spec (`design-system.md` §Sidebar (desk) + §Step rail):
- Row: `flex items-center gap-2.5 h-8 px-2.5 rounded-sm cursor-pointer text-[13.5px]`
- Inactive hover: `hover:bg-sidebar-accent`
- Active: `bg-muted font-semibold` + `border-l-2 border-foreground` (account for the 2px in left padding so labels don't shift)
- Missing-count chip (right-aligned): `font-mono text-[11px] text-muted-foreground` (matches Phase 6 sidebar count badges)

---

## Layout integration in `AssessmentLayout.svelte`

**Current structure** (line 212-310):
```
<div flex h-full flex-col bg-gray-50>
  <div sticky-header>
    [title + actions]
    [horizontal Tabs strip]   ← removed
  </div>
  <div content scrollable />
</div>
```

**New structure**:
```
<div h-screen flex flex-col bg-gray-50 overflow-hidden>
  <div sticky-header>
    [title + actions + (lg-:hamburger Menu icon)]
  </div>
  <div class="flex flex-1 min-h-0">
    <aside class="hidden lg:flex w-[232px] shrink-0 overflow-y-auto bg-sidebar border-r border-sidebar-border">
      <StepRail {steps} currentStep={currentTab} onStepChange={handleTabClick} />
    </aside>
    <main class="flex-1 overflow-y-auto p-2 pt-2 sm:p-3 sm:pt-3 md:p-4 lg:p-6 lg:pt-4">
      <div class="mx-auto w-[98%] max-w-[1600px] sm:w-[95%] md:w-[92%] lg:w-[90%]">
        {#if children}{@render children()}{/if}
      </div>
    </main>
  </div>
  <Sheet bind:open={drawerOpen} side="left">
    <SheetContent class="w-[280px] p-0">
      <StepRail {steps} currentStep={currentTab} onStepChange={(id) => { handleTabClick(id); drawerOpen = false; }} />
    </SheetContent>
  </Sheet>
</div>
```

Notes:
- The OUTER container becomes `h-screen overflow-hidden` so the inner `flex-1` row can give `<aside>` and `<main>` independent scroll.
- The `max-w-[1600px]` content wrapper stays; it now lives inside `<main>`.
- Hamburger only renders `<lg`: `<Button variant="ghost" size="icon" class="lg:hidden" onclick={() => drawerOpen = true}><Menu class="h-4 w-4" /></Button>`. Insert in the header actions area, before the Save button.
- `Sheet` width is 280px in the drawer (vs 232px desktop) for comfortable tap targets.

---

## Status derivation rules (in `AssessmentLayout`)

```ts
const steps = $derived.by(() => {
  return tabs().map((tab) => {
    const validation = tabValidations[tab.id];
    if (!validation) {
      return { id: tab.id, label: tab.label, status: 'not-started' as const };
    }
    if (validation.isComplete) {
      return { id: tab.id, label: tab.label, status: 'complete' as const };
    }
    const total = validation.totalFields ?? 0;
    const missing = validation.missingFields.length;
    const progress = total > 0 ? Math.max(0, Math.min(1, (total - missing) / total)) : 0;
    return {
      id: tab.id,
      label: tab.label,
      status: 'in-progress' as const,
      progress,
      missingCount: missing
    };
  });
});
```

Steps with no validation entry (e.g., `summary`, `finalize`, `additionals`, `frc`, `audit`) just render as `not-started` — that's correct for now; their status logic is out of scope for 8a.

---

## Implementation steps (in order)

1. **Add `totalFields` to validation.** In `src/lib/utils/validation.ts`:
   - Add optional `totalFields?: number` to `TabValidation` interface.
   - For each of the 8 validators (`validateVehicleIdentification`, `validateExterior360`, `validateInteriorMechanical`, `validateTyres`, `validateDamage`, `validateVehicleValues`, `validatePreIncidentEstimate`, `validateEstimate`), compute `totalFields` based on the number of conditional checks the function makes and return it.
   - For checks that depend on dynamic counts (e.g., `tyres.length` × N fields-per-tyre), document inline how `totalFields` is computed.
   - Run `npm run check` and confirm no consumers break.

2. **Build `StepRing.svelte`** (`src/lib/components/ui/step-rail/StepRing.svelte`). Pure SVG, no runtime deps. Match the spec geometry exactly.

3. **Build `StepRailItem.svelte`** (`src/lib/components/ui/step-rail/StepRailItem.svelte`). Composes `StepRing` + label + optional missing chip. Active styling per spec. Accept `onclick` callback prop.

4. **Build `StepRail.svelte`** (`src/lib/components/ui/step-rail/StepRail.svelte`). Maps `steps[]` → `StepRailItem[]`. Add keyboard nav: `ArrowDown` / `ArrowUp` cycle through steps, `Enter` activates. Use `role="tablist"` for accessibility.

5. **Add `index.ts`** (`src/lib/components/ui/step-rail/index.ts`) — barrel export of all three components.

6. **Refactor `AssessmentLayout.svelte`**:
   - Remove the `<Tabs>` block (line 268-299).
   - Drop unused imports (`Tabs`, `TabsList`, `TabsTrigger`). Keep `TabLoadingIndicator` only if still referenced elsewhere — likely not, so drop it too.
   - Add `import { StepRail } from '$lib/components/ui/step-rail';`
   - Add `import { Sheet, SheetContent } from '$lib/components/ui/sheet';`
   - Add `import { Menu } from 'lucide-svelte';`
   - Add `let drawerOpen = $state(false);`
   - Add the `steps` derivation per the rules above.
   - Restructure the layout per the new structure shown above.
   - Add the hamburger button in the header actions row (before Save), `lg:hidden`.
   - Render the `<Sheet>` after the main flex row.

7. **Remove the `<style>` block** (line 312-321) — `scrollbar-hide` was for the horizontal tab scroll which no longer exists. Remove the global style and the `<style>` tag entirely if unused.

8. **Verify build**: `npx svelte-kit sync && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | tail -20`. Must be 0 errors / 0 new warnings.

9. **Spot-check 3 heavy tabs locally if possible (don't `npm run dev`)**: skim `DamageTab.svelte`, `EstimateTab.svelte`, `FRCTab.svelte` for any `h-screen` / `100vh` assumptions that the layout change might break. If you find any, document them in a follow-up note in this file but do NOT fix them — that's a separate task.

10. **Report back**: list every file you modified, confirm `package.json` is unchanged, confirm `npm run check` is clean, and stop. Do NOT commit or push — the user wants to review the diff on the Vercel preview cycle (orchestrator will commit + push after review).

---

## Verification (after implementation)

This is for the orchestrator + user, not the Coder. Listed here for reference.

After commit + push to `claude/confident-mendel`, on the Vercel preview URL:

1. **Desktop (≥1024px)** — open any in-progress assessment.
   - 232px rail visible on the left of the content.
   - Header bar still spans full width above.
   - Active step has `bg-muted` + 2px black left bar + bold label.
   - Steps with no missing fields show green tick rings.
   - Steps with some missing fields show partial arc rings + muted count chip on the right.
   - Steps never visited show hollow rings.
   - Click any step → content updates, URL `?tab=` query updates, no full reload.

2. **Tablet (768–1023px)** — rail hidden, hamburger Menu icon appears in the header.
   - Tap hamburger → left sheet slides in containing the same rail.
   - Tap a step inside sheet → content updates, sheet closes.

3. **Mobile (<640px)** — same as tablet.

4. **Conditional steps** — Additionals appears only after estimate finalized, FRC after submitted, Audit for admin.

5. **Keyboard** — tab into the rail, arrow keys cycle, Enter activates.

6. **Regression** — autosave, validation badges in child tabs, document-generation pause logic all unaffected.

---

## Risks / things to watch

- **Sticky header height**: changing the layout from `flex flex-col` + scrollable body to `h-screen overflow-hidden` + independent scroll panes might fight other components that assume `100vh` content space (FRCTab map, photo gallery dialogs). Spot-check during implementation.
- **`totalFields` count drift**: validators that conditionally check fields (e.g., engine number is optional in `validateVehicleIdentification`) need careful counting. Document in the validator comment what's counted.
- **No new dev dependencies.** If you reach for one, stop.

---

## Coder notes / convention

Per the project's CLAUDE.md and the style upgrade convention:
- Touch ONLY the files listed above. Anything extra → revert.
- No `npm install` of new packages.
- No formatter/lint sweeps over unrelated files.
- No "while I'm here" cleanups.
- Stop after step 10. Do not commit or push.
